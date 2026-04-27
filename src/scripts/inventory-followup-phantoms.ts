// ============================================================
// Diagnostisches Skript fuer einmalige Followup-Phantom-Inventur
// (27.04.2026). Read-only. Nach erfolgreichem Cleanup zu
// archivieren in src/scripts/_archived/.
//
// Phase 1 von Followup-Phantom-Cleanup-Plan: identifiziert
// ASSISTANT-Messages, die der inzwischen deaktivierte
// /api/cron/followup-Job (vercel.json-Eintrag entfernt in
// Commit f371b76) erzeugt hat.
//
// Identifizierungs-Strategie (etabliert im Audit vom 27.04.):
//   role = 'ASSISTANT'
//   AND lead.followUpCount > 0
//   AND timestamp im 09:00-09:04:59 UTC-Fenster
//   AND KEIN USER-Vorlauf in den 5 Minuten davor
//
// Output: Konsolen-Aggregat pro Tenant + MOD-B2C-Detail +
// Diagnose-Sanity-Check (5min-Fenster vs. 30min-Fenster).
// DSGVO-safe: nur Slugs, Counts, technische IDs, Timestamps —
// keine Lead-Namen, keine Nachrichten-Inhalte.
//
// Verwendung: npx tsx src/scripts/inventory-followup-phantoms.ts
// ============================================================

import { config } from "dotenv";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// .env.local bevorzugt laden (analog check-db.ts)
config({ path: ".env.local", override: true });
config({ path: ".env" });

interface TenantAggregateRow {
  tenant_slug: string;
  affected_leads: bigint;
  total_phantom_msgs: bigint;
  earliest: Date | null;
  latest: Date | null;
}

interface ModDetailRow {
  conversation_id: string;
  lead_id: string;
  follow_up_count: number;
  phantom_msg_count: bigint;
  first_phantom: Date | null;
  last_phantom: Date | null;
}

interface DiagnosticRow {
  strict_count: bigint;
  loose_count: bigint;
}

function fmtDate(d: Date | null): string {
  if (!d) return "-";
  return d.toISOString().replace("T", " ").slice(0, 16);
}

function fmtCount(n: bigint | number): string {
  return Number(n).toString();
}

function printTable<T extends object>(
  rows: T[],
  columns: Array<{ key: keyof T; header: string; format?: (v: unknown) => string }>,
): void {
  if (rows.length === 0) {
    console.log("(keine Eintraege)");
    return;
  }
  const formatted = rows.map((r) =>
    columns.map((c) => {
      const v = (r as Record<string, unknown>)[c.key as string];
      return c.format ? c.format(v) : String(v ?? "-");
    }),
  );
  const widths = columns.map((c, i) =>
    Math.max(c.header.length, ...formatted.map((row) => row[i].length)),
  );
  const pad = (s: string, w: number): string => s + " ".repeat(Math.max(0, w - s.length));
  const sep = "| " + widths.map((w) => "-".repeat(w)).join(" | ") + " |";
  console.log("| " + columns.map((c, i) => pad(c.header, widths[i])).join(" | ") + " |");
  console.log(sep);
  for (const row of formatted) {
    console.log("| " + row.map((cell, i) => pad(cell, widths[i])).join(" | ") + " |");
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL ist nicht gesetzt!");
    process.exit(1);
  }

  const adapter = new PrismaPg(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    const today = new Date().toISOString().slice(0, 10);
    console.log(`[Inventory] Followup-Phantom-Messages — ${today}\n`);

    // --- 1) Tenant-Aggregat ---
    const inventory = await prisma.$queryRaw<TenantAggregateRow[]>`
      SELECT
        t.slug AS tenant_slug,
        COUNT(DISTINCT l.id) AS affected_leads,
        COUNT(m.id) AS total_phantom_msgs,
        MIN(m."timestamp") AS earliest,
        MAX(m."timestamp") AS latest
      FROM tenants t
      JOIN leads l ON l."tenantId" = t.id
      LEFT JOIN messages m ON m."conversationId" = l."conversationId"
        AND m.role = 'ASSISTANT'
        AND EXTRACT(HOUR FROM m."timestamp" AT TIME ZONE 'UTC') = 9
        AND EXTRACT(MINUTE FROM m."timestamp" AT TIME ZONE 'UTC') < 5
        AND NOT EXISTS (
          SELECT 1 FROM messages m2
          WHERE m2."conversationId" = m."conversationId"
            AND m2.role = 'USER'
            AND m2."timestamp" BETWEEN
              m."timestamp" - INTERVAL '5 minutes'
              AND m."timestamp"
        )
      WHERE l."followUpCount" > 0
      GROUP BY t.slug
      ORDER BY affected_leads DESC;
    `;

    console.log("=== Tenant-Aggregat ===");
    printTable(inventory, [
      { key: "tenant_slug", header: "tenant_slug" },
      { key: "affected_leads", header: "affected_leads", format: (v) => fmtCount(v as bigint) },
      { key: "total_phantom_msgs", header: "total_phantom_msgs", format: (v) => fmtCount(v as bigint) },
      { key: "earliest", header: "earliest", format: (v) => fmtDate(v as Date | null) },
      { key: "latest", header: "latest", format: (v) => fmtDate(v as Date | null) },
    ]);
    console.log();

    // --- 2) MOD-B2C Detail ---
    const modDetail = await prisma.$queryRaw<ModDetailRow[]>`
      SELECT
        l."conversationId" AS conversation_id,
        l.id AS lead_id,
        l."followUpCount" AS follow_up_count,
        COUNT(m.id) AS phantom_msg_count,
        MIN(m."timestamp") AS first_phantom,
        MAX(m."timestamp") AS last_phantom
      FROM leads l
      JOIN tenants t ON t.id = l."tenantId"
      LEFT JOIN messages m ON m."conversationId" = l."conversationId"
        AND m.role = 'ASSISTANT'
        AND EXTRACT(HOUR FROM m."timestamp" AT TIME ZONE 'UTC') = 9
        AND EXTRACT(MINUTE FROM m."timestamp" AT TIME ZONE 'UTC') < 5
        AND NOT EXISTS (
          SELECT 1 FROM messages m2
          WHERE m2."conversationId" = m."conversationId"
            AND m2.role = 'USER'
            AND m2."timestamp" BETWEEN
              m."timestamp" - INTERVAL '5 minutes'
              AND m."timestamp"
        )
      WHERE t.slug = 'mod-education-demo-b2c'
        AND l."followUpCount" > 0
      GROUP BY l."conversationId", l.id, l."followUpCount"
      ORDER BY phantom_msg_count DESC;
    `;

    console.log("=== MOD-B2C Detail ===");
    printTable(modDetail, [
      { key: "conversation_id", header: "conversation_id" },
      { key: "lead_id", header: "lead_id" },
      { key: "follow_up_count", header: "follow_up_count", format: (v) => fmtCount(v as number) },
      { key: "phantom_msg_count", header: "phantom_msg_count", format: (v) => fmtCount(v as bigint) },
      { key: "first_phantom", header: "first_phantom", format: (v) => fmtDate(v as Date | null) },
      { key: "last_phantom", header: "last_phantom", format: (v) => fmtDate(v as Date | null) },
    ]);
    console.log();

    // --- 3) Diagnose-Sanity-Check ---
    const diagnosticCheck = await prisma.$queryRaw<DiagnosticRow[]>`
      SELECT
        (SELECT COUNT(m.id) FROM messages m
         JOIN leads l ON l."conversationId" = m."conversationId"
         WHERE m.role = 'ASSISTANT'
           AND l."followUpCount" > 0
           AND EXTRACT(HOUR FROM m."timestamp" AT TIME ZONE 'UTC') = 9
           AND EXTRACT(MINUTE FROM m."timestamp" AT TIME ZONE 'UTC') < 5
           AND NOT EXISTS (
             SELECT 1 FROM messages m2
             WHERE m2."conversationId" = m."conversationId"
               AND m2.role = 'USER'
               AND m2."timestamp" BETWEEN
                 m."timestamp" - INTERVAL '5 minutes'
                 AND m."timestamp"
           )
        ) AS strict_count,
        (SELECT COUNT(m.id) FROM messages m
         JOIN leads l ON l."conversationId" = m."conversationId"
         WHERE m.role = 'ASSISTANT'
           AND l."followUpCount" > 0
           AND l."lastFollowUpAt" IS NOT NULL
           AND m."timestamp" BETWEEN
             l."lastFollowUpAt" - INTERVAL '30 minutes'
             AND l."lastFollowUpAt" + INTERVAL '30 minutes'
           AND NOT EXISTS (
             SELECT 1 FROM messages m2
             WHERE m2."conversationId" = m."conversationId"
               AND m2.role = 'USER'
               AND m2."timestamp" BETWEEN
                 m."timestamp" - INTERVAL '5 minutes'
                 AND m."timestamp"
           )
        ) AS loose_count;
    `;

    const diag = diagnosticCheck[0];
    const strict = diag ? Number(diag.strict_count) : 0;
    const loose = diag ? Number(diag.loose_count) : 0;
    const diff = loose - strict;

    console.log("=== Diagnose-Sanity-Check ===");
    console.log(`strict_count (5min-Fenster, 09:00 UTC):    ${strict}`);
    console.log(`loose_count  (30min-Fenster um lastFollowUpAt): ${loose}`);
    console.log(`Diff: ${diff}`);
    if (diff === 0) {
      console.log("→ Strategie greift sauber. Cron lief im engen Zeitfenster.");
    } else if (diff > 0) {
      console.log(
        "→ Cron-Verzoegerungen erkannt. Loose-Window faengt zusaetzliche Messages,",
      );
      console.log(
        "  die das Strict-Window verpasst. Window in Cleanup-Phase ggf. erweitern.",
      );
    } else {
      console.log(
        "→ Unerwartet: strict > loose. Sollte nicht moeglich sein, bitte manuell pruefen.",
      );
    }

    console.log("\n[Inventory] Abgeschlossen. Read-only, keine DB-Aenderungen.");
  } catch (error) {
    console.error("Fehler:", (error as Error).message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
