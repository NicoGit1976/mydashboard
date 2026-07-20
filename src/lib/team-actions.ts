"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { canManageUsers, getActor } from "@/lib/access";
import { normalizeEmail, validateUsername } from "@/lib/identity";

export type TeamState =
  | { ok: true; message: string; tempPassword?: string; login?: string }
  | { ok: false; message: string }
  | null;

// Account management belongs to the super admin only: admins run their own
// clients, they don't create or delete accounts. Role is re-read from the DB so
// a demotion takes effect immediately, not when the ~30-day token expires.
async function requireAdmin() {
  const actor = await getActor();
  if (!actor || !canManageUsers(actor)) return null;
  return actor;
}

export async function createUser(
  _prev: TeamState,
  formData: FormData,
): Promise<TeamState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Réservé aux administrateurs." };

  const checked = validateUsername(formData.get("username"));
  if (!checked.ok) return { ok: false, message: checked.message };
  const username = checked.value;
  // Email is now optional contact info, no longer the credential.
  const email = normalizeEmail(formData.get("email"));
  const rawEmail = String(formData.get("email") ?? "").trim();
  if (rawEmail && !email) return { ok: false, message: "Email invalide." };
  const name = String(formData.get("name") ?? "").trim() || null;
  const roleRaw = String(formData.get("role") ?? "");
  const role = roleRaw === "ADMIN" || roleRaw === "SUPER_ADMIN" ? roleRaw : "MEMBER";

  // Check both columns against both values: existing rows may still hold a
  // non-email login string in `email`.
  const clash = await db.user.findFirst({
    where: {
      OR: [
        { username },
        { email: username },
        ...(email ? [{ email }, { username: email }] : []),
      ],
    },
  });
  if (clash) return { ok: false, message: "Cet identifiant (ou cet email) est déjà pris." };

  const tempPassword = randomBytes(8).toString("hex");
  try {
    await db.user.create({
      data: {
        username,
        email,
        name,
        role,
        passwordHash: await bcrypt.hash(tempPassword, 10),
        mustChangePassword: true, // forced to choose their own on first login
      },
    });
  } catch {
    // The pre-check races; the unique index is the real authority.
    return { ok: false, message: "Cet identifiant (ou cet email) est déjà pris." };
  }

  revalidatePath("/team");
  return {
    ok: true,
    message: `Compte créé : ${username}.`,
    tempPassword,
    login: username,
  };
}

export async function resetUserPassword(userId: string): Promise<TeamState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Réservé aux administrateurs." };
  if (userId === admin.id)
    return { ok: false, message: "Change ton propre mot de passe dans Réglages." };

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, message: "Utilisateur introuvable." };

  const tempPassword = randomBytes(8).toString("hex");
  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash: await bcrypt.hash(tempPassword, 10),
      mustChangePassword: true,
    },
  });

  revalidatePath("/team");
  return {
    ok: true,
    message: `Mot de passe réinitialisé pour ${user.username ?? user.email}.`,
    tempPassword,
    login: user.username ?? user.email ?? undefined,
  };
}

export async function deleteUser(userId: string): Promise<TeamState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Réservé aux administrateurs." };
  if (userId === admin.id)
    return { ok: false, message: "Impossible de supprimer ton propre compte." };

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, message: "Utilisateur introuvable." };

  // Fail closed: deleting a user cascades to their clients, reports AND any
  // share link already sent to a customer. Never do that as a side effect.
  const owned = await db.client.count({ where: { ownerId: userId } });
  if (owned > 0)
    return {
      ok: false,
      message: `${owned} client(s) appartiennent à ce compte. Transfère-les ou supprime-les avant de supprimer le compte.`,
    };

  await db.user.delete({ where: { id: userId } });
  revalidatePath("/team");
  return { ok: true, message: `Compte ${user.username ?? user.email} supprimé.` };
}
