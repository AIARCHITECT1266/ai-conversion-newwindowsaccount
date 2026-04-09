// Session-Note an Notion senden
import { config } from "dotenv";
config({ path: ".env.local", override: true });

const API_KEY = process.env.NOTION_API_KEY!;
const DB_ID = process.env.NOTION_SESSION_DB_ID || "339301ca-b3d0-81d4-9c6a-e88e19d1dbbf";
const SUMMARY_CALLOUT_ID = "339301ca-b3d0-81ce-a5eb-d7fe1caaf190";
const H = {
  "Authorization": `Bearer ${API_KEY}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
};

async function getSessionCount(): Promise<number> {
  const r = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
    method: "POST", headers: H, body: "{}",
  });
  const d = await r.json();
  return d.results?.length || 0;
}

async function main() {
  const count = await getSessionCount();
  const sessionName = `Session ${count} \u2013 DB-Migration, Redis Session-Fix & Env Cleanup`;
  const today = new Date().toISOString().split("T")[0];

  console.log("Erstelle:", sessionName);

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      parent: { database_id: DB_ID },
      icon: { type: "emoji", emoji: "\ud83d\udccb" },
      properties: {
        Name: { title: [{ text: { content: sessionName } }] },
        Datum: { date: { start: today } },
        Typ: { select: { name: "Claude Session" } },
        Status: { select: { name: "Final" } },
        "Code-Zeilen": { number: 2306 },
        Dauer: { rich_text: [{ text: { content: "~6h" } }] },
        Features: { multi_select: [
          { name: "Database" },
          { name: "Security" },
          { name: "DevOps" },
          { name: "Redis" },
        ] },
      },
      children: [
        { type: "callout", callout: { icon: { type: "emoji", emoji: "\ud83d\udcc5" }, rich_text: [{ text: { content: `Datum: ${today}\n${sessionName}` } }], color: "purple_background" as const } },
        { type: "divider", divider: {} },
        { type: "heading_2", heading_2: { rich_text: [{ text: { content: "Was in dieser Session gebaut wurde" } }] } },

        { type: "heading_3", heading_3: { rich_text: [{ text: { content: "1. Datenbank-Wechsel & Migration" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "DB von bole ocean auf prisma-postgres-teal-battery gewechselt" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Prisma Migration Drift behoben (Baseline-Migration erstellt)" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Alte DB disconnected und geloescht" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Schema mit db push + migrate resolve synchronisiert" } }] } },

        { type: "heading_3", heading_3: { rich_text: [{ text: { content: "2. Admin-Login Fix (kritisch)" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "In-Memory Session-Store durch Upstash Redis ersetzt" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Middleware auf Node.js Runtime gesetzt (Fluid Compute)" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "session-validate.ts fuer Edge-kompatible Validierung" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Admin Logout Route hinzugefuegt (/api/admin/logout)" } }] } },

        { type: "heading_3", heading_3: { rich_text: [{ text: { content: "3. Environment Variables Cleanup" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "WEBHOOK_VERIFY_TOKEN -> WHATSAPP_VERIFY_TOKEN umbenannt" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "NOTION_DATABASE_ID -> NOTION_SESSION_DB_ID umbenannt" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "CRON_SECRET generiert, 7 Duplikate konsolidiert" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: ".env.example mit allen korrekten Variablennamen erstellt" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Upstash Redis Variablen mit Quotes-Problem behoben" } }] } },

        { type: "heading_3", heading_3: { rich_text: [{ text: { content: "4. Scripts & Tooling" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "check-db.ts \u2013 DB-Verbindungstest mit Tabellen-Uebersicht" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "fix-migration-drift.ts \u2013 Automatische Drift-Erkennung" } }] } },

        { type: "divider", divider: {} },
        { type: "heading_2", heading_2: { rich_text: [{ text: { content: "Naechste Schritte" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "WHATSAPP_PHONE_ID und WHATSAPP_APP_SECRET aus Meta Console setzen" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Test-Tenant erstellen und WhatsApp-Webhook verifizieren" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Production End-to-End Test (Login -> Tenant -> Conversation)" } }] } },

        { type: "divider", divider: {} },
        { type: "heading_2", heading_2: { rich_text: [{ text: { content: "5 Commits" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "d7e5c6e \u2013 chore(db): baseline migration, DB scripts, remove old migration" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "13fd7c3 \u2013 fix: replace in-memory session store with Upstash Redis" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "af4109d \u2013 chore: add .env.example with correct variable names" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "f68ec4f \u2013 fix: split session validation for Edge-compatible middleware" } }] } },
        { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "4ea92f0 \u2013 fix: set middleware to nodejs runtime for Vercel Fluid Compute" } }] } },
      ],
    }),
  });

  const page = await res.json();
  if (!page.id) {
    console.error("FEHLER:", page.message || JSON.stringify(page));
    process.exit(1);
  }

  console.log("ERFOLG:", sessionName);
  console.log("URL:", page.url);

  // Summary-Callout aktualisieren
  const summaryRes = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
    method: "POST", headers: H, body: "{}",
  });
  const summaryData = await summaryRes.json();
  const pages = summaryData.results || [];
  let totalLines = 0;
  let totalMinutes = 0;
  for (const p of pages) {
    totalLines += p.properties["Code-Zeilen"]?.number || 0;
    const d = p.properties["Dauer"]?.rich_text?.[0]?.plain_text || "";
    const hM = d.match(/(\d+)\s*h/);
    const mM = d.match(/(\d+)\s*min/);
    if (hM) totalMinutes += parseInt(hM[1]) * 60;
    if (mM) totalMinutes += parseInt(mM[1]);
  }
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const todayDE = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const avg = pages.length > 0 ? Math.round(totalLines / pages.length) : 0;
  const summaryText = [
    "Gesamt-Uebersicht Session Notes",
    "",
    `Gesamte Sessions: ${pages.length}`,
    `Gesamte Coding-Zeit: ~${hrs}h${mins ? " " + mins + "min" : ""}`,
    `Gesamte Code-Zeilen: ~${totalLines.toLocaleString("de-DE")}`,
    `Durchschnitt pro Session: ~${avg.toLocaleString("de-DE")} Zeilen`,
    "",
    `Letzte Aktualisierung: ${todayDE}`,
  ].join("\n");

  const updateRes = await fetch(`https://api.notion.com/v1/blocks/${SUMMARY_CALLOUT_ID}`, {
    method: "PATCH",
    headers: H,
    body: JSON.stringify({
      callout: {
        icon: { type: "emoji", emoji: "\ud83d\udcca" },
        rich_text: [{ text: { content: summaryText } }],
        color: "purple_background",
      },
    }),
  });
  const updateData = await updateRes.json();
  console.log(updateData.id ? "Summary-Callout aktualisiert" : "Summary-Update: " + (updateData.message || "unbekannt"));
}

main();
