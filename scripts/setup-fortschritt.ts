// ============================================================
// Erstellt "Multi-Tenant-Vertriebssystem > Fortschritt" unter HQ
// und postet den ersten Fortschrittsbericht (04.04.2026)
// ============================================================

import { Client } from "@notionhq/client";
import { config } from "dotenv";

config({ path: ".env.local" });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const HQ_ID = "337301ca-b3d0-8127-8e7c-cc9fc73f98e7";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createPage(parentId: string, title: string, children: any[] = []) {
  const response = await notion.pages.create({
    parent: { page_id: parentId },
    properties: { title: { title: [{ text: { content: title } }] } },
    children,
  });
  return { id: response.id, url: (response as unknown as { url: string }).url };
}

function h2(text: string) {
  return { object: "block" as const, type: "heading_2" as const, heading_2: { rich_text: [{ text: { content: text } }] } };
}

function h3(text: string) {
  return { object: "block" as const, type: "heading_3" as const, heading_3: { rich_text: [{ text: { content: text } }] } };
}

function paragraph(text: string) {
  return { object: "block" as const, type: "paragraph" as const, paragraph: { rich_text: [{ text: { content: text } }] } };
}

function bullet(text: string) {
  return { object: "block" as const, type: "bulleted_list_item" as const, bulleted_list_item: { rich_text: [{ text: { content: text } }] } };
}

function divider() {
  return { object: "block" as const, type: "divider" as const, divider: {} };
}

function todo(text: string, checked = false) {
  return { object: "block" as const, type: "to_do" as const, to_do: { rich_text: [{ text: { content: text } }], checked } };
}

async function main() {
  console.log("Erstelle Multi-Tenant-Vertriebssystem Projektseite...\n");

  // 1. Hauptseite unter HQ
  const projekt = await createPage(HQ_ID, "Multi-Tenant-Vertriebssystem", [
    h2("Projekt: Multi-Tenant-Vertriebssystem"),
    paragraph("WhatsApp KI-Bot SaaS mit automatischer Lead-Qualifizierung, Tenant-Verwaltung und Echtzeit-Dashboard. DSGVO-konform, PostgreSQL Frankfurt."),
    divider(),
    h3("Tech Stack"),
    bullet("Next.js 15 (App Router) auf Vercel"),
    bullet("Prisma 7 + PostgreSQL (Frankfurt, DSGVO-konform)"),
    bullet("Anthropic Claude (Verkaufsgespraeche)"),
    bullet("OpenAI GPT-4o (Lead-Scoring)"),
    bullet("WhatsApp Cloud API (Messaging)"),
    bullet("AES-256-GCM Verschluesselung"),
    divider(),
    h3("Kernfunktionen"),
    bullet("Multi-Tenant Architektur mit isolierten Daten"),
    bullet("WhatsApp Webhook mit Consent-Tracking"),
    bullet("Automatische Lead-Qualifizierung (Score 0-100)"),
    bullet("Admin-Dashboard fuer Tenant-Verwaltung"),
    bullet("Tenant-Dashboard mit Echtzeit-KPIs"),
    bullet("Plattform-Bot (Claude) als eingebetteter Assistent"),
  ]);
  console.log(`Projektseite: ${projekt.url}`);

  // 2. Fortschritt-Unterseite
  const fortschritt = await createPage(projekt.id, "Fortschritt", [
    h2("Projekt-Fortschritt"),
    paragraph("Tagesgenaue Dokumentation des Entwicklungsfortschritts. Wird nach jeder Claude-Session aktualisiert."),
    divider(),

    // Heutiger Eintrag: 04.04.2026
    h2("04.04.2026"),
    h3("Dashboard auf echte DB-Daten umgestellt"),
    paragraph("Das Tenant-Dashboard unter /dashboard zeigte bisher nur hardcodierte Demo-Daten. Heute wurde es komplett auf echte Datenbankabfragen umgestellt."),
    h3("Neue API-Routen"),
    bullet("GET /api/dashboard/stats?tenantId=xxx — KPIs, Pipeline, Bot-Aktivitaet, letzte Conversations"),
    bullet("GET /api/dashboard/conversations?tenantId=xxx — Live-Uebersicht mit Status-Filter und Lead-Daten"),
    h3("Dashboard-Aenderungen"),
    bullet("Alle Demo-Konstanten (DEMO_KPIS, DEMO_CONVERSATIONS, DEMO_LEADS, PIPELINE_STAGES) entfernt"),
    bullet("Echte Daten via fetch() von /api/dashboard/stats"),
    bullet("Auto-Refresh alle 30 Sekunden + manueller Refresh-Button"),
    bullet("Tenant-ID per Query-Param oder automatisch erster Tenant"),
    bullet("Leerzustand-Anzeige wenn keine Daten vorhanden"),
    bullet("Externe IDs DSGVO-konform maskiert"),
    bullet("Relative Zeitanzeige (vor 2 Min., vor 1 Std.)"),
    h3("Abfragen aus der DB"),
    bullet("Conversations heute (Count)"),
    bullet("Aktive Conversations (Count)"),
    bullet("Neue Leads heute (Count)"),
    bullet("Konversionsrate (CUSTOMER / alle Leads)"),
    bullet("Lead-Pipeline gruppiert nach Qualification"),
    bullet("Nachrichten letzte 24h (Count)"),
    bullet("Termine (Leads mit APPOINTMENT_SET)"),
    bullet("Letzte 5 Conversations mit letzter Nachricht"),
    h3("Status"),
    todo("API-Route /api/dashboard/stats", true),
    todo("API-Route /api/dashboard/conversations", true),
    todo("Dashboard auf echte Daten umgestellt", true),
    todo("Build erfolgreich (TypeScript, keine Fehler)", true),
    todo("Commit: c9b5ad4", true),
    divider(),
  ]);
  console.log(`Fortschritt: ${fortschritt.url}`);

  console.log("\n========================================");
  console.log("Seiten erfolgreich erstellt!");
  console.log("========================================");
  console.log(`\nProjekt-ID (fuer zukuenftige Updates): ${projekt.id}`);
  console.log(`Fortschritt-ID (fuer zukuenftige Updates): ${fortschritt.id}`);
}

main().catch((e) => { console.error("Fehler:", e.message); process.exit(1); });
