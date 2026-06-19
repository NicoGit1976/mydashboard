import type { AccountOption, ProviderData } from "@/lib/providers/types";

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

function pct(cur: number, prev: number): number {
  if (!prev) return 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

type GaRow = {
  dimensionValues?: { value: string }[];
  metricValues?: { value: string }[];
};

export async function fetchGa4(token: string, property: string): Promise<ProviderData> {
  const prop = property.startsWith("properties/") ? property : `properties/${property}`;
  const url = `${DATA}/${prop}:runReport`;

  const totalsReq = {
    dateRanges: [
      { startDate: "28daysAgo", endDate: "yesterday" },
      { startDate: "56daysAgo", endDate: "29daysAgo" },
    ],
    metrics: METRIC_MAP.map((m) => ({ name: m.ga })),
  };
  const trafficReq = {
    dateRanges: [{ startDate: "28daysAgo", endDate: "yesterday" }],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "sessions" }, { name: "totalUsers" }],
    orderBys: [{ dimension: { dimensionName: "date" } }],
  };
  const channelsReq = {
    dateRanges: [{ startDate: "28daysAgo", endDate: "yesterday" }],
    dimensions: [{ name: "sessionDefaultChannelGroup" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 6,
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
  METRIC_MAP.forEach((m, i) => {
    const scale = m.scale ?? 1;
    const cur = Number(curRow?.metricValues?.[i]?.value ?? 0) * scale;
    const prev = Number(prevRow?.metricValues?.[i]?.value ?? 0) * scale;
    kpis[m.key] = { value: Math.round(cur), delta: pct(cur, prev) };
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
    trafficOut = { labels, sessions, users };
  }

  let channelsOut: ProviderData["channels"];
  const crows: GaRow[] = channels?.rows ?? [];
  if (crows.length) {
    channelsOut = crows.map((r) => ({
      name: r.dimensionValues?.[0]?.value ?? "—",
      value: Number(r.metricValues?.[0]?.value ?? 0),
    }));
  }

  return { kpis, traffic: trafficOut, channels: channelsOut };
}
