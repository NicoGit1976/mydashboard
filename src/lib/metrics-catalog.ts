// The catalog is the seam between widgets and data. Today it serves mock values;
// in Phase 3, connectors (Matomo, GA4, Meta…) replace these resolvers — the
// widgets and builder never change.
import { channels, commentaryHtml, networks, topPages, traffic } from "@/lib/mock-data";
import type { SourceKey } from "@/lib/sources";

export type WidgetType =
  | "kpi"
  | "line"
  | "donut"
  | "bar"
  | "table"
  | "content"
  | "illustration"
  | "ai"
  | "icon";

export type KpiFormat = "number" | "percent" | "duration";

export type KpiMetric = {
  label: string;
  value: number;
  delta?: number; // undefined = trend unknown (a live provider gave no comparison)
  source: SourceKey;
  spark: number[];
  format?: KpiFormat;
  invert?: boolean; // lower-is-better (e.g. bounce rate): a drop is good
};

// Shared sparkline shapes (deterministic).
const RISE = [20, 22, 21, 24, 23, 25, 24, 27, 26, 28, 27, 30, 29, 31];
const UP = [9, 11, 10, 13, 12, 15, 14, 18, 16, 19, 18, 22, 21, 24];
const STEADY = [10, 10, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12];
const DOWN = [12, 11, 12, 10, 11, 10, 9, 10, 9, 8, 9, 8, 9, 8];

// Full KPI catalog across every source. The config modal lets any KPI widget
// pick any of these; Phase-3 connectors will fill the real numbers.
export const KPI_METRICS: Record<string, KpiMetric> = {
  // Web — Matomo / GA4
  sessions: { label: "Sessions web", value: 48230, delta: 12.4, source: "matomo", spark: RISE },
  visitors: { label: "Visiteurs uniques", value: 31870, delta: 8.1, source: "ga4", spark: RISE },
  pageviews: { label: "Pages vues", value: 142900, delta: 9.6, source: "matomo", spark: RISE },
  new_users: { label: "Nouveaux visiteurs", value: 21450, delta: 15.3, source: "ga4", spark: UP },
  bounce_rate: { label: "Taux de rebond", value: 38, delta: -2.4, source: "ga4", spark: DOWN, format: "percent", invert: true },
  avg_duration: { label: "Durée moy. session", value: 134, delta: 6.2, source: "matomo", spark: UP, format: "duration" },
  conversions: { label: "Conversions", value: 642, delta: 18.9, source: "ga4", spark: UP },
  // Instagram
  ig_follow: { label: "Abonnés Instagram", value: 12460, delta: 5.4, source: "instagram", spark: STEADY },
  ig_reach: { label: "Portée Instagram", value: 89400, delta: 21.2, source: "instagram", spark: UP },
  ig_engagement: { label: "Engagement Instagram", value: 18640, delta: 23.7, source: "instagram", spark: UP },
  ig_profile_views: { label: "Vues de profil IG", value: 7320, delta: 11.8, source: "instagram", spark: UP },
  // Facebook
  fb_reach: { label: "Portée Facebook", value: 64200, delta: 7.5, source: "facebook", spark: UP },
  fb_engagement: { label: "Engagement Facebook", value: 9230, delta: 4.1, source: "facebook", spark: UP },
  fb_likes: { label: "J'aime de la Page", value: 5840, delta: 2.3, source: "facebook", spark: STEADY },
  // LinkedIn
  li_follow: { label: "Abonnés LinkedIn", value: 3280, delta: 9.8, source: "linkedin", spark: UP },
  li_impressions: { label: "Impressions LinkedIn", value: 41200, delta: 14.6, source: "linkedin", spark: UP },
  li_engagement_rate: { label: "Taux d'engagement LinkedIn", value: 4.8, delta: 0.6, source: "linkedin", spark: UP, format: "percent" },
  // Google Business Profile
  gmb_views: { label: "Vues fiche Google", value: 9420, delta: -3.2, source: "gmb", spark: DOWN },
  gmb_searches: { label: "Recherches Google", value: 6180, delta: 5.1, source: "gmb", spark: UP },
  gmb_calls: { label: "Appels (fiche Google)", value: 312, delta: 8.4, source: "gmb", spark: UP },
  gmb_directions: { label: "Demandes d'itinéraire", value: 1480, delta: 6.7, source: "gmb", spark: UP },
  // Cross-network (kept for backward compatibility)
  social: { label: "Engagement social", value: 18640, delta: 23.7, source: "instagram", spark: UP },
};

export const KPI_METRIC_OPTIONS = Object.entries(KPI_METRICS).map(([value, m]) => ({
  value,
  label: m.label,
}));

export const DATASETS = { traffic, channels, networks, topPages };

export type Blueprint = {
  type: WidgetType;
  label: string; // shown in the add-widget palette
  title?: string;
  subtitle?: string;
  span: number;
  sourceKey?: SourceKey;
  config: Record<string, unknown>;
};

export const WIDGET_BLUEPRINTS: Record<string, Blueprint> = {
  "kpi:sessions": { type: "kpi", label: "KPI · Sessions", span: 3, config: { metric: "sessions" } },
  "kpi:visitors": { type: "kpi", label: "KPI · Visiteurs", span: 3, config: { metric: "visitors" } },
  "kpi:pageviews": { type: "kpi", label: "KPI · Pages vues", span: 3, config: { metric: "pageviews" } },
  "kpi:conversions": { type: "kpi", label: "KPI · Conversions", span: 3, config: { metric: "conversions" } },
  "kpi:social": { type: "kpi", label: "KPI · Engagement", span: 3, config: { metric: "social" } },
  "kpi:gmb": { type: "kpi", label: "KPI · Fiche Google", span: 3, config: { metric: "gmb_views" } },
  "kpi:gmb_searches": { type: "kpi", label: "KPI · Recherches Google", span: 3, config: { metric: "gmb_searches" } },
  "kpi:ig": { type: "kpi", label: "KPI · Abonnés IG", span: 3, config: { metric: "ig_follow" } },
  "kpi:ig_reach": { type: "kpi", label: "KPI · Portée IG", span: 3, config: { metric: "ig_reach" } },
  "kpi:fb_reach": { type: "kpi", label: "KPI · Portée FB", span: 3, config: { metric: "fb_reach" } },
  "kpi:li": { type: "kpi", label: "KPI · Abonnés LinkedIn", span: 3, config: { metric: "li_follow" } },
  "kpi:li_impressions": { type: "kpi", label: "KPI · Impressions LinkedIn", span: 3, config: { metric: "li_impressions" } },
  "line:traffic": { type: "line", label: "Courbe · Trafic web", title: "Trafic web", subtitle: "Sessions et visiteurs uniques par jour", span: 8, sourceKey: "matomo", config: { dataset: "traffic" } },
  "donut:channels": { type: "donut", label: "Anneau · Canaux", title: "Canaux d'acquisition", subtitle: "Répartition des sessions", span: 4, sourceKey: "ga4", config: { dataset: "channels", centerValue: "48,2k", centerLabel: "sessions" } },
  "bar:networks": { type: "bar", label: "Barres · Réseaux", title: "Engagement par réseau", subtitle: "Interactions sur la période", span: 6, sourceKey: "instagram", config: { dataset: "networks" } },
  "table:pages": { type: "table", label: "Tableau · Top pages", title: "Pages les plus vues", subtitle: "Top 5 du site", span: 6, sourceKey: "matomo", config: { dataset: "topPages" } },
  content: { type: "content", label: "Bloc texte (HTML)", title: "Bloc de contenu", subtitle: "Texte libre (HTML)", span: 8, sourceKey: "manual", config: { html: "<h3>Titre de section</h3><p>Votre analyse ici — texte libre avec mise en forme <strong>HTML</strong>.</p>" } },
  "content:demo": { type: "content", label: "Analyse (démo)", title: "Analyse & recommandations", subtitle: "Bloc de contenu libre (HTML)", span: 8, sourceKey: "manual", config: { html: commentaryHtml } },
  illustration: { type: "illustration", label: "Illustration", span: 4, config: { illustration: "growth" } },
  ai: { type: "ai", label: "Résumé IA ✨", title: "Résumé IA", subtitle: "Synthèse générée par Claude", span: 12, config: { tone: "neutral", html: "" } },
  icon: { type: "icon", label: "Icône ✦", span: 3, config: { icon: "Star", shape: "circle", bg: "#ececfe", border: "", iconColor: "#4f46e5" } },
};

// The palette offered in edit mode (excludes the demo-only content block).
export const WIDGET_PALETTE = [
  "ai",
  "kpi:sessions", "kpi:visitors", "kpi:pageviews", "kpi:conversions",
  "kpi:social", "kpi:gmb", "kpi:gmb_searches",
  "kpi:ig", "kpi:ig_reach", "kpi:fb_reach", "kpi:li", "kpi:li_impressions",
  "icon",
  "line:traffic", "donut:channels", "bar:networks", "table:pages",
  "content", "illustration",
].map((key) => ({ key, label: WIDGET_BLUEPRINTS[key].label }));

// Starter layout created for a client's first report. Uses the NEUTRAL content
// block (not content:demo — that injects a fabricated analysis about the demo
// hotel that must never appear in a real client's report unprompted).
export const DEFAULT_REPORT_LAYOUT = [
  // Only metrics a connector can actually fill: no provider emits `social` or
  // any gmb_* key, so seeding them made every new report show invented numbers
  // that could never turn live. They stay in the library for manual use.
  "kpi:sessions", "kpi:visitors", "kpi:pageviews", "kpi:bounce_rate",
  "line:traffic", "donut:channels", "bar:networks", "table:pages",
  "content", "illustration",
];

// Tones for the AI report summary widget.
export const TONE_OPTIONS = [
  { value: "problems", label: "Appuyer sur les problèmes" },
  { value: "positive", label: "Appuyer sur les points positifs" },
  { value: "neutral", label: "Rester relativement neutre" },
];
