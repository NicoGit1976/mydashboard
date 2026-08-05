import type { PublishDestination, PublishInput, PublishResult } from "@/lib/publishers/types";
import { absoluteUrl, isJpeg, readUploadBytes } from "@/lib/publishers/media";
import { classifyGraphError } from "@/lib/publishers/meta-errors";

// Instagram Business publish: 2-step container flow. Meta fetches image_url
// ITSELF, so the upload must be publicly reachable (works in prod, impossible
// against localhost). JPEG only — checked on the magic bytes, since a renamed
// PNG would fail deep in Meta with an opaque code 2207026.

const G = "https://graph.facebook.com/v21.0";

export async function publishInstagramBusiness(
  dest: PublishDestination,
  input: PublishInput,
): Promise<PublishResult> {
  if (!input.media[0])
    return { ok: false, kind: "permanent", message: "Instagram exige une image." };

  const bytes = await readUploadBytes(input.media[0]);
  if (!bytes)
    return { ok: false, kind: "permanent", message: "Image introuvable sur le serveur." };
  if (!isJpeg(bytes))
    return { ok: false, kind: "permanent", message: "Instagram exige un JPEG — réenregistre l'image en .jpg." };

  // Once media_publish is sent, a retry would build a NEW container and post a
  // second time — Meta has no identical-content dedupe to save us.
  let committed = false;
  try {
    // Resolve the IG business account behind the bound Facebook page.
    const pu = new URL(`${G}/${dest.externalId}`);
    pu.searchParams.set("fields", "access_token,instagram_business_account{id}");
    pu.searchParams.set("access_token", dest.token);
    const pres = await fetch(pu, { signal: AbortSignal.timeout(10_000) });
    const page = (await pres.json().catch(() => ({}))) as {
      access_token?: string;
      instagram_business_account?: { id?: string };
      error?: object;
    };
    if (!pres.ok) return classifyGraphError(pres.status, page);
    const igId = page.instagram_business_account?.id;
    const token = page.access_token ?? dest.token;
    if (!igId)
      return {
        ok: false,
        kind: "permission",
        message: "Aucun compte Instagram professionnel n'est relié à cette Page Facebook.",
      };

    // 1. Create the media container.
    const cres = await fetch(`${G}/${igId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        image_url: absoluteUrl(input.media[0]),
        caption: input.body,
        access_token: token,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const container = (await cres.json().catch(() => ({}))) as { id?: string; error?: object };
    if (!cres.ok) return classifyGraphError(cres.status, container);
    if (!container.id)
      return { ok: false, kind: "transient", message: "Meta n'a pas créé le conteneur — nouvel essai." };

    // 2. Publish it (one retry if the container is still processing).
    for (let attempt = 0; attempt < 2; attempt++) {
      committed = true;
      const mres = await fetch(`${G}/${igId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ creation_id: container.id, access_token: token }),
        signal: AbortSignal.timeout(20_000),
      });
      const pub = (await mres.json().catch(() => ({}))) as {
        id?: string;
        error?: { code?: number; error_subcode?: number };
      };
      if (mres.ok && pub.id) {
        const lu = new URL(`${G}/${pub.id}`);
        lu.searchParams.set("fields", "permalink");
        lu.searchParams.set("access_token", token);
        const lres = await fetch(lu, { signal: AbortSignal.timeout(8_000) }).catch(() => null);
        const link = lres?.ok
          ? ((await lres.json().catch(() => ({}))) as { permalink?: string }).permalink
          : undefined;
        return { ok: true, externalPostId: pub.id, publishedUrl: link };
      }
      // Container not ready yet → wait once, then hand back to the scheduler.
      if (pub.error?.error_subcode === 2207027 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 5_000));
        continue;
      }
      return classifyGraphError(mres.status, pub as { error?: object });
    }
    return {
      ok: false,
      kind: "permanent",
      message: "Publication Instagram incertaine — vérifie le compte avant de relancer.",
    };
  } catch {
    return committed
      ? {
          ok: false,
          kind: "permanent",
          message: "Réponse réseau perdue après l'envoi — vérifie sur Instagram si le post est paru, puis relance si besoin.",
        }
      : { ok: false, kind: "transient", message: "Réseau indisponible vers Meta — nouvel essai automatique." };
  }
}
