import type { AccountOption, ProviderData } from "@/lib/providers/types";
import type { DateRange } from "@/lib/date-range";

const ADMIN = "https://analyticsadmin.googleapis.com/v1beta";
const DATA = "https://analyticsdata.googleapis.com/v1beta";

async function gfetch(url: string, token: string, body?: unknown) {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`GA4 ${res.status}: ${await res.text().catch(() => "")}`);
  return res.json();
}

// GA4 properties the connected account can read — feeds the attribution picker.
export async function listGa4Properties(token: string): Promise<AccountOption[]> {
  const data = await gfetch(`${ADMIN}/accountSummaries?pageSize=200`, token);
  const out: AccountOption[] = [];
  for (const acc of data.accountSummaries ?? []) {
    for (const p of acc.propertySummaries ?? []) {
      // p.property = "properties/123456789"
      out.push({ id: p.property, label: `${p.displayName} · ${acc.displayName}` });
    }
  }
  return out;
}

// GA4 metric name -> our catalog metric id (+ optional scale for ratios).
const METRIC_MAP: { ga: string; key: string; scale?: number }[] = [
  { ga: "sessions", key: "sessions" },
  { ga: "totalUsers", key: "visitors" },
  { ga: "screenPageViews", key: "pageviews" },
  { ga: "newUsers", key: "new_users" },
  { ga: "bounceRate", key: "bounce_rate", scale: 100 }, // GA returns a 0..1 ratio
  { ga: "averageSessionDuration", key: "avg_duration" }, // seconds
];

// Spreadable delta, absent when the previous period is 0 — reporting 0 % there
// called "stable" a metric that went from nothing to something.
function delta(cur: number, prev: number): { delta?: number } {
  if (!prev) return {};
  return { delta: Math.round(((cur - prev) / prev) * 1000) / 10 };
}

// A client that didn't exist a year ago has no year-over-year trend to state.
function deltaYoy(cur: number, prev: number): { deltaYoy?: number } {
  if (!prev) return {};
  return { deltaYoy: Math.round(((cur - prev) / prev) * 1000) / 10 };
}

type GaRow = {
  dimensionValues?: { value: string }[];
  metricValues?: { value: string }[];
};

export async function fetchGa4(
  token: string,
  property: string,
  range: DateRange,
): Promise<ProviderData> {
  const prop = property.startsWith("properties/") ? property : `properties/${property}`;
  const url = `${DATA}/${prop}:runReport`;

  const totalsReq = {
    dateRanges: [
      { startDate: range.start, endDate: range.end },
      { startDate: range.prevStart, endDate: range.prevEnd },
      // GA4 accepts several windows in one report: the year-over-year
      // comparison costs no extra round-trip.
      { startDate: range.yoyStart, endDate: range.yoyEnd },
    ],
    metrics: METRIC_MAP.map((m) => ({ name: m.ga })),
  };
  const trafficReq = {
    dateRanges: [{ startDate: range.start, endDate: range.end }],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "sessions" }, { name: "totalUsers" }],
    orderBys: [{ dimension: { dimensionName: "date" } }],
  };
  const channelsReq = {
    dateRanges: [{ startDate: range.start, endDate: range.end }],
    dimensions: [{ name: "sessionDefaultChannelGroup" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    // GA4's default channel grouping has ~12 members; 6 silently dropped the
    // tail and every share was then computed over a partial total.
    limit: 25,
  };

  const [totals, traffic, channels] = await Promise.all([
    gfetch(url, token, totalsReq),
    gfetch(url, token, trafficReq).catch(() => null),
    gfetch(url, token, channelsReq).catch(() => null),
  ]);

  const kpis: ProviderData["kpis"] = {};
  const rows: GaRow[] = totals.rows ?? [];
  const curRow =
    rows.find((r) => r.dimensionValues?.[0]?.value === "date_range_0") ?? rows[0];
  const prevRow =
    rows.find((r) => r.dimensionValues?.[0]?.value === "date_range_1") ?? rows[1];
  const yoyRow =
    rows.find((r) => r.dimensionValues?.[0]?.value === "date_range_2") ?? rows[2];
  METRIC_MAP.forEach((m, i) => {
    const scale = m.scale ?? 1;
    const cur = Number(curRow?.metricValues?.[i]?.value ?? 0) * scale;
    const prev = Number(prevRow?.metricValues?.[i]?.value ?? 0) * scale;
    const yoy = Number(yoyRow?.metricValues?.[i]?.value ?? 0) * scale;
    kpis[m.key] = { value: Math.round(cur), ...delta(cur, prev), ...deltaYoy(cur, yoy) };
  });

  let trafficOut: ProviderData["traffic"];
  const trows: GaRow[] = traffic?.rows ?? [];
  if (trows.length) {
    const labels: string[] = [];
    const sessions: number[] = [];
    const users: number[] = [];
    for (const r of trows) {
      const d = r.dimensionValues?.[0]?.value ?? ""; // YYYYMMDD
      labels.push(d.length === 8 ? `${d.slice(6, 8)}/${d.slice(4, 6)}` : d);
      sessions.push(Number(r.metricValues?.[0]?.value ?? 0));
      users.push(Number(r.metricValues?.[1]?.value ?? 0));
    }
    trafficOut = { labels, sessions, users, unit: { primary: "sessions", secondary: "utilisateurs" } };
  }

  let channelsOut: ProviderData["channels"];
  let channelsTruncated = false;
  const crows: GaRow[] = channels?.rows ?? [];
  if (crows.length) {
    channelsOut = crows.map((r) => ({
      name: r.dimensionValues?.[0]?.value ?? "—",
      value: Number(r.metricValues?.[0]?.value ?? 0),
    }));
    // The query asks for the top CHANNEL_LIMIT rows. When GA4 says there were
    // more, these values do not sum to total acquisition — a share computed
    // over them alone would overstate every channel.
    channelsTruncated = Number(channels?.rowCount ?? crows.length) > crows.length;
  }

  return { kpis, traffic: trafficOut, channels: channelsOut, channelsTruncated };
}
