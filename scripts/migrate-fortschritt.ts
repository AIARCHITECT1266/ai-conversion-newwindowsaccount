// ============================================================
// Einmalig: Fortschritt-Seite bereinigen und bestehenden
// Inhalt als Datums-Unterseite (04.04.2026) migrieren
// ============================================================

import { Client } from "@notionhq/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlockObjectRequest = any;
import { config } from "dotenv";

config({ path: ".env.local" });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const FORTSCHRITT_PAGE_ID = "338301ca-b3d0-8195-9c30-cc53ecb17dd0";

async function main() {
  console.log("1/3 Lese bestehende Bloecke auf Fortschritt-Seite...");

  const existing = await notion.blocks.children.list({
    block_id: FORTSCHRITT_PAGE_ID,
    page_size: 100,
  });

  const blockIds = existing.results.map((b) => b.id);
  console.log(`   ${blockIds.length} Bloecke gefunden`);

  // 2. Alle bestehenden Bloecke loeschen
  console.log("2/3 Loesche alte Bloecke...");
  for (const id of blockIds) {
    await notion.blocks.delete({ block_id: id });
  }
  console.log(`   ${blockIds.length} Bloecke geloescht`);

  // 3. Neue Struktur: Beschreibung + erste Datums-Unterseite
  console.log("3/3 Erstelle neue Struktur...");

  // Beschreibungsblock auf der Fortschritt-Seite
  await notion.blocks.children.append({
    block_id: FORTSCHRITT_PAGE_ID,
    children: [
      {
        object: "block", type: "callout",
        callout: {
          rich_text: [{ text: { content: "Waehle ein Datum aus der Liste unten, um die Fortschritte des jeweiligen Tages zu sehen." } }],
          icon: { type: "emoji", emoji: "📋" } as { type: "emoji"; emoji: "📋" },
        },
      } as BlockObjectRequest,
      { object: "block", type: "divider", divider: {} } as BlockObjectRequest,
    ],
  });

  // Erste Datums-Unterseite: 04.04.2026
  const datePage = await notion.pages.create({
    parent: { page_id: FORTSCHRITT_PAGE_ID },
    properties: {
      title: { title: [{ text: { content: "04.04.2026" } }] },
    },
    children: [
      { object: "block", type: "heading_3", heading_3: { rich_text: [{ text: { content: "Dashboard auf echte DB-Daten umgestellt" } }] } },
      { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: "Das Tenant-Dashboard unter /dashboard zeigte bisher nur hardcodierte Demo-Daten. Heute wurde es komplett auf echte Datenbankabfragen umgestellt." } }] } },

      { object: "block", type: "heading_3", heading_3: { rich_text: [{ text: { content: "Neue API-Routen" } }] } },
      { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "GET /api/dashboard/stats?tenantId=xxx — KPIs, Pipeline, Bot-Aktivitaet, letzte Conversations" } }] } },
      { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "GET /api/dashboard/conversations?tenantId=xxx — Live-Uebersicht mit Status-Filter und Lead-Daten" } }] } },

      { object: "block", type: "heading_3", heading_3: { rich_text: [{ text: { content: "Dashboard-Aenderungen" } }] } },
      { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Alle Demo-Konstanten entfernt (DEMO_KPIS, DEMO_CONVERSATIONS, DEMO_LEADS, PIPELINE_STAGES)" } }] } },
      { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Echte Daten via fetch() von /api/dashboard/stats" } }] } },
      { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Auto-Refresh alle 30 Sekunden + manueller Refresh-Button" } }] } },
      { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Tenant-ID per Query-Param oder automatisch erster Tenant" } }] } },
      { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Leerzustand-Anzeige wenn keine Daten vorhanden" } }] } },
      { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Externe IDs DSGVO-konform maskiert" } }] } },
      { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Relative Zeitanzeige (vor 2 Min., vor 1 Std.)" } }] } },

      { object: "block", type: "heading_3", heading_3: { rich_text: [{ text: { content: "Notion-Integration" } }] } },
      { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Projektseite Multi-Tenant-Vertriebssystem unter AI Conversion HQ erstellt" } }] } },
      { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Fortschritt-Seite mit Datums-Unterseiten eingerichtet" } }] } },
      { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Script post-fortschritt.ts fuer automatisches Posting nach jeder Session" } }] } },

      { object: "block", type: "heading_3", heading_3: { rich_text: [{ text: { content: "Status" } }] } },
      { object: "block", type: "to_do", to_do: { rich_text: [{ text: { content: "API-Route /api/dashboard/stats" } }], checked: true } },
      { object: "block", type: "to_do", to_do: { rich_text: [{ text: { content: "API-Route /api/dashboard/conversations" } }], checked: true } },
      { object: "block", type: "to_do", to_do: { rich_text: [{ text: { content: "Dashboard auf echte Daten umgestellt" } }], checked: true } },
      { object: "block", type: "to_do", to_do: { rich_text: [{ text: { content: "Build erfolgreich" } }], checked: true } },
      { object: "block", type: "to_do", to_do: { rich_text: [{ text: { content: "Notion Fortschritt-Tracking eingerichtet" } }], checked: true } },
    ] as BlockObjectRequest[],
  });

  const url = (datePage as unknown as { url: string }).url;
  console.log(`\nFertig! Neue Struktur:`);
  console.log(`Fortschritt/`);
  console.log(`  04.04.2026 → ${url}`);
  console.log(`\nNeue Tage werden als weitere Unterseiten angelegt.`);
}

main().catch((e) => { console.error("Fehler:", e.message); process.exit(1); });
