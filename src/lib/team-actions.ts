"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export type TeamState =
  | { ok: true; message: string; tempPassword?: string; email?: string }
  | { ok: false; message: string }
  | null;

// All team actions are ADMIN-only (role lives in the JWT session).
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return null;
  return session.user;
}

export async function createUser(
  _prev: TeamState,
  formData: FormData,
): Promise<TeamState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Réservé aux administrateurs." };

  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const name = String(formData.get("name") ?? "").trim() || null;
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "MEMBER";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, message: "Email invalide." };
  if (await db.user.findUnique({ where: { email } }))
    return { ok: false, message: "Un compte existe déjà avec cet email." };

  const tempPassword = randomBytes(8).toString("hex");
  await db.user.create({
    data: {
      email,
      name,
      role,
      passwordHash: await bcrypt.hash(tempPassword, 10),
      mustChangePassword: true, // forced to choose their own on first login
    },
  });

  revalidatePath("/team");
  return {
    ok: true,
    message: `Compte créé pour ${email}.`,
    tempPassword,
    email,
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
    message: `Mot de passe réinitialisé pour ${user.email}.`,
    tempPassword,
    email: user.email,
  };
}

export async function deleteUser(userId: string): Promise<TeamState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Réservé aux administrateurs." };
  if (userId === admin.id)
    return { ok: false, message: "Impossible de supprimer ton propre compte." };

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, message: "Utilisateur introuvable." };

  await db.user.delete({ where: { id: userId } }); // cascades to clients/reports
  revalidatePath("/team");
  return { ok: true, message: `Compte ${user.email} supprimé.` };
}
