"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { saveImageUpload } from "@/lib/uploads";

export type PasswordState = { ok: boolean; message: string } | null;

export async function changePassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Non authentifié." };

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 8)
    return { ok: false, message: "Le nouveau mot de passe doit faire au moins 8 caractères." };

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { ok: false, message: "Utilisateur introuvable." };

  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) return { ok: false, message: "Mot de passe actuel incorrect." };

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 10), mustChangePassword: false },
  });
  return { ok: true, message: "Mot de passe mis à jour ✅" };
}

// First-login forced change: no "current password" needed (the user just signed
// in with the temp one). Set the new password, clear the gate, then enter the app.
export async function completeOnboardingPassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Non authentifié." };

  // Only reachable while the account is genuinely mid-first-login. Otherwise a
  // borrowed/hijacked session could set a new password WITHOUT the current one
  // (account takeover) — established users must go through changePassword.
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.mustChangePassword) redirect("/overview");

  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next.length < 8)
    return { ok: false, message: "Le mot de passe doit faire au moins 8 caractères." };
  if (next !== confirm)
    return { ok: false, message: "Les deux mots de passe ne correspondent pas." };

  await db.user.update({
    where: { id: session.user.id },
    data: { passwordHash: await bcrypt.hash(next, 10), mustChangePassword: false },
  });
  redirect("/overview");
}

// Agency / white-label branding shown in the report footer (signature).
export async function updateAgency(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const agencyName = String(formData.get("agencyName") ?? "").trim() || null;
  const footerNote = String(formData.get("footerNote") ?? "").trim() || null;

  let agencyLogo: string | undefined;
  const logo = formData.get("agencyLogo");
  if (logo instanceof File && logo.size > 0)
    agencyLogo = (await saveImageUpload(logo)) ?? undefined;

  await db.user.update({
    where: { id: session.user.id },
    data: { agencyName, footerNote, ...(agencyLogo ? { agencyLogo } : {}) },
  });
  revalidatePath("/settings");
}
