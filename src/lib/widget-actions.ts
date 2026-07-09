"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { WIDGET_BLUEPRINTS } from "@/lib/metrics-catalog";
import { sanitizeReportHtml } from "@/lib/sanitize";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthenticated");
  return session.user.id;
}

// Ownership guards (cloisonnement): a user can only touch widgets/reports that
// belong to a client they own.
async function ownedReport(reportId: string, userId: string) {
  const report = await db.report.findUnique({
    where: { id: reportId },
    include: { client: true },
  });
  return report && report.client.ownerId === userId ? report : null;
}

async function ownedWidget(widgetId: string, userId: string) {
  const widget = await db.widget.findUnique({
    where: { id: widgetId },
    include: { report: { include: { client: true } } },
  });
  return widget && widget.report.client.ownerId === userId ? widget : null;
}

export async function addWidget(reportId: string, clientId: string, blueprintKey: string) {
  const userId = await requireUserId();
  if (!(await ownedReport(reportId, userId))) return;
  const bp = WIDGET_BLUEPRINTS[blueprintKey];
  if (!bp) return;

  // position = max + 1 (NOT count — count collides after a delete leaves a gap).
  const last = await db.widget.findFirst({
    where: { reportId },
    orderBy: { position: "desc" },
  });
  await db.widget.create({
    data: {
      reportId,
      type: bp.type,
      title: bp.title ?? null,
      sourceKey: bp.sourceKey ?? null,
      span: bp.span,
      position: (last?.position ?? -1) + 1,
      config: { ...bp.config, subtitle: bp.subtitle },
    },
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteWidget(widgetId: string, clientId: string) {
  const userId = await requireUserId();
  if (!(await ownedWidget(widgetId, userId))) return;
  await db.widget.delete({ where: { id: widgetId } });
  revalidatePath(`/clients/${clientId}`);
}

export async function setWidgetSpan(widgetId: string, clientId: string, span: number) {
  const userId = await requireUserId();
  if (!(await ownedWidget(widgetId, userId))) return;
  const safe = [3, 4, 6, 8, 12].includes(span) ? span : 12;
  await db.widget.update({ where: { id: widgetId }, data: { span: safe } });
  revalidatePath(`/clients/${clientId}`);
}

export async function moveWidget(widgetId: string, clientId: string, dir: "up" | "down") {
  const userId = await requireUserId();
  const widget = await ownedWidget(widgetId, userId);
  if (!widget) return;

  const neighbor = await db.widget.findFirst({
    where: {
      reportId: widget.reportId,
      position: dir === "up" ? { lt: widget.position } : { gt: widget.position },
    },
    orderBy: { position: dir === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return;

  await db.$transaction([
    db.widget.update({ where: { id: widget.id }, data: { position: neighbor.position } }),
    db.widget.update({ where: { id: neighbor.id }, data: { position: widget.position } }),
  ]);
  revalidatePath(`/clients/${clientId}`);
}

export async function updateWidget(
  widgetId: string,
  clientId: string,
  data: { title?: string | null; config?: Record<string, unknown> },
) {
  const userId = await requireUserId();
  if (!(await ownedWidget(widgetId, userId))) return;

  // XSS boundary: widget HTML is rendered raw (incl. on public share pages) —
  // sanitize on write so the stored value is always safe.
  const config = data.config ? { ...data.config } : undefined;
  if (config && typeof config.html === "string") {
    config.html = sanitizeReportHtml(config.html);
  }

  await db.widget.update({
    where: { id: widgetId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(config !== undefined ? { config: config as object } : {}),
    },
  });
  revalidatePath(`/clients/${clientId}`);
}
