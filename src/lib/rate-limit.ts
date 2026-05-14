// In-memory rate limiter. For production, replace backing store with Redis.
// This works per-process; multi-instance deployments should use Redis upstash or similar.

interface Record {
  count: number;
  resetAt: number;
  lockedUntil?: number;
}

const store = new Map<string, Record>();

setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of store.entries()) {
    if (rec.resetAt < now && (!rec.lockedUntil || rec.lockedUntil < now)) {
      store.delete(key);
    }
  }
}, 60_000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  lockedUntil?: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  lockMs?: number
): RateLimitResult {
  const now = Date.now();
  let rec = store.get(key);

  if (rec?.lockedUntil && rec.lockedUntil > now) {
    return { allowed: false, remaining: 0, resetAt: rec.resetAt, lockedUntil: rec.lockedUntil };
  }

  if (!rec || rec.resetAt < now) {
    rec = { count: 0, resetAt: now + windowMs };
    store.set(key, rec);
  }

  rec.count++;

  if (rec.count > limit) {
    if (lockMs) {
      rec.lockedUntil = now + lockMs;
    }
    return { allowed: false, remaining: 0, resetAt: rec.resetAt, lockedUntil: rec.lockedUntil };
  }

  return { allowed: true, remaining: limit - rec.count, resetAt: rec.resetAt };
}

export function resetRateLimit(key: string): void {
  store.delete(key);
}
