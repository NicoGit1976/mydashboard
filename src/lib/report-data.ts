import type { Client } from "@prisma/client";
import { db } from "@/lib/db";
import { KPI_METRICS, DATASETS } from "@/lib/metrics-catalog";
import { getValidToken } from "@/lib/connection-tokens";
import { fetchGa4 } from "@/lib/providers/google";
import { fetchMeta } from "@/lib/providers/meta";
import { fetchLinkedin } from "@/lib/providers/linkedin";
import { fetchMatomo } from "@/lib/providers/matomo";
import { fetchGsc } from "@/lib/providers/gsc";
import { fetchShortlinkData } from "@/lib/providers/shortlink";
import type { ProviderData } from "@/lib/providers/types";
import type { SourceKey } from "@/lib/sources";
import { resolveRange, type DateRange } from "@/lib/date-range";

// The traffic curve carries its own unit and completeness flags, because
// "sessions" is only true for some providers: Search Console returns clicks.
type TrafficSet = NonNullable<ProviderData["traffic"]>;

export type ReportData = {
  kpis: typeof KPI_METRICS;
  datasets: Omit<typeof DATASETS, "traffic"> & { traffic: TrafficSet };
  liveSources: string[]; // providers that returned live data this render
  liveMetrics: string[]; // KPI metric ids actually filled by a live provider
  liveDatasets: string[]; // dataset keys (traffic/channels) filled live
  channelsTruncated: boolean; // the channel list is a top-N, not the whole
  range: DateRange; // the period actually queried — headers must state THIS
  // Search Console publishes ~2 days late, so its figures cover a window
  // shifted back from the one the header announces. Exposed so the report can
  // say so instead of letting the two silently disagree.
  gscRange: DateRange;
};

// ---------------------------------------------------------------------------
// Per-provider fetch cache: the report page (and public share pages) call the
// APIs on every render otherwise. 10 min TTL, keyed by owner+provider+account.
const CACHE_TTL_MS = 10 * 60_000;
const cache = new Map<string, { at: number; data: ProviderData }>();

async function cachedFetch(
  key: string,
  fn: () => Promise<ProviderData>,
): Promise<ProviderData> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
  const data = await fn();
  // An empty bundle means the provider produced nothing — don't pin a report to
  // demo values for 10 minutes because of one bad round-trip.
  if (Object.keys(data.kpis).length || data.traffic || data.channels || data.topPages || data.topQueries) {
    cache.set(key, { at: Date.now(), data });
  }
  if (cache.size > 500) {
    for (const [k, v] of cache) if (Date.now() - v.at > CACHE_TTL_MS) cache.delete(k);
  }
  return data;
}

// When a provider supplies a metric, the KPI badge should name THAT provider
// (e.g. Matomo overriding "visitors" must not keep the GA4 badge).
const PROVIDER_BADGE: Record<string, SourceKey | undefined> = {
  matomo: "matomo",
  ga4: "ga4",
  gsc: "gsc",
  shortlink: "shortlink",
};

function applyKpis(
  kpis: typeof KPI_METRICS,
  incoming: ProviderData["kpis"],
  provider: string,
  liveMetrics: string[],
) {
  const badge = PROVIDER_BADGE[provider];
  for (const [key, v] of Object.entries(incoming)) {
    if (!kpis[key]) continue;
    // Live value ⇒ delta is whatever the provider computed (may be undefined =
    // "no trend"); drop the mock spark so a live KPI can't show a fake curve.
    kpis[key] = {
      ...kpis[key],
      value: v.value,
      delta: v.delta,
      deltaYoy: v.deltaYoy,
      spark: [],
    };
    if (badge) kpis[key].source = badge;
    liveMetrics.push(key);
  }
}

// Every provider call is bounded: its own HTTP timeouts + this outer guard so
// one slow API can never hang the report render.
function withTimeout<T>(p: Promise<T>, ms = 10_000): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("provider timeout")), ms)),
  ]);
}

// Builds the data bundle for a client's report: starts from the mock catalog,
// then overrides with live data for every connected + attributed source. Any
// provider error keeps that source's mock values, so the report never breaks.
// readOnly = true for public /share pages: no owner-state writes, no refreshes.
export type ReportPeriod = {
  periodDays: number;
  periodStart: Date | null;
  periodEnd: Date | null;
};

export async function getReportData(
  client: Client,
  readOnly = false,
  period: ReportPeriod = { periodDays: 28, periodStart: null, periodEnd: null },
): Promise<ReportData> {
  const range = resolveRange(period);
  // Search Console publishes ~2 days late: shift its window or the last days
  // read as an artificial collapse.
  const gscRange = resolveRange(period, 2);
  const kpis = structuredClone(KPI_METRICS);
  const datasets = structuredClone(DATASETS) as ReportData["datasets"];
  const liveSources: string[] = [];
  const liveMetrics: string[] = [];
  const liveDatasets: string[] = [];
  let channelsTruncated = false;

  const sources = await db.clientSource.findMany({ where: { clientId: client.id } });

  await Promise.all(
    sources.map(async (s) => {
      try {
        const t = await getValidToken(client.ownerId, s.provider, readOnly);
        if (!t) return;

        // The period is part of the cache identity — otherwise switching to
        // "6 mois" would serve the 28-day numbers for 10 minutes.
        const key = `${client.ownerId}:${s.provider}:${s.externalId}:${range.start}:${range.end}`;
        const d = await withTimeout(
          cachedFetch(key, () => {
            if (s.provider === "ga4") return fetchGa4(t.token, s.externalId, range);
            if (s.provider === "meta") return fetchMeta(t.token, s.externalId, range);
            if (s.provider === "linkedin") return fetchLinkedin(t.token, s.externalId);
            if (s.provider === "matomo") return fetchMatomo(t.token, s.externalId, t.meta, range);
            if (s.provider === "gsc") return fetchGsc(t.token, s.externalId, gscRange);
            return Promise.resolve({ kpis: {} } as ProviderData);
          }),
        );

        applyKpis(kpis, d.kpis, s.provider, liveMetrics);
        if (d.traffic) {
          datasets.traffic = d.traffic;
          liveDatasets.push("traffic");
        }
        if (d.channels) {
          datasets.channels = d.channels;
          channelsTruncated = Boolean(d.channelsTruncated);
          liveDatasets.push("channels");
        }
        if (d.topPages) {
          datasets.topPages = d.topPages;
          liveDatasets.push("topPages");
        }
        if (d.topQueries) {
          datasets.topQueries = d.topQueries;
          liveDatasets.push("topQueries");
        }

        if (Object.keys(d.kpis).length || d.traffic || d.channels || d.topPages || d.topQueries) {
          liveSources.push(s.provider);
        }
      } catch (err) {
        // Keep mock for this source — but never silently: a demo-looking report
        // must leave a trace of why the live fetch failed.
        console.error(
          `[report-data] ${s.provider} live fetch failed (client=${client.id} externalId=${s.externalId}):`,
          err,
        );
      }
    }),
  );

  // First-party short-link clicks: no external API, no attribution needed —
  // this is OUR data, and it works for networks whose stats APIs are locked.
  try {
    const sl = await fetchShortlinkData(client.id, range);
    if (sl) {
      applyKpis(kpis, sl.kpis, "shortlink", liveMetrics);
      if (Object.keys(sl.kpis).length) liveSources.push("shortlink");
    }
  } catch (err) {
    console.error(`[report-data] shortlink stats failed (client=${client.id}):`, err);
  }

  return {
    kpis,
    datasets,
    liveSources,
    liveMetrics,
    liveDatasets,
    channelsTruncated,
    range,
    gscRange,
  };
}
