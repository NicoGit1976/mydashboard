"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActor, getClientFor } from "@/lib/access";
import { createUniqueCode, withUtm } from "@/lib/shortlink";

export type ShortlinkState =
  | { ok: boolean; message: string; shortUrl?: string }
  | null;

const CHANNELS = new Set(["linkedin", "facebook", "instagram", "x", "gmb"]);

// The redirect endpoint is public: without this check it would be an open
// redirector into intranets (SSRF-adjacent) or towards our own login page.
function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^(10\.|127\.|192\.168\.|169\.254\.|0\.)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  // IPv6 literals arrive bracketed ("[::1]") and never matched the v4 rules.
  if (h.startsWith("[")) {
    const v6 = h.slice(1, -1);
    if (v6 === "::1" || v6 === "::") return true;
    if (/^(fc|fd|fe80|::ffff:)/i.test(v6)) return true;
  }
  try {
    const own = new URL(process.env.APP_URL ?? "https://tools.d-analytica.cloud").host;
    if (h === own.toLowerCase()) return true; // no self-redirect loops
  } catch {
    /* APP_URL malformed — skip the self check */
  }
  return false;
}

export async function createShortLink(
  clientId: string,
  _prev: ShortlinkState,
  formData: FormData,
): Promise<ShortlinkState> {
  const actor = await getActor();
  if (!actor) return { ok: false, message: "Non authentifié." };
  if (!(await getClientFor(actor, clientId, "edit")))
    return { ok: false, message: "Accès refusé." };

  const rawUrl = String(formData.get("url") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || null;
  const channelRaw = String(formData.get("channel") ?? "").trim();
  const channel = CHANNELS.has(channelRaw) ? channelRaw : null;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, message: "URL invalide — colle l'adresse complète (https://…)." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
    return { ok: false, message: "Seuls les liens http(s) sont autorisés." };
  if (isPrivateHost(parsed.hostname))
    return { ok: false, message: "Cette adresse ne peut pas être raccourcie." };

  const targetUrl = withUtm(parsed.toString(), channel);
  const code = await createUniqueCode();

  await db.shortLink.create({
    data: {
      code,
      clientId,
      targetUrl,
      originalUrl: parsed.toString(),
      channel,
      label,
      createdById: actor.id,
    },
  });

  revalidatePath(`/clients/${clientId}/edit`);
  const base = process.env.APP_URL ?? "https://tools.d-analytica.cloud";
  return { ok: true, message: "Lien créé.", shortUrl: `${base}/l/${code}` };
}

export async function toggleShortLink(
  linkId: string,
  clientId: string,
): Promise<ShortlinkState> {
  const actor = await getActor();
  if (!actor) return { ok: false, message: "Non authentifié." };
  if (!(await getClientFor(actor, clientId, "edit")))
    return { ok: false, message: "Accès refusé." };

  const link = await db.shortLink.findFirst({ where: { id: linkId, clientId } });
  if (!link) return { ok: false, message: "Lien introuvable." };

  await db.shortLink.update({
    where: { id: link.id },
    data: { disabled: !link.disabled },
  });
  revalidatePath(`/clients/${clientId}/edit`);
  return {
    ok: true,
    message: link.disabled ? "Lien réactivé." : "Lien désactivé (410).",
  };
}

export async function deleteShortLink(
  linkId: string,
  clientId: string,
): Promise<ShortlinkState> {
  const actor = await getActor();
  if (!actor) return { ok: false, message: "Non authentifié." };
  if (!(await getClientFor(actor, clientId, "edit")))
    return { ok: false, message: "Accès refusé." };

  const link = await db.shortLink.findFirst({ where: { id: linkId, clientId } });
  if (!link) return { ok: false, message: "Lien introuvable." };

  await db.shortLink.delete({ where: { id: link.id } });
  revalidatePath(`/clients/${clientId}/edit`);
  return { ok: true, message: "Lien supprimé — l'URL courte ne répond plus." };
}
