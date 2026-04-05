// ============================================================
// E-Mail-Benachrichtigung bei hochqualifizierten Leads
// Sendet eine Benachrichtigung an hello@ai-conversion.ai
// wenn der Lead-Score > 70 liegt.
// ============================================================

import { Resend } from "resend";

interface LeadNotificationData {
  tenantName: string;
  score: number;
  qualification: string;
  lastMessage: string;
  conversationId: string;
}

const QUALIFICATION_LABELS: Record<string, string> = {
  UNQUALIFIED: "Nicht qualifiziert",
  MARKETING_QUALIFIED: "Marketing-qualifiziert",
  SALES_QUALIFIED: "Sales-qualifiziert",
  OPPORTUNITY: "Opportunity",
  CUSTOMER: "Kunde",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function notifyHighScoreLead(data: LeadNotificationData): void {
  if (data.score <= 70) return;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[Lead-Notification] RESEND_API_KEY nicht konfiguriert, ueberspringe E-Mail");
    return;
  }

  const truncatedMessage =
    data.lastMessage.length > 200
      ? data.lastMessage.slice(0, 200) + "\u2026"
      : data.lastMessage;

  const qualLabel =
    QUALIFICATION_LABELS[data.qualification] || data.qualification;

  const resend = new Resend(apiKey);

  // Fire-and-forget: blockiert den Bot-Flow nicht
  resend.emails
    .send({
      from: "AI Conversion <noreply@ai-conversion.ai>",
      to: "hello@ai-conversion.ai",
      subject: `Neuer Hot-Lead: ${data.tenantName} (Score ${data.score})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #B8860B;">Neuer qualifizierter Lead</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Firma</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(data.tenantName)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Lead-Score</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">
                <span style="background: ${data.score >= 90 ? "#22c55e" : "#eab308"}; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;">
                  ${String(data.score)}/100
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Qualifikation</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(qualLabel)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Letzte Nachricht</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; color: #555;">&ldquo;${escapeHtml(truncatedMessage)}&rdquo;</td>
            </tr>
          </table>
          <p style="margin-top: 16px; color: #888; font-size: 12px;">
            Conversation-ID: ${escapeHtml(data.conversationId)}
          </p>
        </div>
      `,
    })
    .then(() => {
      console.log("[Lead-Notification] E-Mail gesendet", {
        tenantName: data.tenantName,
        score: data.score,
      });
    })
    .catch((error: unknown) => {
      console.error("[Lead-Notification] E-Mail-Versand fehlgeschlagen", {
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
      });
    });
}
