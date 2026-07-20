import type { AccountOption, ProviderData } from "@/lib/providers/types";

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

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

type Row = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };

function pct(cur: number, prev: number): number {
  if (!prev) return 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

export async function fetchGsc(token: string, siteUrl: string): Promise<ProviderData> {
  const site = encodeURIComponent(siteUrl);
  const url = `${API}/sites/${site}/searchAnalytics/query`;

  // Search Console data lags ~2 days; ending "yesterday" would report an
  // artificial collapse on the last days.
  const query = (startDate: string, endDate: string, dimensions: string[], rowLimit = 1) =>
    gfetch(url, token, { startDate, endDate, dimensions, rowLimit }).catch(() => null) as Promise<{
      rows?: Row[];
    } | null>;

  const [cur, prev, byDate, byPage] = await Promise.all([
    query(isoDaysAgo(31), isoDaysAgo(3), []),
    query(isoDaysAgo(59), isoDaysAgo(32), []),
    query(isoDaysAgo(31), isoDaysAgo(3), ["date"], 60),
    query(isoDaysAgo(31), isoDaysAgo(3), ["page"], 5),
  ]);

  const c = cur?.rows?.[0];
  const p = prev?.rows?.[0];

  const kpis: ProviderData["kpis"] = {};
  if (c) {
    kpis.gsc_clicks = {
      value: Math.round(c.clicks ?? 0),
      ...(p ? { delta: pct(c.clicks ?? 0, p.clicks ?? 0) } : {}),
    };
    kpis.gsc_impressions = {
      value: Math.round(c.impressions ?? 0),
      ...(p ? { delta: pct(c.impressions ?? 0, p.impressions ?? 0) } : {}),
    };
    kpis.gsc_ctr = {
      value: Math.round((c.ctr ?? 0) * 1000) / 10,
      ...(p ? { delta: pct(c.ctr ?? 0, p.ctr ?? 0) } : {}),
    };
    kpis.gsc_position = {
      value: Math.round((c.position ?? 0) * 10) / 10,
      // Lower is better here, so the sign is deliberately inverted.
      ...(p ? { delta: pct(p.position ?? 0, c.position ?? 0) } : {}),
    };
  }

  let traffic: ProviderData["traffic"];
  if (byDate?.rows?.length) {
    const labels: string[] = [];
    const sessions: number[] = [];
    const users: number[] = [];
    for (const r of byDate.rows) {
      const d = r.keys?.[0] ?? "";
      if (!d) continue;
      labels.push(`${d.slice(8, 10)}/${d.slice(5, 7)}`);
      sessions.push(Math.round(r.clicks ?? 0));
      users.push(Math.round(r.impressions ?? 0));
    }
    if (labels.length) traffic = { labels, sessions, users };
  }

  let topPages: ProviderData["topPages"];
  if (byPage?.rows?.length) {
    const rows = byPage.rows
      .map((r) => ({
        page: (r.keys?.[0] ?? "").replace(/^https?:\/\/[^/]+/, "") || "/",
        views: Math.round(r.clicks ?? 0),
        avgTime: 0,
        bounce: Math.round((r.ctr ?? 0) * 100),
      }))
      .filter((r) => r.views > 0);
    if (rows.length) topPages = rows;
  }

  return { kpis, traffic, topPages };
}
