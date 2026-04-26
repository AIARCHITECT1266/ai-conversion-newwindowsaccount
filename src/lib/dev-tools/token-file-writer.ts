// ============================================================
// Strukturierter dashboard-links.txt-Writer (Phase 2e Hygiene)
//
// Vorher: append-only — alte Tokens stehen unsichtbar zwischen
// neuen, kein Schnell-Lookup, keine Markierung was ungueltig ist.
//
// Jetzt: zwei-Sektionen-Struktur
//   === AKTUELLE TOKENS ===   <- ein Block pro slug+env, oben neueste
//   === ARCHIV (alte Tokens, ungültig) ===
//
// Logik pro Aufruf:
//   1. Datei lesen (oder neu starten, wenn fehlt)
//   2. Bestehenden AKTUELLE-Block fuer denselben slug+env-Key
//      in den Archiv-Kopf verschieben
//   3. Initial-Migration: Wenn die Datei noch im alten Format
//      vorliegt (kein === AKTUELLE TOKENS ===-Header), wandert
//      der gesamte Bestand verbatim in den Archiv-Kopf
//   4. Neuen Block oben in AKTUELLE einsetzen
//   5. Atomar zurueckschreiben (Temp-Datei + rename)
//
// Token-Werte: erscheinen ausschliesslich in der Datei,
// niemals in stdout. Diese Datei stehen in .gitignore und
// niemals in git-Stage.
//
// Pattern-Reuse: Berlin-Zeit-Formatierung lokal
// (Intl.DateTimeFormat mit longOffset waere overkill —
// timezone-berlin.ts hat bewusst nur Tag-Bounds, keine
// HH:MM-Formatierung).
// ============================================================

import * as fs from "fs";
import * as path from "path";

// ---------- Public Types ----------

export type TokenEnv = "Dev" | "Production";

export interface TokenBlock {
  /**
   * Tenant-Slug, z.B. "internal-admin", "mod-education-demo-b2c".
   * Bildet zusammen mit `env` den Block-Key fuer Replacement.
   */
  slug: string;

  /**
   * "Dev" wenn der Token gegen die Dev-DB (red-mirror) generiert
   * wurde, "Production" bei teal-battery-DB. Heuristik in den
   * Scripts: URL-Host bestimmt den Wert (ai-conversion.ai →
   * Production, sonst Dev).
   */
  env: TokenEnv;

  /**
   * Vollstaendiger Magic-Link inklusive Token-Query-Parameter.
   * Landet ausschliesslich in der Datei, nie in stdout.
   */
  loginUrl: string;

  /** Tenant-ID (cuid) fuer Debug-Lookup. */
  tenantId: string;

  /**
   * Optionale Extra-Felder, die in der Reihenfolge der Insertion
   * unterhalb der Tenant-ID gerendert werden.
   * Beispiele: { "Public Key": "pub_xxx", "Plan": "growth_monthly" }.
   */
  extras?: Array<{ label: string; value: string }>;

  /** ISO-Ablauf-Zeitpunkt des Tokens. */
  expiresAt: Date;

  /**
   * Wenn `true`: Hinweiszeile "ACHTUNG: Nach erstem Login rotiert
   * der Token (Single-Use)!" wird angehaengt. Default: true.
   */
  singleUseWarning?: boolean;

  /**
   * Wann der Token erstellt wurde. Default: jetzt.
   * Param vorhanden fuer deterministische Tests.
   */
  generatedAt?: Date;
}

// ---------- Sektion-Header-Konstanten ----------

const HEADER_AKTUELLE = "=== AKTUELLE TOKENS ===";
const HEADER_ARCHIV = "=== ARCHIV (alte Tokens, ungültig) ===";
const ARCHIV_INTRO =
  "[chronologisch absteigend — neueste oben, aelteste unten]";
const AKTUELLE_INTRO = "[immer die zuletzt rotierten Tokens, ein Block pro slug+env]";

// ---------- Public API ----------

/**
 * Schreibt den neuen Token-Block in die strukturierte Datei.
 * Atomares Read-modify-write. Datei-Pfad ist der Repo-Root
 * `dashboard-links.txt`, kann fuer Tests ueberschrieben werden.
 */
export function writeTokenBlock(
  block: TokenBlock,
  filePath: string = "dashboard-links.txt",
): void {
  const newBlockText = renderBlock(block);
  const blockKey = makeKey(block.slug, block.env);

  const previousContent = readIfExists(filePath);
  const next = mergeIntoStructuredFile(previousContent, blockKey, newBlockText);
  atomicWrite(filePath, next);
}

// ---------- Render ----------

function renderBlock(block: TokenBlock): string {
  const generatedAt = block.generatedAt ?? new Date();
  const tsBerlin = formatBerlinTimestamp(generatedAt);
  const lines: string[] = [];
  lines.push(`## ${block.slug} (${block.env}) — generiert ${tsBerlin}`);
  lines.push(block.loginUrl);
  lines.push(`Tenant-ID: ${block.tenantId}`);
  if (block.extras) {
    for (const extra of block.extras) {
      lines.push(`${extra.label}: ${extra.value}`);
    }
  }
  lines.push(`Token laeuft ab: ${block.expiresAt.toISOString()}`);
  if (block.singleUseWarning !== false) {
    lines.push(
      "ACHTUNG: Nach erstem Login rotiert der Token (Single-Use)!",
    );
  }
  return lines.join("\n");
}

// ---------- File I/O ----------

function readIfExists(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

function atomicWrite(filePath: string, content: string): void {
  // Temp-File im selben Verzeichnis, danach rename. Auf demselben
  // Filesystem ist rename atomar (POSIX-Garantie; Windows-NTFS
  // verhaelt sich aequivalent fuer Single-File-Operationen).
  const dir = path.dirname(filePath);
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.tmp-${process.pid}-${Date.now()}`,
  );
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, filePath);
}

// ---------- Merge ----------

function mergeIntoStructuredFile(
  previousContent: string | null,
  blockKey: string,
  newBlockText: string,
): string {
  // Drei Faelle:
  // (a) Datei existiert nicht / leer  → frische Struktur
  // (b) Datei in alter Append-only-Form (kein AKTUELLE-Header)
  //     → kompletter Inhalt wandert in ARCHIV-Kopf, neuer Block
  //       oben in AKTUELLE
  // (c) Datei bereits strukturiert
  //     → bestehender Block fuer denselben Key wandert nach Archiv,
  //       neuer Block ersetzt ihn

  if (previousContent === null || previousContent.trim().length === 0) {
    return assembleFile([newBlockText], "");
  }

  const hasAktuelleHeader = previousContent.includes(HEADER_AKTUELLE);

  if (!hasAktuelleHeader) {
    // (b) Initial-Migration: ganzer Bestand → ARCHIV-Kopf.
    const legacyArchive = previousContent.trim();
    return assembleFile([newBlockText], legacyArchive);
  }

  // (c) Strukturierte Datei
  const parsed = parseStructured(previousContent);
  const otherCurrent: string[] = [];
  let displaced: string | null = null;
  for (const blk of parsed.currentBlocks) {
    const key = extractKey(blk);
    if (key === blockKey) {
      displaced = blk;
    } else {
      otherCurrent.push(blk);
    }
  }

  const newCurrent = [newBlockText, ...otherCurrent];
  const newArchiveHead = displaced ? displaced + "\n\n" : "";
  const newArchive = (newArchiveHead + parsed.archive).trim();
  return assembleFile(newCurrent, newArchive);
}

interface ParsedFile {
  currentBlocks: string[]; // each block is `## slug (env) — ... \n url \n ...`
  archive: string; // verbatim archive content (without ARCHIV header)
}

function parseStructured(content: string): ParsedFile {
  const aktuelleIdx = content.indexOf(HEADER_AKTUELLE);
  const archivIdx = content.indexOf(HEADER_ARCHIV);

  // Region zwischen AKTUELLE-Header und ARCHIV-Header (oder EOF)
  const aktuelleStart = aktuelleIdx + HEADER_AKTUELLE.length;
  const aktuelleEnd = archivIdx === -1 ? content.length : archivIdx;
  const aktuelleRaw = content.slice(aktuelleStart, aktuelleEnd);
  const currentBlocks = splitBlocksByHeader(aktuelleRaw);

  let archive = "";
  if (archivIdx !== -1) {
    archive = content
      .slice(archivIdx + HEADER_ARCHIV.length)
      .replace(ARCHIV_INTRO, "")
      .trim();
  }

  return { currentBlocks, archive };
}

// Zerlegt einen Datei-Slice in einzelne Blocks. Block-Header
// erkennt sich an Zeilen, die mit `## ` beginnen.
function splitBlocksByHeader(slice: string): string[] {
  const lines = slice.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current.length > 0) {
        const text = current.join("\n").trim();
        if (text.length > 0) blocks.push(text);
      }
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) {
    const text = current.join("\n").trim();
    if (text.length > 0) blocks.push(text);
  }
  return blocks;
}

function extractKey(block: string): string {
  // Header-Form: "## <slug> (<env>) — generiert <ts>"
  const firstLine = block.split("\n", 1)[0] ?? "";
  const match = firstLine.match(/^##\s+(\S+)\s+\((Dev|Production)\)/);
  if (!match) return "";
  return makeKey(match[1], match[2] as TokenEnv);
}

function makeKey(slug: string, env: TokenEnv): string {
  return `${slug}@${env}`;
}

// ---------- Assemble ----------

function assembleFile(currentBlocks: string[], archive: string): string {
  const parts: string[] = [];
  parts.push(HEADER_AKTUELLE);
  parts.push(AKTUELLE_INTRO);
  parts.push("");
  if (currentBlocks.length === 0) {
    parts.push("(keine aktuellen Tokens)");
  } else {
    parts.push(currentBlocks.join("\n\n"));
  }
  parts.push("");
  parts.push("");
  parts.push(HEADER_ARCHIV);
  parts.push(ARCHIV_INTRO);
  parts.push("");
  if (archive.length > 0) {
    parts.push(archive);
  } else {
    parts.push("(noch keine archivierten Tokens)");
  }
  parts.push("");
  return parts.join("\n");
}

// ---------- Berlin-Time-Formatter ----------

function formatBerlinTimestamp(date: Date): string {
  // YYYY-MM-DD HH:MM in Berlin-Zeit, DST-aware via
  // Intl.DateTimeFormat — keine eigene Offset-Mathematik.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get(
    "hour",
  )}:${get("minute")}`;
}
