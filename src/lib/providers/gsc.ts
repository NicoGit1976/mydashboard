import type { AccountOption, ProviderData } from "@/lib/providers/types";
import { bucketByGranularity, type DateRange } from "@/lib/date-range";

// Google Search Console (Search Analytics API). Same service-account credential
// as GA4 — only the scope differs — so connecting one connects both.

const API = "https://searchconsole.googleapis.com/webmasters/v3";

async function gfetch(url: string, token: string, body?: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`GSC ${res.status}`);
  return res.json();
}

// Properties the service account can read — it must be added as a user on each
// one in Search Console, exactly like a human collaborator.
export async function listGscSites(token: string): Promise<AccountOption[]> {
  const data = (await gfetch(`${API}/sites`, token)) as {
    siteEntry?: { siteUrl: string; permissionLevel?: string }[];
  };
  return (data.siteEntry ?? [])
    .filter((s) => s.permissionLevel !== "siteUnverifiedUser")
    .map((s) => ({ id: s.siteUrl, label: s.siteUrl }));
}



type Row = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };

// A previous period of exactly 0 has no percentage. Returning 0 said "stable"
// about a metric that went from nothing to something — spreadable-empty keeps
// ProviderData's promise: an honest "no trend" beats a fabricated 0 %.
function delta(cur: number, prev: number): { delta?: number } {
  if (!prev) return {};
  return { delta: Math.round(((cur - prev) / prev) * 1000) / 10 };
}

// Same shape, one year earlier. Absent when the site had no Search Console
// history back then rather than reported as a spectacular gain from zero.
function deltaYoy(cur: number, prev: number): { deltaYoy?: number } {
  if (!prev) return {};
  return { deltaYoy: Math.round(((cur - prev) / prev) * 1000) / 10 };
}

export async function fetchGsc(
  token: string,
  siteUrl: string,
  range: DateRange,
): Promise<ProviderData> {
  const site = encodeURIComponent(siteUrl);
  const url = `${API}/sites/${site}/searchAnalytics/query`;

  // Search Console data lags ~2 days; ending "yesterday" would report an
  // artificial collapse on the last days.
  const query = (startDate: string, endDate: string, dimensions: string[], rowLimit = 1) =>
    gfetch(url, token, { startDate, endDate, dimensions, rowLimit }).catch(() => null) as Promise<{
      rows?: Row[];
    } | null>;

  // The caller already shifted this range back for Search Console's ~2-day lag.
  const [cur, prev, yoy, byDate, byPage, byQuery] = await Promise.all([
    query(range.start, range.end, []),
    query(range.prevStart, range.prevEnd, []),
    query(range.yoyStart, range.yoyEnd, []),
    query(range.start, range.end, ["date"], 500),
    query(range.start, range.end, ["page"], 5),
    query(range.start, range.end, ["query"], 15),
  ]);

  const c = cur?.rows?.[0];
  const p = prev?.rows?.[0];
  const y = yoy?.rows?.[0];

  const kpis: ProviderData["kpis"] = {};
  if (c) {
    kpis.gsc_clicks = {
      value: Math.round(c.clicks ?? 0),
      ...(p ? delta(c.clicks ?? 0, p.clicks ?? 0) : {}),
      ...(y ? deltaYoy(c.clicks ?? 0, y.clicks ?? 0) : {}),
    };
    kpis.gsc_impressions = {
      value: Math.round(c.impressions ?? 0),
      ...(p ? delta(c.impressions ?? 0, p.impressions ?? 0) : {}),
      ...(y ? deltaYoy(c.impressions ?? 0, y.impressions ?? 0) : {}),
    };
    kpis.gsc_ctr = {
      value: Math.round((c.ctr ?? 0) * 1000) / 10,
      ...(p ? delta(c.ctr ?? 0, p.ctr ?? 0) : {}),
      ...(y ? deltaYoy(c.ctr ?? 0, y.ctr ?? 0) : {}),
    };
    kpis.gsc_position = {
      value: Math.round((c.position ?? 0) * 10) / 10,
      // Natural sign, like every other metric. gsc_position carries invert:true
      // in the catalog, which is what marks "lower is better" — pre-inverting
      // here as well flipped it twice and called every improvement a decline.
      ...(p ? delta(c.position ?? 0, p.position ?? 0) : {}),
      ...(y ? deltaYoy(c.position ?? 0, y.position ?? 0) : {}),
    };
  }

  let traffic: ProviderData["traffic"];
  if (byDate?.rows?.length) {
    const rows = byDate.rows
      .filter((r) => r.keys?.[0])
      .map((r) => ({ date: r.keys![0], values: [Math.round(r.clicks ?? 0), Math.round(r.impressions ?? 0)] }));
    const { labels, series } = bucketByGranularity(rows, range.granularity);
    // Search Console counts clicks and impressions, NOT sessions — say so, or
    // a Google click count gets reported to the client as web traffic.
    if (labels.length)
      traffic = {
        labels,
        sessions: series[0],
        users: series[1],
        unit: { primary: "clics Google", secondary: "impressions Google" },
        partialEdges: range.granularity !== "day",
      };
  }

  let topPages: ProviderData["topPages"];
  if (byPage?.rows?.length) {
    const rows = byPage.rows
      .map((r) => ({
        page: (r.keys?.[0] ?? "").replace(/^https?:\/\/[^/]+/, "") || "/",
        views: Math.round(r.clicks ?? 0),
        // Search Console measures neither. Reporting 0 s and passing the CTR
        // off as a bounce rate invented two columns of a client's report.
        avgTime: null,
        bounce: null,
      }))
      .filter((r) => r.views > 0);
    if (rows.length) topPages = rows;
  }

  // Queries are ordered by clicks (the API's default) and capped: a report
  // shows the handful that matter, not the long tail.
  let topQueries: ProviderData["topQueries"];
  if (byQuery?.rows?.length) {
    const rows = byQuery.rows
      .filter((r) => r.keys?.[0])
      .map((r) => ({
        query: r.keys![0],
        clicks: Math.round(r.clicks ?? 0),
        impressions: Math.round(r.impressions ?? 0),
        ctr: Math.round((r.ctr ?? 0) * 1000) / 10,
        position: Math.round((r.position ?? 0) * 10) / 10,
      }))
      .filter((r) => r.impressions > 0);
    if (rows.length) topQueries = rows;
  }

  return { kpis, traffic, topPages, topQueries };
}
