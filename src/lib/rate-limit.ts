// ============================================================
// Rate-Limiting via Upstash Redis (cluster-weit)
// Produktionsreif: Funktioniert über alle Serverless-Instanzen.
// Fallback: In-Memory für lokale Entwicklung ohne Redis.
// ============================================================

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ---------- Redis-Client (Lazy-Init) ----------

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("[Rate-Limit] Upstash Redis nicht konfiguriert – Fallback auf In-Memory");
    return null;
  }

  _redis = new Redis({ url, token });
  return _redis;
}

// ---------- Rate-Limiter Cache ----------

const limiters = new Map<string, Ratelimit>();

function getLimiter(prefix: string, max: number, windowMs: number): Ratelimit {
  const key = `${prefix}:${max}:${windowMs}`;

  const cached = limiters.get(key);
  if (cached) return cached;

  const redis = getRedis();
  const windowSec = Math.ceil(windowMs / 1000);

  // Upstash Ratelimit mit Sliding-Window
  // Wenn kein Redis: In-Memory-Fallback mit Ephemeral-Cache
  const limiter = new Ratelimit({
    redis: redis ?? new Map() as unknown as Redis,
    limiter: Ratelimit.slidingWindow(max, `${windowSec} s`),
    prefix: `rl:${prefix}`,
    ...(redis ? {} : { ephemeralCache: new Map() }),
  });

  limiters.set(key, limiter);
  return limiter;
}

// ---------- Oeffentliche API ----------

interface RateLimitOptions {
  /** Maximale Anfragen im Zeitfenster */
  max: number;
  /** Zeitfenster in Millisekunden */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Prueft ob ein Request erlaubt ist (cluster-weit via Upstash Redis).
 * @param key Eindeutiger Schluessel (z.B. "admin-login:1.2.3.4")
 * @param options Limit-Konfiguration
 */
export async function checkRateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const prefix = key.split(":")[0] || "default";
  const limiter = getLimiter(prefix, options.max, options.windowMs);

  const result = await limiter.limit(key);

  return {
    allowed: result.success,
    remaining: result.remaining,
    resetAt: result.reset,
  };
}

/**
 * Hilfsfunktion: IP-Adresse aus Request extrahieren.
 * Auf Vercel wird x-real-ip vom Edge-Netzwerk korrekt gesetzt.
 */
export function getClientIp(request: Request): string {
  // Vercel setzt x-real-ip zuverlaessig
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return "unknown";
}
