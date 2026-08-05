import type { PublishDestination, PublishInput, PublishResult } from "@/lib/publishers/types";
import { isJpeg, readUploadBytes } from "@/lib/publishers/media";

// Publishes on a member's own LinkedIn profile (w_member_social — self-serve,
// no app review). Versioned Posts API; image = initializeUpload → PUT bytes.

const API = "https://api.linkedin.com";
const VERSION = process.env.LINKEDIN_API_VERSION || "202506";

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": VERSION,
  };
}

function classify(status: number, body: string): Extract<PublishResult, { ok: false }> {
  if (status === 401)
    return { ok: false, kind: "auth", message: "Jeton LinkedIn expiré — reconnecte le compte dans Sources de données." };
  if (status === 403)
    return { ok: false, kind: "permission", message: "LinkedIn refuse la publication pour ce compte (droit w_member_social manquant)." };
  if (status === 429)
    return { ok: false, kind: "rate", message: "Limite LinkedIn atteinte — nouvel essai plus tard." };
  if (status >= 500)
    return { ok: false, kind: "transient", message: "LinkedIn indisponible — nouvel essai automatique." };
  if (/DUPLICATE/i.test(body))
    return { ok: false, kind: "permanent", message: "LinkedIn a refusé : contenu identique publié récemment (doublon)." };
  return { ok: false, kind: "permanent", message: `LinkedIn a refusé la publication (HTTP ${status}).` };
}

export async function publishLinkedinMember(
  dest: PublishDestination,
  input: PublishInput,
): Promise<PublishResult> {
  const memberUrn = String(dest.meta.memberUrn ?? "");
  if (!memberUrn)
    return {
      ok: false,
      kind: "permission",
      message: "Profil LinkedIn incomplet — reconnecte le compte pour récupérer son identité.",
    };

  // After /rest/posts is sent, a lost response must not trigger a retry.
  let committed = false;
  try {
    // Optional single image.
    let imageUrn: string | null = null;
    if (input.media[0]) {
      const bytes = await readUploadBytes(input.media[0]);
      if (!bytes)
        return { ok: false, kind: "permanent", message: "Image introuvable sur le serveur." };
      if (input.media[0].endsWith(".webp"))
        return { ok: false, kind: "permanent", message: "LinkedIn n'accepte pas le WebP — utilise JPEG ou PNG." };

      const init = await fetch(`${API}/rest/images?action=initializeUpload`, {
        method: "POST",
        headers: headers(dest.token),
        body: JSON.stringify({ initializeUploadRequest: { owner: memberUrn } }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!init.ok) return classify(init.status, await init.text().catch(() => ""));
      const initData = (await init.json()) as {
        value?: { uploadUrl?: string; image?: string };
      };
      const uploadUrl = initData.value?.uploadUrl;
      imageUrn = initData.value?.image ?? null;
      if (!uploadUrl || !imageUrn)
        return { ok: false, kind: "transient", message: "LinkedIn n'a pas fourni d'URL d'upload — nouvel essai." };

      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${dest.token}`,
          "Content-Type": isJpeg(bytes) ? "image/jpeg" : "image/png",
        },
        body: new Uint8Array(bytes),
        signal: AbortSignal.timeout(30_000),
      });
      if (!put.ok) return classify(put.status, "");
    }

    committed = true;
    const post = await fetch(`${API}/rest/posts`, {
      method: "POST",
      headers: headers(dest.token),
      body: JSON.stringify({
        author: memberUrn,
        commentary: input.body,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
        ...(imageUrn ? { content: { media: { id: imageUrn } } } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!post.ok) return classify(post.status, await post.text().catch(() => ""));

    const urn = post.headers.get("x-restli-id") ?? "";
    return {
      ok: true,
      externalPostId: urn,
      publishedUrl: urn ? `https://www.linkedin.com/feed/update/${urn}/` : undefined,
    };
  } catch {
    return committed
      ? {
          ok: false,
          kind: "permanent",
          message: "Réponse réseau perdue après l'envoi — vérifie sur LinkedIn si le post est paru, puis relance si besoin.",
        }
      : { ok: false, kind: "transient", message: "Réseau indisponible vers LinkedIn — nouvel essai automatique." };
  }
}
