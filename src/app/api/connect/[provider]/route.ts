import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { getConnector, isConfigured } from "@/lib/connectors";

// Generic OAuth start — builds the provider's authorize URL from the registry.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL("/login", req.url));

  const def = getConnector(provider);
  if (!def?.oauth) return NextResponse.redirect(new URL("/sources?error=unknown", req.url));
  if (!isConfigured(def))
    return NextResponse.redirect(new URL(`/sources?error=notconfigured&p=${provider}`, req.url));

  const appUrl = process.env.APP_URL ?? new URL(req.url).origin;
  const redirectUri = `${appUrl}/api/connect/${provider}/callback`;
  const state = randomBytes(16).toString("hex");

  const authUrl = new URL(def.oauth.authUrl);
  authUrl.searchParams.set("client_id", process.env[def.oauth.clientIdEnv]!);
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
