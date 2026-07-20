"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActor, getClientFor } from "@/lib/access";

// Inviting someone onto a client is what makes it visible to them. It is purely
// additive: `ownerId` is never rewritten, so revoking an invitation can never
// orphan a client.

export type AssignState = { ok: boolean; message: string } | null;

// Who the client's owner may invite. Never the owner themselves (they already
// have full rights), and a plain member can't invite anyone.
export async function listAssignableUsers(clientId: string) {
  const actor = await getActor();
  if (!actor) return [];
  const client = await getClientFor(actor, clientId, "manage");
  if (!client) return [];
  return db.user.findMany({
    where: { id: { not: client.ownerId } },
    select: { id: true, username: true, name: true, role: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function setClientAssignees(
  clientId: string,
  _prev: AssignState,
  formData: FormData,
): Promise<AssignState> {
  const actor = await getActor();
  if (!actor) return { ok: false, message: "Non authentifié." };
  // "manage": only the client's owner (or the super admin) decides who sees it.
  const client = await getClientFor(actor, clientId, "manage");
  if (!client)
    return { ok: false, message: "Seul le propriétaire du client peut gérer les accès." };

  const wanted = formData
    .getAll("userIds")
    .map((v) => String(v))
    .filter(Boolean);

  // The owner is implicit — never store an assignment for them.
  const ids = [...new Set(wanted)].filter((id) => id !== client.ownerId);

  // Reject ids that aren't real accounts rather than silently dropping them.
  const found = await db.user.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  if (found.length !== ids.length)
    return { ok: false, message: "Un des comptes sélectionnés n'existe plus." };

  await db.$transaction([
    db.clientAssignment.deleteMany({ where: { clientId, userId: { notIn: ids.length ? ids : ["_none_"] } } }),
    ...ids.map((userId) =>
      db.clientAssignment.upsert({
        where: { clientId_userId: { clientId, userId } },
        update: {},
        create: { clientId, userId },
      }),
    ),
  ]);

  revalidatePath(`/clients/${clientId}/edit`);
  revalidatePath("/clients");
  return {
    ok: true,
    message: ids.length
      ? `Accès mis à jour — ${ids.length} membre(s) peuvent travailler sur ce client.`
      : "Accès mis à jour — ce client est de nouveau privé.",
  };
}
