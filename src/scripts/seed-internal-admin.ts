// ============================================================
// Seed-Script: Internal Admin Tenant anlegen
// Erstellt den Platform-eigenen Tenant mit allen Modellen
// und maximalem Credit-Kontingent.
//
// Ausfuehrung: npx tsx src/scripts/seed-internal-admin.ts
// ============================================================

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });
loadEnv({ path: ".env" });

import { randomBytes, createHash } from "crypto";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  writeTokenBlock,
  type TokenEnv,
} from "../lib/dev-tools/token-file-writer";

const SLUG = "internal-admin";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function main() {
  const adapter = new PrismaPg(process.env.DATABASE_URL!);
  const db = new PrismaClient({ adapter });

  try {
    // Pruefen ob Tenant bereits existiert
    const existing = await db.tenant.findUnique({ where: { slug: SLUG } });
    if (existing) {
      console.log(`[Seed] Tenant "${SLUG}" existiert bereits (ID: ${existing.id})`);
      console.log("[Seed] Loesche und erstelle neu...");
      // Credits und Modelle zuerst loeschen (Cascade greift nicht bei diesen)
      await db.assetCredit.deleteMany({ where: { tenantId: existing.id } });
      await db.tenantAssetModel.deleteMany({ where: { tenantId: existing.id } });
      await db.lead.deleteMany({ where: { tenantId: existing.id } });
      await db.message.deleteMany({
        where: { conversation: { tenantId: existing.id } },
      });
      await db.conversation.deleteMany({ where: { tenantId: existing.id } });
      await db.tenant.delete({ where: { id: existing.id } });
    }

    // Token generieren
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h

    // Tenant erstellen
    const tenant = await db.tenant.create({
      data: {
        name: "AI Conversion Platform",
        slug: SLUG,
        whatsappPhoneId: "internal-platform",
        brandName: "AI Conversion",
        brandColor: "#C9A84C",
        retentionDays: 365,
        systemPrompt: "",
        dashboardToken: tokenHash,
        dashboardTokenExpiresAt: expiresAt,
        isActive: true,
      },
    });

    console.log(`[Seed] Tenant erstellt: ${tenant.id}`);

    // Asset Credits: 9999 monatlich
    await db.assetCredit.create({
      data: {
        tenantId: tenant.id,
        monthlyIncluded: 9999,
        used: 0,
        bonusCredits: 0,
        resetAt: new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          1
        ),
      },
    });

    console.log("[Seed] Asset Credits erstellt (9999/Monat)");

    // Alle Modelle aktivieren
    const models = ["GROK", "GEMINI", "FLUX"] as const;
    for (const model of models) {
      await db.tenantAssetModel.create({
        data: {
          tenantId: tenant.id,
          model,
          isActive: true,
        },
      });
    }

    console.log(`[Seed] Modelle aktiviert: ${models.join(", ")}`);

    // Magic Link in dashboard-links.txt speichern (in .gitignore).
    // Strukturierter Schreibvorgang via Helper — alter Block
    // fuer slug+env-Key wandert in ARCHIV, neuer Block ersetzt
    // ihn in AKTUELLE TOKENS.
    //
    // Heuristik fuer env: DATABASE_URL-Host. Prisma-Postgres-Hosts
    // mit "teal-battery" sind Production, alle anderen Dev. Fallback
    // bei unbekanntem Host: Dev (sicherer Default fuer Markierung).
    const dbHost = (process.env.DATABASE_URL ?? "").includes("teal-battery")
      ? "Production"
      : "Dev";
    const tokenEnv: TokenEnv = dbHost as TokenEnv;
    const loginUrl =
      tokenEnv === "Production"
        ? `https://ai-conversion.ai/dashboard/login?token=${rawToken}`
        : `http://localhost:3000/dashboard/login?token=${rawToken}`;

    writeTokenBlock({
      slug: SLUG,
      env: tokenEnv,
      loginUrl,
      tenantId: tenant.id,
      expiresAt,
    });

    console.log("[Seed] Magic Link gespeichert in: dashboard-links.txt");
    console.log(`[Seed] Tenant-ID: ${tenant.id}`);
    console.log("[Seed] Fertig! Oeffne dashboard-links.txt fuer den Login-Link.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("[Seed] Fehler:", err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
