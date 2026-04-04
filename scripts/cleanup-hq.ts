// ============================================================
// AI Conversion HQ bereinigen: Inhalte migrieren, alte Seiten loeschen
// ============================================================

import { Client } from "@notionhq/client";
import { config } from "dotenv";

config({ path: ".env.local" });

const NOTION_KEY = process.env.NOTION_API_KEY!;
const notion = new Client({ auth: NOTION_KEY });

// Neue Hub-IDs
const OPS_FINANZEN_ID = "338301ca-b3d0-81f0-b2de-d8fa4c1b7597"; // Operations > Finanzen und MRR

// Alte Seiten die geloescht werden
const OLD_PAGES = {
  "Kunden & Tenants": "337301ca-b3d0-8149-af60-f7355b469167",
  "Finanzen": "337301ca-b3d0-8103-801b-e45c2b366f40",
  "Produkte": "337301ca-b3d0-8161-ba68-f762b421146a",
  "Marketing und Vertrieb": "337301ca-b3d0-811a-b3f8-c62e75d98a8f",
};

// Bloecke auf HQ-Ebene die weg sollen (heading, paragraph, divider, leerer paragraph, Tages-Tasks DB direkt unter HQ)
const HQ_CLEANUP_BLOCKS = [
  "337301ca-b3d0-81e9-ae80-e4ad9488a0c7", // heading: Willkommen
  "337301ca-b3d0-813c-aafd-c85e330c151e", // paragraph: Zentrale Verwaltung
  "337301ca-b3d0-81a4-8754-d6a339d2f2db", // divider
  "337301ca-b3d0-8099-9bb0-c52cd9431bb7", // leerer paragraph
  "337301ca-b3d0-81e0-864d-cde8687ce106", // Tages-Tasks DB (Duplikat, richtige ist in Roadmap)
];

async function main() {
  // 1. Finanzen-Inhalte nach Operations > Finanzen und MRR kopieren
  console.log("1/4 Kopiere Finanzen-Inhalte nach Operations...");
  await fetch(`https://api.notion.com/v1/blocks/${OPS_FINANZEN_ID}/children`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${NOTION_KEY}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
    body: JSON.stringify({
      children: [
        { object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content: "MRR Uebersicht" } }] } },
        { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: "Monatlich wiederkehrende Einnahmen, Ausgaben und Margen." } }] } },
        { object: "block", type: "divider", divider: {} },
        { object: "block", type: "heading_3", heading_3: { rich_text: [{ text: { content: "Einnahmen" } }] } },
        { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: "-- Noch keine Eintraege --" } }] } },
        { object: "block", type: "heading_3", heading_3: { rich_text: [{ text: { content: "Ausgaben" } }] } },
        { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Vercel Pro: ca. 20 EUR/Monat" } }] } },
        { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Anthropic API: variabel" } }] } },
        { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "OpenAI API: variabel" } }] } },
        { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "WhatsApp Business API: variabel" } }] } },
      ],
    }),
  });
  console.log("   Finanzen-Inhalte kopiert\n");

  // 2. Dokumentation behalten (hat echte Inhalte, bleibt als Top-Level Seite)
  console.log("2/4 Dokumentation bleibt erhalten (echte Inhalte)\n");

  // 3. Alte Seiten loeschen (archivieren)
  console.log("3/4 Loesche alte Seiten...");
  for (const [name, id] of Object.entries(OLD_PAGES)) {
    const res = await fetch(`https://api.notion.com/v1/blocks/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${NOTION_KEY}`, "Notion-Version": "2022-06-28" },
    });
    const data = await res.json() as any;
    if (data.archived || data.in_trash) {
      console.log(`   Geloescht: ${name}`);
    } else {
      console.log(`   Fehler bei ${name}: ${data.message || "unbekannt"}`);
    }
  }

  // 4. HQ-Ebene bereinigen (Header, Divider, leere Bloecke, Duplikat-DB)
  console.log("\n4/4 Bereinige HQ-Ebene...");
  for (const id of HQ_CLEANUP_BLOCKS) {
    await fetch(`https://api.notion.com/v1/blocks/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${NOTION_KEY}`, "Notion-Version": "2022-06-28" },
    });
  }
  console.log(`   ${HQ_CLEANUP_BLOCKS.length} Bloecke entfernt`);

  // Ergebnis pruefen
  console.log("\n========================================");
  console.log("Finale Struktur pruefen...");
  console.log("========================================\n");

  const res = await fetch(`https://api.notion.com/v1/blocks/337301cab3d081278e7ccc9fc73f98e7/children?page_size=50`, {
    headers: { "Authorization": `Bearer ${NOTION_KEY}`, "Notion-Version": "2022-06-28" },
  });
  const final = await res.json() as any;

  console.log("AI Conversion HQ");
  console.log("|");
  for (const b of final.results) {
    if (b.type === "child_page") {
      console.log(`|-- ${b.child_page.title}`);
    } else if (b.type === "child_database") {
      console.log(`|-- [DB] ${b.child_database.title}`);
    }
  }
}

main().catch(e => { console.error("Fehler:", e.message); process.exit(1); });
