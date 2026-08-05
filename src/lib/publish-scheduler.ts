import { db } from "@/lib/db";
import { getValidTokenByConnection } from "@/lib/connection-tokens";
import { getPublisher } from "@/lib/publishers";
import type { PublishResult } from "@/lib/publishers/types";

// The publish scheduler: a 60 s in-process tick (started from
// instrumentation.ts — single always-on container, so no external cron).
//
// Safety model = at-most-once: a target is CLAIMED with an atomic
// status flip before any network call, and a claim that dies mid-flight
// (deploy, crash) is swept to `failed` with an honest message — never
// auto-retried, because we can't know whether the post reached the network.

const TICK_MS = 60_000;
// Backoff minutes per attempt; beyond the last → failed.
const BACKOFF_MIN = [2, 10, 30, 120, 360];
const MAX_ATTEMPTS = 5;
// A rate-parked target (429 with Retry-After) may wait at most this long.
const RATE_PARK_MAX_MS = 7 * 86_400_000;

const INTERRUPTED_MSG =
  "Publication interrompue par un redémarrage — vérifiez sur le réseau si le post est paru, puis relancez si besoin.";

let running = false;

async function recomputePostStatus(postId: string): Promise<void> {
  const targets = await db.postTarget.findMany({ where: { postId } });
  if (targets.length === 0) return;
  const live = targets.filter((t) => t.status !== "cancelled");
  const pool = live.length ? live : targets;
  let status: string;
  if (pool.some((t) => t.status === "running")) status = "PUBLISHING";
  else if (pool.some((t) => t.status === "scheduled")) status = "SCHEDULED";
  // A post that reached one network and failed another is NOT "Publié" —
  // saying so hides the failure behind a green badge.
  else if (pool.some((t) => t.status === "failed") && pool.some((t) => t.status === "published"))
    status = "PARTIAL";
  else if (pool.some((t) => t.status === "published")) status = "PUBLISHED";
  else if (pool.every((t) => t.status === "cancelled")) status = "CANCELLED";
  else status = "FAILED";
  await db.post.update({ where: { id: postId }, data: { status } }).catch(() => {});
}

async function failTarget(
  t: { id: string; postId: string; attempts: number; connectionId: string | null },
  res: Extract<PublishResult, { ok: false }>,
): Promise<void> {
  if (res.kind === "auth" && t.connectionId) {
    // Dead token: surface it on the Sources page and stop hitting the API.
    await db.connection
      .update({ where: { id: t.connectionId }, data: { status: "error" } })
      .catch(() => {});
  }

  const retriable = res.kind === "transient" || res.kind === "rate";
  const attemptConsumed = !(res.kind === "rate" && res.retryAfterSec);
  const attempts = t.attempts + (attemptConsumed ? 1 : 0);

  if (retriable && attempts < MAX_ATTEMPTS) {
    const delayMs = res.retryAfterSec
      ? Math.min(res.retryAfterSec * 1000, RATE_PARK_MAX_MS)
      : BACKOFF_MIN[Math.min(attempts, BACKOFF_MIN.length - 1)] * 60_000;
    await db.postTarget.update({
      where: { id: t.id },
      data: {
        status: "scheduled",
        attempts,
        nextAttemptAt: new Date(Date.now() + delayMs),
        lockedAt: null,
        lastError: res.message,
      },
    });
  } else {
    await db.postTarget.update({
      where: { id: t.id },
      data: { status: "failed", attempts, lockedAt: null, lastError: res.message },
    });
  }
  await recomputePostStatus(t.postId);
}

async function publishOne(targetId: string): Promise<void> {
  const t = await db.postTarget.findUnique({
    where: { id: targetId },
    include: { post: true },
  });
  if (!t || t.status !== "running") return;

  if (!t.connectionId) {
    await failTarget(t, {
      ok: false,
      kind: "permanent",
      message: "Le compte lié a été déconnecté — cette destination n'est plus joignable.",
    });
    return;
  }
  const live = await getValidTokenByConnection(t.connectionId);
  if (!live) {
    await failTarget(t, {
      ok: false,
      kind: "auth",
      message: "Jeton expiré — reconnectez le compte dans Sources de données.",
    });
    return;
  }

  const publisher = getPublisher(t.provider);
  const media = Array.isArray(t.post.media) ? (t.post.media as string[]) : [];
  const res = await publisher(
    {
      provider: t.provider,
      externalId: t.externalId,
      label: t.label,
      token: live.token,
      meta: live.meta,
    },
    { body: t.post.body, media },
  );

  if (res.ok) {
    await db.postTarget.update({
      where: { id: t.id },
      data: {
        status: "published",
        lockedAt: null,
        lastError: null,
        externalPostId: res.externalPostId,
        publishedUrl: res.publishedUrl ?? null,
        publishedAt: new Date(),
      },
    });
    await recomputePostStatus(t.postId);
  } else {
    await failTarget(t, res);
  }
}

async function tick(): Promise<void> {
  if (running) return; // re-entrance guard: a slow tick must not stack
  running = true;
  try {
    const now = new Date();

    // Defensive in-tick sweep: a lock older than 10 min means a publish died
    // without finishing (shouldn't happen — publishOne always settles).
    await db.postTarget.updateMany({
      where: { status: "running", lockedAt: { lt: new Date(Date.now() - 600_000) } },
      data: { status: "failed", lockedAt: null, lastError: INTERRUPTED_MSG },
    });

    const due = await db.postTarget.findMany({
      where: { status: "scheduled", nextAttemptAt: { lte: now } },
      select: { id: true, postId: true },
      take: 10, // bound one tick's work; the next tick takes the rest
    });

    for (const d of due) {
      // Atomic claim: only ONE tick can flip scheduled → running.
      const claimed = await db.postTarget.updateMany({
        where: { id: d.id, status: "scheduled" },
        data: { status: "running", lockedAt: new Date() },
      });
      if (claimed.count !== 1) continue;
      await db.post
        .update({ where: { id: d.postId }, data: { status: "PUBLISHING" } })
        .catch(() => {});
      // Network I/O strictly outside any transaction (SQLite single writer).
      // One broken row must not abort the rest of the batch.
      try {
        await publishOne(d.id);
      } catch (err) {
        console.error(`[publish-scheduler] target ${d.id} threw:`, err);
        await db.postTarget
          .updateMany({
            where: { id: d.id, status: "running" },
            data: { status: "failed", lockedAt: null, lastError: "Erreur interne pendant la publication." },
          })
          .catch(() => {});
      }
    }
  } catch (err) {
    console.error("[publish-scheduler] tick error:", err);
  } finally {
    running = false;
  }
}

// Boot recovery: after a restart NO in-flight publish survived, so every
// `running` row is an interrupted attempt. At-most-once ⇒ mark failed with an
// honest message; a human decides whether to retry.
async function recoverStaleRuns(): Promise<void> {
  const swept = await db.postTarget.updateMany({
    where: { status: "running" },
    data: { status: "failed", lockedAt: null, lastError: INTERRUPTED_MSG },
  });
  if (swept.count > 0) {
    console.log(`[publish-scheduler] swept ${swept.count} interrupted publish(es) after restart`);
    const posts = await db.post.findMany({
      where: { status: "PUBLISHING" },
      select: { id: true },
    });
    for (const p of posts) await recomputePostStatus(p.id);
  }
}

// Singleton across HMR / route re-imports (same pattern as db.ts).
const g = globalThis as unknown as { __publishScheduler?: ReturnType<typeof setInterval> };

export function startPublishScheduler(): void {
  if (g.__publishScheduler) return;
  console.log("[publish-scheduler] started (60s tick)");
  void recoverStaleRuns().catch((e) =>
    console.error("[publish-scheduler] boot sweep failed:", e),
  );
  g.__publishScheduler = setInterval(() => void tick(), TICK_MS);
  // Never keep the process alive just for the timer.
  g.__publishScheduler.unref?.();
}
