// ============================================================
// Roadmap & Tasks bereinigen: alte Bloecke loeschen,
// echte Datenbank erstellen, Tasks eintragen
// ============================================================

import { Client } from "@notionhq/client";
import { config } from "dotenv";

config({ path: ".env.local" });

const NOTION_KEY = process.env.NOTION_API_KEY!;
const notion = new Client({ auth: NOTION_KEY });

const ROADMAP_ID = "337301ca-b3d0-81e0-a23d-cadbdbd496d4";

// Bloecke die geloescht werden (callout, bullets, headings, todos)
const DELETE_IDS = [
  "337301ca-b3d0-81c8-8912-d8371992c829",
  "337301ca-b3d0-817e-b889-cc1066909860",
  "337301ca-b3d0-81e2-83d9-def7539e05eb",
  "337301ca-b3d0-8110-8f4a-ee7d7de7bf0f",
  "337301ca-b3d0-816d-b332-c79cd75e7b91",
  "337301ca-b3d0-812b-a7ec-e7006b6a7c9d",
  "337301ca-b3d0-819b-8c7f-dc0b6e21dda3",
  "337301ca-b3d0-812c-bcf6-e784e8fe4c1b",
  "337301ca-b3d0-810a-b184-e1d61a91cef3",
  "337301ca-b3d0-81b4-9d9f-c92706278439",
  "337301ca-b3d0-81dc-8148-c6fb11da8d40",
  "337301ca-b3d0-81e1-8d73-fc32b0f8c68d",
  "337301ca-b3d0-8137-87ae-fa440c766002",
  "337301ca-b3d0-811f-89f8-eb9868b10e3f",
  "337301ca-b3d0-816b-baa9-e2a128386c6f",
  "337301ca-b3d0-81f5-8cda-d464cad6bb59",
  "337301ca-b3d0-814c-b0eb-d81adb7f767f",
];

async function addTask(dbId: string, name: string, datum: string, status: string, prio: string, projekt: string, notizen?: string) {
  const props: any = {
    Name: { title: [{ text: { content: name } }] },
    Datum: { date: { start: datum } },
    Status: { select: { name: status } },
    Prioritaet: { select: { name: prio } },
    Projekt: { select: { name: projekt } },
  };
  if (notizen) props.Notizen = { rich_text: [{ text: { content: notizen } }] };
  await notion.pages.create({ parent: { database_id: dbId }, properties: props });
  console.log(`  [${status}] ${name}`);
}

async function main() {
  // 1. Alte Bloecke loeschen
  console.log("1/3 Loesche alte Bloecke...");
  for (const id of DELETE_IDS) {
    await fetch(`https://api.notion.com/v1/blocks/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${NOTION_KEY}`, "Notion-Version": "2022-06-28" },
    });
  }
  console.log(`   ${DELETE_IDS.length} Bloecke geloescht\n`);

  // 2. Datenbank erstellen
  console.log("2/3 Erstelle Tages-Tasks Datenbank...");
  const dbRes = await fetch("https://api.notion.com/v1/databases", {
    method: "POST",
    headers: { "Authorization": `Bearer ${NOTION_KEY}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
    body: JSON.stringify({
      parent: { type: "page_id", page_id: ROADMAP_ID },
      title: [{ text: { content: "Tages-Tasks" } }],
      is_inline: true,
      properties: {
        Name: { title: {} },
        Datum: { date: {} },
        Status: { select: { options: [
          { name: "Offen", color: "gray" },
          { name: "In Arbeit", color: "blue" },
          { name: "Erledigt", color: "green" },
        ]}},
        Prioritaet: { select: { options: [
          { name: "Kritisch", color: "red" },
          { name: "Hoch", color: "orange" },
          { name: "Mittel", color: "yellow" },
          { name: "Niedrig", color: "green" },
        ]}},
        Projekt: { select: { options: [
          { name: "WhatsApp Bot", color: "purple" },
          { name: "Multi-AI Interface", color: "blue" },
          { name: "Voice Agent", color: "pink" },
          { name: "Marketing", color: "orange" },
          { name: "Allgemein", color: "gray" },
        ]}},
        Notizen: { rich_text: {} },
      },
    }),
  });

  const db = await dbRes.json() as any;
  if (db.object === "error") { throw new Error(db.message); }
  const dbId = db.id;
  console.log(`   Datenbank erstellt: ${db.url}\n`);

  // 3. Tasks eintragen
  console.log("3/3 Tasks eintragen...\n04.04.2026 (Erledigt):");
  await addTask(dbId, "Facebook OG-Tags gefixt", "2026-04-04", "Erledigt", "Hoch", "WhatsApp Bot", "og:image, og:url, twitter:card");
  await addTask(dbId, "GitHub Repository eingerichtet", "2026-04-04", "Erledigt", "Hoch", "Allgemein", "AIARCHITECT1266/ai-conversion");
  await addTask(dbId, "Datenbank Frankfurt aufgesetzt", "2026-04-04", "Erledigt", "Kritisch", "WhatsApp Bot", "PostgreSQL Frankfurt, DSGVO-konform");
  await addTask(dbId, "Claude + GPT-4o Integration", "2026-04-04", "Erledigt", "Kritisch", "WhatsApp Bot", "Claude Verkauf, GPT-4o Lead-Scoring");
  await addTask(dbId, "WhatsApp Webhook verbunden", "2026-04-04", "Erledigt", "Kritisch", "WhatsApp Bot", "GET Verify + POST Handler");
  await addTask(dbId, "API Keys eingerichtet", "2026-04-04", "Erledigt", "Hoch", "Allgemein", "Anthropic, OpenAI, WhatsApp in Vercel");
  await addTask(dbId, "Meta Developer App erstellt", "2026-04-04", "Erledigt", "Hoch", "WhatsApp Bot");
  await addTask(dbId, "Notion Workspace aufgebaut", "2026-04-04", "Erledigt", "Mittel", "Allgemein", "HQ mit 40+ Unterseiten");
  await addTask(dbId, "Session-Summary Integration", "2026-04-04", "Erledigt", "Mittel", "Allgemein", "Notion-Eintraege via API");
  await addTask(dbId, "CLAUDE.md Sicherheitsregeln", "2026-04-04", "Erledigt", "Hoch", "Allgemein", "Keine Secrets im Output");

  console.log("\n05.04.2026 (Offen):");
  await addTask(dbId, "Meta Sperre pruefen", "2026-04-05", "Offen", "Kritisch", "WhatsApp Bot", "Status im Meta Business Account");
  await addTask(dbId, "Webhook bei Meta registrieren", "2026-04-05", "Offen", "Kritisch", "WhatsApp Bot", "Callback URL + Verify Token");
  await addTask(dbId, "WHATSAPP_PHONE_ID eintragen", "2026-04-05", "Offen", "Hoch", "WhatsApp Bot", "Phone Number ID in Vercel");
  await addTask(dbId, "Ersten Bot-Test machen", "2026-04-05", "Offen", "Hoch", "WhatsApp Bot", "Testnachricht + KI-Antwort");
  await addTask(dbId, "Virtuelle deutsche Adresse", "2026-04-05", "Offen", "Hoch", "Allgemein", "Gewerbeanmeldung + Meta Account");
  await addTask(dbId, "Telnyx Nummer kaufen", "2026-04-05", "Offen", "Hoch", "Voice Agent", "Deutsche Nummer fuer WhatsApp");
  await addTask(dbId, "Multi-AI Interface Prototyp", "2026-04-05", "Offen", "Hoch", "Multi-AI Interface", "Ein Prompt, mehrere AIs, SaaS 49-299 EUR");
  await addTask(dbId, "Stripe Integration", "2026-04-05", "Offen", "Mittel", "WhatsApp Bot", "Automatische Zahlungsabwicklung");
  await addTask(dbId, "Admin Dashboard", "2026-04-05", "Offen", "Mittel", "WhatsApp Bot", "Kunden-Selbstverwaltung");
  await addTask(dbId, "Website neue Preise", "2026-04-05", "Offen", "Mittel", "Marketing", "Preise aktualisieren");
  await addTask(dbId, "Ersten Kunden onboarden", "2026-04-05", "Offen", "Hoch", "WhatsApp Bot", "Echter Kunde als Test");

  console.log(`\nFertig! 21 Tasks in Datenbank.`);
  console.log(`URL: ${db.url}`);
}

main().catch(e => { console.error("Fehler:", e.message); process.exit(1); });
