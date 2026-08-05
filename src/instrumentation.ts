// Next.js instrumentation hook — runs once per server process.
// Starts the publish scheduler in the real Node runtime only: never in the
// Edge runtime, and never during `next build` (CI has no DB volume and no env).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { startPublishScheduler } = await import("@/lib/publish-scheduler");
  startPublishScheduler();
}
