// THE reporting period. One resolved range, passed to every provider, so a
// report's stated period and its numbers can never disagree — the label used to
// be decorative while the fetchers were hardcoded to 28 days.
//
// Providers accept arbitrary ranges: we ask for the real dates rather than
// stitching fixed windows together, so totals are exact rather than averaged.

export type Granularity = "day" | "week" | "month";

export type DateRange = {
  start: string; // YYYY-MM-DD, inclusive
  end: string; // YYYY-MM-DD, inclusive
  prevStart: string; // same length, immediately before — for the delta
  prevEnd: string;
  days: number;
  granularity: Granularity; // how the curve should be bucketed
  label: string; // human label, e.g. "6 derniers mois"
};

export const PERIOD_PRESETS = [
  { days: 7, label: "7 derniers jours" },
  { days: 28, label: "28 derniers jours" },
  { days: 90, label: "3 derniers mois" },
  { days: 180, label: "6 derniers mois" },
  { days: 365, label: "12 derniers mois" },
] as const;

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

// Too many points is unreadable and slow; too few hides the trend.
function granularityFor(days: number): Granularity {
  if (days <= 31) return "day";
  if (days <= 120) return "week";
  return "month";
}

function diffDays(start: string, end: string): number {
  return Math.max(
    1,
    Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1,
  );
}

// Resolves a report's stored period into concrete dates. `lagDays` shifts the
// window back for providers that publish late (Search Console ≈ 2 days).
export function resolveRange(
  report: { periodDays: number; periodStart: Date | null; periodEnd: Date | null },
  lagDays = 0,
): DateRange {
  let start: string;
  let end: string;
  let label: string;

  if (report.periodStart && report.periodEnd) {
    start = iso(report.periodStart);
    end = iso(report.periodEnd);
    label = `du ${fr(start)} au ${fr(end)}`;
  } else {
    const days = report.periodDays > 0 ? report.periodDays : 28;
    end = iso(daysAgo(1 + lagDays));
    start = iso(daysAgo(days + lagDays));
    label = PERIOD_PRESETS.find((p) => p.days === days)?.label ?? `${days} derniers jours`;
  }

  const days = diffDays(start, end);
  // Previous window of the SAME length, ending the day before this one starts.
  const prevEnd = iso(new Date(Date.parse(start) - 86_400_000));
  const prevStart = iso(new Date(Date.parse(start) - days * 86_400_000));

  return { start, end, prevStart, prevEnd, days, granularity: granularityFor(days), label };
}

export function fr(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

// Buckets a set of dated values into the range's granularity. Used by providers
// that only return daily rows (Matomo, Search Console) so a 6-month curve shows
// 6 real monthly points instead of 180 unreadable ones.
export function bucketByGranularity(
  rows: { date: string; values: number[] }[],
  granularity: Granularity,
): { labels: string[]; series: number[][] } {
  if (rows.length === 0) return { labels: [], series: [] };
  const width = rows[0].values.length;

  const keyOf = (date: string): string => {
    if (granularity === "day") return date;
    if (granularity === "month") return date.slice(0, 7);
    // ISO-ish week bucket: label by the Monday of that week.
    const d = new Date(date);
    const dow = (d.getUTCDay() + 6) % 7;
    return iso(new Date(d.getTime() - dow * 86_400_000));
  };

  const buckets = new Map<string, number[]>();
  for (const r of rows) {
    const k = keyOf(r.date);
    const acc = buckets.get(k) ?? new Array(width).fill(0);
    for (let i = 0; i < width; i++) acc[i] += r.values[i] ?? 0;
    buckets.set(k, acc);
  }

  const keys = [...buckets.keys()].sort();
  const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const labels = keys.map((k) => {
    if (granularity === "month") {
      const [y, m] = k.split("-");
      return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
    }
    return `${k.slice(8, 10)}/${k.slice(5, 7)}`;
  });

  const series: number[][] = [];
  for (let i = 0; i < width; i++) series.push(keys.map((k) => buckets.get(k)![i]));
  return { labels, series };
}
