import { createHash } from "crypto";
import { db } from "@/lib/db";

// Click recording for short links. Privacy stance: daily aggregates only —
// no raw click rows, no IP, no user-agent ever persisted. "Unique" visitors
// are counted through a salted hash that changes every day, so nothing can be
// correlated across days.

// Link unfurlers and tools fetch every URL shared on a network; counting them
// as humans would double every click number. They land in `bots` instead.
const BOT_RE =
  /bot|crawl|spider|slurp|preview|fetch|scan|monitor|curl|wget|python-requests|axios|headless|facebookexternalhit|whatsapp|telegram|skypeuripreview|discordbot|twitterbot|linkedinbot|slackbot|pinterest|embedly|quora link preview|vkshare|snapchat/i;

export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true; // no UA = not a browser
  return BOT_RE.test(userAgent);
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// Salted per-day visitor hash. The salt derives from ENCRYPTION_KEY + the day,
// so the same visitor collapses to one "unique" within a day and is
// unlinkable across days (and the hash is meaningless without the key).
function visitorHash(ip: string, userAgent: string, day: string): string {
  return createHash("sha256")
    .update(`${process.env.ENCRYPTION_KEY ?? ""}:${day}:${ip}:${userAgent}`)
    .digest("hex")
    .slice(0, 24);
}

// Process-local dedup of uniques (same doctrine as rate-limit.ts: good enough
// for one container, resets on restart — worst case slightly over-counts).
const seen = new Set<string>();
const SEEN_CAP = 20_000;

export async function recordClick(
  linkId: string,
  ip: string,
  userAgent: string | null,
): Promise<void> {
  const day = todayUtc();
  const bot = isBot(userAgent);

  let isNewVisitor = false;
  if (!bot) {
    const h = `${linkId}:${visitorHash(ip, userAgent ?? "", day)}`;
    isNewVisitor = !seen.has(h);
    if (isNewVisitor) {
      if (seen.size > SEEN_CAP) seen.clear();
      seen.add(h);
    }
  }

  const inc = bot
    ? { bots: { increment: 1 } }
    : {
        clicks: { increment: 1 },
        ...(isNewVisitor ? { uniques: { increment: 1 } } : {}),
      };

  // Upsert races with itself under concurrent clicks — one retry rides the
  // unique index instead of dropping the click.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await db.shortLinkClickDay.upsert({
        where: { linkId_day: { linkId, day } },
        update: inc,
        create: {
          linkId,
          day,
          clicks: bot ? 0 : 1,
          uniques: bot ? 0 : isNewVisitor ? 1 : 0,
          bots: bot ? 1 : 0,
        },
      });
      return;
    } catch {
      // retry once; then drop — a lost click must never break the redirect
    }
  }
}
