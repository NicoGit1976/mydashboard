import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { getConnector } from "@/lib/connectors";
import { resolveOAuthCredentials } from "@/lib/provider-apps";

// Redirects must be built on the PUBLIC url: behind Traefik the request
// host is the container's own (0.0.0.0:3000), which the browser can't reach.
const PUBLIC_BASE = process.env.APP_URL ?? "https://tools.d-analytica.cloud";
function appUrl(path: string): string {
  return new URL(path, PUBLIC_BASE).toString();
}

// Generic OAuth start — builds the provider's authorize URL from the registry.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(appUrl("/login"));

  const def = getConnector(provider);
  if (!def?.oauth) return NextResponse.redirect(appUrl("/sources?error=unknown"));
  // The caller's own registered application, else the instance-wide one.
  const creds = await resolveOAuthCredentials(session.user.id, provider);
  if (!creds)
    return NextResponse.redirect(appUrl(`/sources?error=notconfigured&p=${provider}`));

  const redirectUri = `${PUBLIC_BASE}/api/connect/${provider}/callback`;
  const state = randomBytes(16).toString("hex");

  const authUrl = new URL(def.oauth.authUrl);
  authUrl.searchParams.set("client_id", creds.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", def.oauth.scopes.join(" "));
  authUrl.searchParams.set("state", state);
  for (const [k, v] of Object.entries(def.oauth.extraAuthParams ?? {})) {
    authUrl.searchParams.set(k, v);
  }

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set(`oauth_state_${provider}`, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return res;
}
