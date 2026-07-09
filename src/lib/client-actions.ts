"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { saveImageUpload } from "@/lib/uploads";

async function ownsClient(clientId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthenticated");
  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client || client.ownerId !== session.user.id) return null;
  return client;
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
  if (!(await ownsClient(clientId))) return;
  await db.client.delete({ where: { id: clientId } }); // cascades to reports + widgets
  revalidatePath("/clients");
  redirect("/clients");
}
