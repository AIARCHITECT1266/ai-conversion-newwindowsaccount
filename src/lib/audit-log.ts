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
  | "cron.cleanup_completed"
  | "rate_limit.exceeded";

interface AuditEntry {
  timestamp: string;
  action: AuditAction;
  tenantId?: string;
  ip?: string;
  details?: Record<string, unknown>;
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
    ...options,
  };

  // Structured JSON logging – von Vercel Log Drain parsebar
  console.log(JSON.stringify(entry));
}
