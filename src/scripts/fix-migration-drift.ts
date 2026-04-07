// ============================================================
// Fix Migration Drift – Baselining-Script
// Prüft ob Schema und DB synchron sind und ob die
// Migration-History konsistent ist.
// Verwendung: npx tsx src/scripts/fix-migration-drift.ts
// ============================================================
import { config } from "dotenv";
import { execSync } from "child_process";

// .env.local bevorzugt laden
config({ path: ".env.local", override: true });
config({ path: ".env" });

function run(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: "pipe" });
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string; status?: number };
    return (e.stdout || "") + (e.stderr || "");
  }
}

function runWithExit(cmd: string): { output: string; exitCode: number } {
  try {
    const output = execSync(cmd, { encoding: "utf-8", stdio: "pipe" });
    return { output, exitCode: 0 };
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string; status?: number };
    return {
      output: (e.stdout || "") + (e.stderr || ""),
      exitCode: e.status ?? 1,
    };
  }
}

async function main() {
  console.log("=== Prisma Migration Drift Check ===\n");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL ist nicht gesetzt!");
    process.exit(1);
  }
  console.log("1. DATABASE_URL gefunden\n");

  // Schritt 2: Migration Status prüfen
  console.log("2. Migration Status:");
  const status = run("npx prisma migrate status");
  console.log(status);

  const isUpToDate = status.includes("Database schema is up to date");

  // Schritt 3: Drift prüfen
  console.log("3. Drift-Check (Schema vs. Datenbank):");
  const { output: diffOutput, exitCode: diffExit } = runWithExit(
    "npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code"
  );
  console.log(diffOutput);

  if (diffExit === 0 && isUpToDate) {
    console.log("Kein Drift erkannt. Schema und DB sind synchron.");
    console.log("Migration-History ist konsistent.");
    console.log("\nAb jetzt sicher verwendbar:");
    console.log("  npx prisma migrate dev --name <beschreibung>  (Development)");
    console.log("  npx prisma migrate deploy                     (Production)");
    console.log("\n=== Alles OK ===");
    process.exit(0);
  }

  if (diffExit === 2) {
    console.log("DRIFT ERKANNT! Schema und DB stimmen nicht überein.\n");
    console.log("Optionen:");
    console.log("  a) npx prisma db push          – DB an Schema anpassen (ohne Migration)");
    console.log("  b) npx prisma migrate dev      – Neue Migration erstellen und anwenden");
    console.log("  c) Baseline neu erstellen       – Dieses Script erneut nach db push ausführen");
    process.exit(2);
  }

  if (!isUpToDate) {
    console.log("Migration-History hat Drift, aber kein Schema-Drift.\n");
    console.log("Empfehlung: Baseline neu erstellen:");
    console.log("  1. npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > migration.sql");
    console.log("  2. Alte Migrationen ersetzen");
    console.log("  3. npx prisma migrate resolve --applied <name>");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Unerwarteter Fehler:", e);
  process.exit(1);
});
