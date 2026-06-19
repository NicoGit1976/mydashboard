"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getConnector } from "@/lib/connectors";

async function ownsClient(clientId: string) {
  const session = await auth();
  if (!session?.user?.id) return false;
  const client = await db.client.findUnique({ where: { id: clientId } });
  return !!client && client.ownerId === session.user.id;
}

// Bind (or update) which external entity of a provider maps to this client.
// Empty externalId removes the binding.
export async function saveClientSource(
  clientId: string,
  provider: string,
  formData: FormData,
) {
  if (!(await ownsClient(clientId))) return;
  if (!getConnector(provider)) return;

  const externalId = String(formData.get("externalId") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || null;

  if (!externalId) {
    await db.clientSource.deleteMany({ where: { clientId, provider } });
  } else {
    await db.clientSource.upsert({
      where: { clientId_provider: { clientId, provider } },
      update: { externalId, label },
      create: { clientId, provider, externalId, label },
    });
  }
  revalidatePath(`/clients/${clientId}/edit`);
}

export async function removeClientSource(clientId: string, provider: string) {
  if (!(await ownsClient(clientId))) return;
  await db.clientSource.deleteMany({ where: { clientId, provider } });
  revalidatePath(`/clients/${clientId}/edit`);
}
