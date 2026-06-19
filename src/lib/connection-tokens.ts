import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";
import { getConnector } from "@/lib/connectors";

export type LiveToken = { token: string; meta: Record<string, unknown> };

// Returns a usable access token for (owner, provider), refreshing Google tokens
// (short-lived, ~1h) when expired. Returns null if not connected / undecryptable.
export async function getValidToken(
  ownerId: string,
  provider: string,
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

  const def = getConnector(provider);
  const isGoogle = Boolean(def?.oauth?.tokenUrl?.includes("oauth2.googleapis.com"));
  const expiresSoon = conn.expiresAt
    ? conn.expiresAt.getTime() < Date.now() + 60_000
    : false;

  if (isGoogle && expiresSoon && conn.refreshToken && def?.oauth) {
    try {
      const refreshToken = decrypt(conn.refreshToken);
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: process.env[def.oauth.clientIdEnv] ?? "",
          client_secret: process.env[def.oauth.clientSecretEnv] ?? "",
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { access_token: string; expires_in?: number };
        token = data.access_token;
        await db.connection.update({
          where: { id: conn.id },
          data: {
            accessToken: encrypt(data.access_token),
            expiresAt: data.expires_in
              ? new Date(Date.now() + data.expires_in * 1000)
              : null,
            status: "connected",
          },
        });
      } else {
        await db.connection.update({
          where: { id: conn.id },
          data: { status: "error" },
        });
      }
    } catch {
      // Use the (possibly stale) token; the data fetch will surface real errors.
    }
  }

  return { token, meta };
}
