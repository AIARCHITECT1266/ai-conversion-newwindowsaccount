// ============================================================
// Einmal-Diagnose: Welche displayName-Werte sind in der DB?
// Ruft GET /api/admin/demo-seed/mod-education auf.
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
  if (!login.ok) throw new Error(`Login: ${login.status}`);
  const token = extractAdminToken(login.headers.get("set-cookie"));
  if (!token) throw new Error("no token");

  // Retry-Loop: bei 404 warten bis GET-Handler deployt ist
  let data: {
    tenantSlug: string;
    count: number;
    items: Array<{
      externalId: string | null;
      displayName: string | null;
      displayNameLength: number;
      age: number | null;
      score: number | null;
    }>;
  } | null = null;

  for (let attempt = 0; attempt < 15; attempt++) {
    const res = await fetch(`${BASE_URL}/api/admin/demo-seed/mod-education`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      data = await res.json();
      break;
    }
    if (res.status === 405 || res.status === 404) {
      console.log(`Versuch ${attempt + 1}: ${res.status} — Deploy wohl noch nicht durch, warte 15s...`);
      await new Promise((r) => setTimeout(r, 15000));
      continue;
    }
    throw new Error(`GET failed: ${res.status} ${await res.text()}`);
  }

  if (!data) throw new Error("GET-Endpoint nach 15 Versuchen nicht erreichbar");

  console.log(`Tenant: ${data.tenantSlug}`);
  console.log(`Demo-Conversations: ${data.count}`);
  console.log("");
  console.log("externalId".padEnd(28) + "displayName".padEnd(22) + "len".padStart(5) + "age".padStart(5) + "score".padStart(7));
  console.log("-".repeat(70));
  for (const i of data.items) {
    console.log(
      (i.externalId ?? "(null)").padEnd(28) +
        (i.displayName ?? "(null)").padEnd(22) +
        String(i.displayNameLength).padStart(5) +
        String(i.age ?? "-").padStart(5) +
        String(i.score ?? "-").padStart(7),
    );
  }
}

main().catch((err) => {
  console.error("Fehler:", err instanceof Error ? err.message : err);
  process.exit(1);
});
