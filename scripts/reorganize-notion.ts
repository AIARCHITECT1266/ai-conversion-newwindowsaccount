// ============================================================
// Notion Workspace Reorganisation – Hub-Struktur
// ============================================================

import { Client } from "@notionhq/client";
import { config } from "dotenv";

config({ path: ".env.local" });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const HQ_ID = "337301ca-b3d0-8127-8e7c-cc9fc73f98e7";

const results: Array<{ indent: number; name: string; url: string }> = [];

async function createPage(parentId: string, title: string, children: any[] = []) {
  const response = await notion.pages.create({
    parent: { page_id: parentId },
    properties: { title: { title: [{ text: { content: title } }] } },
    children,
  });
  const url = (response as any).url as string;
  return { id: response.id, url };
}

function linkBlock(title: string, url: string) {
  return {
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: { rich_text: [{ text: { content: title, link: { url } } }] },
  };
}

function heading(text: string) {
  return {
    object: "block" as const,
    type: "heading_3" as const,
    heading_3: { rich_text: [{ text: { content: text } }] },
  };
}

async function main() {
  console.log("Reorganisiere AI Conversion HQ...\n");

  // ============================================================
  // 1. Hub: WhatsApp Bot
  // ============================================================
  console.log("[1/5] Hub: WhatsApp Bot...");
  const waBot = await createPage(HQ_ID, "WhatsApp Bot", [
    heading("Produkt-Hub"),
    {
      object: "block", type: "paragraph",
      paragraph: { rich_text: [{ text: { content: "KI-gestuetzter Vertriebsassistent ueber WhatsApp. Claude fuehrt Verkaufsgespraeche, GPT-4o bewertet Leads automatisch." } }] },
    },
    { object: "block", type: "divider", divider: {} },
    heading("Bestehende Ressourcen"),
    linkBlock("Tages-Tasks Datenbank (global)", "https://www.notion.so/337301cab3d0812ab42ecb1e37410e9e"),
    linkBlock("Session Notes", "https://www.notion.so/337301cab3d081649b2ac8de768229a2"),
  ]);
  results.push({ indent: 0, name: "WhatsApp Bot", url: waBot.url });

  const waSubs = ["Kunden", "System-Prompt Vorlagen", "Preise und Pakete", "Onboarding Checkliste", "Roadmap"];
  for (const name of waSubs) {
    const p = await createPage(waBot.id, name);
    results.push({ indent: 1, name, url: p.url });
  }

  // ============================================================
  // 2. Hub: Multi-AI Interface
  // ============================================================
  console.log("[2/5] Hub: Multi-AI Interface...");
  const multiAI = await createPage(HQ_ID, "Multi-AI Interface", [
    heading("Produkt-Hub"),
    {
      object: "block", type: "paragraph",
      paragraph: { rich_text: [{ text: { content: "Ein Prompt, mehrere AIs auswaehlbar (Claude, GPT, Gemini, Grok). DSGVO-konform, als SaaS verkaufbar 49-299 EUR/Monat." } }] },
    },
    { object: "block", type: "divider", divider: {} },
  ]);
  results.push({ indent: 0, name: "Multi-AI Interface", url: multiAI.url });

  const multiSubs = ["Konzept und Vision", "Technische Architektur", "Preise und Pakete", "Roadmap"];
  for (const name of multiSubs) {
    const p = await createPage(multiAI.id, name);
    results.push({ indent: 1, name, url: p.url });
  }

  // ============================================================
  // 3. Hub: Voice Agent
  // ============================================================
  console.log("[3/5] Hub: Voice Agent...");
  const voice = await createPage(HQ_ID, "Voice Agent", [
    heading("Produkt-Hub"),
    {
      object: "block", type: "paragraph",
      paragraph: { rich_text: [{ text: { content: "KI-Sprachassistent fuer Telefon-Vertrieb mit gleicher Lead-Pipeline wie der WhatsApp Bot." } }] },
    },
    { object: "block", type: "divider", divider: {} },
  ]);
  results.push({ indent: 0, name: "Voice Agent", url: voice.url });

  const voiceSubs = ["Telnyx Setup Guide", "Preise und Pakete", "Roadmap"];
  for (const name of voiceSubs) {
    const p = await createPage(voice.id, name);
    results.push({ indent: 1, name, url: p.url });
  }

  // ============================================================
  // 4. Hub: Marketing und Vertrieb
  // ============================================================
  console.log("[4/5] Hub: Marketing und Vertrieb...");
  const marketing = await createPage(HQ_ID, "Marketing Hub", [
    heading("Marketing und Vertrieb"),
    {
      object: "block", type: "paragraph",
      paragraph: { rich_text: [{ text: { content: "Zentraler Ort fuer alle Marketing-Aktivitaeten, Kampagnen und Content-Planung." } }] },
    },
    { object: "block", type: "divider", divider: {} },
    heading("Bestehende Seiten"),
    linkBlock("Marketing und Vertrieb (alt)", "https://www.notion.so/Marketing-und-Vertrieb-337301cab3d0811ab3f8c62e75d98a8f"),
  ]);
  results.push({ indent: 0, name: "Marketing Hub", url: marketing.url });

  const marketingSubs = ["Kampagnen", "Zielgruppen", "Content Kalender", "Testimonials und Cases"];
  for (const name of marketingSubs) {
    const p = await createPage(marketing.id, name);
    results.push({ indent: 1, name, url: p.url });
  }

  // ============================================================
  // 5. Hub: Operations
  // ============================================================
  console.log("[5/5] Hub: Operations...");
  const ops = await createPage(HQ_ID, "Operations", [
    heading("Business Operations"),
    {
      object: "block", type: "paragraph",
      paragraph: { rich_text: [{ text: { content: "Finanzen, Recht, Tools und Deployment-Prozesse." } }] },
    },
    { object: "block", type: "divider", divider: {} },
    heading("Bestehende Seiten"),
    linkBlock("Finanzen (alt)", "https://www.notion.so/Finanzen-337301cab3d08103801be45c2b366f40"),
  ]);
  results.push({ indent: 0, name: "Operations", url: ops.url });

  const opsSubs = ["Finanzen und MRR", "DSGVO und Rechtliches", "Tools und Subscriptions", "Deployment Guide"];
  for (const name of opsSubs) {
    const p = await createPage(ops.id, name);
    results.push({ indent: 1, name, url: p.url });
  }

  // ============================================================
  // Ergebnis
  // ============================================================
  console.log("\n========================================");
  console.log("Hub-Struktur erstellt!");
  console.log("========================================\n");

  console.log("AI Conversion HQ");
  console.log("|");

  // Bestehende Top-Level Seiten
  console.log("|-- Session Notes: https://www.notion.so/337301cab3d081649b2ac8de768229a2");
  console.log("|");

  for (const r of results) {
    const prefix = r.indent === 0 ? "|-- " : "|   |-- ";
    console.log(prefix + r.name + ": " + r.url);
    if (r.indent === 0) {
      // Naechster Eintrag pruefen
      const idx = results.indexOf(r);
      const next = results[idx + 1];
      if (!next || next.indent === 0) console.log("|");
    }
  }

  console.log("|");
  console.log("|-- Roadmap und Tasks: https://www.notion.so/Roadmap-Tasks-337301cab3d081e0a23dcadbdbd496d4");
  console.log("|-- Dokumentation: https://www.notion.so/Dokumentation-337301cab3d08174a97deae1c3bc4549");
}

main().catch(e => { console.error("Fehler:", e.message); process.exit(1); });
