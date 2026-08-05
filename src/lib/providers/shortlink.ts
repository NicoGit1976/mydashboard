import { db } from "@/lib/db";
import type { ProviderData } from "@/lib/providers/types";
import type { DateRange } from "@/lib/date-range";

// First-party "provider": short-link clicks measured on our own domain.
// No external API, no token, no quota — and it is the ONLY performance signal
// available for networks whose stats APIs are locked behind approvals.

export async function fetchShortlinkData(
  clientId: string,
  range: DateRange,
): Promise<ProviderData | null> {
  const links = await db.shortLink.findMany({
    where: { clientId },
    select: { id: true },
  });
  // No links at all ⇒ null, so the report keeps its honest "demo" state rather
  // than showing a real-looking zero.
  if (links.length === 0) return null;

  const ids = links.map((l) => l.id);
  const days = await db.shortLinkClickDay.findMany({
    where: { linkId: { in: ids }, day: { gte: range.prevStart, lte: range.end } },
    select: { day: true, clicks: true, uniques: true },
  });

  let clicks = 0;
  let uniques = 0;
  let prevClicks = 0;
  let prevUniques = 0;
  let prevDays = 0;
  for (const d of days) {
    if (d.day >= range.start) {
      clicks += d.clicks;
      uniques += d.uniques;
    } else {
      prevClicks += d.clicks;
      prevUniques += d.uniques;
      prevDays++;
    }
  }

  const pct = (cur: number, prev: number) =>
    prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : undefined;

  return {
    kpis: {
      // delta omitted when there is no prior window — an honest "no trend".
      sl_clicks: { value: clicks, ...(prevDays ? { delta: pct(clicks, prevClicks) } : {}) },
      sl_uniques: { value: uniques, ...(prevDays ? { delta: pct(uniques, prevUniques) } : {}) },
    },
  };
}
