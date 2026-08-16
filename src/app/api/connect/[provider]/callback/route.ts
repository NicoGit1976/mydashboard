import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getConnector } from "@/lib/connectors";
import { encrypt } from "@/lib/crypto";
import { resolveOAuthCredentials } from "@/lib/provider-apps";
import { exchangeLongLivedToken } from "@/lib/providers/meta";

// Redirects must be built on the PUBLIC url: behind Traefik the request
// host is the container's own (0.0.0.0:3000), which the browser can't reach.
const PUBLIC_BASE = process.env.APP_URL ?? "https://tools.d-analytica.cloud";
function appUrl(path: string): string {
  return new URL(path, PUBLIC_BASE).toString();
}

// Generic OAuth callback — exchanges the code for tokens (standard OAuth2
// authorization-code grant) and stores them encrypted.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(appUrl("/login"));

  const def = getConnector(provider);
  if (!def?.oauth) return NextResponse.redirect(appUrl("/sources?error=unknown"));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get(`oauth_state_${provider}`)?.value;
  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(appUrl(`/sources?error=state&p=${provider}`));
  }

  // The SAME application the authorize step used, or the provider rejects
  // the exchange: the code is bound to the client that requested it.
  const creds = await resolveOAuthCredentials(session.user.id, provider);
  if (!creds)
    return NextResponse.redirect(appUrl(`/sources?error=notconfigured&p=${provider}`));

  // Must match the redirect_uri sent at authorize time, byte for byte.
  const redirectUri = `${PUBLIC_BASE}/api/connect/${provider}/callback`;

  try {
    const res = await fetch(def.oauth.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
      }),
    });
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!res.ok || !data.access_token) {
      return NextResponse.redirect(appUrl(`/sources?error=token&p=${provider}`));
    }

    let accessToken = data.access_token;
    let expiresIn = data.expires_in;
    // Meta hands back a short-lived token — swap it for a ~60-day one, signed
    // by the SAME application that issued it. A failed swap is surfaced rather
    // than stored: a token that dies within the hour behind a "Connecté" badge
    // is worse than an error the user can act on.
    if (provider === "meta") {
      const longLived = await exchangeLongLivedToken(
        accessToken,
        creds.clientId,
        creds.clientSecret,
      );
      if (!longLived)
        return NextResponse.redirect(appUrl(`/sources?error=longlived&p=${provider}`));
      accessToken = longLived;
      expiresIn = 60 * 24 * 3600;
    }
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    // Capture the account identity NOW: LinkedIn posts are authored by a member
    // URN, and there is no later opportunity to ask for it.
    let meta: Record<string, string> | null = null;
    let accountLabel: string | null = null;
    if (provider === "linkedin") {
      const ui = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);
      if (ui?.ok) {
        const who = (await ui.json().catch(() => ({}))) as { sub?: string; name?: string };
        if (who.sub) {
          meta = { memberUrn: `urn:li:person:${who.sub}` };
          accountLabel = who.name ?? null;
        }
      }
      if (!meta)
        return NextResponse.redirect(appUrl("/sources?error=identity"));
    }

    await db.connection.upsert({
      where: { ownerId_provider: { ownerId: session.user.id, provider } },
      update: {
        authType: "oauth",
        status: "connected",
        accessToken: encrypt(accessToken),
        // Only overwrite the refresh token when the provider returns one — an
        // absent refresh_token on reconnect must NOT wipe the stored one.
        ...(data.refresh_token ? { refreshToken: encrypt(data.refresh_token) } : {}),
        ...(meta ? { meta } : {}),
        ...(accountLabel ? { accountLabel } : {}),
        expiresAt,
        oauthClientId: creds.clientId,
      },
      create: {
        ownerId: session.user.id,
        provider,
        authType: "oauth",
        status: "connected",
        accessToken: encrypt(accessToken),
        refreshToken: data.refresh_token ? encrypt(data.refresh_token) : null,
        ...(meta ? { meta } : {}),
        ...(accountLabel ? { accountLabel } : {}),
        expiresAt,
        oauthClientId: creds.clientId,
      },
    });

    const redirect = NextResponse.redirect(appUrl(`/sources?connected=${provider}`));
    redirect.cookies.delete(`oauth_state_${provider}`);
    return redirect;
  } catch {
    return NextResponse.redirect(appUrl(`/sources?error=exchange&p=${provider}`));
  }
}
