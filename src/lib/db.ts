// ============================================================
// Prisma Client – Singleton für Next.js
// Verhindert mehrere Instanzen im Development-Modus durch
// Hot-Reloading. In Produktion wird eine einzelne Instanz genutzt.
// ============================================================

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    accelerateUrl: process.env.DATABASE_URL!,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
