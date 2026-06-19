// Demo dataset for the Phase 0 dashboard. Everything here is replaced by real
// connector output in Phase 3 — the UI never reads from APIs directly, only from
// this shape, so swapping in live data is a drop-in.
import type { SourceKey } from "@/lib/sources";

export const demoClient = {
  name: "Maison Aurore",
  initials: "MA",
  brand: "#C2410C", // the client's OWN brand color — proves per-client theming
  sector: "Hôtellerie & Spa",
  period: "1 – 31 mai 2026",
  compare: "vs. avril 2026",
};

export type Kpi = {
  label: string;
  value: number;
  delta: number;
  source: SourceKey;
  spark: number[];
};

export const kpis: Kpi[] = [
  {
    label: "Sessions web",
    value: 48230,
    delta: 12.4,
    source: "matomo",
    spark: [28, 30, 27, 33, 31, 36, 34, 38, 35, 40, 39, 44, 42, 47],
  },
  {
    label: "Visiteurs uniques",
    value: 31870,
    delta: 8.1,
    source: "ga4",
    spark: [20, 22, 21, 24, 23, 25, 24, 27, 26, 28, 27, 30, 29, 31],
  },
  {
    label: "Engagement social",
    value: 18640,
    delta: 23.7,
    source: "instagram",
    spark: [9, 11, 10, 13, 12, 15, 14, 18, 16, 19, 18, 22, 21, 24],
  },
  {
    label: "Vues fiche Google",
    value: 9420,
    delta: -3.2,
    source: "gmb",
    spark: [12, 11, 12, 10, 11, 10, 9, 10, 9, 8, 9, 8, 9, 8],
  },
];

const days = Array.from({ length: 31 }, (_, i) => i + 1);
export const traffic = {
  labels: days.map((d) => `${d}/05`),
  sessions: days.map((d) => Math.round(1100 + 360 * Math.sin(d / 3) + d * 17)),
  users: days.map((d) => Math.round(760 + 230 * Math.sin(d / 3 + 0.6) + d * 11)),
};

export const channels = [
  { name: "Organique", value: 42 },
  { name: "Direct", value: 23 },
  { name: "Réseaux sociaux", value: 18 },
  { name: "Référents", value: 11 },
  { name: "Payant", value: 6 },
];

export const networks: { name: string; value: number; source: SourceKey }[] = [
  { name: "Instagram", value: 8420, source: "instagram" },
  { name: "Facebook", value: 5230, source: "facebook" },
  { name: "LinkedIn", value: 3110, source: "linkedin" },
  { name: "Google Business", value: 1880, source: "gmb" },
];

export type PageRow = {
  page: string;
  views: number;
  avgTime: number;
  bounce: number;
};

export const topPages: PageRow[] = [
  { page: "/offres/spa-duo", views: 6240, avgTime: 184, bounce: 31 },
  { page: "/", views: 5810, avgTime: 96, bounce: 44 },
  { page: "/chambres/suite-aurore", views: 4120, avgTime: 212, bounce: 28 },
  { page: "/restaurant", views: 3180, avgTime: 142, bounce: 39 },
  { page: "/reserver", views: 2470, avgTime: 88, bounce: 22 },
];

export const commentaryHtml = `
  <h3>Faits marquants du mois</h3>
  <p>Mai signe le <strong>meilleur mois de l'année</strong> en trafic web (+12,4 %),
  porté par la campagne « Spa Duo » et une forte progression sur Instagram
  (<strong>+23,7 %</strong> d'engagement).</p>
  <ul>
    <li>La page <strong>/offres/spa-duo</strong> devient la plus consultée du site.</li>
    <li>Le canal <strong>réseaux sociaux</strong> pèse désormais 18 % des sessions.</li>
    <li>Point d'attention : les vues de la fiche Google reculent légèrement (−3,2 %).</li>
  </ul>
  <p>Recommandation : prolonger la campagne sociale et rafraîchir les visuels de la
  fiche Google Business.</p>
`;
