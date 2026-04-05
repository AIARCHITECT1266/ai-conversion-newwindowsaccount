// ============================================================
// Admin Session-Token Verwaltung
// Generiert sichere Session-Tokens anstatt das ADMIN_SECRET
// direkt als Cookie zu speichern. Verhindert Secret-Leak
// über Browser, DevTools oder XSS.
// ============================================================

import { randomBytes, timingSafeEqual } from "crypto";

// Session-Token → Ablaufzeit
const sessions = new Map<string, number>();

// Konfiguration
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 Stunden
const CLEANUP_INTERVAL_MS = 60_000; // Aufräumen alle 60 Sekunden
let lastCleanup = Date.now();

/**
 * Räumt abgelaufene Sessions auf.
 */
function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [token, expiresAt] of sessions) {
    if (expiresAt <= now) {
      sessions.delete(token);
    }
  }
}

/**
 * Erstellt einen neuen Session-Token.
 * @returns 64 Zeichen langer Hex-Token
 */
export function createAdminSession(): string {
  cleanup();
  const token = randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

/**
 * Prüft ob ein Session-Token gültig ist.
 * Verwendet timing-safe Vergleich gegen alle gespeicherten Tokens.
 */
export function validateAdminSession(token: string): boolean {
  cleanup();

  if (!token || token.length !== 64) return false;

  const tokenBuffer = Buffer.from(token, "utf8");

  for (const [storedToken, expiresAt] of sessions) {
    if (expiresAt <= Date.now()) {
      sessions.delete(storedToken);
      continue;
    }

    const storedBuffer = Buffer.from(storedToken, "utf8");
    if (tokenBuffer.length === storedBuffer.length &&
        timingSafeEqual(tokenBuffer, storedBuffer)) {
      return true;
    }
  }

  return false;
}

/**
 * Invalidiert einen Session-Token (Logout).
 */
export function invalidateAdminSession(token: string): void {
  sessions.delete(token);
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
