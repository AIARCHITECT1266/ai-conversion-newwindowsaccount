// ============================================================
// Neue Session Note in Notion erstellen
// Ausfuehren: npx tsx src/scripts/new-session.ts "Titel"
// Beispiel:  npx tsx src/scripts/new-session.ts "API Refactoring"
// ============================================================

import { config } from "dotenv";
config({ path: ".env.local" });

const API_KEY = process.env.NOTION_API_KEY;
const DB_ID = process.env.NOTION_SESSION_DB_ID || "339301ca-b3d0-81d4-9c6a-e88e19d1dbbf";
const HQ_ID = "337301ca-b3d0-8127-8e7c-cc9fc73f98e7";
// Summary-Callout Block ID (wird beim ersten Lauf gesucht)
const SUMMARY_CALLOUT_ID = "339301ca-b3d0-81ce-a5eb-d7fe1caaf190";

const H = {
  "Authorization": `Bearer ${API_KEY}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
};

async function getSessionCount(): Promise<number> {
  const res = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({}),
  });
  const data = await res.json();
  return data.results?.length || 0;
}

interface SessionSummary {
  count: number;
  totalLines: number;
  totalHours: string;
}

async function getSessionSummary(): Promise<SessionSummary> {
  const res = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({}),
  });
  const data = await res.json();
  const pages = data.results || [];

  let totalLines = 0;
  let totalMinutes = 0;

  for (const page of pages) {
    const lines = page.properties["Code-Zeilen"]?.number || 0;
    totalLines += lines;

    const dauer = page.properties["Dauer"]?.rich_text?.[0]?.plain_text || "";
    // Parse "~4h", "11h 45min", "~8h" etc.
    const hMatch = dauer.match(/(\d+)\s*h/);
    const mMatch = dauer.match(/(\d+)\s*min/);
    if (hMatch) totalMinutes += parseInt(hMatch[1]) * 60;
    if (mMatch) totalMinutes += parseInt(mMatch[1]);
  }

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  return {
    count: pages.length,
    totalLines,
    totalHours: mins > 0 ? `~${hours}h ${mins}min` : `~${hours}h`,
  };
}

async function updateSummaryCallout(summary: SessionSummary) {
  const avgHours = Math.round((summary.count > 0 ? summary.totalLines / summary.count : 0));
  const today = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

  const text = [
    "Gesamt-Uebersicht Session Notes",
    "",
    `Gesamte Sessions: ${summary.count}`,
    `Gesamte Coding-Zeit: ${summary.totalHours}`,
    `Gesamte Code-Zeilen: ~${summary.totalLines.toLocaleString("de-DE")}`,
    `Durchschnitt pro Session: ~${avgHours.toLocaleString("de-DE")} Zeilen`,
    "",
    `Letzte Aktualisierung: ${today}`,
  ].join("\n");

  const res = await fetch(`https://api.notion.com/v1/blocks/${SUMMARY_CALLOUT_ID}`, {
    method: "PATCH",
    headers: H,
    body: JSON.stringify({
      callout: {
        icon: { type: "emoji", emoji: "📊" },
        rich_text: [{ text: { content: text } }],
        color: "purple_background",
      },
    }),
  });
  const data = await res.json();
  return !!data.id;
}

async function main() {
  if (!API_KEY) {
    console.error("FEHLER: NOTION_API_KEY nicht in .env.local gesetzt");
    process.exit(1);
  }

  const titel = process.argv[2];
  if (!titel) {
    console.error("Verwendung: npx tsx src/scripts/new-session.ts \"Titel\"");
    console.error("Beispiel:   npx tsx src/scripts/new-session.ts \"API Refactoring\"");
    process.exit(1);
  }

  // Session-Nummer ermitteln
  const count = await getSessionCount();
  const sessionName = `Session ${count} – ${titel}`;
  const today = new Date().toISOString().split("T")[0];

  console.log(`Erstelle: ${sessionName}`);
  console.log(`Datum: ${today}`);

  // Neue Session anlegen
  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      parent: { database_id: DB_ID },
      icon: { type: "emoji", emoji: "📋" },
      properties: {
        Name: { title: [{ text: { content: sessionName } }] },
        Datum: { date: { start: today } },
        Typ: { select: { name: "Claude Session" } },
        Status: { select: { name: "Entwurf" } },
        "Code-Zeilen": { number: 0 },
        Dauer: { rich_text: [{ text: { content: "" } }] },
        Features: { multi_select: [] },
      },
      children: [
        {
          type: "callout",
          callout: {
            icon: { type: "emoji", emoji: "📅" },
            rich_text: [{ text: { content: `Datum: ${today}\n${sessionName}` } }],
            color: "purple_background",
          },
        },
        { type: "divider", divider: {} },
        { type: "heading_2", heading_2: { rich_text: [{ text: { content: "Was in dieser Session gebaut wurde" } }] } },
        { type: "paragraph", paragraph: { rich_text: [{ text: { content: "(wird am Ende der Session ausgefuellt)" } }] } },
        { type: "divider", divider: {} },
        { type: "heading_2", heading_2: { rich_text: [{ text: { content: "Naechste Schritte" } }] } },
        { type: "paragraph", paragraph: { rich_text: [{ text: { content: "(wird am Ende der Session ausgefuellt)" } }] } },
      ],
    }),
  });

  const page = await res.json();
  if (!page.id) {
    console.error("FEHLER:", page.message);
    process.exit(1);
  }

  console.log(`\nERFOLG: ${sessionName} erstellt`);
  console.log(`URL: ${page.url}`);

  // Summary aktualisieren
  console.log("\nAktualisiere Summary...");
  const summary = await getSessionSummary();
  const updated = await updateSummaryCallout(summary);
  console.log(updated ? "Summary aktualisiert" : "Summary-Update fehlgeschlagen");

  console.log(`\nGesamt: ${summary.count} Sessions, ${summary.totalHours}, ~${summary.totalLines.toLocaleString("de-DE")} Zeilen`);
}

main();
