"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActor, getClientFor } from "@/lib/access";
import { getOrCreateReport, clientProviders } from "@/lib/report";
import { buildTemplateLayout, getTemplate } from "@/lib/report-templates";

// Server actions are public endpoints: the client controls every argument.
function badId(v: unknown): boolean {
  return typeof v !== "string" || v.length === 0 || v.length > 64;
}

type Result = { ok: boolean; error?: string; count?: number };

/**
 * Replaces a report's layout with a template's, filtered to the sources this
 * client actually has. Destructive — every existing widget goes, including any
 * hand-written commentary — so the UI must confirm before calling it.
 */
export async function applyTemplate(clientId: string, templateKey: string): Promise<Result> {
  if (badId(clientId) || badId(templateKey)) return { ok: false, error: "Accès refusé." };

  const actor = await getActor();
  const client = actor ? await getClientFor(actor, clientId, "edit") : null;
  if (!actor || !client) return { ok: false, error: "Accès refusé." };

  const template = getTemplate(templateKey);
  if (!template) return { ok: false, error: "Modèle inconnu." };

  const report = await getOrCreateReport(clientId);
  const providers = await clientProviders(clientId);
  const widgets = buildTemplateLayout(template, providers);

  if (templateKey !== "blank" && widgets.length === 0)
    return {
      ok: false,
      error:
        "Ce modèle n'a aucun bloc à afficher pour ce client : aucune de ses sources ne peut alimenter ces indicateurs.",
    };

  // One transaction: a half-applied template would leave the client's report
  // showing the remains of the old one interleaved with the new.
  await db.$transaction([
    db.widget.deleteMany({ where: { reportId: report.id } }),
    ...(widgets.length
      ? [
          db.widget.createMany({
            data: widgets.map((w, i) => ({
              reportId: report.id,
              type: w.type,
              title: w.title,
              sourceKey: w.sourceKey,
              span: w.span,
              position: i,
              config: w.config as object,
            })),
          }),
        ]
      : []),
    db.report.update({ where: { id: report.id }, data: { title: template.title } }),
  ]);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/edit`);
  return { ok: true, count: widgets.length };
}

/**
 * Copies another client's report layout onto this one. The layout only —
 * values are always re-fetched per client, so nothing of the source client's
 * data travels with it. Free-text and AI blocks DO carry over, which is the
 * point (a house style you wrote once), but it means the copy can contain
 * commentary about the other client: the UI says so.
 */
export async function cloneReportLayout(
  clientId: string,
  fromClientId: string,
): Promise<Result> {
  if (badId(clientId) || badId(fromClientId)) return { ok: false, error: "Accès refusé." };
  if (clientId === fromClientId) return { ok: false, error: "Choisis un autre client." };

  const actor = await getActor();
  if (!actor) return { ok: false, error: "Accès refusé." };
  // Both ends are checked: you may only copy FROM a client you can see, and
  // only ONTO a client you may edit.
  const target = await getClientFor(actor, clientId, "edit");
  const origin = await getClientFor(actor, fromClientId, "view");
  if (!target || !origin) return { ok: false, error: "Accès refusé." };

  const source = await db.report.findFirst({
    where: { clientId: fromClientId },
    orderBy: { createdAt: "asc" },
    include: { widgets: { orderBy: { position: "asc" } } },
  });
  if (!source || source.widgets.length === 0)
    return { ok: false, error: "Ce client n'a pas encore de rapport à copier." };

  const report = await getOrCreateReport(clientId);

  await db.$transaction([
    db.widget.deleteMany({ where: { reportId: report.id } }),
    db.widget.createMany({
      data: source.widgets.map((w, i) => ({
        reportId: report.id,
        type: w.type,
        title: w.title,
        sourceKey: w.sourceKey,
        span: w.span,
        position: i,
        config: (w.config ?? {}) as object,
      })),
    }),
    db.report.update({
      where: { id: report.id },
      data: {
        title: source.title,
        periodDays: source.periodDays,
        periodStart: source.periodStart,
        periodEnd: source.periodEnd,
        periodLabel: source.periodLabel,
        compareLabel: source.compareLabel,
      },
    }),
  ]);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/edit`);
  return { ok: true, count: source.widgets.length };
}
