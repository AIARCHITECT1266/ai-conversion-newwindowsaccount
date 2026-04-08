#!/usr/bin/env tsx
// ============================================================
// AI Asset Studio – CLI Entry-Point
//
// Nutzung:
//   npx tsx modules/ai-asset-studio/cli/index.ts generate "Beschreibung" --model grok --variations 4
//   npx tsx modules/ai-asset-studio/cli/index.ts edit bild.png --sharpen 75 --round-corners 18 --brand-kit "premium-gold"
//   npx tsx modules/ai-asset-studio/cli/index.ts models --tenant <id> --list
//   npx tsx modules/ai-asset-studio/cli/index.ts models --tenant <id> --enable grok
//   npx tsx modules/ai-asset-studio/cli/index.ts credits --tenant <id>
// ============================================================

import { parseArgs } from "node:util";
import { generateCommand } from "./commands/generate";
import { editCommand } from "./commands/edit";
import { modelsCommand } from "./commands/models";
import { creditsCommand } from "./commands/credits";

// Haupt-Command aus dem ersten Argument ermitteln
const command = process.argv[2];

async function main(): Promise<void> {
  if (!command || command === "--help" || command === "-h") {
    printHelp();
    process.exit(0);
  }

  switch (command) {
    case "generate":
      await generateCommand();
      break;
    case "edit":
      await editCommand();
      break;
    case "models":
      await modelsCommand();
      break;
    case "credits":
      await creditsCommand();
      break;
    default:
      console.error(`Unbekannter Befehl: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp(): void {
  console.log(`
AI Asset Studio – CLI

Befehle:
  generate <prompt>    Bild generieren
    --model <id>       Modell: grok, claude, gemini, flux (Standard: flux)
    --variations <n>   Anzahl Variationen: 1-4 (Standard: 1)
    --width <px>       Bildbreite (Standard: 1024)
    --height <px>      Bildhöhe (Standard: 1024)
    --tenant <id>      Tenant-ID (Pflicht)
    --output <pfad>    Ausgabeverzeichnis (Standard: ./output)

  edit <datei>         Bild bearbeiten
    --sharpen <0-100>  Schärfe anwenden
    --round-corners <px>  Abgerundete Ecken
    --brand-kit <name> Brand-Kit anwenden (premium-gold, modern-purple, clean-white)
    --resize <WxH>     Größe ändern (z.B. 512x512)
    --format <fmt>     Ausgabeformat: png, webp, jpeg (Standard: png)
    --quality <1-100>  Qualität (Standard: 90)
    --tenant <id>      Tenant-ID (Pflicht)

  models               Modell-Verwaltung
    --tenant <id>      Tenant-ID (Pflicht)
    --list             Aktivierte Modelle anzeigen
    --enable <id>      Modell aktivieren
    --disable <id>     Modell deaktivieren

  credits              Credit-Stand anzeigen
    --tenant <id>      Tenant-ID (Pflicht)
`);
}

main().catch((error) => {
  console.error("Fehler:", error instanceof Error ? error.message : error);
  process.exit(1);
});
