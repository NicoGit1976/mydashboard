"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { saveImageUpload } from "@/lib/uploads";
import { getActor, getClientFor, type Level } from "@/lib/access";

// Assignees may edit a client's content; only its owner (or a super admin) may
// delete it or change who can see it.
async function ownsClient(clientId: string, level: Level = "edit") {
  const actor = await getActor();
  if (!actor) throw new Error("unauthenticated");
  return getClientFor(actor, clientId, level);
}

export async function updateClient(clientId: string, formData: FormData) {
  if (!(await ownsClient(clientId))) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const sector = String(formData.get("sector") ?? "").trim() || null;
  const brandColor = String(formData.get("brandColor") ?? "#4f46e5");

  let logoUrl: string | undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0)
    logoUrl = (await saveImageUpload(logo)) ?? undefined;

  await db.client.update({
    where: { id: clientId },
    data: { name, sector, brandColor, ...(logoUrl ? { logoUrl } : {}) },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}

export async function deleteClient(clientId: string) {
  // "manage": an invited member can work on a client but never delete it.
  if (!(await ownsClient(clientId, "manage"))) return;
  await db.client.delete({ where: { id: clientId } }); // cascades to reports + widgets
  revalidatePath("/clients");
  redirect("/clients");
}
