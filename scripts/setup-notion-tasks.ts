// ============================================================
// Notion Tages-Tasks Datenbank erstellen und befuellen
// Nutzt REST API direkt fuer Datenbank-Erstellung
// ============================================================

import { Client } from "@notionhq/client";
import { config } from "dotenv";

config({ path: ".env.local" });

const NOTION_KEY = process.env.NOTION_API_KEY!;
const notion = new Client({ auth: NOTION_KEY });

// AI Conversion HQ Seite
const PARENT_PAGE_ID = "337301ca-b3d0-8127-8e7c-cc9fc73f98e7";

async function main() {
  console.log("Erstelle Tages-Tasks Datenbank...\n");

  // 1. Datenbank via REST API erstellen (SDK ignoriert properties)
  const dbResponse = await fetch("https://api.notion.com/v1/databases", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${NOTION_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { type: "page_id", page_id: PARENT_PAGE_ID },
      title: [{ text: { content: "Tages-Tasks" } }],
      properties: {
        Name: { title: {} },
        Datum: { date: {} },
        Status: {
          select: {
            options: [
              { name: "Offen", color: "gray" },
              { name: "In Arbeit", color: "blue" },
              { name: "Erledigt", color: "green" },
            ],
          },
        },
        Prioritaet: {
          select: {
            options: [
              { name: "Kritisch", color: "red" },
              { name: "Hoch", color: "orange" },
              { name: "Mittel", color: "yellow" },
              { name: "Niedrig", color: "green" },
            ],
          },
        },
        Projekt: {
          select: {
            options: [
              { name: "WhatsApp Bot", color: "purple" },
              { name: "Multi-AI Interface", color: "blue" },
              { name: "Voice Agent", color: "pink" },
              { name: "Marketing", color: "orange" },
              { name: "Allgemein", color: "gray" },
            ],
          },
        },
        Notizen: { rich_text: {} },
      },
    }),
  });

  const db = await dbResponse.json() as any;

  if (db.object === "error") {
    throw new Error(db.message);
  }

  const dbId = db.id;
  console.log(`Datenbank erstellt: ${db.url}\n`);

  // Hilfsfunktion
  async function addTask(
    name: string,
    datum: string,
    status: string,
    prioritaet: string,
    projekt: string,
    notizen?: string
  ) {
    const properties: any = {
      Name: { title: [{ text: { content: name } }] },
      Datum: { date: { start: datum } },
      Status: { select: { name: status } },
      Prioritaet: { select: { name: prioritaet } },
      Projekt: { select: { name: projekt } },
    };
    if (notizen) {
      properties.Notizen = { rich_text: [{ text: { content: notizen } }] };
    }
    await notion.pages.create({
      parent: { database_id: dbId },
      properties,
    });
    console.log(`  [${status}] ${name}`);
  }

  // 2. Heutige Tasks (04.04.2026) - Erledigt
  console.log("Tasks 04.04.2026 (Erledigt):");
  await addTask("Facebook OG-Tags gefixt", "2026-04-04", "Erledigt", "Hoch", "WhatsApp Bot", "og:image, og:url, twitter:card hinzugefuegt");
  await addTask("GitHub Repository eingerichtet", "2026-04-04", "Erledigt", "Hoch", "Allgemein", "AIARCHITECT1266/ai-conversion, privat");
  await addTask("Datenbank Frankfurt aufgesetzt", "2026-04-04", "Erledigt", "Kritisch", "WhatsApp Bot", "PostgreSQL Frankfurt, beide IPs verifiziert");
  await addTask("Claude + GPT-4o Integration", "2026-04-04", "Erledigt", "Kritisch", "WhatsApp Bot", "Claude Verkaufsgespraeche, GPT-4o Lead-Scoring");
  await addTask("WhatsApp Webhook verbunden", "2026-04-04", "Erledigt", "Kritisch", "WhatsApp Bot", "GET Verify + POST Handler mit KI-Pipeline");
  await addTask("API Keys eingerichtet", "2026-04-04", "Erledigt", "Hoch", "Allgemein", "Anthropic, OpenAI, WhatsApp Token in Vercel");
  await addTask("Meta Developer App erstellt", "2026-04-04", "Erledigt", "Hoch", "WhatsApp Bot");
  await addTask("Notion Workspace aufgebaut", "2026-04-04", "Erledigt", "Mittel", "Allgemein", "AI Conversion HQ mit 40+ Unterseiten");
  await addTask("Session-Summary Integration", "2026-04-04", "Erledigt", "Mittel", "Allgemein", "Automatische Notion-Eintraege via API");
  await addTask("CLAUDE.md Sicherheitsregeln", "2026-04-04", "Erledigt", "Hoch", "Allgemein", "Keine Secrets im Output, Build vor Commit");

  // 3. Morgige Tasks (05.04.2026) - Offen
  console.log("\nTasks 05.04.2026 (Offen):");
  await addTask("Meta Sperre pruefen", "2026-04-05", "Offen", "Kritisch", "WhatsApp Bot", "Status im Meta Business Account checken");
  await addTask("Webhook bei Meta registrieren", "2026-04-05", "Offen", "Kritisch", "WhatsApp Bot", "Callback URL + Verify Token eintragen");
  await addTask("WHATSAPP_PHONE_ID eintragen", "2026-04-05", "Offen", "Hoch", "WhatsApp Bot", "Phone Number ID in Vercel env setzen");
  await addTask("Ersten Bot-Test machen", "2026-04-05", "Offen", "Hoch", "WhatsApp Bot", "Testnachricht senden und KI-Antwort pruefen");
  await addTask("Virtuelle deutsche Adresse", "2026-04-05", "Offen", "Hoch", "Allgemein", "Fuer Gewerbeanmeldung und Meta Business Account");
  await addTask("Telnyx Nummer kaufen", "2026-04-05", "Offen", "Hoch", "Voice Agent", "Deutsche Nummer fuer WhatsApp Business");

  console.log(`\nFertig! 16 Tasks erstellt.`);
  console.log(`Datenbank: ${db.url}`);
}

main().catch((error) => {
  console.error("Fehler:", error.message);
  process.exit(1);
});
