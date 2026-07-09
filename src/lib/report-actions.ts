"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Edits the report's meta (title / period / compare labels) — ownership-guarded.
export async function updateReportMeta(
  reportId: string,
  clientId: string,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) return;

  const report = await db.report.findUnique({
    where: { id: reportId },
    include: { client: true },
  });
  if (!report || report.client.ownerId !== session.user.id) return;

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
