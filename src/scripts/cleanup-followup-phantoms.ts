// ============================================================
// Diagnostisches Cleanup-Skript fuer einmaligen Followup-
// Phantom-Cleanup (27.04.2026). Default dry-run, ENV
// CLEANUP_COMMIT=true fuer echten DELETE. Nach erfolgreichem
// Cleanup zu archivieren in src/scripts/_archived/.
//
// Phase 2 von Followup-Phantom-Cleanup-Plan. Vorausgegangen:
// - Inventur (Commit e0855fc) bestaetigt 147 Phantom-Messages
//   ueber 4 Tenants (MOD-B2C 63, ai-conversion-marketing 42,
//   internal-admin 39, MOD-B2B 3)
// - Cron entfernt aus vercel.json (Commit f371b76)
//
// Identifizierungs-Strategie (identisch zu Inventur):
//   role = 'ASSISTANT'
//   AND lead.followUpCount > 0
//   AND timestamp im 09:00-09:04:59 UTC-Fenster
//   AND KEIN USER-Vorlauf in den 5 Minuten davor
//
// Verwendung:
//   npx tsx src/scripts/cleanup-followup-phantoms.ts
//     [--tenant=<slug>]
//
// Modi:
//   Default (kein ENV)        : DRY-RUN, Plan-Output, kein DELETE
//   CLEANUP_COMMIT=true       : echter DELETE in Transaction
//
// Tenant-Isolation:
//   - Identifizierungs-Query joint via leads.tenantId
//   - --tenant=<slug>-Filter: WHERE t.slug = '...'
//   - Ohne --tenant: cleanup ueber alle 4 betroffenen Tenants
//
// Lead-Marker (followUpCount, lastFollowUpAt) bleiben
// unveraendert — forensische Spur, dass diese Leads im
// Cron-Zeitraum 13.04.-26.04. erfasst wurden.
// ============================================================

import { config } from "dotenv";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: ".env.production.local", override: true });

interface IdRow {
  id: string;
}

interface CountRow {
  count: bigint;
}

function parseTenantArg(argv: string[]): string | null {
  for (const a of argv) {
    if (a.startsWith("--tenant=")) {
      const value = a.slice("--tenant=".length).trim();
      // Defensive: nur a-z0-9- erlaubt (Slug-Format), verhindert
      // Injection ueber argv. Slugs in der DB folgen diesem Format.
      if (!/^[a-z0-9-]+$/.test(value)) {
        console.error(
          `[Cleanup] FEHLER: --tenant=<slug> hat ungueltiges Format: '${value}'`,
        );
        process.exit(1);
      }
      return value;
    }
  }
  return null;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "[Cleanup] FEHLER: DATABASE_URL nicht gesetzt. Pruefe .env.production.local.",
    );
    process.exit(1);
  }

  const hostMatch = process.env.DATABASE_URL.match(/@([^:/?]+)/);
  const dbHost = hostMatch ? hostMatch[1] : "(host parse-error)";
  console.log(`[Cleanup] DATABASE_URL Host: ${dbHost}`);

  const tenantSlug = parseTenantArg(process.argv.slice(2));
  const isCommit = process.env.CLEANUP_COMMIT === "true";
  const modeLabel = isCommit ? "COMMIT (echter DELETE)" : "DRY-RUN";
  const scopeLabel = tenantSlug
    ? `Tenant-Filter: ${tenantSlug}`
    : "Tenant-Filter: alle Tenants";

  console.log(`[Cleanup] Modus: ${modeLabel}`);
  console.log(`[Cleanup] ${scopeLabel}\n`);

  const adapter = new PrismaPg(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    // --- Pre-Count ---
    const preCountRows = tenantSlug
      ? await prisma.$queryRaw<CountRow[]>`
          SELECT COUNT(m.id)::bigint AS count
          FROM messages m
          JOIN leads l ON l."conversationId" = m."conversationId"
          JOIN tenants t ON t.id = l."tenantId"
          WHERE m.role = 'ASSISTANT'
            AND l."followUpCount" > 0
            AND t.slug = ${tenantSlug}
            AND EXTRACT(HOUR FROM m."timestamp" AT TIME ZONE 'UTC') = 9
            AND EXTRACT(MINUTE FROM m."timestamp" AT TIME ZONE 'UTC') < 5
            AND NOT EXISTS (
              SELECT 1 FROM messages m2
              WHERE m2."conversationId" = m."conversationId"
                AND m2.role = 'USER'
                AND m2."timestamp" BETWEEN
                  m."timestamp" - INTERVAL '5 minutes'
                  AND m."timestamp"
            );
        `
      : await prisma.$queryRaw<CountRow[]>`
          SELECT COUNT(m.id)::bigint AS count
          FROM messages m
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
            );
        `;

    const preCount = Number(preCountRows[0]?.count ?? 0);
    console.log(
      `[Cleanup] Plan: ${preCount} Messages werden ${
        isCommit ? "GELOESCHT" : "identifiziert (DRY-RUN)"
      }`,
    );

    if (preCount === 0) {
      console.log("[Cleanup] Nichts zu tun. Beende.");
      return;
    }

    // --- Transaction: ID-Snapshot + DELETE oder Rollback ---
    try {
      await prisma.$transaction(
        async (tx) => {
          const toDelete = tenantSlug
            ? await tx.$queryRaw<IdRow[]>`
                SELECT m.id
                FROM messages m
                JOIN leads l ON l."conversationId" = m."conversationId"
                JOIN tenants t ON t.id = l."tenantId"
                WHERE m.role = 'ASSISTANT'
                  AND l."followUpCount" > 0
                  AND t.slug = ${tenantSlug}
                  AND EXTRACT(HOUR FROM m."timestamp" AT TIME ZONE 'UTC') = 9
                  AND EXTRACT(MINUTE FROM m."timestamp" AT TIME ZONE 'UTC') < 5
                  AND NOT EXISTS (
                    SELECT 1 FROM messages m2
                    WHERE m2."conversationId" = m."conversationId"
                      AND m2.role = 'USER'
                      AND m2."timestamp" BETWEEN
                        m."timestamp" - INTERVAL '5 minutes'
                        AND m."timestamp"
                  );
              `
            : await tx.$queryRaw<IdRow[]>`
                SELECT m.id
                FROM messages m
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
                  );
              `;

          console.log(`[Cleanup] Snapshot: ${toDelete.length} IDs erfasst`);

          if (!isCommit) {
            console.log(
              "[Cleanup] DRY-RUN — Transaction wird gleich rollbacked",
            );
            throw new Error("DRY_RUN_ABORT");
          }

          const result = await tx.message.deleteMany({
            where: { id: { in: toDelete.map((r) => r.id) } },
          });

          console.log(
            `[Cleanup] Deleted: ${result.count} (erwartet: ${toDelete.length})`,
          );

          if (result.count !== toDelete.length) {
            throw new Error(
              `Count-Mismatch: erwartet ${toDelete.length}, geloescht ${result.count}. Transaction wird rollbacked.`,
            );
          }
        },
        { timeout: 60_000, isolationLevel: "Serializable" },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "DRY_RUN_ABORT") {
        console.log(
          "[Cleanup] DRY-RUN abgeschlossen. Transaction wurde sauber rollbacked. Kein DELETE.",
        );
        return;
      }
      throw err;
    }

    // --- Post-Verifikation (nur bei COMMIT) ---
    const postCountRows = tenantSlug
      ? await prisma.$queryRaw<CountRow[]>`
          SELECT COUNT(m.id)::bigint AS count
          FROM messages m
          JOIN leads l ON l."conversationId" = m."conversationId"
          JOIN tenants t ON t.id = l."tenantId"
          WHERE m.role = 'ASSISTANT'
            AND l."followUpCount" > 0
            AND t.slug = ${tenantSlug}
            AND EXTRACT(HOUR FROM m."timestamp" AT TIME ZONE 'UTC') = 9
            AND EXTRACT(MINUTE FROM m."timestamp" AT TIME ZONE 'UTC') < 5
            AND NOT EXISTS (
              SELECT 1 FROM messages m2
              WHERE m2."conversationId" = m."conversationId"
                AND m2.role = 'USER'
                AND m2."timestamp" BETWEEN
                  m."timestamp" - INTERVAL '5 minutes'
                  AND m."timestamp"
            );
        `
      : await prisma.$queryRaw<CountRow[]>`
          SELECT COUNT(m.id)::bigint AS count
          FROM messages m
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
            );
        `;

    const postCount = Number(postCountRows[0]?.count ?? 0);
    console.log(`[Cleanup] Post-Cleanup-Count: ${postCount} (erwartet: 0)`);

    if (postCount !== 0) {
      console.error(
        `[Cleanup] WARNUNG: ${postCount} Phantom-Messages noch da. Re-Run noetig.`,
      );
      process.exit(1);
    }

    console.log("[Cleanup] Erfolgreich. DB ist sauber.");
  } catch (error) {
    console.error("[Cleanup] Fehler:", (error as Error).message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
