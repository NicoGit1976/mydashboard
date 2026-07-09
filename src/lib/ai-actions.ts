"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getReportData, type ReportData } from "@/lib/report-data";
import { sanitizeReportHtml } from "@/lib/sanitize";

const TONE_PROMPTS: Record<string, string> = {
  problems:
    "Angle : mets l'accent sur les PROBLÈMES, baisses, risques et points de vigilance. Sois lucide et un peu critique, et propose 1 à 2 correctifs concrets.",
  positive:
    "Angle : mets l'accent sur les POINTS POSITIFS, les progrès et les réussites. Ton valorisant et commercial, sans masquer la réalité.",
  neutral:
    "Angle : synthèse FACTUELLE et équilibrée — ne dramatise pas, ne survends pas.",
};

// Builds the fact sheet from the SAME data bundle the report renders (live
// values where sources are connected, mock otherwise) — the AI summarizes what
// the reader actually sees.
function buildReportFacts(
  client: { name: string; sector: string | null },
  report: { periodLabel: string | null; compareLabel: string | null },
  widgets: { type: string; config: unknown }[],
  data: ReportData,
): string {
  const lines: string[] = [
    `Client : ${client.name}${client.sector ? ` (${client.sector})` : ""}`,
    `Période : ${report.periodLabel ?? "—"} ${report.compareLabel ?? ""}`.trim(),
    data.liveSources.length
      ? `Données réelles (sources : ${data.liveSources.join(", ")})`
      : "Données de démonstration",
  ];

  for (const w of widgets) {
    const cfg = (w.config ?? {}) as Record<string, string>;
    if (w.type === "kpi") {
      const m = data.kpis[cfg.metric];
      if (m) {
        const trend =
          typeof m.delta === "number"
            ? ` (${m.delta >= 0 ? "+" : ""}${m.delta} % vs période précédente)`
            : "";
        lines.push(`KPI ${m.label} : ${m.value}${trend}`);
      }
    } else if (w.type === "line" && cfg.dataset === "traffic") {
      const t = data.datasets.traffic;
      lines.push(
        `Trafic web (sessions/jour) : de ${t.sessions[0]} à ${t.sessions[t.sessions.length - 1]} sur la période`,
      );
    } else if (w.type === "donut" && cfg.dataset === "channels") {
      const total = data.datasets.channels.reduce((s, c) => s + c.value, 0) || 1;
      lines.push(
        "Canaux d'acquisition (sessions) : " +
          data.datasets.channels
            .map((c) => `${c.name} ${c.value} (${Math.round((c.value / total) * 100)} %)`)
            .join(", "),
      );
    } else if (w.type === "bar" && cfg.dataset === "networks") {
      lines.push(
        "Engagement par réseau : " +
          data.datasets.networks.map((n) => `${n.name} ${n.value}`).join(", "),
      );
    } else if (w.type === "table" && cfg.dataset === "topPages") {
      lines.push(
        "Top pages (vues) : " +
          data.datasets.topPages.map((p) => `${p.page} ${p.views}`).join(", "),
      );
    }
  }
  return lines.join("\n");
}

export async function generateSummary(
  widgetId: string,
  clientId: string,
  tone: string,
): Promise<{ ok: boolean; html?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non authentifié." };

  const widget = await db.widget.findUnique({
    where: { id: widgetId },
    include: { report: { include: { client: true } } },
  });
  if (!widget || widget.report.client.ownerId !== session.user.id)
    return { ok: false, error: "Accès refusé." };

  if (!process.env.ANTHROPIC_API_KEY)
    return {
      ok: false,
      error:
        "Clé API Anthropic manquante. Ajoute ANTHROPIC_API_KEY dans .env (console.anthropic.com) puis relance le serveur.",
    };

  const report = await db.report.findUnique({
    where: { id: widget.reportId },
    include: { client: true, widgets: { orderBy: { position: "asc" } } },
  });
  if (!report) return { ok: false, error: "Rapport introuvable." };

  const data = await getReportData(report.client);
  const facts = buildReportFacts(report.client, report, report.widgets, data);
  const toneInstr = TONE_PROMPTS[tone] ?? TONE_PROMPTS.neutral;

  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1500,
      system:
        `Tu es analyste reporting pour une agence. Tu rédiges une synthèse en français à partir des chiffres d'un rapport client. ${toneInstr}\n` +
        "Réponds UNIQUEMENT en HTML simple : <h3>, <p>, <ul><li>, <strong>. Pas de <html>/<body>, pas de markdown, pas de bloc de code. 120 à 180 mots.",
      messages: [
        {
          role: "user",
          content: `Voici les données du rapport :\n\n${facts}\n\nRédige la synthèse.`,
        },
      ],
    });

    const textBlock = msg.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );
    const html = sanitizeReportHtml(
      (textBlock?.text ?? "").replace(/```html?/gi, "").replace(/```/g, "").trim(),
    );
    if (!html) return { ok: false, error: "Réponse vide du modèle." };

    const newConfig = {
      ...((widget.config ?? {}) as Record<string, unknown>),
      tone,
      html,
    };
    await db.widget.update({ where: { id: widgetId }, data: { config: newConfig } });
    revalidatePath(`/clients/${clientId}`);
    return { ok: true, html };
  } catch (e) {
    const err = e instanceof Error ? e.message : "Erreur inconnue";
    return { ok: false, error: `Échec de la génération : ${err}` };
  }
}
