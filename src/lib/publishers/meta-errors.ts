import type { PublishResult } from "@/lib/publishers/types";

// Shared Graph API error classifier (Facebook + Instagram use the same codes).
//   190          → dead/expired token (auth)
//   4/17/32/613  → rate limits (long window — retry no sooner than 1 h)
//   10, 200-299  → missing permission/role on the page
//   1/2          → transient Graph hiccups
type GraphError = { error?: { code?: number; message?: string; error_subcode?: number } };

export function classifyGraphError(status: number, body: GraphError): Extract<PublishResult, { ok: false }> {
  const code = body.error?.code ?? 0;
  const msg = body.error?.message ?? `Graph HTTP ${status}`;

  if (code === 190)
    return { ok: false, kind: "auth", message: "Jeton Meta expiré — reconnecte le compte dans Sources de données." };
  if ([4, 17, 32, 613].includes(code))
    return { ok: false, kind: "rate", message: "Limite d'appels Meta atteinte — nouvel essai dans 1 h.", retryAfterSec: 3600 };
  if (code === 10 || (code >= 200 && code <= 299))
    return { ok: false, kind: "permission", message: "Droit de publication manquant sur cette Page (rôle admin requis)." };
  if (code === 1 || code === 2 || status >= 500)
    return { ok: false, kind: "transient", message: "Meta indisponible — nouvel essai automatique." };
  return { ok: false, kind: "permanent", message: `Meta a refusé la publication : ${msg}` };
}
