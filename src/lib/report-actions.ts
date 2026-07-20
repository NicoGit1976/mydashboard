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
  const periodLabel = String(formData.get("periodLabel") ?? "").trim() || null;
  const compareLabel = String(formData.get("compareLabel") ?? "").trim() || null;

  await db.report.update({
    where: { id: reportId },
    data: { title, periodLabel, compareLabel },
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/edit`);
}
