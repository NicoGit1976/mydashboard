"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

async function ownsClient(clientId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthenticated");
  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client || client.ownerId !== session.user.id) return null;
  return client;
}

async function saveLogo(file: File) {
  const ext = (file.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const fileName = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${fileName}`;
}

export async function updateClient(clientId: string, formData: FormData) {
  if (!(await ownsClient(clientId))) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const sector = String(formData.get("sector") ?? "").trim() || null;
  const brandColor = String(formData.get("brandColor") ?? "#4f46e5");

  let logoUrl: string | undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) logoUrl = await saveLogo(logo);

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
