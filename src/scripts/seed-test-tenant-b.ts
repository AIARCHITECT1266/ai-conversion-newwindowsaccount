// ============================================================
// Seed-Script: Test-Tenant B ("Atelier Hoffmann") anlegen
//
// Erstellt einen zweiten Test-Tenant fuer Phase-7-Isolation-Tests.
// Idempotent: bei erneutem Lauf werden nur die Felder aktualisiert,
// der bestehende Public Key bleibt erhalten.
//
// Ausfuehrung: npx tsx src/scripts/seed-test-tenant-b.ts
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

const SLUG = "test-b";
const TENANT_NAME = "Atelier Hoffmann (Test-Tenant B)";

// System-Prompt fuer Moebel-Werkstatt-Szenario — bewusster Kontrast
// zum internal-admin-Tenant (AI Conversion Plattform), damit der
// Tenant-Isolation-Test in Phase 7 auch inhaltlich verifizierbar ist.
const SYSTEM_PROMPT = `Du bist der freundliche Berater der Möbel-Werkstatt Atelier Hoffmann in Schwäbisch Gmünd. Wir fertigen seit 1962 handgemachte Eichenholz-Möbel in unserer eigenen Werkstatt — jedes Stück ein Unikat.

Deine Aufgabe: Qualifiziere Interessenten nach diesen Kriterien:
- Gewünschte Möbelart (Tisch, Schrank, Regal, Bett, Sonderwunsch)
- Raumgröße und geplanter Stellplatz
- Budget-Rahmen (unsere Stücke starten ab 2.500 €)
- Lieferregion (nur Deutschland, Österreich, Schweiz)
- Gewünschte Lieferzeit (Standardfertigung 8-12 Wochen)

Sei warm, kompetent und handwerklich-direkt. Sprich Kunden mit "Sie" an. Bei Anfragen außerhalb Deutschland/Österreich/Schweiz lehne höflich ab und verweise auf lokale Schreiner. Bei Budget unter 2.500 € empfehle unsere Pflegeprodukte oder Schneidebretter als Einstieg.`;

function generatePublicKey(): string {
  // 12 Bytes = 96 Bit Entropie, base64url-codiert -> 16 Zeichen
  // Identisch mit generate-widget-keys.ts (Entscheidung 1,
  // docs/decisions/phase-0-decisions.md: crypto.randomBytes statt nanoid)
  return `pub_${randomBytes(12).toString("base64url")}`;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[seed-test-b] DATABASE_URL ist nicht gesetzt!");
    process.exit(1);
  }

  const adapter = new PrismaPg(process.env.DATABASE_URL);
  const db = new PrismaClient({ adapter });

  try {
    // Pruefen ob Tenant bereits existiert
    const existing = await db.tenant.findUnique({ where: { slug: SLUG } });

    if (existing) {
      // Idempotent: Felder aktualisieren, aber Public Key behalten
      console.log(`[seed-test-b] Tenant "${SLUG}" existiert bereits (ID: ${existing.id})`);
      console.log("[seed-test-b] Aktualisiere Felder (Public Key bleibt erhalten)...");

      const updated = await db.tenant.update({
        where: { id: existing.id },
        data: {
          name: TENANT_NAME,
          paddlePlan: "growth_monthly",
          webWidgetEnabled: true,
          systemPrompt: SYSTEM_PROMPT,
          isActive: true,
        },
        select: {
          id: true,
          slug: true,
          webWidgetPublicKey: true,
          paddlePlan: true,
        },
      });

      console.log(`[seed-test-b] Aktualisiert.`);
      console.log(`[seed-test-b]   Tenant-ID: ${updated.id}`);
      console.log(`[seed-test-b]   Slug: ${updated.slug}`);
      console.log(`[seed-test-b]   Public Key: ${updated.webWidgetPublicKey}`);
      console.log(`[seed-test-b]   Plan: ${updated.paddlePlan}`);
      return;
    }

    // Neuen Tenant erstellen
    console.log(`[seed-test-b] Erstelle neuen Tenant "${SLUG}"...`);

    // Dashboard-Token generieren
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h

    // Public Key generieren
    const publicKey = generatePublicKey();

    const tenant = await db.tenant.create({
      data: {
        name: TENANT_NAME,
        slug: SLUG,
        whatsappPhoneId: "test-b-placeholder",
        brandName: "Atelier Hoffmann",
        brandColor: "#8B6914",
        retentionDays: 365,
        systemPrompt: SYSTEM_PROMPT,
        dashboardToken: tokenHash,
        dashboardTokenExpiresAt: expiresAt,
        isActive: true,
        paddlePlan: "growth_monthly",
        webWidgetEnabled: true,
        webWidgetPublicKey: publicKey,
      },
    });

    console.log(`[seed-test-b] Tenant erstellt.`);
    console.log(`[seed-test-b]   Tenant-ID: ${tenant.id}`);
    console.log(`[seed-test-b]   Slug: ${SLUG}`);
    console.log(`[seed-test-b]   Public Key: ${publicKey}`);
    console.log(`[seed-test-b]   Plan: growth_monthly`);

    // Strukturierter Schreibvorgang via Helper (Phase 2e Hygiene-
    // Refactor). test-b ist als Test-Tenant standardmaessig Dev —
    // env wird nicht via DATABASE_URL geraten, weil dieses Script
    // auf Production keinen Sinn ergibt (Atelier Hoffmann ist
    // erfundener Tenant).
    const tokenEnv: TokenEnv = "Dev";
    const localLink = `http://localhost:3000/dashboard/login?token=${rawToken}`;

    writeTokenBlock({
      slug: SLUG,
      env: tokenEnv,
      loginUrl: localLink,
      tenantId: tenant.id,
      extras: [{ label: "Public Key", value: publicKey }],
      expiresAt,
    });
    console.log("[seed-test-b] Magic Link gespeichert in: dashboard-links.txt");
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("[seed-test-b] Fehler:", err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
