// ============================================================
// Daten-Migration: Web-Widget Public Keys generieren
//
// Erzeugt fuer alle Tenants ohne webWidgetPublicKey einen neuen
// Key im Format "pub_<base64url(12 Bytes)>" und speichert ihn in
// der DB. Idempotent: Tenants mit bestehendem Key werden uebersprungen.
//
// Ausfuehrung:
//   npx tsx src/scripts/generate-widget-keys.ts
//
// Entscheidung 1 (docs/decisions/phase-0-decisions.md):
// Wir verwenden crypto.randomBytes statt nanoid - keine neue
// Dependency, ausreichend Entropie (96 Bit).
// ============================================================

import { config } from "dotenv";
import { randomBytes } from "crypto";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// .env.local bevorzugt laden - muss VOR dem PrismaClient-Init passieren.
config({ path: ".env.local", override: true });
config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  console.error("[generate-widget-keys] DATABASE_URL ist nicht gesetzt!");
  process.exit(1);
}

const db = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL),
});

function generatePublicKey(): string {
  // 12 Bytes = 96 Bit Entropie, base64url-codiert -> 16 Zeichen
  return `pub_${randomBytes(12).toString("base64url")}`;
}

async function main(): Promise<void> {
  const tenants = await db.tenant.findMany({
    where: { webWidgetPublicKey: null },
    select: { id: true, name: true, slug: true },
  });

  if (tenants.length === 0) {
    console.log("[generate-widget-keys] Keine Tenants ohne Public-Key gefunden.");
    return;
  }

  console.log(
    `[generate-widget-keys] ${tenants.length} Tenant(s) ohne Public-Key gefunden, generiere Keys ...`,
  );

  let success = 0;
  for (const tenant of tenants) {
    const publicKey = generatePublicKey();

    try {
      await db.tenant.update({
        where: { id: tenant.id },
        data: { webWidgetPublicKey: publicKey },
      });

      // Slug und Name sind nicht sensitiv (Admin-interne Identifier),
      // der Key selbst ist per Definition oeffentlich.
      console.log(
        `[generate-widget-keys]   ${tenant.slug} (${tenant.name}) -> ${publicKey}`,
      );
      success += 1;
    } catch (error) {
      console.error(
        `[generate-widget-keys]   FEHLER bei ${tenant.slug}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  console.log(
    `[generate-widget-keys] Fertig: ${success}/${tenants.length} Tenants aktualisiert.`,
  );
}

main()
  .catch((error) => {
    console.error("[generate-widget-keys] Abbruch:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
