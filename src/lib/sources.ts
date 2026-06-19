// Canonical list of data sources (connectors). Drives the source badges and,
// in Phase 3, the actual connector registry.
export const SOURCES = {
  matomo: { label: "Matomo", color: "#3450A1" },
  ga4: { label: "GA4", color: "#E8710A" },
  facebook: { label: "Facebook", color: "#1877F2" },
  instagram: { label: "Instagram", color: "#E1306C" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
  gmb: { label: "Google Business", color: "#34A853" },
  manual: { label: "Manuel", color: "#8b91a7" },
} as const;

export type SourceKey = keyof typeof SOURCES;
