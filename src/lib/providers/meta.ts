import type { AccountOption, ProviderData } from "@/lib/providers/types";

const G = "https://graph.facebook.com/v21.0";

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
  const res = await fetch(u, { cache: "no-store" });
  if (!res.ok) return null;
  const d = (await res.json()) as { access_token?: string };
  return d.access_token ?? null;
}

type Page = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username?: string };
};

async function getPages(userToken: string): Promise<Page[]> {
  const u = new URL(`${G}/me/accounts`);
  u.searchParams.set("fields", "id,name,access_token,instagram_business_account{id,username}");
  u.searchParams.set("access_token", userToken);
  const res = await fetch(u, { cache: "no-store" });
  if (!res.ok) throw new Error(`Meta ${res.status}`);
  const d = (await res.json()) as { data?: Page[] };
  return d.data ?? [];
}

// Facebook Pages (+ linked Instagram) the user manages — attribution picker.
export async function listMetaPages(userToken: string): Promise<AccountOption[]> {
  const pages = await getPages(userToken);
  return pages.map((p) => ({
    id: p.id,
    label: p.instagram_business_account?.username
      ? `${p.name} · IG @${p.instagram_business_account.username}`
      : p.name,
  }));
}

function lastValue(m: { values?: { value: number }[] }): number {
  const vals = m.values ?? [];
  return Number(vals[vals.length - 1]?.value ?? 0);
}

// Facebook page + linked Instagram insights for the attributed page id.
// Defensive: every metric is best-effort so a missing permission/metric on a
// given account degrades gracefully instead of breaking the report.
export async function fetchMeta(userToken: string, pageId: string): Promise<ProviderData> {
  const pages = await getPages(userToken);
  const page = pages.find((p) => p.id === pageId);
  if (!page) return { kpis: {} };
  const kpis: ProviderData["kpis"] = {};

  // Facebook page reach + post engagement (last 28 days).
  try {
    const u = new URL(`${G}/${page.id}/insights`);
    u.searchParams.set("metric", "page_impressions_unique,page_post_engagements");
    u.searchParams.set("period", "days_28");
    u.searchParams.set("access_token", page.access_token);
    const res = await fetch(u, { cache: "no-store" });
    if (res.ok) {
      const d = (await res.json()) as { data?: { name: string; values?: { value: number }[] }[] };
      for (const m of d.data ?? []) {
        if (m.name === "page_impressions_unique") kpis.fb_reach = { value: lastValue(m), delta: 0 };
        if (m.name === "page_post_engagements") kpis.fb_engagement = { value: lastValue(m), delta: 0 };
      }
    }
  } catch {
    /* skip */
  }

  // Facebook page fans (followers).
  try {
    const u = new URL(`${G}/${page.id}`);
    u.searchParams.set("fields", "fan_count");
    u.searchParams.set("access_token", page.access_token);
    const res = await fetch(u, { cache: "no-store" });
    if (res.ok) {
      const d = (await res.json()) as { fan_count?: number };
      if (typeof d.fan_count === "number") kpis.fb_likes = { value: d.fan_count, delta: 0 };
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
      u.searchParams.set("access_token", page.access_token);
      const res = await fetch(u, { cache: "no-store" });
      if (res.ok) {
        const d = (await res.json()) as { followers_count?: number };
        if (typeof d.followers_count === "number") kpis.ig_follow = { value: d.followers_count, delta: 0 };
      }
    } catch {
      /* skip */
    }
    try {
      const u = new URL(`${G}/${ig}/insights`);
      u.searchParams.set("metric", "reach");
      u.searchParams.set("period", "days_28");
      u.searchParams.set("access_token", page.access_token);
      const res = await fetch(u, { cache: "no-store" });
      if (res.ok) {
        const d = (await res.json()) as { data?: { name: string; values?: { value: number }[] }[] };
        for (const m of d.data ?? []) {
          if (m.name === "reach") kpis.ig_reach = { value: lastValue(m), delta: 0 };
        }
      }
    } catch {
      /* skip */
    }
  }

  return { kpis };
}
