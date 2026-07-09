import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getConnector } from "@/lib/connectors";
import { encrypt } from "@/lib/crypto";
import { exchangeLongLivedToken } from "@/lib/providers/meta";

// Generic OAuth callback — exchanges the code for tokens (standard OAuth2
// authorization-code grant) and stores them encrypted.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL("/login", req.url));

  const def = getConnector(provider);
  if (!def?.oauth) return NextResponse.redirect(new URL("/sources?error=unknown", req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get(`oauth_state_${provider}`)?.value;
  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(new URL(`/sources?error=state&p=${provider}`, req.url));
  }

  const appUrl = process.env.APP_URL ?? url.origin;
  const redirectUri = `${appUrl}/api/connect/${provider}/callback`;

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
        client_id: process.env[def.oauth.clientIdEnv]!,
        client_secret: process.env[def.oauth.clientSecretEnv]!,
      }),
    });
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!res.ok || !data.access_token) {
      return NextResponse.redirect(new URL(`/sources?error=token&p=${provider}`, req.url));
    }

    let accessToken = data.access_token;
    let expiresIn = data.expires_in;
    // Meta hands back a short-lived token — swap it for a ~60-day one.
    if (provider === "meta") {
      const longLived = await exchangeLongLivedToken(accessToken);
      if (longLived) {
        accessToken = longLived;
        expiresIn = 60 * 24 * 3600;
      }
    }
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    await db.connection.upsert({
      where: { ownerId_provider: { ownerId: session.user.id, provider } },
      update: {
        authType: "oauth",
        status: "connected",
        accessToken: encrypt(accessToken),
        // Only overwrite the refresh token when the provider returns one — an
        // absent refresh_token on reconnect must NOT wipe the stored one.
        ...(data.refresh_token ? { refreshToken: encrypt(data.refresh_token) } : {}),
        expiresAt,
      },
      create: {
        ownerId: session.user.id,
        provider,
        authType: "oauth",
        status: "connected",
        accessToken: encrypt(accessToken),
        refreshToken: data.refresh_token ? encrypt(data.refresh_token) : null,
        expiresAt,
      },
    });

    const redirect = NextResponse.redirect(new URL(`/sources?connected=${provider}`, req.url));
    redirect.cookies.delete(`oauth_state_${provider}`);
    return redirect;
  } catch {
    return NextResponse.redirect(new URL(`/sources?error=exchange&p=${provider}`, req.url));
  }
}
