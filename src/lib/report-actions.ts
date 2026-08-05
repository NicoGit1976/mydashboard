"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActor, getReportClientFor } from "@/lib/access";

// Edits the report's meta (title / period / compare labels) — ownership-guarded.
export async function updateReportMeta(
  reportId: string,
  clientId: string,
  formData: FormData,
) {
  const actor = await getActor();
  if (!actor) return;
  if (!(await getReportClientFor(actor, reportId, "edit"))) return;

  const title = String(formData.get("title") ?? "").trim() || "Rapport de performance";
  // The period drives the actual API queries — validate it rather than trusting
  // whatever the form posts.
  const rawDays = Number(String(formData.get("periodDays") ?? "28"));
  const periodDays = [0, 7, 28, 90, 180, 365].includes(rawDays) ? rawDays : 28;
  const parseDate = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const d = new Date(`${s}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  let periodStart = parseDate(formData.get("periodStart"));
  let periodEnd = parseDate(formData.get("periodEnd"));
  // The dropdown is the single source of truth: custom dates apply ONLY when
  // "Dates précises…" (0) is chosen. Otherwise leftover values in those fields
  // silently overrode the preset — you picked "6 mois" and got something else.
  if (periodDays !== 0 || !periodStart || !periodEnd || periodStart > periodEnd) {
    periodStart = null;
    periodEnd = null;
  }
  const periodLabel = String(formData.get("periodLabel") ?? "").trim() || null;
  const compareLabel = String(formData.get("compareLabel") ?? "").trim() || null;

  await db.report.update({
    where: { id: reportId },
    data: { title, periodLabel, compareLabel, periodDays, periodStart, periodEnd },
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/edit`);
}
