// ============================================================
// HubSpot API – Leads als Kontakte anlegen
// Verschlüsselter API-Key pro Tenant (AES-256-GCM)
// ============================================================

const HUBSPOT_API_URL = "https://api.hubapi.com";
const TIMEOUT_MS = 10_000;

interface HubSpotContactProps {
  leadScore: number;
  qualification: string;
  pipelineStatus: string;
  conversationId: string;
  tenantName: string;
  dealValue?: number | null;
  notes?: string | null;
}

interface PushResult {
  success: boolean;
  contactId?: string;
  error?: string;
}

/**
 * Erstellt oder aktualisiert einen Kontakt in HubSpot.
 * Wird automatisch aufgerufen wenn Lead-Score > 70.
 */
export async function pushLeadToHubSpot(
  apiKey: string,
  lead: HubSpotContactProps
): Promise<PushResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // HubSpot Custom Properties für AI Conversion Leads
    const properties: Record<string, string> = {
      company: lead.tenantName,
      lifecyclestage: mapQualificationToLifecycle(lead.qualification),
      hs_lead_status: lead.pipelineStatus,
      ai_conversion_score: lead.leadScore.toString(),
      ai_conversion_conversation_id: lead.conversationId,
    };

    if (lead.dealValue) {
      properties.ai_conversion_deal_value = lead.dealValue.toString();
    }
    if (lead.notes) {
      properties.ai_conversion_notes = lead.notes;
    }

    const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/contacts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMsg = errorData?.message ?? `API-Fehler ${response.status}`;
      console.error("[HubSpot] Push fehlgeschlagen", {
        status: response.status,
        error: errorMsg,
      });
      return { success: false, error: errorMsg };
    }

    const data = await response.json();
    console.log("[HubSpot] Lead gepusht", { contactId: data.id });
    return { success: true, contactId: data.id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error("[HubSpot] Sendefehler", { error: msg });
    return { success: false, error: msg };
  } finally {
    clearTimeout(timeout);
  }
}

// HubSpot Lifecycle-Stage aus Lead-Qualifikation ableiten
function mapQualificationToLifecycle(qualification: string): string {
  switch (qualification) {
    case "MARKETING_QUALIFIED": return "marketingqualifiedlead";
    case "SALES_QUALIFIED": return "salesqualifiedlead";
    case "OPPORTUNITY": return "opportunity";
    case "CUSTOMER": return "customer";
    default: return "lead";
  }
}
