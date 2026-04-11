// ============================================================
// Non-destructive Rotation des Dashboard-Magic-Link-Tokens
//
// Aktualisiert AUSSCHLIESSLICH dashboardToken und
// dashboardTokenExpiresAt am existierenden internal-admin-Tenant.
// Alle anderen Felder bleiben unveraendert. Kein Delete, kein
// Cascade, kein Anfassen von Conversations, Leads, Widget-Keys
// oder Asset-Credits.
//
// Pattern-Referenz: src/scripts/seed-internal-admin.ts (dessen
// "loesche und erstelle neu"-Flow zieht ALLES mit, deshalb
// dieses separate, sichere Skript fuer reine Token-Rotation).
//
// Neue Magic-Link-Eintraege werden an dashboard-links.txt
// appended (steht in .gitignore:47). Die Token-Werte
// erscheinen ausschliesslich in dieser Datei — niemals im
// Script-Output, niemals im Terminal. CLAUDE.md Security-Regel
// "Selbst generierte Secrets niemals im Output anzeigen, auch
// nicht zur Bestaetigung" gilt absolut.
//
// Ausfuehrung:
//   npx tsx src/scripts/rotate-dashboard-token.ts
// ============================================================

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });
loadEnv({ path: ".env" });

import { randomBytes, createHash } from "crypto";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";

// ---------- Konstanten ----------

const SLUG = "internal-admin";

// Token-TTL identisch zu seed-internal-admin.ts und der Pruefung in
// src/modules/auth/dashboard-auth.ts (MAGIC_LINK_EXPIRY_MS).
const TOKEN_TTL_MS = 72 * 60 * 60 * 1000;

// ---------- Hilfsfunktionen ----------

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ---------- Main ----------

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error(
      "[rotate-token] DATABASE_URL ist nicht gesetzt. .env.local pruefen.",
    );
    process.exit(1);
  }

  const adapter = new PrismaPg(process.env.DATABASE_URL);
  const db = new PrismaClient({ adapter });

  try {
    // Tenant ausschliesslich per Slug suchen. Kein findOrCreate,
    // kein Fallback-Anlegen - dieses Skript ist reiner Rotator.
    const tenant = await db.tenant.findUnique({
      where: { slug: SLUG },
      select: { id: true, name: true },
    });

    if (!tenant) {
      console.error(
        `[rotate-token] Tenant "${SLUG}" nicht gefunden. Dieses Skript ` +
          `rotiert nur einen bereits existierenden Tenant. Zum Erst-Anlegen ` +
          `bitte src/scripts/seed-internal-admin.ts verwenden (achtung: ` +
          `destruktiv - loescht vorhandene Conversations, Leads, Widget-Config).`,
      );
      process.exit(1);
    }

    // Neuen Rohtoken generieren: 32 Bytes = 256 Bit Entropie,
    // identisch zur Logik in seed-internal-admin.ts Zeile 46.
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    // NUR diese zwei Felder aktualisieren. Alles andere bleibt.
    await db.tenant.update({
      where: { id: tenant.id },
      data: {
        dashboardToken: tokenHash,
        dashboardTokenExpiresAt: expiresAt,
      },
    });

    // Link-Eintrag an dashboard-links.txt appenden. Der Lokal-Link
    // respektiert NEXT_PUBLIC_APP_URL aus .env.local (falls gesetzt),
    // sonst Fallback auf http://localhost:3000 (Next.js Dev-Mode-
    // Standard-Port). Trailing-Slashes werden defensiv entfernt.
    //
    // Spec-Bezug (CLAUDE.md Regel 5): Port 3001 aus dem ersten Wurf
    // dieses Skripts war eine falsche Port-Annahme — der Dev-Server
    // laeuft standardmaessig auf 3000, nicht auf 3001. Dieser Fix
    // stellt den Standard wieder her und macht die Port-Annahme
    // via ENV ueberschreibbar.
    const localBaseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    ).replace(/\/+$/, "");
    const prodLink = `https://ai-conversion.ai/dashboard/login?token=${rawToken}`;
    const localLink = `${localBaseUrl}/dashboard/login?token=${rawToken}`;
    const timestamp = new Date().toISOString();

    const entry = [
      "",
      `=== Dashboard Token Rotation ===`,
      `Rotiert: ${timestamp}`,
      `Tenant-ID: ${tenant.id}`,
      `Slug: ${SLUG}`,
      `Name: ${tenant.name}`,
      `Magic Link (Production): ${prodLink}`,
      `Magic Link (Lokal):      ${localLink}`,
      `Token laeuft ab: ${expiresAt.toISOString()}`,
      `Hinweis: Alle frueher generierten Tokens sind ab sofort ungueltig.`,
      "",
    ].join("\n");

    fs.appendFileSync("dashboard-links.txt", entry);

    // Bestaetigungs-Output auf stdout. KEINE Token-Werte, KEINE
    // Links, KEINE Hashes — siehe CLAUDE.md Self-Generated-
    // Secrets-Regel. Der User liest den Link direkt aus
    // dashboard-links.txt.
    console.log("[rotate-token] Token rotiert ✓");
    console.log(`[rotate-token] Tenant: ${tenant.name}`);
    console.log(`[rotate-token] Tenant-ID: ${tenant.id}`);
    console.log(`[rotate-token] Laeuft ab: ${expiresAt.toISOString()}`);
    console.log(
      "[rotate-token] Neuer Link an dashboard-links.txt appended.",
    );
    console.log(
      "[rotate-token] Oeffne die Datei lokal und nimm den Eintrag am Ende.",
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(
    "[rotate-token] Fehler:",
    err instanceof Error ? err.message : err,
  );
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
