// ============================================================
// Strukturiertes Audit-Logging
// JSON-Format fuer Vercel Log Drain / externe Auswertung
// DSGVO: Keine personenbezogenen Daten loggen
// ============================================================

type AuditAction =
  | "admin.login"
  | "admin.login_failed"
  | "admin.tenant_created"
  | "admin.tenant_updated"
  | "admin.tenant_deleted"
  | "admin.token_regenerated"
  | "dashboard.login"
  | "dashboard.login_failed"
  | "webhook.received"
  | "webhook.duplicate"
  | "webhook.invalid_signature"
  | "webhook.handler_error"
  | "bot.conversation_created"
  | "bot.consent_requested"
  | "bot.consent_given"
  | "bot.conversation_stopped"
  | "bot.reply_sent"
  | "bot.reply_failed"
  | "bot.lead_scored"
  | "bot.hubspot_pushed"
  | "cron.cleanup_completed"
  | "rate_limit.exceeded"
  | "gdpr.data_export"
  | "gdpr.dpa_accepted"
  | "widget.config_fetched"
  | "widget.session_started"
  | "widget.message_received"
  | "widget.config_updated"
  | "widget.public_key_generated"
  | "widget.toggled";

// DSGVO: Felder die nie in Details auftauchen duerfen
const SENSITIVE_FIELDS = new Set([
  "phone", "telefon", "email", "name", "address", "adresse",
  "password", "secret", "token", "key", "content", "message", "nachricht",
]);

interface AuditEntry {
  timestamp: string;
  action: AuditAction;
  tenantId?: string;
  ip?: string;
  details?: Record<string, unknown>;
}

/**
 * Filtert potenziell sensible Felder aus Details.
 */
function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

/**
 * Schreibt einen strukturierten Audit-Log-Eintrag.
 * In Production: JSON fuer Vercel Log Drain.
 */
export function auditLog(
  action: AuditAction,
  options?: {
    tenantId?: string;
    ip?: string;
    details?: Record<string, unknown>;
  }
): void {
  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    action,
  };

  if (options?.tenantId) entry.tenantId = options.tenantId;
  if (options?.ip) entry.ip = options.ip;
  if (options?.details) entry.details = sanitizeDetails(options.details);

  // Structured JSON logging – von Vercel Log Drain parsebar
  console.log(JSON.stringify(entry));
}
