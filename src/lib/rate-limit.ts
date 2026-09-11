const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, number[]>();

export function rateLimit(key: string, max = MAX_ATTEMPTS, windowMs = WINDOW_MS) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((time) => now - time < windowMs);

  if (recent.length >= max) {
    return { ok: false, remaining: 0 };
  }

  recent.push(now);
  attempts.set(key, recent);
  return { ok: true, remaining: max - recent.length };
}
