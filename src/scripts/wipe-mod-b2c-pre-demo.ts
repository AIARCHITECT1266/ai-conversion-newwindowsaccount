// ============================================================
// Pre-Demo-DB-Wipe fuer mod-education-demo-b2c
// Stage-basiertes One-Shot-Skript (28.04.2026 abends).
// Loescht Conversations, Messages, Leads, Clients, Broadcasts,
// BroadcastRecipients, Campaigns, AbTests fuer einen einzigen
// Tenant. Tenant-Stammdaten (id, slug, settings, hubspotApiKey,
// systemPrompt etc.) bleiben unangetastet.
//
// Pattern analog cleanup-followup-phantoms.ts (heute Vormittag):
// .env.production.local laden, Stages mit Dry-Run,
// Transaction-basierter Wipe mit Rollback bei Fehler.
//
// Verwendung:
//   npx tsx src/scripts/wipe-mod-b2c-pre-demo.ts inventur
//   npx tsx src/scripts/wipe-mod-b2c-pre-demo.ts dry-run
//   WIPE_COMMIT=true npx tsx src/scripts/wipe-mod-b2c-pre-demo.ts commit
//   npx tsx src/scripts/wipe-mod-b2c-pre-demo.ts verify
//
// Sicherheit:
//   - Tenant-Slug hardcoded ("mod-education-demo-b2c")
//   - Stage 'commit' erfordert ZUSAETZLICH WIPE_COMMIT=true
//     (zwei-Faktor-Bestaetigung: CLI-Subcommand + ENV-Var)
//   - Sanity-Check vor und nach: andere Tenants duerfen sich
//     in Counts (Leads + Conversations) NICHT veraendern
//   - Loesch-Reihenfolge: leaf-first, deterministische Counts
//     statt Cascade-Reliance (siehe deletionOrder() Doku)
//
// Audit-Log:
//   - Nach erfolgreichem Commit: strukturierter JSON-Log
//     analog modules/compliance/auditLog (action="wipe.pre_demo").
//   - AuditAction-Union NICHT erweitert (one-shot Skript,
//     Vercel Log Drain parsiert beide Formen identisch).
// ============================================================

import { config } from "dotenv";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: ".env.production.local", override: true });

const TENANT_SLUG = "mod-education-demo-b2c";

type Stage = "inventur" | "dry-run" | "commit" | "verify";

interface Counts {
  conversations: number;
  messages: number;
  leads: number;
  clients: number;
  broadcasts: number;
  broadcastRecipients: number;
  campaigns: number;
  abTests: number;
}

interface DeleteCounts {
  broadcastRecipients: number;
  broadcasts: number;
  abTests: number;
  messages: number;
  clients: number;
  leads: number;
  conversations: number;
  campaigns: number;
}

function parseStage(argv: string[]): Stage {
  const a = argv[0];
  if (a === "inventur" || a === "dry-run" || a === "commit" || a === "verify") {
    return a;
  }
  console.error(
    "Usage: npx tsx src/scripts/wipe-mod-b2c-pre-demo.ts <inventur|dry-run|commit|verify>",
  );
  process.exit(1);
}

// Reihenfolge: leaf-first. Wir koennten teilweise auf
// Cascade-Constraints vertrauen (Conversation->Lead->Client,
// Conversation->Message, Campaign->AbTest), aber dann waeren
// die deleteMany-Counts irrefuehrend (0 statt der echten Zahl).
// Durch explizite Reihenfolge bekommen wir pro Entity einen
// deterministischen Count.
type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

async function performWipe(tx: Tx, tenantId: string): Promise<DeleteCounts> {
  const r1 = await tx.broadcastRecipient.deleteMany({
    where: { broadcast: { tenantId } },
  });
  const r2 = await tx.broadcast.deleteMany({
    where: { tenantId },
  });
  const r3 = await tx.abTest.deleteMany({
    where: { campaign: { tenantId } },
  });
  const r4 = await tx.message.deleteMany({
    where: { conversation: { tenantId } },
  });
  const r5 = await tx.client.deleteMany({
    where: { tenantId },
  });
  const r6 = await tx.lead.deleteMany({
    where: { tenantId },
  });
  const r7 = await tx.conversation.deleteMany({
    where: { tenantId },
  });
  const r8 = await tx.campaign.deleteMany({
    where: { tenantId },
  });
  return {
    broadcastRecipients: r1.count,
    broadcasts: r2.count,
    abTests: r3.count,
    messages: r4.count,
    clients: r5.count,
    leads: r6.count,
    conversations: r7.count,
    campaigns: r8.count,
  };
}

async function countAll(prisma: PrismaClient, tenantId: string): Promise<Counts> {
  const [
    conversations,
    messages,
    leads,
    clients,
    broadcasts,
    broadcastRecipients,
    campaigns,
    abTests,
  ] = await Promise.all([
    prisma.conversation.count({ where: { tenantId } }),
    prisma.message.count({ where: { conversation: { tenantId } } }),
    prisma.lead.count({ where: { tenantId } }),
    prisma.client.count({ where: { tenantId } }),
    prisma.broadcast.count({ where: { tenantId } }),
    prisma.broadcastRecipient.count({ where: { broadcast: { tenantId } } }),
    prisma.campaign.count({ where: { tenantId } }),
    prisma.abTest.count({ where: { campaign: { tenantId } } }),
  ]);
  return {
    conversations,
    messages,
    leads,
    clients,
    broadcasts,
    broadcastRecipients,
    campaigns,
    abTests,
  };
}

function printCounts(label: string, c: Counts): void {
  console.log(`\n[${label}] Counts fuer ${TENANT_SLUG}:`);
  console.log(`  Conversations       : ${c.conversations}`);
  console.log(`  Messages            : ${c.messages}`);
  console.log(`  Leads               : ${c.leads}`);
  console.log(`  Clients             : ${c.clients}`);
  console.log(`  Broadcasts          : ${c.broadcasts}`);
  console.log(`  BroadcastRecipients : ${c.broadcastRecipients}`);
  console.log(`  Campaigns           : ${c.campaigns}`);
  console.log(`  AbTests             : ${c.abTests}`);
}

function printDeleted(label: string, d: DeleteCounts): void {
  console.log(`\n[${label}] Geloeschte Eintraege:`);
  console.log(`  BroadcastRecipients : ${d.broadcastRecipients}`);
  console.log(`  Broadcasts          : ${d.broadcasts}`);
  console.log(`  AbTests             : ${d.abTests}`);
  console.log(`  Messages            : ${d.messages}`);
  console.log(`  Clients             : ${d.clients}`);
  console.log(`  Leads               : ${d.leads}`);
  console.log(`  Conversations       : ${d.conversations}`);
  console.log(`  Campaigns           : ${d.campaigns}`);
}

interface SanityCounts {
  otherLeads: number;
  otherConversations: number;
}

async function sanityCheckOtherTenants(
  prisma: PrismaClient,
  ourTenantId: string,
): Promise<SanityCounts> {
  const [otherLeads, otherConversations] = await Promise.all([
    prisma.lead.count({ where: { tenantId: { not: ourTenantId } } }),
    prisma.conversation.count({ where: { tenantId: { not: ourTenantId } } }),
  ]);
  return { otherLeads, otherConversations };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "[Wipe] FEHLER: DATABASE_URL nicht gesetzt. Pruefe .env.production.local.",
    );
    process.exit(1);
  }

  const hostMatch = process.env.DATABASE_URL.match(/@([^:/?]+)/);
  const dbHost = hostMatch ? hostMatch[1] : "(host parse-error)";
  console.log(`[Wipe] DATABASE_URL Host: ${dbHost}`);

  const stage = parseStage(process.argv.slice(2));
  console.log(`[Wipe] Stage: ${stage}`);
  console.log(`[Wipe] Tenant-Slug (hardcoded): ${TENANT_SLUG}`);

  const adapter = new PrismaPg(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: TENANT_SLUG },
      select: { id: true, slug: true, name: true },
    });
    if (!tenant) {
      console.error(
        `[Wipe] FEHLER: Tenant mit slug='${TENANT_SLUG}' nicht in DB gefunden. Abbruch.`,
      );
      process.exit(1);
    }
    console.log(`[Wipe] Tenant geladen: id=${tenant.id} name=${tenant.name}`);

    const sanityPre = await sanityCheckOtherTenants(prisma, tenant.id);
    console.log(
      `[Sanity-Pre] Andere Tenants: ${sanityPre.otherLeads} Leads, ${sanityPre.otherConversations} Conversations (werden NICHT angefasst)`,
    );

    if (stage === "inventur") {
      const c = await countAll(prisma, tenant.id);
      printCounts("INVENTUR", c);
      return;
    }

    if (stage === "verify") {
      const c = await countAll(prisma, tenant.id);
      printCounts("VERIFY", c);
      const total =
        c.conversations +
        c.messages +
        c.leads +
        c.clients +
        c.broadcasts +
        c.broadcastRecipients +
        c.campaigns +
        c.abTests;
      if (total === 0) {
        console.log(`\n[Wipe] DB clean fuer ${TENANT_SLUG}. Bereit fuer Live-Mara-Tests.`);
      } else {
        console.error(`\n[Wipe] WARNUNG: ${total} Eintraege noch da. Re-Run noetig.`);
        process.exit(1);
      }
      return;
    }

    if (stage === "dry-run") {
      const pre = await countAll(prisma, tenant.id);
      printCounts("PRE-DRY-RUN", pre);

      try {
        await prisma.$transaction(
          async (tx) => {
            const deleted = await performWipe(tx, tenant.id);
            printDeleted("DRY-RUN (wuerde loeschen)", deleted);
            throw new Error("DRY_RUN_ABORT");
          },
          { timeout: 60_000, isolationLevel: "Serializable" },
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === "DRY_RUN_ABORT") {
          console.log(
            "\n[DRY-RUN] Transaction sauber rollbacked. Keine DB-Aenderung.",
          );
        } else {
          throw err;
        }
      }

      // Verify nichts geaendert
      const post = await countAll(prisma, tenant.id);
      const unchanged = JSON.stringify(pre) === JSON.stringify(post);
      console.log(
        `[DRY-RUN] Counts unveraendert nach Rollback: ${unchanged ? "JA" : "NEIN (FEHLER!)"}`,
      );
      if (!unchanged) process.exit(1);
      return;
    }

    if (stage === "commit") {
      if (process.env.WIPE_COMMIT !== "true") {
        console.error(
          "\n[Wipe] FEHLER: 'commit'-Stage erfordert WIPE_COMMIT=true im ENV.",
        );
        console.error(
          "        Beispiel: WIPE_COMMIT=true npx tsx src/scripts/wipe-mod-b2c-pre-demo.ts commit",
        );
        console.error(
          "        Vorher 'inventur' und 'dry-run' ausfuehren, um Auswirkung zu pruefen.",
        );
        process.exit(1);
      }

      const pre = await countAll(prisma, tenant.id);
      printCounts("PRE-COMMIT", pre);

      let deleted: DeleteCounts;
      try {
        deleted = await prisma.$transaction(
          async (tx) => performWipe(tx, tenant.id),
          { timeout: 120_000, isolationLevel: "Serializable" },
        );
      } catch (err) {
        console.error(
          "[Wipe] Transaction fehlgeschlagen, automatischer Rollback:",
          (err as Error).message,
        );
        process.exit(1);
      }

      printDeleted("COMMIT", deleted);

      // Strukturierter Audit-Log analog modules/compliance/auditLog.
      // AuditAction-Union NICHT erweitert (siehe Header-Kommentar).
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          action: "wipe.pre_demo",
          tenantId: tenant.id,
          details: {
            tenantSlug: TENANT_SLUG,
            deleted,
          },
        }),
      );

      // Sanity-Post: andere Tenants unveraendert?
      const sanityPost = await sanityCheckOtherTenants(prisma, tenant.id);
      const otherUntouched =
        sanityPre.otherLeads === sanityPost.otherLeads &&
        sanityPre.otherConversations === sanityPost.otherConversations;
      console.log(
        `[Sanity-Post] Andere Tenants unveraendert: ${otherUntouched ? "JA" : "NEIN (FEHLER!)"}`,
      );
      if (!otherUntouched) {
        console.error(
          "[Wipe] KRITISCH: Andere Tenants haben sich veraendert. Sofort PITR-Restore pruefen.",
        );
        process.exit(1);
      }

      console.log(
        `\n[Wipe] Commit erfolgreich. Naechster Schritt: 'verify'-Stage ausfuehren.`,
      );
      return;
    }
  } catch (error) {
    console.error("[Wipe] Fehler:", (error as Error).message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
