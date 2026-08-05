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

  // Service account: the user pastes the WHOLE JSON key file — asking them to
  // split it by hand was a needless trap. Extract the two fields we need.
  if (def.credType === "service_account") {
    const trimmed = token.trim();
    if (trimmed.startsWith("{")) {
      try {
        const key = JSON.parse(trimmed) as { client_email?: string; private_key?: string };
        if (!key.client_email || !key.private_key)
          return {
            ok: false,
            message:
              "Ce JSON ne contient pas « client_email » et « private_key ». Vérifie que c'est bien la clé d'un compte de service.",
          };
        meta.client_email = key.client_email;
        token = key.private_key;
      } catch {
        return {
          ok: false,
          message: "JSON illisible — colle le contenu complet du fichier téléchargé, accolades comprises.",
        };
      }
    } else if (!meta.client_email) {
      return {
        ok: false,
        message: "Colle le contenu complet du fichier JSON (il commence par « { »).",
      };
    }

    // Validate before saving: a credential that looks accepted but returns
    // nothing is the failure mode that costs days to notice.
    const probe = await probeServiceAccount(
      meta.client_email ?? "",
      token,
      provider === "gsc" ? GSC_SCOPE : GA4_SCOPE,
    );
    if (!probe.ok) return { ok: false, message: probe.message };
  }

  // Meta / LinkedIn pasted tokens: verify them NOW and capture the identity,
  // so the card can never say "connecté" over a token that publishes nowhere.
  if (provider === "meta") {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name&access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(10_000) },
    ).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as {
      data?: { id: string; name: string }[];
      error?: { message?: string };
    };
    if (!res?.ok)
      return {
        ok: false,
        message: `Meta a refusé ce jeton${data?.error?.message ? ` : ${data.error.message}` : "."}`,
      };
    if (!data.data?.length)
      return {
        ok: false,
        message:
          "Jeton valide, mais il ne donne accès à aucune Page. Ajoute la permission pages_show_list et régénère-le.",
      };
    meta.pages = String(data.data.length);
  }

  if (provider === "linkedin") {
    const res = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    const who = (await res?.json().catch(() => ({}))) as { sub?: string; name?: string };
    if (!res?.ok || !who.sub)
      return {
        ok: false,
        message:
          "LinkedIn a refusé ce jeton. Vérifie qu'il inclut bien les permissions openid, profile et w_member_social.",
      };
    // The author URN is required to publish — capture it now or never.
    meta.memberUrn = `urn:li:person:${who.sub}`;
    if (who.name) meta.accountLabel = who.name;
  }

  const accountLabel = meta.accountLabel ?? null;
  delete meta.accountLabel;

  await db.connection.upsert({
    where: { ownerId_provider: { ownerId: session.user.id, provider } },
    update: {
      accessToken: encrypt(token),
      meta,
      ...(accountLabel ? { accountLabel } : {}),
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
      ...(accountLabel ? { accountLabel } : {}),
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
