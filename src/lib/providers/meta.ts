import type { AccountOption, ProviderData } from "@/lib/providers/types";
import type { DateRange } from "@/lib/date-range";

// Graph's `days_28` is a fixed preset: for any other period we must ask for
// daily values over since/until and sum them ourselves.
function applyRange(u: URL, range: DateRange): void {
  if (range.days === 28) {
    u.searchParams.set("period", "days_28");
    return;
  }
  u.searchParams.set("period", "day");
  u.searchParams.set("since", String(Math.floor(Date.parse(range.start) / 1000)));
  u.searchParams.set("until", String(Math.floor(Date.parse(range.end) / 1000) + 86_400));
}

const G = "https://graph.facebook.com/v21.0";
const TIMEOUT = 8000;

function gget(url: URL): Promise<Response> {
  return fetch(url, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT) });
}

// Swap a short-lived user token (from the OAuth callback) for a ~60-day one.
export async function exchangeLongLivedToken(shortToken: string): Promise<string | null> {
  const id = process.env.META_CLIENT_ID;
  const secret = process.env.META_CLIENT_SECRET;
  if (!id || !secret) return null;
  const u = new URL(`${G}/oauth/access_token`);
  u.searchParams.set("grant_type", "fb_exchange_token");
  u.searchParams.set("client_id", id);
  u.searchParams.set("client_secret", secret);
  u.searchParams.set("fb_exchange_token", shortToken);
  const res = await gget(u);
  if (!res.ok) return null;
  const d = (await res.json()) as { access_token?: string };
  return d.access_token ?? null;
}

type Page = {
  id: string;
  name: string;
  access_token: string;
  fan_count?: number;
  instagram_business_account?: { id: string; username?: string };
};

// Facebook Pages (+ linked Instagram) the user manages — attribution picker.
// Follows paging so users with >25 Pages aren't silently truncated.
export async function listMetaPages(userToken: string): Promise<AccountOption[]> {
  const out: AccountOption[] = [];
  let next: string | null = (() => {
    const u = new URL(`${G}/me/accounts`);
    u.searchParams.set("fields", "id,name,instagram_business_account{username}");
    u.searchParams.set("limit", "100");
    u.searchParams.set("access_token", userToken);
    return u.toString();
  })();

  // Cap at a few pages of results to stay bounded.
  for (let guard = 0; next && guard < 10; guard++) {
    const res = await gget(new URL(next));
    if (!res.ok) break;
    const d = (await res.json()) as { data?: Page[]; paging?: { next?: string } };
    for (const p of d.data ?? []) {
      out.push({
        id: p.id,
        label: p.instagram_business_account?.username
          ? `${p.name} · IG @${p.instagram_business_account.username}`
          : p.name,
      });
    }
    next = d.paging?.next ?? null;
  }
  return out;
}

// With the `days_28` preset Graph returns ONE rolling value (take the last);
// with period=day over since/until it returns one row per day, which must be
// SUMMED. Taking the last value there would report a single day as the total.
function periodValue(m: { values?: { value: number }[] }, range: DateRange): number {
  const vals = m.values ?? [];
  if (vals.length === 0) return 0;
  if (range.days === 28) return Number(vals[vals.length - 1]?.value ?? 0);
  return vals.reduce((sum, v) => sum + Number(v?.value ?? 0), 0);
}

// Facebook page + linked Instagram insights for the attributed page id.
// Fetches the page DIRECTLY by id (no /me/accounts listing, so no 25-page
// truncation) and reads its page-scoped access token. Defensive: every metric
// is best-effort. delta is omitted (Meta has no cheap prior-period compare) so
// the KPI card shows "tendance n/d" rather than a fake 0 %.
export async function fetchMeta(
  userToken: string,
  pageId: string,
  range: DateRange,
): Promise<ProviderData> {
  const kpis: ProviderData["kpis"] = {};

  const pu = new URL(`${G}/${pageId}`);
  pu.searchParams.set("fields", "id,name,access_token,fan_count,instagram_business_account{id,username}");
  pu.searchParams.set("access_token", userToken);
  const pres = await gget(pu);
  if (!pres.ok) return { kpis };
  const page = (await pres.json()) as Page;
  const pageToken = page.access_token || userToken;

  if (typeof page.fan_count === "number") kpis.fb_likes = { value: page.fan_count };

  // Facebook page reach + post engagement (last 28 days).
  try {
    const u = new URL(`${G}/${page.id}/insights`);
    u.searchParams.set("metric", "page_impressions_unique,page_post_engagements");
    applyRange(u, range);
    u.searchParams.set("access_token", pageToken);
    const res = await gget(u);
    if (res.ok) {
      const d = (await res.json()) as { data?: { name: string; values?: { value: number }[] }[] };
      for (const m of d.data ?? []) {
        if (m.name === "page_impressions_unique") kpis.fb_reach = { value: periodValue(m, range) };
        if (m.name === "page_post_engagements") kpis.fb_engagement = { value: periodValue(m, range) };
      }
    }
  } catch {
    /* skip */
  }

  // Instagram (if a business account is linked to the page).
  const ig = page.instagram_business_account?.id;
  if (ig) {
    try {
      const u = new URL(`${G}/${ig}`);
      u.searchParams.set("fields", "followers_count");
      u.searchParams.set("access_token", pageToken);
      const res = await gget(u);
      if (res.ok) {
        const d = (await res.json()) as { followers_count?: number };
        if (typeof d.followers_count === "number") kpis.ig_follow = { value: d.followers_count };
      }
    } catch {
      /* skip */
    }
    try {
      const u = new URL(`${G}/${ig}/insights`);
      u.searchParams.set("metric", "reach");
      applyRange(u, range);
      u.searchParams.set("access_token", pageToken);
      const res = await gget(u);
      if (res.ok) {
        const d = (await res.json()) as { data?: { name: string; values?: { value: number }[] }[] };
        for (const m of d.data ?? []) {
          if (m.name === "reach") kpis.ig_reach = { value: periodValue(m, range) };
        }
      }
    } catch {
      /* skip */
    }
  }

  return { kpis };
}
