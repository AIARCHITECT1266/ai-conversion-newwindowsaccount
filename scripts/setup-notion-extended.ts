// ============================================================
// Notion Workspace Setup – Erweiterte Struktur
// Erstellt die komplette Unterseiten-Hierarchie
// ============================================================

import { Client } from "@notionhq/client";
import { config } from "dotenv";

config({ path: ".env.local" });

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Bestehende Seiten-IDs
const HQ_ID = "337301ca-b3d0-8127-8e7c-cc9fc73f98e7";
const SESSION_NOTES_ID = "337301ca-b3d0-8164-9b2a-c8de768229a2";
const KUNDEN_ID = "337301ca-b3d0-8149-af60-f7355b469167";
const ROADMAP_ID = "337301ca-b3d0-81e0-a23d-cadbdbd496d4";
const FINANZEN_ID = "337301ca-b3d0-8103-801b-e45c2b366f40";
const DOCS_ID = "337301ca-b3d0-8174-a97d-eae1c3bc4549";
const PRODUKTE_ID = "337301ca-b3d0-8161-ba68-f762b421146a";
const SESSION_040426_ID = "337301ca-b3d0-81da-822e-f403dc463d05";

// Ergebnis-Sammlung
const results: Array<{ name: string; url: string }> = [];

async function createPage(parentId: string, title: string, children: any[] = []) {
  const response = await notion.pages.create({
    parent: { page_id: parentId },
    properties: {
      title: { title: [{ text: { content: title } }] },
    },
    children,
  });
  const url = (response as any).url as string;
  results.push({ name: title, url });
  return { id: response.id, url };
}

async function main() {
  console.log("Erstelle erweiterte Notion-Struktur...\n");

  // ============================================================
  // 1. Session Notes: Jahres- und Monatsstruktur
  // ============================================================
  console.log("[1/7] Session Notes...");

  const year2026 = await createPage(SESSION_NOTES_ID, "2026");

  const april = await createPage(year2026.id, "April 2026", [
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{
          text: {
            content: "Session 04.04.2026 -- WhatsApp SaaS Launch",
            link: { url: `https://www.notion.so/${SESSION_040426_ID.replace(/-/g, "")}` },
          },
        }],
      },
    },
  ]);

  const mai = await createPage(year2026.id, "Mai 2026");
  const juni = await createPage(year2026.id, "Juni 2026");
  const juli = await createPage(year2026.id, "Juli 2026");
  const august = await createPage(year2026.id, "August 2026");

  console.log("   Fertig: 2026, April-August");

  // ============================================================
  // 2. Kunden & Tenants: Unterseiten
  // ============================================================
  console.log("[2/7] Kunden & Tenants...");

  await createPage(KUNDEN_ID, "Aktive Kunden");
  await createPage(KUNDEN_ID, "Pipeline und Leads");
  await createPage(KUNDEN_ID, "Offboarded");
  await createPage(KUNDEN_ID, "Onboarding Templates");

  console.log("   Fertig: 4 Unterseiten");

  // ============================================================
  // 3. Roadmap & Tasks: Unterseiten
  // ============================================================
  console.log("[3/7] Roadmap & Tasks...");

  await createPage(ROADMAP_ID, "Diese Woche");
  await createPage(ROADMAP_ID, "Backlog");
  await createPage(ROADMAP_ID, "Erledigt");
  await createPage(ROADMAP_ID, "Ideen und Spaeter");

  console.log("   Fertig: 4 Unterseiten");

  // ============================================================
  // 4. Finanzen: Unterseiten
  // ============================================================
  console.log("[4/7] Finanzen...");

  await createPage(FINANZEN_ID, "MRR Tracker");
  await createPage(FINANZEN_ID, "Ausgaben 2026");
  await createPage(FINANZEN_ID, "Rechnungen");
  await createPage(FINANZEN_ID, "Tools und Subscriptions");

  console.log("   Fertig: 4 Unterseiten");

  // ============================================================
  // 5. Dokumentation: Unterseiten
  // ============================================================
  console.log("[5/7] Dokumentation...");

  await createPage(DOCS_ID, "System Architektur");
  await createPage(DOCS_ID, "API Dokumentation");
  await createPage(DOCS_ID, "DSGVO und Rechtliches");
  await createPage(DOCS_ID, "Deployment Guide");
  await createPage(DOCS_ID, "Troubleshooting");

  console.log("   Fertig: 5 Unterseiten");

  // ============================================================
  // 6. Produkte: Unterseiten mit Sub-Unterseiten
  // ============================================================
  console.log("[6/7] Produkte...");

  const whatsappBot = await createPage(PRODUKTE_ID, "WhatsApp Bot");
  await createPage(whatsappBot.id, "Features");
  await createPage(whatsappBot.id, "Preise");
  await createPage(whatsappBot.id, "Roadmap");

  const multiAI = await createPage(PRODUKTE_ID, "Multi-AI Interface");
  await createPage(multiAI.id, "Konzept");
  await createPage(multiAI.id, "Preise");
  await createPage(multiAI.id, "Roadmap");

  const voiceAgent = await createPage(PRODUKTE_ID, "Voice Agent");
  await createPage(voiceAgent.id, "Konzept");
  await createPage(voiceAgent.id, "Telnyx Setup");
  await createPage(voiceAgent.id, "Roadmap");

  console.log("   Fertig: 3 Produkte mit je 3 Unterseiten");

  // ============================================================
  // 7. Neue Hauptseite: Marketing und Vertrieb
  // ============================================================
  console.log("[7/7] Marketing und Vertrieb...");

  const marketing = await createPage(HQ_ID, "Marketing und Vertrieb");
  await createPage(marketing.id, "Zielgruppen");
  await createPage(marketing.id, "Kampagnen");
  await createPage(marketing.id, "Content Ideen");
  await createPage(marketing.id, "Testimonials und Cases");

  console.log("   Fertig: 4 Unterseiten");

  // ============================================================
  // Ergebnis
  // ============================================================
  console.log("\n========================================");
  console.log(`${results.length} Seiten erfolgreich erstellt`);
  console.log("========================================\n");

  for (const r of results) {
    console.log(`${r.name}: ${r.url}`);
  }
}

main().catch((error) => {
  console.error("Fehler:", error.message);
  process.exit(1);
});
