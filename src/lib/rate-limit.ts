// In-memory sliding-window failure counter (single-container deploy, so a
// process-local Map is the right tool — no Redis needed at this scale).
type Entry = { count: number; first: number };

const buckets = new Map<string, Entry>();
const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 5;
const MAX_ENTRIES = 5000; // hard cap so a flood of distinct keys can't grow unbounded

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
  const e = buckets.get(key);
  if (e && now - e.first <= WINDOW_MS) {
    e.count++;
    return;
  }
  // New window for this key. Evict the oldest inserted entry when at capacity
  // (Map preserves insertion order → first key is the oldest) — bounded memory
  // and O(1), regardless of window expiry.
  if (buckets.size >= MAX_ENTRIES) {
    const oldest = buckets.keys().next().value;
    if (oldest !== undefined) buckets.delete(oldest);
  }
  buckets.set(key, { count: 1, first: now });
}

export function clearFailures(key: string) {
  buckets.delete(key);
}
