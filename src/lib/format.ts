// Locale-aware formatters. fr-FR for the demo; will become per-workspace later.
const intFormatter = new Intl.NumberFormat("fr-FR");
const compactFormatter = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const fmtInt = (n: number) => intFormatter.format(Math.round(n));
export const fmtCompact = (n: number) => compactFormatter.format(n);

export const fmtPct = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1).replace(".", ",")} %`;

export const fmtDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
};
