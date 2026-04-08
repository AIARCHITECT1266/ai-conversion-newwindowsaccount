// ============================================================
// Session-Validierung – Edge-kompatibel (kein crypto Import)
// Wird von der Middleware verwendet. Nutzt @upstash/redis
// mit dem fetch-basierten HTTP-Client (Edge-kompatibel).
// ============================================================

import { Redis } from "@upstash/redis";

const SESSION_PREFIX = "admin-session:";

// Redis-Client (Lazy-Init)
let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  _redis = new Redis({ url, token });
  return _redis;
}

/**
 * Prüft ob ein Session-Token gültig ist (Edge-kompatibel).
 * Verwendet Upstash Redis REST API (fetch-basiert, kein Node.js nötig).
 */
export async function validateAdminSession(token: string): Promise<boolean> {
  if (!token || token.length !== 64) return false;

  const redis = getRedis();

  if (redis) {
    const exists = await redis.exists(`${SESSION_PREFIX}${token}`);
    return exists === 1;
  }

  // Kein Redis konfiguriert → kein Login möglich auf Vercel
  return false;
}
