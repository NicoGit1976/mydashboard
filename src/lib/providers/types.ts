// Normalized shapes every provider returns. The report-data seam maps these
// onto the KPI catalog + datasets, so widgets never know which API they came from.
export type ProviderData = {
  // metric id (from metrics-catalog) -> live value + delta (% vs previous
  // period). delta omitted when the provider can't compute a comparison —
  // better an honest "no trend" than a fake 0 %.
  kpis: Record<string, { value: number; delta?: number }>;
  // `unit` names what `sessions` actually counts, because not every provider
  // measures sessions: Search Console returns clicks and impressions. Reports
  // (and the AI fact sheet) must label the curve with the real unit.
  traffic?: {
    labels: string[];
    sessions: number[];
    users: number[];
    unit?: { primary: string; secondary: string };
    /** Buckets that cover a partial week/month — their totals are not comparable. */
    partialEdges?: boolean;
  };
  // `truncated` = the API returned only the top N and a tail was dropped, so
  // these values do not sum to the whole.
  channels?: { name: string; value: number }[];
  channelsTruncated?: boolean;
  // Most-viewed pages. avgTime in seconds, bounce in percent; null when the
  // source doesn't measure them.
  topPages?: { page: string; views: number; avgTime: number | null; bounce: number | null }[];
};

// One selectable account/property/page/org for the attribution picker.
export type AccountOption = { id: string; label: string };
