// In-memory sliding-window failure counter (single-container deploy, so a
// process-local Map is the right tool — no Redis needed at this scale).
type Entry = { count: number; first: number };

const buckets = new Map<string, Entry>();
const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 5;

function gc(now: number) {
  if (buckets.size < 1000) return;
  for (const [k, e] of buckets) if (now - e.first > WINDOW_MS) buckets.delete(k);
}

export function isBlocked(key: string): boolean {
  const e = buckets.get(key);
  if (!e) return false;
  if (Date.now() - e.first > WINDOW_MS) {
    buckets.delete(key);
    return false;
  }
  return e.count >= MAX_FAILURES;
}

export function recordFailure(key: string) {
  const now = Date.now();
  gc(now);
  const e = buckets.get(key);
  if (!e || now - e.first > WINDOW_MS) buckets.set(key, { count: 1, first: now });
  else e.count++;
}

export function clearFailures(key: string) {
  buckets.delete(key);
}
