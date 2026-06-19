"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getConnector } from "@/lib/connectors";
import { encrypt } from "@/lib/crypto";

// Token-based providers (Matomo): save URL + token, encrypted at rest.
export async function saveTokenConnection(provider: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;
  const def = getConnector(provider);
  if (!def || def.authType !== "token") return;

  const meta: Record<string, string> = {};
  let token = "";
  for (const f of def.tokenFields ?? []) {
    const value = String(formData.get(f.name) ?? "").trim();
    if (f.name === "token") token = value;
    else meta[f.name] = value;
  }
  if (!token) return;

  await db.connection.upsert({
    where: { ownerId_provider: { ownerId: session.user.id, provider } },
    update: { accessToken: encrypt(token), meta, status: "connected", authType: "token" },
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
}

export async function disconnectProvider(provider: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  await db.connection.deleteMany({ where: { ownerId: session.user.id, provider } });
  revalidatePath("/sources");
}
