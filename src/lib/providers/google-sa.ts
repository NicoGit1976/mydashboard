import { createSign } from "crypto";

// Google service-account auth (JWT-bearer flow, RFC 7523).
//
// Why this exists: an OAuth app left in "Testing" — the only status reachable
// without Google's verification review — issues refresh tokens that expire
// after 7 days, so a self-hosted install would need reconnecting every week.
// A service account has no consent screen, no review and no expiry: you grant
// its e-mail read access to a property the same way you'd add a colleague.
//
// The same credential covers GA4 and Search Console; only the scope differs.

export const GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
export const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Pasted keys arrive in two shapes: copied out of the JSON file (real newlines)
// or copied out of the raw JSON string (literal backslash-n). Both must work —
// getting this wrong is the classic "invalid PEM" dead end.
function normalizePem(key: string): string {
  return key.trim().replace(/\\n/g, "\n");
}

// Minted tokens last an hour; cache them so a report render doesn't re-sign on
// every widget. Keyed by account + scope.
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function getServiceAccountToken(
  clientEmail: string,
  privateKeyPem: string,
  scope: string,
): Promise<string | null> {
  const cacheKey = `${clientEmail}:${scope}`;
  const hit = tokenCache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now() + 60_000) return hit.token;

  const iat = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: clientEmail,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      iat,
      exp: iat + 3600,
    }),
  );

  let signature: string;
  try {
    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${claim}`);
    signature = b64url(signer.sign(normalizePem(privateKeyPem)));
  } catch {
    // Malformed key: fail as "no token" so the caller keeps mock data rather
    // than crashing a report render.
    return null;
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claim}.${signature}`,
    }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);

  if (!res || !res.ok) return null;
  const data = (await res.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number }
    | null;
  if (!data?.access_token) return null;

  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  });
  return data.access_token;
}

// Validates a pasted credential the moment it's saved, so a typo surfaces
// immediately instead of as a silently-mock report days later.
export async function probeServiceAccount(
  clientEmail: string,
  privateKeyPem: string,
  scope: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!clientEmail.includes("@"))
    return { ok: false, message: "L'adresse du compte de service semble incomplète." };
  if (!/BEGIN [A-Z ]*PRIVATE KEY/.test(privateKeyPem))
    return {
      ok: false,
      message:
        "La clé privée est incomplète : colle-la entièrement, lignes d'en-tête et de fin comprises.",
    };
  const token = await getServiceAccountToken(clientEmail, privateKeyPem, scope);
  return token
    ? { ok: true }
    : {
        ok: false,
        message:
          "Google a refusé cette clé. Vérifie qu'elle est complète et que l'API correspondante est activée sur le projet.",
      };
}
