// The grounding layer for AI analysis.
//
// Every number an insight can mention is computed HERE, in code, from the same
// bundle the report renders. The model receives a finished fact sheet and is
// asked to interpret it — never to do arithmetic, and never to reach for a
// figure that isn't on the sheet. That is what keeps a client-facing analysis
// from quietly inventing a percentage.

import type { ReportData } from "@/lib/report-data";
import { fmtDuration, fmtInt } from "@/lib/format";
import { fr } from "@/lib/date-range";

export type FactKpi = {
  id: string;
  label: string;
  formatted: string;
  delta: number | null; // % vs previous period; null = provider gave no trend
  invert: boolean; // lower is better (bounce rate, average position)
};

export type FactSheet = {
  client: string;
  sector: string | null;
  rangeLabel: string;
  start: string;
  end: string;
  prevStart: string;
  prevEnd: string;
  days: number;
  live: boolean;
  liveSources: string[];
  kpis: FactKpi[];
  traffic: {
    unit: string; // what `sessions` actually counts for THIS provider
    points: number;
    total: number;
    best: { label: string; value: number };
    worst: { label: string; value: number };
    trendPct: number | null; // 2nd half vs 1st half of the period
    edgesDropped: boolean; // partial week/month buckets excluded from the above
  } | null;
  channels: { name: string; value: number; share: number }[];
  channelsTruncated: boolean;
  topPages: { page: string; views: number; avgTime: number | null; bounce: number | null }[];
};

function formatValue(value: number, format?: string): string {
  if (format === "percent") return `${value} %`;
  if (format === "duration") return fmtDuration(value);
  return fmtInt(value);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Page paths and channel names come from whoever requested a URL on the
// client's site. They land in the same plain-text message as the analysis
// instructions, so strip anything that could read as markup or as a new
// instruction line, and cap the length.
function scrub(s: string): string {
  return s
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 120);
}

// Half-over-half is the honest way to state a trend inside a window: comparing
// the first and last point turns one noisy day into "the story of the period".
function halfOverHalf(series: number[]): number | null {
  if (series.length < 4) return null;
  const mid = Math.floor(series.length / 2);
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
  const first = avg(series.slice(0, mid));
  const second = avg(series.slice(mid));
  if (first === 0) return null;
  const pct = round1(((second - first) / first) * 100);
  return Number.isFinite(pct) ? pct : null;
}

export function buildFactSheet(
  client: { name: string; sector: string | null },
  data: ReportData,
): FactSheet {
  const liveSet = new Set(data.liveMetrics);
  const live = data.liveSources.length > 0;

  // A demo report must not contribute demo KPIs to an analysis that reads as
  // real. When nothing is live, the sheet stays empty and the caller refuses.
  const kpis: FactKpi[] = Object.entries(data.kpis)
    .filter(([id]) => live && liveSet.has(id))
    .map(([id, m]) => ({
      id,
      label: m.label,
      formatted: formatValue(m.value, m.format),
      delta: typeof m.delta === "number" ? round1(m.delta) : null,
      invert: Boolean(m.invert),
    }));

  const t = data.datasets.traffic;
  let traffic: FactSheet["traffic"] = null;
  if (data.liveDatasets.includes("traffic") && t.sessions.length > 0) {
    // Week/month buckets at both ends of the range cover only part of a
    // week/month. Their totals are structurally small — kept in the chart,
    // excluded from every statement about highs, lows and trend.
    const edgesDropped = Boolean(t.partialEdges) && t.sessions.length >= 5;
    const from = edgesDropped ? 1 : 0;
    const to = edgesDropped ? t.sessions.length - 1 : t.sessions.length;
    const values = t.sessions.slice(from, to);
    const labels = t.labels.slice(from, to);

    if (values.length > 0) {
      let bestIdx = 0;
      let worstIdx = 0;
      values.forEach((v, i) => {
        if (v > values[bestIdx]) bestIdx = i;
        if (v < values[worstIdx]) worstIdx = i;
      });
      traffic = {
        unit: t.unit?.primary ?? "sessions",
        points: values.length,
        total: values.reduce((s, v) => s + v, 0),
        best: { label: scrub(labels[bestIdx] ?? "—"), value: values[bestIdx] },
        worst: { label: scrub(labels[worstIdx] ?? "—"), value: values[worstIdx] },
        trendPct: halfOverHalf(values),
        edgesDropped,
      };
    }
  }

  const chTotal = data.datasets.channels.reduce((s, c) => s + c.value, 0);
  const channelsLive = data.liveDatasets.includes("channels") && chTotal > 0;
  const channels = channelsLive
    ? data.datasets.channels.map((c) => ({
        name: scrub(c.name),
        value: c.value,
        share: round1((c.value / chTotal) * 100),
      }))
    : [];

  const topPages = data.liveDatasets.includes("topPages")
    ? data.datasets.topPages.map((p) => ({ ...p, page: scrub(p.page) }))
    : [];

  return {
    client: scrub(client.name),
    sector: client.sector ? scrub(client.sector) : null,
    rangeLabel: data.range.label,
    start: data.range.start,
    end: data.range.end,
    prevStart: data.range.prevStart,
    prevEnd: data.range.prevEnd,
    days: data.range.days,
    live,
    liveSources: data.liveSources,
    kpis,
    traffic,
    channels,
    channelsTruncated: channelsLive && data.channelsTruncated,
    topPages,
  };
}

// True when there is genuinely nothing to analyse — no live KPI, no live
// dataset. Callers refuse rather than narrate demo values.
export function isEmpty(sheet: FactSheet): boolean {
  return (
    sheet.kpis.length === 0 &&
    !sheet.traffic &&
    sheet.channels.length === 0 &&
    sheet.topPages.length === 0
  );
}

const SOURCE_LABEL: Record<string, string> = {
  ga4: "Google Analytics 4",
  gsc: "Google Search Console",
  matomo: "Matomo",
  meta: "Facebook / Instagram",
  linkedin: "LinkedIn",
  shortlink: "liens courts (mesure interne)",
};

// Compact, unambiguous serialization. Deltas carry their direction in words so
// the model can't misread a negative on an inverted metric (a falling bounce
// rate is good news).
export function factsToText(sheet: FactSheet): string {
  const lines: string[] = [
    `Client : ${sheet.client}${sheet.sector ? ` — secteur : ${sheet.sector}` : ""}`,
    `Période analysée : ${sheet.rangeLabel}, du ${fr(sheet.start)} au ${fr(sheet.end)} (${sheet.days} jours).`,
    `Période de comparaison : du ${fr(sheet.prevStart)} au ${fr(sheet.prevEnd)} (même durée).`,
    `Sources connectées : ${sheet.liveSources.map((s) => SOURCE_LABEL[s] ?? s).join(", ") || "aucune"}.`,
    "",
  ];

  if (sheet.kpis.length) {
    lines.push("INDICATEURS (valeur sur la période, évolution vs période de comparaison) :");
    for (const k of sheet.kpis) {
      let trend = "évolution non fournie par la source";
      if (k.delta !== null) {
        const dir = k.delta > 0 ? "hausse" : k.delta < 0 ? "baisse" : "stable";
        const good = k.delta === 0 ? "neutre" : (k.delta > 0) !== k.invert ? "favorable" : "défavorable";
        trend = `${dir} de ${Math.abs(k.delta)} % — ${good}`;
      }
      lines.push(`- ${k.label} : ${k.formatted} (${trend})`);
    }
    lines.push("");
  }

  if (sheet.traffic) {
    const tr =
      sheet.traffic.trendPct === null
        ? "tendance interne non calculable"
        : `tendance interne ${sheet.traffic.trendPct > 0 ? "+" : ""}${sheet.traffic.trendPct} % (moyenne de la 2e moitié de la période vs la 1re)`;
    lines.push(
      `COURBE (unité : ${sheet.traffic.unit}) :`,
      `- Total sur les points retenus : ${fmtInt(sheet.traffic.total)} ${sheet.traffic.unit} sur ${sheet.traffic.points} points.`,
      `- Point le plus haut : ${sheet.traffic.best.label} (${fmtInt(sheet.traffic.best.value)}).`,
      `- Point le plus bas : ${sheet.traffic.worst.label} (${fmtInt(sheet.traffic.worst.value)}).`,
      `- ${tr}.`,
    );
    if (sheet.traffic.edgesDropped)
      lines.push(
        "- Note : le premier et le dernier point de la période sont incomplets (semaine/mois partiel) et sont exclus de ce total et de cette tendance.",
      );
    lines.push("");
  }

  if (sheet.channels.length) {
    lines.push(
      sheet.channelsTruncated
        ? "CANAUX D'ACQUISITION (principaux canaux seulement — la source a tronqué la liste, ces parts ne couvrent donc pas 100 % du trafic) :"
        : "CANAUX D'ACQUISITION :",
    );
    for (const c of sheet.channels) lines.push(`- ${c.name} : ${fmtInt(c.value)} sessions (${c.share} %)`);
    lines.push("");
  }

  if (sheet.topPages.length) {
    lines.push("PAGES LES PLUS VUES :");
    for (const p of sheet.topPages) {
      const extra = [
        p.avgTime !== null ? `durée moyenne ${fmtDuration(p.avgTime)}` : null,
        p.bounce !== null ? `rebond ${p.bounce} %` : null,
      ].filter(Boolean);
      lines.push(
        `- ${p.page} : ${fmtInt(p.views)} vues${extra.length ? `, ${extra.join(", ")}` : " (la source ne mesure ni la durée ni le rebond)"}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}
