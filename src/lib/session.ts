// ============================================================
// Admin Session-Token Verwaltung via Upstash Redis
// Cluster-weit: Funktioniert über alle Serverless-Instanzen.
// Fallback: In-Memory für lokale Entwicklung ohne Redis.
// ============================================================

import { randomBytes, timingSafeEqual } from "crypto";
import { Redis } from "@upstash/redis";

// Konfiguration
const SESSION_TTL_S = 8 * 60 * 60; // 8 Stunden in Sekunden
const SESSION_PREFIX = "admin-session:";

// ---------- Redis-Client (Lazy-Init, shared mit rate-limit) ----------

let _redis: Redis | null = null;
// In-Memory-Fallback für lokale Entwicklung ohne Redis
const _fallbackSessions = new Map<string, number>();

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
 * Erstellt einen neuen Session-Token und speichert ihn in Redis.
 * @returns 64 Zeichen langer Hex-Token
 */
export async function createAdminSession(): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const redis = getRedis();

  if (redis) {
    // Token in Redis speichern mit automatischem TTL
    await redis.set(`${SESSION_PREFIX}${token}`, "1", { ex: SESSION_TTL_S });
  } else {
    // Fallback: In-Memory (nur lokal)
    _fallbackSessions.set(token, Date.now() + SESSION_TTL_S * 1000);
  }

  return token;
}

/**
 * Prüft ob ein Session-Token gültig ist.
 * Verwendet Redis-Lookup (cluster-weit persistent).
 */
export async function validateAdminSession(token: string): Promise<boolean> {
  if (!token || token.length !== 64) return false;

  const redis = getRedis();

  if (redis) {
    const exists = await redis.exists(`${SESSION_PREFIX}${token}`);
    return exists === 1;
  }

  // Fallback: In-Memory
  const expiresAt = _fallbackSessions.get(token);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    _fallbackSessions.delete(token);
    return false;
  }
  return true;
}

/**
 * Invalidiert einen Session-Token (Logout).
 */
export async function invalidateAdminSession(token: string): Promise<void> {
  const redis = getRedis();

  if (redis) {
    await redis.del(`${SESSION_PREFIX}${token}`);
  } else {
    _fallbackSessions.delete(token);
  }
}

/**
 * Timing-sicherer String-Vergleich.
 * Für Secrets, API-Keys, HMAC-Signaturen etc.
 */
export function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;

  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}
