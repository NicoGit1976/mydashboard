"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActor, getClientFor } from "@/lib/access";
import { getConnector } from "@/lib/connectors";

// Publishable providers bind a client to a real account: choosing which page
// feeds the report — and receives posts — is an OWNER decision. Analytics-only
// providers stay at "edit" so an assignee can still wire up a Matomo site.
const OWNER_ONLY = new Set(["meta", "gmb", "linkedin", "x"]);

async function ownsClient(clientId: string, provider: string) {
  const actor = await getActor();
  if (!actor) return false;
  const level = OWNER_ONLY.has(provider) ? "manage" : "edit";
  return !!(await getClientFor(actor, clientId, level));
}

// Bind (or update) which external entity of a provider maps to this client.
// Empty externalId removes the binding.
export async function saveClientSource(
  clientId: string,
  provider: string,
  formData: FormData,
) {
  if (!(await ownsClient(clientId, provider))) return;
  if (!getConnector(provider)) return;

  const externalId = String(formData.get("externalId") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || null;

  if (!externalId) {
    await db.clientSource.deleteMany({ where: { clientId, provider } });
  } else {
    // Record WHICH connection this id belongs to: an external id is only
    // meaningful against the instance it came from.
    const client = await db.client.findUnique({ where: { id: clientId } });
    const conn = client
      ? await db.connection.findUnique({
          where: { ownerId_provider: { ownerId: client.ownerId, provider } },
        })
      : null;
    await db.clientSource.upsert({
      where: { clientId_provider: { clientId, provider } },
      update: { externalId, label, connectionId: conn?.id ?? null },
      create: { clientId, provider, externalId, label, connectionId: conn?.id ?? null },
    });
  }
  revalidatePath(`/clients/${clientId}/edit`);
}

export async function removeClientSource(clientId: string, provider: string) {
  if (!(await ownsClient(clientId, provider))) return;
  await db.clientSource.deleteMany({ where: { clientId, provider } });
  revalidatePath(`/clients/${clientId}/edit`);
}
