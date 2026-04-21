// ============================================================
// Einmal-Verify: Tenant-Isolation nach MOD-Demo-Seeding
//
// Prueft via Admin-API, dass:
// - mod-education-demo-b2c: 8 Conversations, 8 Leads (durch Seed)
// - mod-education-demo-b2b: unveraendert (Phase 1 hat nur Prompt
//   gesetzt, keine Demo-Daten dort)
// - Alle anderen Tenants: unveraendert im Vergleich zum Baseline
//
// Dieses Script ist eine diagnostische Hilfe, keine wiederholbare
// Infrastruktur. Nach dem Demo-Call kann es geloescht werden.
// ============================================================

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });
loadEnv({ path: ".env" });

const BASE_URL = (process.env.SEED_TARGET_URL ?? "https://ai-conversion.ai").replace(/\/+$/, "");
const ADMIN_SECRET = process.env.ADMIN_SECRET;

function extractAdminToken(h: string | null): string | null {
  if (!h) return null;
  const m = /admin_token=([^;]+)/.exec(h);
  return m ? m[1] : null;
}

async function main() {
  if (!ADMIN_SECRET) throw new Error("ADMIN_SECRET fehlt");

  const login = await fetch(`${BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: ADMIN_SECRET }),
  });
  if (!login.ok) throw new Error(`Login failed: ${login.status}`);
  const token = extractAdminToken(login.headers.get("set-cookie"));
  if (!token) throw new Error("no token");

  const res = await fetch(`${BASE_URL}/api/admin/tenants`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  const data = (await res.json()) as {
    tenants: Array<{
      id: string;
      slug: string;
      paddlePlan: string | null;
      webWidgetEnabled: boolean;
      _count: { conversations: number; leads: number };
    }>;
  };

  console.log("Tenant-Uebersicht (nach Phase-2-Seed):");
  console.log("");
  console.log("Slug".padEnd(32) + "Plan".padEnd(22) + "Widget".padEnd(10) + "Convs".padStart(6) + "Leads".padStart(7));
  console.log("-".repeat(80));

  for (const t of data.tenants) {
    const slug = t.slug.padEnd(32);
    const plan = (t.paddlePlan ?? "-").padEnd(22);
    const widget = (t.webWidgetEnabled ? "on" : "off").padEnd(10);
    const convs = String(t._count.conversations).padStart(6);
    const leads = String(t._count.leads).padStart(7);
    console.log(`${slug}${plan}${widget}${convs}${leads}`);
  }

  console.log("");
  console.log("Erwartung:");
  console.log("  mod-education-demo-b2c: 8 Convs, 8 Leads (durch Seed)");
  console.log("  mod-education-demo-b2b: unveraendert (nur Prompt gesetzt)");
  console.log("  alle anderen: unveraendert");
}

main().catch((err) => {
  console.error("Fehler:", err instanceof Error ? err.message : err);
  process.exit(1);
});
