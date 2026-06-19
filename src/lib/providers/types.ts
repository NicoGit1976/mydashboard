// Normalized shapes every provider returns. The report-data seam maps these
// onto the KPI catalog + datasets, so widgets never know which API they came from.
export type ProviderData = {
  // metric id (from metrics-catalog) -> live value + delta (% vs previous period)
  kpis: Record<string, { value: number; delta: number }>;
  traffic?: { labels: string[]; sessions: number[]; users: number[] };
  channels?: { name: string; value: number }[];
};

// One selectable account/property/page/org for the attribution picker.
export type AccountOption = { id: string; label: string };
