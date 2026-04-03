// ============================================================
// Notion-Integration – Session-Notizen erstellen
// Speichert Zusammenfassungen als neue Seiten in einer
// Notion-Datenbank. Benötigt NOTION_API_KEY und NOTION_DATABASE_ID.
// ============================================================

import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;

// ---------- Typen ----------

export interface SessionNoteResult {
  success: boolean;
  pageId?: string;
  url?: string;
  error?: string;
}

// ---------- Session-Notiz erstellen ----------

/**
 * Erstellt eine neue Seite in der Notion-Datenbank.
 *
 * @param title - Titel der Notiz
 * @param content - Inhalt als Markdown-Text
 */
export async function createSessionNote(
  title: string,
  content: string
): Promise<SessionNoteResult> {
  if (!DATABASE_ID) {
    return { success: false, error: "NOTION_DATABASE_ID ist nicht gesetzt" };
  }

  try {
    // Inhalt in Blöcke aufteilen (Notion limitiert auf 2000 Zeichen pro Block)
    const contentBlocks = splitIntoBlocks(content);

    const response = await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties: {
        // Standard-Notion-Datenbank: Titel-Spalte heißt "Name" oder "Title"
        Name: {
          title: [
            {
              text: { content: title },
            },
          ],
        },
      },
      children: contentBlocks,
    });

    console.log("[Notion] Seite erstellt", {
      pageId: response.id,
    });

    return {
      success: true,
      pageId: response.id,
      url: "url" in response ? (response.url as string) : undefined,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unbekannter Fehler";

    console.error("[Notion] Fehler beim Erstellen der Seite", {
      error: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

// ---------- Hilfsfunktion: Text in Notion-Blöcke aufteilen ----------

function splitIntoBlocks(content: string) {
  const paragraphs = content.split(/\n\n+/);

  return paragraphs.map((paragraph) => {
    const trimmed = paragraph.trim();
    if (!trimmed) return null;

    // Überschriften erkennen
    if (trimmed.startsWith("### ")) {
      return {
        object: "block" as const,
        type: "heading_3" as const,
        heading_3: {
          rich_text: [{ text: { content: trimmed.slice(4) } }],
        },
      };
    }

    if (trimmed.startsWith("## ")) {
      return {
        object: "block" as const,
        type: "heading_2" as const,
        heading_2: {
          rich_text: [{ text: { content: trimmed.slice(3) } }],
        },
      };
    }

    // Normaler Absatz (auf 2000 Zeichen begrenzen)
    return {
      object: "block" as const,
      type: "paragraph" as const,
      paragraph: {
        rich_text: [
          { text: { content: trimmed.slice(0, 2000) } },
        ],
      },
    };
  }).filter((block): block is NonNullable<typeof block> => block !== null);
}
