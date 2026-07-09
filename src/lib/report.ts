import { db } from "@/lib/db";
import { DEFAULT_REPORT_LAYOUT, WIDGET_BLUEPRINTS } from "@/lib/metrics-catalog";

// Each client has one report. Lazily create it (with the starter layout) the
// first time it's viewed, so seeded clients get populated too.
export async function getOrCreateReport(clientId: string) {
  const existing = await db.report.findFirst({
    where: { clientId },
    // Deterministic: always return the oldest report for a client, so if a
    // render race ever created a duplicate, everyone lands on the same one.
    orderBy: { createdAt: "asc" },
    include: { widgets: { orderBy: { position: "asc" } } },
  });
  if (existing) return existing;

  return db.report.create({
    data: {
      clientId,
      title: "Rapport de performance",
      // Matches what the connectors actually fetch (last 28 full days).
      periodLabel: "28 derniers jours",
      compareLabel: "vs 28 jours précédents",
      widgets: {
        create: DEFAULT_REPORT_LAYOUT.map((key, i) => {
          const bp = WIDGET_BLUEPRINTS[key];
          return {
            type: bp.type,
            title: bp.title ?? null,
            sourceKey: bp.sourceKey ?? null,
            span: bp.span,
            position: i,
            config: { ...bp.config, subtitle: bp.subtitle },
          };
        }),
      },
    },
    include: { widgets: { orderBy: { position: "asc" } } },
  });
}
