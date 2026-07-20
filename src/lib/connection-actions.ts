"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getConnector } from "@/lib/connectors";
import { encrypt } from "@/lib/crypto";
import { GA4_SCOPE, GSC_SCOPE, probeServiceAccount } from "@/lib/providers/google-sa";

export type ConnectState = { ok: boolean; message: string } | null;

// Pasted credentials. Not limited to authType "token": an OAuth connector may
// ALSO accept a pasted credential (a Google service-account key), which is the
// only way to connect without registering a developer app.
export async function saveTokenConnection(
  provider: string,
  _prev: ConnectState,
  formData: FormData,
): Promise<ConnectState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Non authentifié." };
  const def = getConnector(provider);
  if (!def?.tokenFields?.length)
    return { ok: false, message: "Ce connecteur n'accepte pas d'identifiants collés." };

  const meta: Record<string, string> = {};
  let token = "";
  for (const f of def.tokenFields) {
    const value = String(formData.get(f.name) ?? "").trim();
    if (f.name === "token") token = value;
    else if (value) meta[f.name] = value;
  }
  if (!token) return { ok: false, message: "Le champ principal est vide." };

  // Record WHAT was pasted so token resolution knows how to use it.
  if (def.credType) meta.credType = def.credType;

  // Validate before saving: a credential that looks accepted but returns
  // nothing is the failure mode that costs days to notice.
  if (def.credType === "service_account") {
    const probe = await probeServiceAccount(
      meta.client_email ?? "",
      token,
      provider === "gsc" ? GSC_SCOPE : GA4_SCOPE,
    );
    if (!probe.ok) return { ok: false, message: probe.message };
  }

  await db.connection.upsert({
    where: { ownerId_provider: { ownerId: session.user.id, provider } },
    update: {
      accessToken: encrypt(token),
      meta,
      status: "connected",
      authType: "token",
      // Clear any OAuth leftovers: a stale expiry would send the refresh path
      // after a pasted credential and throw it away on first use.
      refreshToken: null,
      expiresAt: null,
    },
    create: {
      ownerId: session.user.id,
      provider,
      authType: "token",
      accessToken: encrypt(token),
      meta,
      status: "connected",
    },
  });
  revalidatePath("/sources");
  return { ok: true, message: `${def.label} connecté.` };
}

export async function disconnectProvider(provider: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  await db.connection.deleteMany({ where: { ownerId: session.user.id, provider } });
  revalidatePath("/sources");
}
