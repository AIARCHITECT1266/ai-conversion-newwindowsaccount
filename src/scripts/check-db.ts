// Datenbank-Verbindungstest
// Verwendung: npx tsx src/scripts/check-db.ts
import { config } from "dotenv";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// .env.local bevorzugt laden
config({ path: ".env.local", override: true });
config({ path: ".env" });

async function main() {
  console.log("Teste Datenbankverbindung...\n");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL ist nicht gesetzt!");
    process.exit(1);
  }

  console.log("DATABASE_URL gefunden (Laenge:", process.env.DATABASE_URL.length, "Zeichen)\n");

  const adapter = new PrismaPg(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  try {
    const tenants = await prisma.tenant.count();
    console.log("DB-Verbindung erfolgreich!\n");

    console.log("Datensatz-Uebersicht:");
    console.log("  Tenants:", tenants);
    console.log("  Conversations:", await prisma.conversation.count());
    console.log("  Messages:", await prisma.message.count());
    console.log("  Leads:", await prisma.lead.count());
    console.log("  Campaigns:", await prisma.campaign.count());
    console.log("  Assets:", await prisma.asset.count());
    console.log("  Clients:", await prisma.client.count());
    console.log("  Campaign Templates:", await prisma.campaignTemplate.count());
    console.log("  Broadcasts:", await prisma.broadcast.count());

    console.log("\nAlle Tabellen erreichbar – Datenbank ist korrekt verbunden!");
  } catch (error) {
    console.error("Fehler:", (error as Error).message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
