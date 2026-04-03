// Prisma-Konfiguration – lädt .env.local bevorzugt vor .env
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// .env.local hat Vorrang (enthält die echten Vercel-Werte)
config({ path: ".env.local", override: true });
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
