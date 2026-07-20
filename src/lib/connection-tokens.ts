import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";
import { getConnector } from "@/lib/connectors";
import { exchangeLongLivedToken } from "@/lib/providers/meta";
import { GA4_SCOPE, GSC_SCOPE, getServiceAccountToken } from "@/lib/providers/google-sa";

export type LiveToken = { token: string; meta: Record<string, unknown> };

type Refreshed = { token: string; refreshToken?: string; expiresIn?: number };

// Provider-specific refresh. Returns null when it can't produce a fresh token.
async function refreshToken(
  provider: string,
  currentToken: string,
  encRefresh: string | null,
): Promise<Refreshed | null> {
  const def = getConnector(provider);
  const isGoogle = Boolean(def?.oauth?.tokenUrl?.includes("oauth2.googleapis.com"));

  if (isGoogle && encRefresh && def?.oauth) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: decrypt(encRefresh),
        client_id: process.env[def.oauth.clientIdEnv] ?? "",
        client_secret: process.env[def.oauth.clientSecretEnv] ?? "",
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const d = (await res.json()) as { access_token: string; expires_in?: number };
    return { token: d.access_token, expiresIn: d.expires_in };
  }

  if (provider === "meta") {
    // fb_exchange_token extends a still-valid long-lived token by ~60 days.
    const extended = await exchangeLongLivedToken(currentToken);
    return extended ? { token: extended, expiresIn: 60 * 24 * 3600 } : null;
  }

  if (provider === "linkedin" && encRefresh && def?.oauth) {
    const res = await fetch(def.oauth.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: decrypt(encRefresh),
        client_id: process.env[def.oauth.clientIdEnv] ?? "",
        client_secret: process.env[def.oauth.clientSecretEnv] ?? "",
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const d = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };
    return { token: d.access_token, refreshToken: d.refresh_token, expiresIn: d.expires_in };
  }

  return null;
}

// Returns a usable access token for (owner, provider), refreshing it when it is
// expiring. If a token is expired and cannot be refreshed, the connection is
// flagged `error` and null is returned — so a dead token is never served as a
// live "connected" source (which would silently render mock data as real).
export async function getValidToken(
  ownerId: string,
  provider: string,
  readOnly = false,
): Promise<LiveToken | null> {
  const conn = await db.connection.findUnique({
    where: { ownerId_provider: { ownerId, provider } },
  });
  if (!conn?.accessToken) return null;

  let token: string;
  try {
    token = decrypt(conn.accessToken);
  } catch {
    return null;
  }
  const meta = (conn.meta ?? {}) as Record<string, unknown>;

  // A pasted service-account key is not a bearer token: exchange it for one.
  // Same credential for GA4 and Search Console — only the scope differs.
  if (meta.credType === "service_account") {
    const clientEmail = String(meta.client_email ?? "");
    const scope = provider === "gsc" ? GSC_SCOPE : GA4_SCOPE;
    const minted = await getServiceAccountToken(clientEmail, token, scope);
    return minted ? { token: minted, meta } : null;
  }

  // Read-only path (public /share pages): never refresh or mutate the owner's
  // connection state and never spend their API quota — an unauthenticated viewer
  // must not be able to flip status or trigger refreshes. Serve the current
  // token best-effort (a dead token just yields cached/mock data downstream).
  if (readOnly) return { token, meta };

  const now = Date.now();
  const nowExpired = conn.expiresAt ? conn.expiresAt.getTime() < now : false;
  const expiresSoon = conn.expiresAt ? conn.expiresAt.getTime() < now + 60_000 : false;

  if (expiresSoon) {
    let refreshed: Refreshed | null = null;
    try {
      refreshed = await refreshToken(provider, token, conn.refreshToken);
    } catch {
      refreshed = null;
    }
    if (refreshed) {
      token = refreshed.token;
      await db.connection.update({
        where: { id: conn.id },
        data: {
          accessToken: encrypt(refreshed.token),
          ...(refreshed.refreshToken ? { refreshToken: encrypt(refreshed.refreshToken) } : {}),
          expiresAt: refreshed.expiresIn
            ? new Date(Date.now() + refreshed.expiresIn * 1000)
            : null,
          status: "connected",
        },
      });
    } else if (nowExpired) {
      // Actually past expiry and un-refreshable → surface it; don't serve dead.
      await db.connection.update({ where: { id: conn.id }, data: { status: "error" } });
      return null;
    }
    // Not-yet-expired + transient refresh failure (5xx/429/network): keep the
    // still-valid current token rather than nuking a working connection.
  }

  return { token, meta };
}
