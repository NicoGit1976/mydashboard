import type { Client } from "@prisma/client";
import { db } from "@/lib/db";
import { KPI_METRICS, DATASETS } from "@/lib/metrics-catalog";
import { getValidToken } from "@/lib/connection-tokens";
import { fetchGa4 } from "@/lib/providers/google";
import { fetchMeta } from "@/lib/providers/meta";
import { fetchLinkedin } from "@/lib/providers/linkedin";
import { fetchMatomo } from "@/lib/providers/matomo";
import type { ProviderData } from "@/lib/providers/types";
import type { SourceKey } from "@/lib/sources";

export type ReportData = {
  kpis: typeof KPI_METRICS;
  datasets: typeof DATASETS;
  liveSources: string[]; // providers that returned live data this render
  liveMetrics: string[]; // KPI metric ids actually filled by a live provider
  liveDatasets: string[]; // dataset keys (traffic/channels) filled live
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
  cache.set(key, { at: Date.now(), data });
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
    kpis[key] = { ...kpis[key], value: v.value, delta: v.delta, spark: [] };
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
export async function getReportData(client: Client, readOnly = false): Promise<ReportData> {
  const kpis = structuredClone(KPI_METRICS);
  const datasets = structuredClone(DATASETS);
  const liveSources: string[] = [];
  const liveMetrics: string[] = [];
  const liveDatasets: string[] = [];

  const sources = await db.clientSource.findMany({ where: { clientId: client.id } });

  await Promise.all(
    sources.map(async (s) => {
      try {
        const t = await getValidToken(client.ownerId, s.provider, readOnly);
        if (!t) return;

        const key = `${client.ownerId}:${s.provider}:${s.externalId}`;
        const d = await withTimeout(
          cachedFetch(key, () => {
            if (s.provider === "ga4") return fetchGa4(t.token, s.externalId);
            if (s.provider === "meta") return fetchMeta(t.token, s.externalId);
            if (s.provider === "linkedin") return fetchLinkedin(t.token, s.externalId);
            if (s.provider === "matomo") return fetchMatomo(t.token, s.externalId, t.meta);
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
          liveDatasets.push("channels");
        }

        if (Object.keys(d.kpis).length || d.traffic || d.channels) {
          liveSources.push(s.provider);
        }
      } catch {
        // keep mock for this source
      }
    }),
  );

  return { kpis, datasets, liveSources, liveMetrics, liveDatasets };
}
