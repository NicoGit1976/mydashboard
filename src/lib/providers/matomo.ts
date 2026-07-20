import type { AccountOption, ProviderData } from "@/lib/providers/types";

// Matomo Reporting API. Token-based (no OAuth app needed) — the fastest way to
// real data. token_auth is POSTed (Matomo 4+ recommendation), never in the URL.

type MatomoMeta = { url?: string };

function baseUrl(meta: Record<string, unknown>): string | null {
  const url = (meta as MatomoMeta).url?.trim().replace(/\/+$/, "");
  return url || null;
}

async function mfetch(
  base: string,
  token: string,
  params: Record<string, string>,
): Promise<unknown> {
  const body = new URLSearchParams({
    module: "API",
    format: "JSON",
    token_auth: token,
    ...params,
  });
  const res = await fetch(`${base}/index.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Matomo ${res.status}`);
  const data = (await res.json()) as unknown;
  if (
    data &&
    typeof data === "object" &&
    (data as { result?: string }).result === "error"
  ) {
    throw new Error(`Matomo: ${(data as { message?: string }).message ?? "error"}`);
  }
  return data;
}

// Sites the token can read — feeds the attribution picker.
export async function listMatomoSites(
  token: string,
  meta: Record<string, unknown>,
): Promise<AccountOption[]> {
  const base = baseUrl(meta);
  if (!base) return [];
  const data = (await mfetch(base, token, {
    method: "SitesManager.getSitesWithAtLeastViewAccess",
  })) as { idsite: string | number; name: string; main_url?: string }[];
  return (Array.isArray(data) ? data : []).map((s) => ({
    id: String(s.idsite),
    label: s.main_url ? `${s.name} · ${s.main_url}` : s.name,
  }));
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v.replace("%", "")) || 0;
  return 0;
}

function pct(cur: number, prev: number): number {
  if (!prev) return 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

function isoDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

type MatomoSummary = Record<string, unknown>;

type MatomoPageRow = {
  label?: string;
  url?: string;
  nb_hits?: unknown;
  avg_time_on_page?: unknown;
  bounce_rate?: unknown;
};

export async function fetchMatomo(
  token: string,
  siteId: string,
  meta: Record<string, unknown>,
): Promise<ProviderData> {
  const base = baseUrl(meta);
  if (!base) return { kpis: {} };

  // Current = last 28 full days, previous = the 28 days before that.
  const curRange = `${isoDaysAgo(28)},${isoDaysAgo(1)}`;
  const prevRange = `${isoDaysAgo(56)},${isoDaysAgo(29)}`;
  const common = { idSite: siteId };

  // Every call is individually guarded: one failing endpoint must degrade that
  // section only, never discard the whole payload.
  const [cur, prev, daily, referrers, pages] = await Promise.all([
    mfetch(base, token, { method: "API.get", period: "range", date: curRange, ...common }).catch(() => null) as Promise<MatomoSummary | null>,
    mfetch(base, token, { method: "API.get", period: "range", date: prevRange, ...common }).catch(() => null) as Promise<MatomoSummary | null>,
    mfetch(base, token, { method: "VisitsSummary.get", period: "day", date: "last28", ...common }).catch(() => null) as Promise<Record<string, MatomoSummary> | null>,
    mfetch(base, token, { method: "Referrers.get", period: "range", date: curRange, ...common }).catch(() => null) as Promise<MatomoSummary | null>,
    // flat=1 flattens Matomo's page-tree into plain paths, matching the table.
    mfetch(base, token, {
      method: "Actions.getPageUrls",
      period: "range",
      date: curRange,
      flat: "1",
      filter_sort_column: "nb_hits",
      filter_limit: "5",
      ...common,
    }).catch(() => null) as Promise<MatomoPageRow[] | null>,
  ]);

  const kpis: ProviderData["kpis"] = {};
  const metric = (key: string, curName: string, scaleToInt = true) => {
    const c = num(cur?.[curName]);
    const val = scaleToInt ? Math.round(c) : c;
    // Omit delta when the previous period is unavailable — an honest "no trend"
    // instead of a fabricated 0 %.
    kpis[key] = prev ? { value: val, delta: pct(c, num(prev[curName])) } : { value: val };
  };
  // No summary ⇒ emit no KPIs at all. Emitting zeros would overwrite the mock
  // with fake "real" data, which is worse than showing nothing.
  if (cur) {
    metric("sessions", "nb_visits");
    metric("pageviews", "nb_pageviews");
    metric("avg_duration", "avg_time_on_site");
    metric("bounce_rate", "bounce_rate");
    if (cur.nb_uniq_visitors !== undefined) metric("visitors", "nb_uniq_visitors");
    if (num(cur.nb_conversions) > 0 || num(prev?.nb_conversions) > 0)
      metric("conversions", "nb_conversions");
  }

  // Daily traffic (sessions + unique visitors per day).
  let traffic: ProviderData["traffic"];
  if (daily && typeof daily === "object") {
    const labels: string[] = [];
    const sessions: number[] = [];
    const users: number[] = [];
    for (const [date, row] of Object.entries(daily)) {
      // date = YYYY-MM-DD
      labels.push(`${date.slice(8, 10)}/${date.slice(5, 7)}`);
      sessions.push(num((row as MatomoSummary)?.nb_visits));
      users.push(num((row as MatomoSummary)?.nb_uniq_visitors));
    }
    if (labels.length) traffic = { labels, sessions, users };
  }

  // Acquisition channels (absolute visit counts).
  let channels: ProviderData["channels"];
  if (referrers) {
    const mapping: [string, string][] = [
      ["Organique", "visitorsFromSearchEngines"],
      ["Direct", "visitorsFromDirectEntry"],
      ["Référents", "visitorsFromWebsites"],
      ["Réseaux sociaux", "visitorsFromSocialNetworks"],
      ["Campagnes", "visitorsFromCampaigns"],
    ];
    // Matomo's Referrers.get returns metrics prefixed with `Referrers_`; fall
    // back to the bare key across API versions.
    const out = mapping
      .map(([name, key]) => ({
        name,
        value: num(referrers[`Referrers_${key}`] ?? referrers[key]),
      }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
    if (out.length) channels = out;
  }

  // Most-viewed pages — without this the report keeps showing sample URLs next
  // to real KPIs, which is worse than showing nothing.
  let topPages: ProviderData["topPages"];
  if (Array.isArray(pages) && pages.length) {
    const rows = pages
      .map((p) => ({
        page: (p.label ?? p.url ?? "").trim() || "/",
        views: Math.round(num(p.nb_hits)),
        avgTime: Math.round(num(p.avg_time_on_page)),
        bounce: Math.round(num(p.bounce_rate)),
      }))
      .filter((p) => p.views > 0);
    if (rows.length) topPages = rows;
  }

  return { kpis, traffic, channels, topPages };
}
