// ============================================================
// Claude KI-Integration – Premium-Verkaufsgespräche (DACH)
// Anthropic Claude führt empathische, conversion-optimierte
// Gespräche in der Sie-Form. System-Prompt pro Tenant konfigurierbar.
// ============================================================

import Anthropic from "@anthropic-ai/sdk";

// ---------- Lazy-Init Client ----------

let _anthropic: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("[Claude] ANTHROPIC_API_KEY nicht konfiguriert");
    }
    _anthropic = new Anthropic({ apiKey });
  }
  return _anthropic;
}

// ---------- Typen ----------

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  success: boolean;
  reply?: string;
  error?: string;
}

// ---------- Standard-System-Prompt (DACH-Markt) ----------

const DEFAULT_SYSTEM_PROMPT = `Du bist ein professioneller Premium-Vertriebsassistent für den DACH-Markt.

KOMMUNIKATIONSREGELN:
- Verwende ausschließlich die Sie-Form
- Kommuniziere auf Deutsch, empathisch und professionell
- Sei freundlich, aber nicht aufdringlich
- Antworte prägnant (max. 3-4 Sätze pro Nachricht)
- Verwende keine Emojis außer gelegentlich ✅ oder 📞

VERTRIEBSSTRATEGIE:
- Zeige echtes Interesse an den Bedürfnissen des Gesprächspartners
- Stelle gezielte Fragen zur Bedarfsermittlung
- Hebe den konkreten Mehrwert hervor, nicht Features
- Führe das Gespräch behutsam Richtung Terminvereinbarung
- Bei Einwänden: Verständnis zeigen, dann gezielt adressieren

TERMINVEREINBARUNG:
- Biete konkrete Zeitfenster an wenn der Lead qualifiziert erscheint
- Formulierung: "Darf ich Ihnen einen kurzen Beratungstermin vorschlagen?"
- Nenne nie Preise – verweise auf das persönliche Gespräch

WICHTIG:
- Gib dich nie als Mensch aus – sage bei direkter Nachfrage ehrlich, dass du ein KI-Assistent bist
- Leite bei komplexen Anliegen an einen menschlichen Berater weiter
- Beende das Gespräch höflich wenn der Nutzer kein Interesse hat`;

// ---------- Antwort generieren ----------

/**
 * Generiert eine Verkaufsantwort mit Claude.
 *
 * @param tenantSystemPrompt - Mandanten-spezifischer System-Prompt (überschreibt Standard)
 * @param brandName - Markenname für die Begrüßung
 * @param conversationHistory - Bisheriger Gesprächsverlauf
 * @param userMessage - Aktuelle Nachricht des Nutzers
 */
export async function generateReply(
  tenantSystemPrompt: string | null,
  brandName: string,
  conversationHistory: ChatMessage[],
  userMessage: string
): Promise<ClaudeResponse> {
  // brandName bereinigen: Newlines und Steuerzeichen entfernen (Prompt-Injection-Schutz)
  const safeBrandName = brandName
    .replace(/[\r\n]+/g, " ")
    .replace(/[^\p{L}\p{N}\s\-_.&]/gu, "")
    .substring(0, 200)
    .trim();

  const systemPrompt = [
    tenantSystemPrompt || DEFAULT_SYSTEM_PROMPT,
    `Du antwortest im Namen von "${safeBrandName}".`,
  ].join("\n\n");

  // Gesprächsverlauf + aktuelle Nachricht zusammenführen
  const messages: ChatMessage[] = [
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  // Timeout: 30 Sekunden
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const client = getClient();
    const response = await client.messages.create(
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      },
      { signal: controller.signal }
    );

    const reply =
      response.content.length > 0 && response.content[0].type === "text"
        ? response.content[0].text
        : undefined;

    if (!reply) {
      return { success: false, error: "Keine Textantwort von Claude erhalten" };
    }

    console.log("[Claude] Antwort generiert", {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      // DSGVO: Keine Nachrichteninhalte loggen
    });

    return { success: true, reply };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unbekannter Fehler";

    console.error("[Claude] Fehler bei Antwortgenerierung", {
      error: errorMessage,
    });

    return { success: false, error: errorMessage };
  } finally {
    clearTimeout(timeout);
  }
}
