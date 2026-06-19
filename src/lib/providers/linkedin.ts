import type { AccountOption, ProviderData } from "@/lib/providers/types";

const API = "https://api.linkedin.com";
const VERSION = "202405"; // LinkedIn versioned APIs require a YYYYMM header

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": VERSION,
  };
}

// Company Pages the user administers — attribution picker.
// Requires the Community Management API (r_organization_admin) to be approved.
export async function listLinkedinOrgs(token: string): Promise<AccountOption[]> {
  const url = `${API}/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED`;
  const res = await fetch(url, { headers: headers(token), cache: "no-store" });
  if (!res.ok) throw new Error(`LinkedIn ${res.status}`);
  const d = (await res.json()) as { elements?: { organization?: string }[] };

  const orgs: AccountOption[] = [];
  for (const el of d.elements ?? []) {
    const urn = el.organization ?? ""; // urn:li:organization:123
    const id = urn.split(":").pop() ?? "";
    if (!id) continue;
    let label = `Organisation ${id}`;
    try {
      const o = await fetch(`${API}/rest/organizations/${id}`, {
        headers: headers(token),
        cache: "no-store",
      });
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
    const res = await fetch(
      `${API}/rest/networkSizes/${encodeURIComponent(urn)}?edgeType=CompanyFollowedByMember`,
      { headers: headers(token), cache: "no-store" },
    );
    if (res.ok) {
      const d = (await res.json()) as { firstDegreeSize?: number };
      if (typeof d.firstDegreeSize === "number") kpis.li_follow = { value: d.firstDegreeSize, delta: 0 };
    }
  } catch {
    /* skip */
  }

  // Share statistics (impressions + engagement rate).
  try {
    const url = `${API}/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(urn)}`;
    const res = await fetch(url, { headers: headers(token), cache: "no-store" });
    if (res.ok) {
      const d = (await res.json()) as {
        elements?: { totalShareStatistics?: { impressionCount?: number; engagement?: number } }[];
      };
      const stats = d.elements?.[0]?.totalShareStatistics;
      if (stats) {
        if (typeof stats.impressionCount === "number")
          kpis.li_impressions = { value: stats.impressionCount, delta: 0 };
        if (typeof stats.engagement === "number")
          kpis.li_engagement_rate = { value: Math.round(stats.engagement * 1000) / 10, delta: 0 };
      }
    }
  } catch {
    /* skip */
  }

  return { kpis };
}
