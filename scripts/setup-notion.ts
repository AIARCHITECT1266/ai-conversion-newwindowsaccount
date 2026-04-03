// ============================================================
// Notion Workspace Setup – AI Conversion HQ
// Erstellt die komplette Notion-Struktur über die API
// ============================================================

import { Client } from "@notionhq/client";
import { config } from "dotenv";

// .env.local laden
config({ path: ".env.local" });

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Bestehende Datenbank als Workspace
const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

// ---------- Hilfsfunktionen ----------

// Erstellt eine Seite als Eintrag in der Datenbank (hat dann Unterseiten-Fähigkeit)
async function createDbPage(title: string, children: any[] = []) {
  const response = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      Name: { title: [{ text: { content: title } }] },
    },
    children,
  });
  return { id: response.id, url: (response as any).url };
}

// Erstellt eine Unterseite innerhalb einer bestehenden Seite
async function createSubPage(parentId: string, title: string, children: any[] = []) {
  const response = await notion.pages.create({
    parent: { page_id: parentId },
    properties: {
      title: { title: [{ text: { content: title } }] },
    },
    children,
  });
  return { id: response.id, url: (response as any).url };
}

// Erstellt eine Datenbank als Unterseite (Seite mit Tabellen-Platzhalter)
async function createChildDatabase(parentId: string, title: string, columns: string[]) {
  // Datenbank-Seite als Unterseite erstellen mit Spalten-Dokumentation
  const columnList = columns.map((col) => ({
    object: "block" as const,
    type: "bulleted_list_item" as const,
    bulleted_list_item: { rich_text: [{ text: { content: col } }] },
  }));

  const response = await notion.pages.create({
    parent: { page_id: parentId },
    properties: {
      title: { title: [{ text: { content: title } }] },
    },
    children: [
      {
        object: "block",
        type: "callout",
        callout: {
          rich_text: [{ text: { content: "Diese Seite wird als Datenbank genutzt. Konvertiere sie in Notion zu einer Datenbank (Tabelle) mit folgenden Spalten:" } }],
          icon: { type: "emoji", emoji: "💡" as any },
        },
      },
      ...columnList,
      { object: "block", type: "divider", divider: {} },
    ],
  });
  return { id: response.id, url: (response as any).url };
}

// ---------- Hauptlogik ----------

async function main() {
  console.log("Erstelle AI Conversion HQ Struktur in Notion...\n");

  // 1. Bestehende HQ-Seite nutzen oder neue erstellen
  const existingHqId = process.argv[2]; // Optional: HQ Page ID als Argument
  console.log("1/7 Erstelle Hauptseite...");
  const hq = existingHqId
    ? { id: existingHqId, url: `https://www.notion.so/${existingHqId.replace(/-/g, "")}` }
    : await createDbPage("AI Conversion HQ", [
    {
      object: "block",
      type: "heading_2",
      heading_2: { rich_text: [{ text: { content: "Willkommen im AI Conversion Headquarter" } }] },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ text: { content: "Zentrale Verwaltung für das Multi-Tenant WhatsApp KI-SaaS Projekt." } }],
      },
    },
    { object: "block", type: "divider", divider: {} },
  ]);
  console.log(`   AI Conversion HQ: ${hq.url}`);

  // 2. Session Notes (Datenbank)
  console.log("2/7 Erstelle Session Notes Datenbank...");
  const sessionNotes = await createChildDatabase(hq.id, "Session Notes", [
    "Name (Title) — Titel der Session",
    "Datum (Date) — Datum der Session",
    "Typ (Select) — Claude Session, Meeting, Entscheidung, Debug",
    "Status (Select) — Entwurf, Final",
  ]);
  console.log(`   ✅ Session Notes: ${sessionNotes.url}`);

  // 3. Kunden & Tenants (Datenbank)
  console.log("3/7 Erstelle Kunden & Tenants Datenbank...");
  const kunden = await createChildDatabase(hq.id, "Kunden & Tenants", [
    "Name (Title) — Firmenname",
    "Plan (Select) — Starter, Professional, Enterprise",
    "Status (Select) — Aktiv, Onboarding, Pausiert, Gekündigt",
    "WhatsApp-Nummer (Phone) — Business-Nummer",
    "Startdatum (Date) — Vertragsbeginn",
    "MRR (Number, Euro) — Monatlicher Umsatz",
  ]);
  console.log(`   ✅ Kunden & Tenants: ${kunden.url}`);

  // 4. Roadmap & Tasks (Datenbank)
  console.log("4/7 Erstelle Roadmap & Tasks Datenbank...");
  const roadmap = await createChildDatabase(hq.id, "Roadmap & Tasks", [
    "Task (Title) — Aufgabenbeschreibung",
    "Status (Select) — Backlog, In Progress, Review, Done, Blocked",
    "Priorität (Select) — Kritisch, Hoch, Mittel, Niedrig",
    "Deadline (Date) — Fälligkeitsdatum",
    "Bereich (Select) — Backend, Frontend, KI/ML, DevOps, Business",
  ]);
  console.log(`   ✅ Roadmap & Tasks: ${roadmap.url}`);

  // 5. Finanzen (Seite)
  console.log("5/7 Erstelle Finanzen Seite...");
  const finanzen = await createSubPage(hq.id, "Finanzen", [
    {
      object: "block",
      type: "heading_2",
      heading_2: { rich_text: [{ text: { content: "MRR Übersicht" } }] },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: [{ text: { content: "Monatlich wiederkehrende Einnahmen, Ausgaben und Margen." } }] },
    },
    { object: "block", type: "divider", divider: {} },
    {
      object: "block",
      type: "heading_3",
      heading_3: { rich_text: [{ text: { content: "Einnahmen" } }] },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: [{ text: { content: "— Noch keine Einträge —" } }] },
    },
    {
      object: "block",
      type: "heading_3",
      heading_3: { rich_text: [{ text: { content: "Ausgaben" } }] },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { rich_text: [{ text: { content: "Vercel Pro: ~20€/Monat" } }] },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { rich_text: [{ text: { content: "Anthropic API: variabel" } }] },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { rich_text: [{ text: { content: "OpenAI API: variabel" } }] },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { rich_text: [{ text: { content: "WhatsApp Business API: variabel" } }] },
    },
  ]);
  console.log(`   ✅ Finanzen: ${finanzen.url}`);

  // 6. Dokumentation (Seite)
  console.log("6/7 Erstelle Dokumentation Seite...");
  const docs = await createSubPage(hq.id, "Dokumentation", [
    {
      object: "block",
      type: "heading_2",
      heading_2: { rich_text: [{ text: { content: "System-Architektur" } }] },
    },
    {
      object: "block",
      type: "code",
      code: {
        language: "plain text",
        rich_text: [{
          text: {
            content:
              "WhatsApp → Webhook → Handler → Tenant-Lookup → DB (verschlüsselt)\n" +
              "                                    → Claude (Antwort) → WhatsApp\n" +
              "                                    → GPT-4o (Lead-Score) → DB",
          },
        }],
      },
    },
    { object: "block", type: "divider", divider: {} },
    {
      object: "block",
      type: "heading_3",
      heading_3: { rich_text: [{ text: { content: "Tech Stack" } }] },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { rich_text: [{ text: { content: "Next.js 15 (App Router) auf Vercel" } }] },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { rich_text: [{ text: { content: "Prisma 7 + PostgreSQL (Frankfurt, DSGVO-konform)" } }] },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { rich_text: [{ text: { content: "Anthropic Claude (Verkaufsgespräche)" } }] },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { rich_text: [{ text: { content: "OpenAI GPT-4o (Lead-Scoring)" } }] },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { rich_text: [{ text: { content: "WhatsApp Cloud API (Messaging)" } }] },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { rich_text: [{ text: { content: "AES-256-GCM Verschlüsselung (DSGVO)" } }] },
    },
    { object: "block", type: "divider", divider: {} },
    {
      object: "block",
      type: "heading_3",
      heading_3: { rich_text: [{ text: { content: "API Endpoints" } }] },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { rich_text: [{ text: { content: "POST/GET /api/webhook/whatsapp — WhatsApp Webhook" } }] },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { rich_text: [{ text: { content: "POST/GET /api/admin/tenants — Tenant-Verwaltung" } }] },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { rich_text: [{ text: { content: "POST /api/session-summary — Notion Session Notes" } }] },
    },
  ]);
  console.log(`   ✅ Dokumentation: ${docs.url}`);

  // 7. Produkte (Seite)
  console.log("7/7 Erstelle Produkte Seite...");
  const produkte = await createSubPage(hq.id, "Produkte", [
    {
      object: "block",
      type: "heading_2",
      heading_2: { rich_text: [{ text: { content: "WhatsApp Bot" } }] },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{
          text: {
            content:
              "KI-gestützter Vertriebsassistent über WhatsApp. Claude führt Premium-Verkaufsgespräche " +
              "in der Sie-Form, GPT-4o bewertet Leads automatisch. Multi-Tenant fähig.",
          },
        }],
      },
    },
    { object: "block", type: "divider", divider: {} },
    {
      object: "block",
      type: "heading_2",
      heading_2: { rich_text: [{ text: { content: "AI Dashboard" } }] },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ text: { content: "Geplant: Admin-Dashboard für Tenant-Verwaltung, Lead-Übersicht und Conversation-Analytics." } }],
      },
    },
    { object: "block", type: "divider", divider: {} },
    {
      object: "block",
      type: "heading_2",
      heading_2: { rich_text: [{ text: { content: "Voice Agent" } }] },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ text: { content: "Geplant: KI-Sprachassistent für Telefon-Vertrieb. Integration mit bestehender Lead-Pipeline." } }],
      },
    },
  ]);
  console.log(`   ✅ Produkte: ${produkte.url}`);

  // Zusammenfassung
  console.log("\n========================================");
  console.log("Notion Workspace erfolgreich erstellt!");
  console.log("========================================\n");
  console.log(`🏢 AI Conversion HQ:    ${hq.url}`);
  console.log(`📝 Session Notes:        ${sessionNotes.url}`);
  console.log(`👥 Kunden & Tenants:     ${kunden.url}`);
  console.log(`🗺️  Roadmap & Tasks:      ${roadmap.url}`);
  console.log(`💰 Finanzen:             ${finanzen.url}`);
  console.log(`�� Dokumentation:        ${docs.url}`);
  console.log(`🚀 Produkte:             ${produkte.url}`);
  console.log(`\nSession Notes DB ID: ${sessionNotes.id}`);
  console.log("(Diese ID in NOTION_DATABASE_ID eintragen für automatische Session-Summaries)");
}

main().catch((error) => {
  console.error("Fehler:", error.message);
  process.exit(1);
});
