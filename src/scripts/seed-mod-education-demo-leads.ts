// ============================================================
// Seed-Script: MOD Education Demo-Leads (8 Leads, Mara-B2C)
//
// Ruft den Admin-API-Endpoint
// POST /api/admin/demo-seed/mod-education auf.
// Tenant-Slug ist serverseitig hartkodiert.
//
// Environment-Variablen:
//   SEED_TARGET_URL   Base-URL. Default: https://ai-conversion.ai
//   ADMIN_SECRET      Admin-Secret fuer /api/admin/login
//
// Ausfuehrung:
//   npx tsx src/scripts/seed-mod-education-demo-leads.ts
// ============================================================

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });
loadEnv({ path: ".env" });

const BASE_URL = (process.env.SEED_TARGET_URL ?? "https://ai-conversion.ai").replace(/\/+$/, "");
const ADMIN_SECRET = process.env.ADMIN_SECRET;

function extractAdminToken(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;
  const match = /admin_token=([^;]+)/.exec(setCookieHeader);
  return match ? match[1] : null;
}

async function adminLogin(): Promise<string> {
  if (!ADMIN_SECRET) {
    throw new Error("ADMIN_SECRET fehlt in der Umgebung (siehe .env.local)");
  }

  const res = await fetch(`${BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: ADMIN_SECRET }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Admin-Login fehlgeschlagen (${res.status}): ${text.slice(0, 200)}`);
  }
  const token = extractAdminToken(res.headers.get("set-cookie"));
  if (!token) throw new Error("Set-Cookie-Header ohne admin_token");
  return token;
}

interface SeedResponse {
  tenantSlug: string;
  tenantName: string;
  deleted: number;
  created: number;
  leads: Array<{ name: string; score: number; qualification: string }>;
}

async function main() {
  console.log(`[seed-demo-leads] Target: ${BASE_URL}`);

  const token = await adminLogin();
  console.log("[seed-demo-leads] Admin-Login ok.");

  const res = await fetch(`${BASE_URL}/api/admin/demo-seed/mod-education`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Demo-Seed fehlgeschlagen (${res.status}): ${text.slice(0, 400)}`);
  }

  const data = (await res.json()) as SeedResponse;

  console.log(`[seed-demo-leads] Tenant: ${data.tenantName} (${data.tenantSlug})`);
  console.log(`[seed-demo-leads] Alte Demo-Leads geloescht: ${data.deleted}`);
  console.log(`[seed-demo-leads] Neue Demo-Leads erstellt:  ${data.created}`);
  console.log("");
  console.log("Lead-Uebersicht:");
  for (const l of data.leads) {
    const scoreLabel = l.score >= 80 ? "A" : l.score >= 55 ? "A/B" : l.score >= 30 ? "B" : "C";
    console.log(`  [${scoreLabel}] ${l.name.padEnd(24)} Score ${String(l.score).padStart(3)}  ${l.qualification}`);
  }
  console.log("");
  console.log("[seed-demo-leads] Fertig.");
}

main().catch((err) => {
  console.error("[seed-demo-leads] Fehler:", err instanceof Error ? err.message : err);
  process.exit(1);
});
