// ============================================================
// Prisma Client – Singleton für Next.js
// Verhindert mehrere Instanzen im Development-Modus durch
// Hot-Reloading. In Produktion wird eine einzelne Instanz genutzt.
// Prisma 7 erfordert einen Driver Adapter (PrismaPg).
// ============================================================

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg(process.env.DATABASE_URL!);
  return new PrismaClient({ adapter });
}

export const db =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
