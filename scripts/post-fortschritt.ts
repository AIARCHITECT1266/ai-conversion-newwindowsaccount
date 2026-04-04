// ============================================================
// Fortschritt in Notion posten – pro Datum eine Unterseite
// Struktur: Fortschritt > 04.04.2026 > Inhalte
//
// Nutzung: npx tsx scripts/post-fortschritt.ts --json '{...}'
// Wird von Claude nach jeder Session aufgerufen.
//
// Wenn fuer ein Datum bereits eine Seite existiert, werden
// die neuen Inhalte angehaengt (mehrere Sessions pro Tag).
// ============================================================

import { Client } from "@notionhq/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlockObjectRequest = any;
import { config } from "dotenv";

config({ path: ".env.local" });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const FORTSCHRITT_PAGE_ID = "338301ca-b3d0-8195-9c30-cc53ecb17dd0";

interface FortschrittSection {
  title: string;          // Ueberschrift des Abschnitts
  description?: string;   // Optionale Beschreibung
  items: string[];        // Bullet-Punkte
}

interface FortschrittEntry {
  date: string;                // z.B. "04.04.2026"
  sections: FortschrittSection[];
  todos?: { text: string; done: boolean }[];
}

// Bestehende Unterseite fuer ein Datum suchen
async function findDatePage(date: string): Promise<string | null> {
  const children = await notion.blocks.children.list({
    block_id: FORTSCHRITT_PAGE_ID,
    page_size: 100,
  });

  for (const block of children.results) {
    if ("type" in block && block.type === "child_page") {
      const pageBlock = block as unknown as { id: string; child_page: { title: string } };
      if (pageBlock.child_page.title === date) {
        return pageBlock.id;
      }
    }
  }
  return null;
}

// Bloecke fuer eine Section bauen
function buildSectionBlocks(section: FortschrittSection): BlockObjectRequest[] {
  const blocks: BlockObjectRequest[] = [
    { object: "block", type: "heading_3", heading_3: { rich_text: [{ text: { content: section.title } }] } },
  ];

  if (section.description) {
    blocks.push({
      object: "block", type: "paragraph",
      paragraph: { rich_text: [{ text: { content: section.description } }] },
    });
  }

  for (const item of section.items) {
    blocks.push({
      object: "block", type: "bulleted_list_item",
      bulleted_list_item: { rich_text: [{ text: { content: item } }] },
    });
  }

  return blocks;
}

export async function postFortschritt(entry: FortschrittEntry) {
  // Alle Content-Bloecke zusammenbauen
  const contentBlocks: BlockObjectRequest[] = [];

  for (const section of entry.sections) {
    contentBlocks.push(...buildSectionBlocks(section));
  }

  if (entry.todos && entry.todos.length > 0) {
    contentBlocks.push({
      object: "block", type: "heading_3",
      heading_3: { rich_text: [{ text: { content: "Status" } }] },
    });
    for (const todo of entry.todos) {
      contentBlocks.push({
        object: "block", type: "to_do",
        to_do: { rich_text: [{ text: { content: todo.text } }], checked: todo.done },
      });
    }
  }

  // Pruefen ob Seite fuer dieses Datum schon existiert
  const existingPageId = await findDatePage(entry.date);

  if (existingPageId) {
    // Trennlinie + neue Bloecke an bestehende Seite anhaengen
    const appendBlocks: BlockObjectRequest[] = [
      { object: "block", type: "divider", divider: {} },
      ...contentBlocks,
    ];

    await notion.blocks.children.append({
      block_id: existingPageId,
      children: appendBlocks,
    });
    console.log(`Fortschritt an bestehende Seite ${entry.date} angehaengt.`);
  } else {
    // Neue Unterseite unter Fortschritt erstellen
    const response = await notion.pages.create({
      parent: { page_id: FORTSCHRITT_PAGE_ID },
      properties: {
        title: { title: [{ text: { content: entry.date } }] },
      },
      children: contentBlocks,
    });
    const url = (response as unknown as { url: string }).url;
    console.log(`Neue Fortschritt-Seite erstellt: ${entry.date}`);
    console.log(`URL: ${url}`);
  }
}

// CLI-Modus
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Nutzung: npx tsx scripts/post-fortschritt.ts --json '{...}'");
    console.log("\nFormat:");
    console.log(JSON.stringify({
      date: "04.04.2026",
      sections: [
        { title: "Feature XY", description: "Beschreibung", items: ["Punkt 1", "Punkt 2"] },
      ],
      todos: [{ text: "Aufgabe", done: true }],
    }, null, 2));
    process.exit(0);
  }

  const jsonIdx = args.indexOf("--json");
  if (jsonIdx === -1 || !args[jsonIdx + 1]) {
    console.error("Fehler: --json Argument fehlt");
    process.exit(1);
  }

  const entry: FortschrittEntry = JSON.parse(args[jsonIdx + 1]);
  await postFortschritt(entry);
}

main().catch((e) => { console.error("Fehler:", e.message); process.exit(1); });
