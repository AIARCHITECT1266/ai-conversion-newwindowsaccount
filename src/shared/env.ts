// ============================================================
// Zentrale Umgebungsvariablen-Validierung via Zod
// Wird beim ersten Zugriff ausgewertet – Fehler sofort beim Start
// ============================================================

import { z } from "zod";

// Pflicht-Variablen
const envSchema = z.object({
  // Datenbank
  DATABASE_URL: z.string().min(1, "DATABASE_URL fehlt"),

  // Verschlüsselung
  ENCRYPTION_KEY: z.string().length(64, "ENCRYPTION_KEY muss 64 Hex-Zeichen lang sein"),

  // Admin
  ADMIN_SECRET: z.string().min(16, "ADMIN_SECRET muss mindestens 16 Zeichen lang sein"),

  // WhatsApp
  WHATSAPP_TOKEN: z.string().min(1, "WHATSAPP_TOKEN fehlt"),
  WHATSAPP_PHONE_ID: z.string().min(1, "WHATSAPP_PHONE_ID fehlt"),
  WHATSAPP_APP_SECRET: z.string().min(1, "WHATSAPP_APP_SECRET fehlt"),

  // Webhook-Verifizierung (Meta)
  WHATSAPP_VERIFY_TOKEN: z.string().min(1, "WHATSAPP_VERIFY_TOKEN fehlt"),

  // KI-APIs
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY fehlt"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY fehlt"),

  // DSGVO Cron
  CRON_SECRET: z.string().min(16, "CRON_SECRET muss mindestens 16 Zeichen lang sein"),

  // Upstash Redis (Rate-Limiting)
  UPSTASH_REDIS_REST_URL: z.string().url("UPSTASH_REDIS_REST_URL muss eine gültige URL sein"),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "UPSTASH_REDIS_REST_TOKEN fehlt"),
});

// Optionale Variablen
const optionalEnvSchema = z.object({
  // Paddle
  PADDLE_API_KEY: z.string().optional(),
  PADDLE_WEBHOOK_SECRET: z.string().optional(),
  PADDLE_ENVIRONMENT: z.enum(["sandbox", "production"]).optional(),

  // Resend
  RESEND_API_KEY: z.string().optional(),

  // Notion
  NOTION_API_KEY: z.string().optional(),
  NOTION_SESSION_DB_ID: z.string().optional(),

  // Zusätzliche KI-APIs
  GOOGLE_AI_API_KEY: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),
});

// Zusammengeführtes Schema
const fullEnvSchema = envSchema.merge(optionalEnvSchema);

export type Env = z.infer<typeof fullEnvSchema>;

// Lazy-Singleton: Validierung beim ersten Zugriff
let _validated: Env | null = null;

/**
 * Validiert und gibt alle Umgebungsvariablen typsicher zurück.
 * Wirft einen Fehler mit Details zu allen fehlenden/ungültigen Variablen.
 */
export function getEnv(): Env {
  if (_validated) return _validated;

  const result = fullEnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `[Env] Umgebungsvariablen-Validierung fehlgeschlagen:\n${errors}`
    );
  }

  _validated = result.data;
  return _validated;
}

/**
 * Prüft ob eine optionale Env-Variable gesetzt ist.
 * Nützlich für Features die nur bei Konfiguration aktiv sein sollen.
 */
export function hasEnv(key: keyof Env): boolean {
  return !!process.env[key];
}
