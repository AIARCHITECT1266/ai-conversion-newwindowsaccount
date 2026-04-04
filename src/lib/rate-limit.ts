// ============================================================
// Einfacher In-Memory Rate-Limiter (Sliding Window)
// Fuer Serverless: Pro Instanz, kein Cluster-weites Limit
// Fuer produktives Rate-Limiting: Upstash Redis empfohlen
// ============================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Alte Eintraege regelmaessig aufraeumen
const CLEANUP_INTERVAL = 60_000; // 1 Minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

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
 * Prueft ob ein Request erlaubt ist.
 * @param key Eindeutiger Schluessel (z.B. IP-Adresse oder Route + IP)
 * @param options Limit-Konfiguration
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  // Kein Eintrag oder Fenster abgelaufen: neues Fenster starten
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, remaining: options.max - 1, resetAt: now + options.windowMs };
  }

  // Innerhalb des Fensters
  entry.count++;
  if (entry.count > options.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: options.max - entry.count, resetAt: entry.resetAt };
}

/**
 * Hilfsfunktion: IP-Adresse aus Request extrahieren
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}
