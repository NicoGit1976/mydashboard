import type { Client } from "@prisma/client";
import { db } from "@/lib/db";
import { KPI_METRICS, DATASETS } from "@/lib/metrics-catalog";
import { getValidToken } from "@/lib/connection-tokens";
import { fetchGa4 } from "@/lib/providers/google";
import { fetchMeta } from "@/lib/providers/meta";
import { fetchLinkedin } from "@/lib/providers/linkedin";
import type { ProviderData } from "@/lib/providers/types";

export type ReportData = {
  kpis: typeof KPI_METRICS;
  datasets: typeof DATASETS;
  liveSources: string[]; // providers that returned live data this render
};

function applyKpis(kpis: typeof KPI_METRICS, incoming: ProviderData["kpis"]) {
  for (const [key, v] of Object.entries(incoming)) {
    if (kpis[key]) kpis[key] = { ...kpis[key], value: v.value, delta: v.delta };
  }
}

// Builds the data bundle for a client's report: starts from the mock catalog,
// then overrides with live data for every connected + attributed source. Any
// provider error keeps that source's mock values, so the report never breaks.
export async function getReportData(client: Client): Promise<ReportData> {
  const kpis = structuredClone(KPI_METRICS);
  const datasets = structuredClone(DATASETS);
  const liveSources: string[] = [];

  const sources = await db.clientSource.findMany({ where: { clientId: client.id } });

  await Promise.all(
    sources.map(async (s) => {
      try {
        const t = await getValidToken(client.ownerId, s.provider);
        if (!t) return;

        let d: ProviderData | null = null;
        if (s.provider === "ga4") d = await fetchGa4(t.token, s.externalId);
        else if (s.provider === "meta") d = await fetchMeta(t.token, s.externalId);
        else if (s.provider === "linkedin") d = await fetchLinkedin(t.token, s.externalId);
        if (!d) return;

        applyKpis(kpis, d.kpis);
        if (d.traffic) datasets.traffic = d.traffic;
        if (d.channels) datasets.channels = d.channels;

        if (Object.keys(d.kpis).length || d.traffic || d.channels) {
          liveSources.push(s.provider);
        }
      } catch {
        // keep mock for this source
      }
    }),
  );

  return { kpis, datasets, liveSources };
}
