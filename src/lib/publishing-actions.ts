"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getActor, getClientFor, getPostClientFor } from "@/lib/access";
import {
  NETWORK_LIMITS,
  effectiveLength,
  listPublishCandidates,
} from "@/lib/publish-targets";
import { saveImageUpload } from "@/lib/uploads";

export type PublishState = { ok: boolean; message: string; postId?: string } | null;

// Media stored on Post.media as string[] of upload URLs.
function mediaOf(post: { media: unknown }): string[] {
  return Array.isArray(post.media) ? (post.media as string[]) : [];
}
function keysOf(post: { targetKeys: unknown }): string[] {
  return Array.isArray(post.targetKeys) ? (post.targetKeys as string[]) : [];
}

// Validates body/media against every SELECTED network. Returns null when fine,
// else a French message. Server-side authority — the composer's counters are
// cosmetic.
function validateAgainstNetworks(
  body: string,
  mediaCount: number,
  providers: string[],
): string | null {
  for (const p of providers) {
    const lim = NETWORK_LIMITS[p];
    if (!lim) continue;
    const len = effectiveLength(body, p);
    if (len > lim.maxChars)
      return `Trop long pour ${p === "x" ? "X" : p} : ${len}/${lim.maxChars} caractères.`;
    if (mediaCount > lim.maxImages)
      return p === "x"
        ? "X (v1) : texte et lien seulement, retire l'image ou décoche X."
        : "Une seule image par publication (v1).";
    if (lim.requiresImage && mediaCount === 0)
      return "Instagram exige une image — ajoute un JPEG ou décoche Instagram.";
  }
  return null;
}

type FormRead =
  | { ok: false; error: string }
  | { ok: true; body: string; scheduledAt: Date | null; targetKeys: string[]; mediaUrl: string | null };

async function readForm(formData: FormData): Promise<FormRead> {
  const body = String(formData.get("body") ?? "").trim();
  const scheduledRaw = String(formData.get("scheduledAt") ?? "").trim();
  // datetime-local arrives without timezone: interpreted as the SERVER's local
  // time (container = UTC). The composer labels the field accordingly.
  const scheduledAt = scheduledRaw ? new Date(scheduledRaw) : null;
  const targetKeys = formData.getAll("targetKeys").map(String).filter(Boolean);

  let mediaUrl: string | null = null;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    mediaUrl = await saveImageUpload(image);
    if (!mediaUrl) return { ok: false, error: "Image refusée (2 Mo max, jpg/png/webp/gif)." };
  }
  return { ok: true, body, scheduledAt, targetKeys, mediaUrl };
}

export async function createPost(
  clientId: string,
  _prev: PublishState,
  formData: FormData,
): Promise<PublishState> {
  const actor = await getActor();
  if (!actor) return { ok: false, message: "Non authentifié." };
  if (!(await getClientFor(actor, clientId, "edit")))
    return { ok: false, message: "Accès refusé." };

  const f = await readForm(formData);
  if (!f.ok) return { ok: false, message: f.error };
  if (!f.body && !f.mediaUrl) return { ok: false, message: "Le post est vide." };

  const post = await db.post.create({
    data: {
      clientId,
      authorId: actor.id,
      body: f.body,
      media: f.mediaUrl ? [f.mediaUrl] : [],
      targetKeys: f.targetKeys,
      scheduledAt: f.scheduledAt,
      status: "DRAFT",
    },
  });
  revalidatePath("/publishing");
  return { ok: true, message: "Brouillon enregistré.", postId: post.id };
}

export async function updatePost(
  postId: string,
  _prev: PublishState,
  formData: FormData,
): Promise<PublishState> {
  const actor = await getActor();
  if (!actor) return { ok: false, message: "Non authentifié." };
  const found = await getPostClientFor(actor, postId, "edit");
  if (!found) return { ok: false, message: "Accès refusé." };
  if (found.post.status !== "DRAFT" && found.post.status !== "PENDING_APPROVAL")
    return { ok: false, message: "Ce post n'est plus modifiable (déjà planifié ou publié)." };

  const f = await readForm(formData);
  if (!f.ok) return { ok: false, message: f.error };
  if (!f.body && !f.mediaUrl && mediaOf(found.post).length === 0)
    return { ok: false, message: "Le post est vide." };

  await db.post.update({
    where: { id: postId },
    data: {
      body: f.body,
      ...(f.mediaUrl ? { media: [f.mediaUrl] } : {}),
      targetKeys: f.targetKeys,
      scheduledAt: f.scheduledAt,
      // Editing a submitted post pulls it back to draft: the approver must see
      // the final text, never a version that changed under their decision.
      status: "DRAFT",
      submittedAt: null,
    },
  });
  revalidatePath("/publishing");
  revalidatePath(`/publishing/${postId}`);
  return { ok: true, message: "Brouillon mis à jour.", postId };
}

export async function submitPost(postId: string): Promise<PublishState> {
  const actor = await getActor();
  if (!actor) return { ok: false, message: "Non authentifié." };
  const found = await getPostClientFor(actor, postId, "edit");
  if (!found) return { ok: false, message: "Accès refusé." };
  if (found.post.status !== "DRAFT")
    return { ok: false, message: "Seul un brouillon peut être soumis." };
  if (keysOf(found.post).length === 0)
    return { ok: false, message: "Choisis au moins une destination avant de soumettre." };

  await db.post.update({
    where: { id: postId },
    data: { status: "PENDING_APPROVAL", submittedAt: new Date() },
  });
  revalidatePath("/publishing");
  revalidatePath(`/publishing/${postId}`);
  return { ok: true, message: "Soumis pour approbation." };
}

// Approval — "manage" only (owner / super admin). Creates the PostTarget rows
// in one transaction: this is the moment a post becomes publishable, and the
// selection is RE-DERIVED server-side so a forged key can't smuggle a target.
export async function approvePost(
  postId: string,
  _prev: PublishState,
  formData: FormData,
): Promise<PublishState> {
  const actor = await getActor();
  if (!actor) return { ok: false, message: "Non authentifié." };
  const found = await getPostClientFor(actor, postId, "manage");
  if (!found)
    return { ok: false, message: "Seul le propriétaire du client peut approuver." };
  const { post } = found;
  if (post.status !== "PENDING_APPROVAL" && post.status !== "DRAFT")
    return { ok: false, message: "Ce post n'est pas en attente d'approbation." };

  const wanted = keysOf(post);
  if (wanted.length === 0)
    return { ok: false, message: "Aucune destination sélectionnée sur ce post." };

  const candidates = await listPublishCandidates(post.clientId);
  const byKey = new Map(candidates.map((c) => [c.key, c]));
  const chosen = wanted.map((k) => byKey.get(k)).filter((c) => !!c);
  if (chosen.length !== wanted.length)
    return {
      ok: false,
      message:
        "Une destination sélectionnée n'existe plus (compte déconnecté ?). Rouvre le post et revalide les destinations.",
    };

  const err = validateAgainstNetworks(
    post.body,
    mediaOf(post).length,
    chosen.map((c) => c.provider),
  );
  if (err) return { ok: false, message: err };

  const note = String(formData.get("note") ?? "").trim() || null;
  const when = post.scheduledAt ?? new Date();

  try {
    await db.$transaction([
    db.postTarget.deleteMany({ where: { postId } }),
    db.postTarget.createMany({
      data: chosen.map((c) => ({
        postId,
        provider: c.provider,
        externalId: c.externalId,
        label: c.label,
        connectionId: c.connectionId,
        status: "scheduled",
        nextAttemptAt: when,
      })),
    }),
    db.post.update({
      where: { id: postId },
      data: {
        status: "SCHEDULED",
        approvedById: actor.id,
        approvedAt: new Date(),
        reviewNote: note,
      },
    }),
    ]);
  } catch {
    return {
      ok: false,
      message: "Impossible de programmer ces destinations (doublon ou compte retiré). Rouvre le post et revalide-les.",
    };
  }

  revalidatePath("/publishing");
  revalidatePath(`/publishing/${postId}`);
  return {
    ok: true,
    message: post.scheduledAt
      ? "Approuvé — publication planifiée."
      : "Approuvé — publication dans la minute.",
  };
}

export async function rejectPost(
  postId: string,
  _prev: PublishState,
  formData: FormData,
): Promise<PublishState> {
  const actor = await getActor();
  if (!actor) return { ok: false, message: "Non authentifié." };
  const found = await getPostClientFor(actor, postId, "manage");
  if (!found)
    return { ok: false, message: "Seul le propriétaire du client peut refuser." };
  if (found.post.status !== "PENDING_APPROVAL")
    return { ok: false, message: "Ce post n'est pas en attente d'approbation." };

  const note = String(formData.get("note") ?? "").trim();
  if (!note)
    return { ok: false, message: "Explique le refus — l'auteur doit savoir quoi corriger." };

  await db.post.update({
    where: { id: postId },
    data: { status: "DRAFT", submittedAt: null, reviewNote: note },
  });
  revalidatePath("/publishing");
  revalidatePath(`/publishing/${postId}`);
  return { ok: true, message: "Refusé — retourné en brouillon avec ta note." };
}

// Cancellation is only possible while every target is still unclaimed: once a
// network call may have gone out, cancelling would lie about the outcome.
export async function cancelPost(postId: string): Promise<PublishState> {
  const actor = await getActor();
  if (!actor) return { ok: false, message: "Non authentifié." };
  const found = await getPostClientFor(actor, postId, "edit");
  if (!found) return { ok: false, message: "Accès refusé." };
  const { post } = found;
  if (post.status !== "SCHEDULED")
    return { ok: false, message: "Seul un post planifié peut être annulé." };
  // Re-check inside a transaction: the snapshot above is one round trip old,
  // and the scheduler may have claimed a target in that gap. If anything was
  // claimed, roll back rather than report a cancellation that didn't happen.
  try {
    await db.$transaction(async (tx) => {
      const live = await tx.postTarget.findMany({ where: { postId }, select: { status: true } });
      const done = await tx.postTarget.updateMany({
        where: { postId, status: "scheduled" },
        data: { status: "cancelled" },
      });
      if (done.count !== live.length) throw new Error("claimed");
      await tx.post.update({ where: { id: postId }, data: { status: "CANCELLED" } });
    });
  } catch {
    return { ok: false, message: "Publication déjà en cours — impossible d'annuler." };
  }
  revalidatePath("/publishing");
  revalidatePath(`/publishing/${postId}`);
  return { ok: true, message: "Publication annulée." };
}

export async function retryPostTarget(targetId: string): Promise<PublishState> {
  const actor = await getActor();
  if (!actor) return { ok: false, message: "Non authentifié." };
  const target = await db.postTarget.findUnique({
    where: { id: targetId },
    include: { connection: true },
  });
  if (!target) return { ok: false, message: "Cible introuvable." };
  const found = await getPostClientFor(actor, target.postId, "edit");
  if (!found) return { ok: false, message: "Accès refusé." };
  if (target.status !== "failed")
    return { ok: false, message: "Seule une cible en échec peut être relancée." };
  if (target.connection?.status === "error")
    return {
      ok: false,
      message: "Reconnecte d'abord le compte dans Sources de données.",
    };

  await db.$transaction([
    db.postTarget.update({
      where: { id: targetId },
      data: { status: "scheduled", attempts: 0, nextAttemptAt: new Date(), lastError: null, lockedAt: null },
    }),
    // Never assert SCHEDULED over a post whose sibling target is mid-flight —
    // that would re-open the delete button while a network call is running.
    db.post.updateMany({
      where: { id: target.postId, status: { not: "PUBLISHING" } },
      data: { status: "SCHEDULED" },
    }),
  ]);
  revalidatePath(`/publishing/${target.postId}`);
  return { ok: true, message: "Relancé — nouvel essai dans la minute." };
}

export async function deletePost(postId: string): Promise<PublishState> {
  const actor = await getActor();
  if (!actor) return { ok: false, message: "Non authentifié." };
  const found = await getPostClientFor(actor, postId, "edit");
  if (!found) return { ok: false, message: "Accès refusé." };
  // The targets are the authority, not the post's cached status: deleting
  // cascades PostTarget rows, so a claimed target must never be deletable.
  if (found.post.targets.some((t) => t.status === "running" || t.lockedAt))
    return { ok: false, message: "Publication en cours — attends la fin avant de supprimer." };

  await db.post.delete({ where: { id: postId } });
  revalidatePath("/publishing");
  redirect("/publishing");
}
