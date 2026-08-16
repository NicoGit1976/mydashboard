import { db } from "@/lib/db";
import { DEFAULT_REPORT_LAYOUT, WIDGET_BLUEPRINTS } from "@/lib/metrics-catalog";
import {
  buildTemplateLayout,
  getTemplate,
  suggestTemplate,
  type PlannedWidget,
} from "@/lib/report-templates";

// Which providers are attributed to this client — the set a template gets
// filtered against, so a new report only lays down blocks that can turn live.
export async function clientProviders(clientId: string): Promise<string[]> {
  const rows = await db.clientSource.findMany({
    where: { clientId },
    select: { provider: true },
  });
  return [...new Set(rows.map((r) => r.provider))];
}

function fallbackLayout(): PlannedWidget[] {
  return DEFAULT_REPORT_LAYOUT.map((key) => {
    const bp = WIDGET_BLUEPRINTS[key];
    return {
      type: bp.type,
      title: bp.title ?? null,
      sourceKey: bp.sourceKey ?? null,
      span: bp.span,
      config: { ...bp.config, subtitle: bp.subtitle },
    };
  });
}

// Each client has one report. Lazily create it the first time it's viewed, with
// the template that matches the sources actually attributed to that client — a
// client with only Search Console shouldn't open onto empty session counters.
export async function getOrCreateReport(clientId: string) {
  const existing = await db.report.findFirst({
    where: { clientId },
    // Deterministic: always return the oldest report for a client, so if a
    // render race ever created a duplicate, everyone lands on the same one.
    orderBy: { createdAt: "asc" },
    include: { widgets: { orderBy: { position: "asc" } } },
  });
  if (existing) return existing;

  const providers = await clientProviders(clientId);
  const template = getTemplate(suggestTemplate(providers));
  const planned =
    template && template.sections.length
      ? buildTemplateLayout(template, providers)
      : [];
  // Nothing attributed yet: fall back to the generic web layout so the report
  // isn't blank, rather than guessing at sources the client doesn't have.
  const widgets = planned.length ? planned : fallbackLayout();

  return db.report.create({
    data: {
      clientId,
      title: template?.title ?? "Rapport de performance",
      periodDays: 28,
      periodLabel: "28 derniers jours",
      compareLabel: "vs 28 jours précédents",
      widgets: {
        create: widgets.map((w, i) => ({
          type: w.type,
          title: w.title,
          sourceKey: w.sourceKey,
          span: w.span,
          position: i,
          config: w.config as object,
        })),
      },
    },
    include: { widgets: { orderBy: { position: "asc" } } },
  });
}
