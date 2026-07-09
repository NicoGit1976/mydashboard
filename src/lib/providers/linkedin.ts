import type { AccountOption, ProviderData } from "@/lib/providers/types";

const API = "https://api.linkedin.com";
const TIMEOUT = 8000;
// LinkedIn versioned APIs require a YYYYMM header and only support ~12 months;
// keep it in env so it can be rotated without a rebuild.
const VERSION = (process.env.LINKEDIN_API_VERSION || "202511").trim();

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": VERSION,
  };
}

function lget(url: string, token: string): Promise<Response> {
  return fetch(url, { headers: headers(token), cache: "no-store", signal: AbortSignal.timeout(TIMEOUT) });
}

// Company Pages the user administers — attribution picker.
// Requires the Community Management API (r_organization_admin) to be approved.
export async function listLinkedinOrgs(token: string): Promise<AccountOption[]> {
  const url = `${API}/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED`;
  const res = await lget(url, token);
  if (!res.ok) throw new Error(`LinkedIn ${res.status}`);
  const d = (await res.json()) as { elements?: { organization?: string }[] };

  const orgs: AccountOption[] = [];
  for (const el of d.elements ?? []) {
    const urn = el.organization ?? ""; // urn:li:organization:123
    const id = urn.split(":").pop() ?? "";
    if (!id) continue;
    let label = `Organisation ${id}`;
    try {
      const o = await lget(`${API}/rest/organizations/${id}`, token);
      if (o.ok) {
        const od = (await o.json()) as { localizedName?: string };
        label = od.localizedName ?? label;
      }
    } catch {
      /* keep fallback label */
    }
    orgs.push({ id: urn, label });
  }
  return orgs;
}

export async function fetchLinkedin(token: string, orgUrn: string): Promise<ProviderData> {
  const urn = orgUrn.startsWith("urn:li:organization:")
    ? orgUrn
    : `urn:li:organization:${orgUrn}`;
  const kpis: ProviderData["kpis"] = {};

  // Total followers.
  try {
    const res = await lget(
      `${API}/rest/networkSizes/${encodeURIComponent(urn)}?edgeType=CompanyFollowedByMember`,
      token,
    );
    if (res.ok) {
      const d = (await res.json()) as { firstDegreeSize?: number };
      if (typeof d.firstDegreeSize === "number") kpis.li_follow = { value: d.firstDegreeSize };
    }
  } catch {
    /* skip */
  }

  // Share statistics for the LAST 28 DAYS (without timeIntervals the API returns
  // LIFETIME totals — which would dwarf every other 28-day KPI in the report).
  try {
    const end = Date.now();
    const start = end - 28 * 86_400_000;
    const timeIntervals = `(timeRange:(start:${start},end:${end}),timeGranularityType:DAY)`;
    const url =
      `${API}/rest/organizationalEntityShareStatistics?q=organizationalEntity` +
      `&organizationalEntity=${encodeURIComponent(urn)}` +
      `&timeIntervals=${encodeURIComponent(timeIntervals)}`;
    const res = await lget(url, token);
    if (res.ok) {
      const d = (await res.json()) as {
        elements?: { totalShareStatistics?: { impressionCount?: number; engagement?: number } }[];
      };
      // Sum the daily buckets over the window.
      let impressions = 0;
      let engagementSum = 0;
      let engagementN = 0;
      for (const el of d.elements ?? []) {
        const s = el.totalShareStatistics;
        if (!s) continue;
        if (typeof s.impressionCount === "number") impressions += s.impressionCount;
        if (typeof s.engagement === "number") {
          engagementSum += s.engagement;
          engagementN++;
        }
      }
      if (impressions > 0) kpis.li_impressions = { value: impressions };
      if (engagementN > 0)
        kpis.li_engagement_rate = { value: Math.round((engagementSum / engagementN) * 1000) / 10 };
    }
  } catch {
    /* skip */
  }

  return { kpis };
}
