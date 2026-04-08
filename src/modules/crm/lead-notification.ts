// ============================================================
// Lead-Benachrichtigungen via Resend
// Sendet E-Mails bei Hot-Leads (Score > 70).
// Benötigt RESEND_API_KEY in den Umgebungsvariablen.
// ============================================================

import { Resend } from "resend";

// Lazy-Init: Resend-Client nur erstellen wenn API-Key vorhanden
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (_resend) return _resend;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  _resend = new Resend(apiKey);
  return _resend;
}

interface LeadNotificationData {
  tenantName: string;
  score: number;
  qualification: string;
  lastMessage: string;
  conversationId: string;
}

// Qualifikationsstufen-Labels
const qualificationLabels: Record<string, string> = {
  UNQUALIFIED: "Unqualifiziert",
  MARKETING_QUALIFIED: "Marketing Qualified",
  SALES_QUALIFIED: "Sales Qualified",
  OPPORTUNITY: "Opportunity",
  CUSTOMER: "Kunde",
};

/**
 * Sendet eine E-Mail-Benachrichtigung bei Hot-Leads.
 * Fehlschläge werden geloggt, blockieren aber nicht den Haupt-Flow.
 */
export async function notifyHighScoreLead(data: LeadNotificationData): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[Lead-Notification] RESEND_API_KEY nicht konfiguriert – Benachrichtigung übersprungen");
    return;
  }

  const qualLabel = qualificationLabels[data.qualification] || data.qualification;

  try {
    await resend.emails.send({
      from: "AI Conversion <noreply@ai-conversion.ai>",
      to: ["hello@ai-conversion.ai"],
      subject: `Hot Lead (Score ${data.score}) bei ${data.tenantName}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px;">
          <h2 style="color: #8b5cf6;">Neuer Hot Lead erkannt</h2>
          <table style="border-collapse: collapse; width: 100%;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 600;">Tenant</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(data.tenantName)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 600;">Lead-Score</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${data.score}/100</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 600;">Qualifikation</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(qualLabel)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 600;">Conversation-ID</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 12px;">${escapeHtml(data.conversationId)}</td>
            </tr>
          </table>
          <p style="color: #666; font-size: 13px; margin-top: 16px;">
            Dieser Lead sollte zeitnah von einem Vertriebsmitarbeiter kontaktiert werden.
          </p>
        </div>
      `,
    });

    console.log("[Lead-Notification] Benachrichtigung gesendet", {
      tenantName: data.tenantName,
      score: data.score,
    });
  } catch (error) {
    console.error("[Lead-Notification] E-Mail-Versand fehlgeschlagen", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
  }
}

// XSS-Schutz fuer HTML-E-Mails
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
