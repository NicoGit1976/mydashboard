"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActor, getClientFor } from "@/lib/access";
import { getConnector } from "@/lib/connectors";

async function ownsClient(clientId: string) {
  const actor = await getActor();
  if (!actor) return false;
  return !!(await getClientFor(actor, clientId, "edit"));
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
