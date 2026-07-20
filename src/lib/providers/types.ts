// Normalized shapes every provider returns. The report-data seam maps these
// onto the KPI catalog + datasets, so widgets never know which API they came from.
export type ProviderData = {
  // metric id (from metrics-catalog) -> live value + delta (% vs previous
  // period). delta omitted when the provider can't compute a comparison —
  // better an honest "no trend" than a fake 0 %.
  kpis: Record<string, { value: number; delta?: number }>;
  traffic?: { labels: string[]; sessions: number[]; users: number[] };
  channels?: { name: string; value: number }[];
  // Most-viewed pages. avgTime in seconds, bounce in percent.
  topPages?: { page: string; views: number; avgTime: number; bounce: number }[];
};

// One selectable account/property/page/org for the attribution picker.
export type AccountOption = { id: string; label: string };
