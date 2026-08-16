// Report templates: a starting layout chosen against the sources a client
// ACTUALLY has.
//
// The rule that shapes everything here: a widget is only laid down when some
// attributed provider can fill it. Seeding a "Fiche Google" card on a client
// with no GBP connector doesn't give them a head start — it gives them a
// fabricated number that can never turn live, sitting in a client-facing
// report. So each widget declares which providers can fill it, and the builder
// drops the rest (and any section left empty).

import { WIDGET_BLUEPRINTS } from "@/lib/metrics-catalog";

// Which connected provider can actually fill each metric — read off the
// fetchers in src/lib/providers/, not off the KPI catalog's `source` badge
// (that badge is display-only and gets overridden at render).
const METRIC_PROVIDERS: Record<string, string[]> = {
  sessions: ["matomo", "ga4"],
  visitors: ["matomo", "ga4"],
  pageviews: ["matomo", "ga4"],
  bounce_rate: ["matomo", "ga4"],
  avg_duration: ["matomo", "ga4"],
  conversions: ["matomo"],
  new_users: ["ga4"],
  gsc_clicks: ["gsc"],
  gsc_impressions: ["gsc"],
  gsc_ctr: ["gsc"],
  gsc_position: ["gsc"],
  fb_likes: ["meta"],
  fb_reach: ["meta"],
  fb_engagement: ["meta"],
  ig_follow: ["meta"],
  ig_reach: ["meta"],
  li_follow: ["linkedin"],
  li_impressions: ["linkedin"],
  li_engagement_rate: ["linkedin"],
  // First-party: our own short links, no external connector to attribute.
  sl_clicks: ["shortlink"],
  sl_uniques: ["shortlink"],
};

const DATASET_PROVIDERS: Record<string, string[]> = {
  traffic: ["matomo", "ga4", "gsc"],
  channels: ["matomo", "ga4"],
  topPages: ["matomo", "gsc"],
  // Only Search Console knows what people typed.
  topQueries: ["gsc"],
  // `networks` has no fetcher at all — never seed it.
  networks: [],
};

// Widgets that carry no data (text, headings, decoration) are always allowed.
const ALWAYS_OK = new Set(["section", "content", "illustration", "icon", "ai"]);

// Short links are ours: every client can have them, no attribution needed.
const IMPLICIT_PROVIDERS = ["shortlink"];

export function widgetIsFillable(blueprintKey: string, providers: Set<string>): boolean {
  const bp = WIDGET_BLUEPRINTS[blueprintKey];
  if (!bp) return false;
  if (ALWAYS_OK.has(bp.type)) return true;

  const cfg = bp.config as Record<string, string>;
  const needed =
    bp.type === "kpi"
      ? METRIC_PROVIDERS[cfg.metric]
      : DATASET_PROVIDERS[cfg.dataset];

  // An unmapped metric/dataset means no fetcher writes it — drop it rather
  // than seeding a permanently-mock card.
  if (!needed || needed.length === 0) return false;
  return needed.some((p) => providers.has(p));
}

export type TemplateSection = {
  heading: string | null; // null = no divider band (used by the blank template)
  widgets: string[];
};

export type ReportTemplate = {
  key: string;
  label: string;
  description: string;
  title: string;
  /** Providers this template is about; used to sort suggestions, not to gate. */
  about: string[];
  sections: TemplateSection[];
};

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    key: "blank",
    label: "Rapport vierge",
    description: "Aucun bloc. À construire entièrement à la main.",
    title: "Rapport de performance",
    about: [],
    sections: [],
  },
  {
    key: "web",
    label: "Visibilité web",
    description:
      "Trafic du site, canaux d'acquisition et pages les plus vues. Le rapport le plus courant.",
    title: "Visibilité web",
    about: ["matomo", "ga4"],
    sections: [
      {
        heading: "Vue du trafic web",
        widgets: [
          "kpi:sessions",
          "kpi:visitors",
          "kpi:pageviews",
          "kpi:new_users",
          "line:traffic",
        ],
      },
      {
        heading: "Qualité des visites",
        widgets: ["kpi:bounce_rate", "kpi:avg_duration", "kpi:conversions"],
      },
      {
        heading: "Sources du trafic",
        widgets: ["donut:channels", "table:pages"],
      },
      { heading: "Analyse", widgets: ["ai", "content"] },
    ],
  },
  {
    key: "seo",
    label: "Référencement Google",
    description:
      "Clics, impressions, CTR et position moyenne dans les résultats Google, plus les pages qui rapportent.",
    title: "Référencement Google",
    about: ["gsc"],
    sections: [
      {
        heading: "Présence dans les résultats Google",
        widgets: [
          "kpi:gsc_clicks",
          "kpi:gsc_impressions",
          "kpi:gsc_ctr",
          "kpi:gsc_position",
          "line:traffic",
        ],
      },
      {
        heading: "Requêtes les plus performantes",
        widgets: ["table:queries"],
      },
      { heading: "Pages qui rapportent des clics", widgets: ["table:pages"] },
      { heading: "Analyse", widgets: ["ai", "content"] },
    ],
  },
  {
    key: "social",
    label: "Réseaux sociaux",
    description: "Audience et engagement Facebook, Instagram et LinkedIn.",
    title: "Réseaux sociaux",
    about: ["meta", "linkedin"],
    sections: [
      {
        heading: "Facebook",
        widgets: ["kpi:fb_likes", "kpi:fb_reach", "kpi:fb_engagement"],
      },
      { heading: "Instagram", widgets: ["kpi:ig", "kpi:ig_reach"] },
      {
        heading: "LinkedIn",
        widgets: ["kpi:li", "kpi:li_impressions", "kpi:li_engagement_rate"],
      },
      {
        heading: "Trafic généré",
        widgets: ["kpi:sl_clicks", "kpi:sl_uniques"],
      },
      { heading: "Analyse", widgets: ["ai", "content"] },
    ],
  },
  {
    key: "full",
    label: "Rapport complet",
    description:
      "Web, référencement et réseaux sociaux réunis. Les sections sans source branchée sont retirées.",
    title: "Rapport de visibilité",
    about: ["matomo", "ga4", "gsc", "meta", "linkedin"],
    sections: [
      {
        heading: "Vue du trafic web",
        widgets: [
          "kpi:sessions",
          "kpi:visitors",
          "kpi:pageviews",
          "kpi:bounce_rate",
          "line:traffic",
        ],
      },
      { heading: "Sources du trafic", widgets: ["donut:channels", "table:pages"] },
      {
        heading: "Référencement Google",
        widgets: [
          "kpi:gsc_clicks",
          "kpi:gsc_impressions",
          "kpi:gsc_ctr",
          "kpi:gsc_position",
          "table:queries",
        ],
      },
      {
        heading: "Réseaux sociaux",
        widgets: [
          "kpi:fb_reach",
          "kpi:ig_reach",
          "kpi:li_impressions",
          "kpi:sl_clicks",
        ],
      },
      { heading: "Analyse", widgets: ["ai", "content"] },
    ],
  },
];

export function getTemplate(key: string): ReportTemplate | undefined {
  return REPORT_TEMPLATES.find((t) => t.key === key);
}

export type PlannedWidget = {
  type: string;
  title: string | null;
  sourceKey: string | null;
  span: number;
  config: Record<string, unknown>;
};

/**
 * Turns a template into the concrete widget list for ONE client, keeping only
 * what that client's attributed sources can fill. A section whose widgets all
 * dropped takes its heading with it — an empty chapter title is worse than no
 * chapter at all.
 */
export function buildTemplateLayout(
  template: ReportTemplate,
  attributedProviders: string[],
): PlannedWidget[] {
  const providers = new Set([...attributedProviders, ...IMPLICIT_PROVIDERS]);
  const out: PlannedWidget[] = [];

  for (const section of template.sections) {
    const keys = section.widgets.filter((k) => widgetIsFillable(k, providers));
    // "Analyse" is text-only, so it always survives the filter. Don't emit it
    // on its own — a report that is nothing but an empty commentary block.
    if (keys.length === 0) continue;

    if (section.heading) {
      const bp = WIDGET_BLUEPRINTS.section;
      out.push({
        type: bp.type,
        title: null,
        sourceKey: null,
        span: bp.span,
        config: { heading: section.heading },
      });
    }
    for (const key of keys) {
      const bp = WIDGET_BLUEPRINTS[key];
      out.push({
        type: bp.type,
        title: bp.title ?? null,
        sourceKey: bp.sourceKey ?? null,
        span: bp.span,
        config: { ...bp.config, subtitle: bp.subtitle },
      });
    }
  }

  // A layout of headings and commentary with no data block is not a report.
  const hasData = out.some((w) => !ALWAYS_OK.has(w.type));
  return hasData ? out : [];
}

/**
 * Which template to offer first for a set of sources — the one whose subject
 * matter the client actually has data for.
 */
export function suggestTemplate(attributedProviders: string[]): string {
  const p = new Set(attributedProviders);
  const web = p.has("matomo") || p.has("ga4");
  const social = p.has("meta") || p.has("linkedin");
  if (web && (p.has("gsc") || social)) return "full";
  if (web) return "web";
  if (p.has("gsc")) return "seo";
  if (social) return "social";
  return "blank";
}
