import type { PublishDestination, PublishInput, PublishResult } from "@/lib/publishers/types";
import { absoluteUrl } from "@/lib/publishers/media";
import { classifyGraphError } from "@/lib/publishers/meta-errors";

// Publishes to a Facebook Page. Writes REQUIRE the page-scoped token — if the
// page doesn't hand one out, that's a missing role, not something a user token
// fallback should paper over.

const G = "https://graph.facebook.com/v21.0";

async function pageToken(userToken: string, pageId: string): Promise<string | PublishResult> {
  const u = new URL(`${G}/${pageId}`);
  u.searchParams.set("fields", "access_token");
  u.searchParams.set("access_token", userToken);
  const res = await fetch(u, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
  if (!res)
    return { ok: false, kind: "transient", message: "Réseau indisponible vers Meta — nouvel essai automatique." };
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; error?: object };
  if (!res.ok) return classifyGraphError(res.status, data);
  if (!data.access_token)
    return { ok: false, kind: "permission", message: "Pas de jeton de Page — le compte connecté doit être admin de cette Page." };
  return data.access_token;
}

export async function publishFacebookPage(
  dest: PublishDestination,
  input: PublishInput,
): Promise<PublishResult> {
  const pt = await pageToken(dest.token, dest.externalId);
  if (typeof pt !== "string") return pt;

  // A lost response after the terminal POST is indistinguishable from "never
  // sent" — but the story may exist. Once committed, NEVER return `transient`:
  // a retry would publish a second time on the client's real Page.
  let committed = false;
  try {
    let res: Response;
    if (input.media[0]) {
      committed = true;
      const u = new URL(`${G}/${dest.externalId}/photos`);
      res = await fetch(u, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          url: absoluteUrl(input.media[0]),
          caption: input.body,
          access_token: pt,
        }),
        signal: AbortSignal.timeout(20_000),
      });
    } else {
      const u = new URL(`${G}/${dest.externalId}/feed`);
      committed = true;
      res = await fetch(u, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ message: input.body, access_token: pt }),
        signal: AbortSignal.timeout(15_000),
      });
    }

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      post_id?: string;
      error?: object;
    };
    if (!res.ok) return classifyGraphError(res.status, data);

    const id = data.post_id ?? data.id ?? "";
    if (!id)
      // 2xx from Graph means the story EXISTS — retrying would duplicate it.
      return {
        ok: false,
        kind: "permanent",
        message: "Meta a accepté sans renvoyer d'identifiant — vérifie sur la Page si le post est paru avant de relancer.",
      };
    return { ok: true, externalPostId: id, publishedUrl: `https://www.facebook.com/${id}` };
  } catch {
    return committed
      ? {
          ok: false,
          kind: "permanent",
          message: "Réponse réseau perdue après l'envoi — vérifie sur la Page si le post est paru, puis relance si besoin.",
        }
      : { ok: false, kind: "transient", message: "Réseau indisponible vers Meta — nouvel essai automatique." };
  }
}
