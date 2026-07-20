"use server";

import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getActor, getReportClientFor } from "@/lib/access";

export type ShareState = { ok: boolean; token?: string; error?: string };

async function ownedReport(reportId: string, _userId: string) {
  const actor = await getActor();
  if (!actor) return null;
  const found = await getReportClientFor(actor, reportId, "edit");
  return found ? found.report : null;
}

// Returns the report's share token, creating it on first call (idempotent —
// re-sharing the same report reuses the same URL).
export async function getOrCreateShareLink(reportId: string): Promise<ShareState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non authentifié." };
  if (!(await ownedReport(reportId, session.user.id)))
    return { ok: false, error: "Accès refusé." };

  const existing = await db.shareLink.findFirst({ where: { reportId } });
  if (existing) return { ok: true, token: existing.token };

  const link = await db.shareLink.create({
    data: { reportId, token: randomBytes(16).toString("hex") },
  });
  return { ok: true, token: link.token };
}

// Revokes every share link of the report — the public URL dies immediately.
export async function revokeShareLink(reportId: string): Promise<ShareState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non authentifié." };
  if (!(await ownedReport(reportId, session.user.id)))
    return { ok: false, error: "Accès refusé." };

  await db.shareLink.deleteMany({ where: { reportId } });
  return { ok: true };
}
