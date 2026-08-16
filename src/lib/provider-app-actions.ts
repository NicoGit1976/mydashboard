"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { encrypt } from "@/lib/crypto";
import { getConnector } from "@/lib/connectors";

type Result = { ok: boolean; error?: string };

// Server actions are public endpoints: every argument is whatever the client
// sent, including nothing at all.
function badStr(v: unknown, max: number): boolean {
  return typeof v !== "string" || v.trim().length === 0 || v.length > max;
}

/**
 * Registers (or replaces) the caller's own OAuth application for a provider.
 * The secret is encrypted at rest and never read back to the browser — the UI
 * only ever learns that an app exists and what its client id is.
 */
export async function saveProviderApp(formData: FormData): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non authentifié." };

  const provider = String(formData.get("provider") ?? "");
  const clientId = String(formData.get("clientId") ?? "").trim();
  const clientSecret = String(formData.get("clientSecret") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim().slice(0, 120) || null;

  const def = getConnector(provider);
  if (!def?.oauth)
    return { ok: false, error: "Ce connecteur n'utilise pas d'application OAuth." };
  if (badStr(clientId, 256)) return { ok: false, error: "Identifiant client manquant." };

  // The form says "leave empty to keep the current secret", so honour it: the
  // secret is only required when there is nothing stored to keep. Demanding it
  // on every edit made the label and client id impossible to correct without
  // fetching the secret again from the provider.
  const existing = await db.providerApp.findUnique({
    where: { ownerId_provider: { ownerId: session.user.id, provider } },
    select: { id: true },
  });
  if (!clientSecret && !existing) return { ok: false, error: "Secret client manquant." };
  if (clientSecret && clientSecret.length > 512)
    return { ok: false, error: "Secret client invalide." };

  await db.providerApp.upsert({
    where: { ownerId_provider: { ownerId: session.user.id, provider } },
    update: { clientId, label, ...(clientSecret ? { clientSecretEnc: encrypt(clientSecret) } : {}) },
    create: {
      ownerId: session.user.id,
      provider,
      clientId,
      clientSecretEnc: encrypt(clientSecret),
      label,
    },
  });

  revalidatePath("/sources");
  return { ok: true };
}

/**
 * Forgets the caller's application. Any existing Connection is left in place —
 * wiping a live connection is not what "remove my app registration" means — but
 * be clear about what that buys: the stored access token keeps working until it
 * expires, and then CANNOT be refreshed, because the application that minted it
 * is gone. The connection will flip to "error" at that point and has to be
 * remade against whichever application is registered then.
 */
export async function deleteProviderApp(provider: string): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non authentifié." };
  if (badStr(provider, 64)) return { ok: false, error: "Connecteur inconnu." };

  await db.providerApp.deleteMany({
    where: { ownerId: session.user.id, provider },
  });

  revalidatePath("/sources");
  return { ok: true };
}
