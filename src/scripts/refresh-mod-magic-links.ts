// ============================================================
// One-Off: Neue Dashboard-Magic-Links fuer die MOD-Demo-Tenants.
//
// Ruft POST /api/admin/tenants/<id> auf (rotiert dashboardToken,
// TTL 30 Tage nach Login — siehe SESSION_EXPIRY_MS). Schreibt die
// frischen Magic-Links in dashboard-links.txt (gitignored).
//
// Grund: Single-Use-Token-Rotation macht den urspruenglichen
// Magic-Link nach dem ersten Login ungueltig. Dieses Skript ist
// die pragmatische Sofort-Loesung, bis das Admin-UI-Feature
// "Neuen Dashboard-Link generieren" gebaut ist.
//
// Token wird NIEMALS in stdout geloggt (CLAUDE.md-Regel).
// Nur "gespeichert"-Bestaetigung + Link-Ziel (dashboard-links.txt).
// ============================================================

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });
loadEnv({ path: ".env" });

import {
  writeTokenBlock,
  type TokenEnv,
} from "../lib/dev-tools/token-file-writer";

const BASE_URL = (process.env.SEED_TARGET_URL ?? "https://ai-conversion.ai").replace(/\/+$/, "");
const ADMIN_SECRET = process.env.ADMIN_SECRET;

// Production-Heuristik: ai-conversion.ai = Production, sonst Dev.
// Wird an den strukturierten Token-File-Writer als env-Param
// uebergeben (Phase 2e Hygiene-Refactor).
const TOKEN_ENV: TokenEnv = BASE_URL.includes("ai-conversion.ai")
  ? "Production"
  : "Dev";

const TENANTS = [
  { slug: "mod-education-demo-b2c", label: "MOD B2C (Mara)" },
  { slug: "mod-education-demo-b2b", label: "MOD B2B (Nora)" },
];

function extractAdminToken(h: string | null): string | null {
  if (!h) return null;
  const m = /admin_token=([^;]+)/.exec(h);
  return m ? m[1] : null;
}

async function adminLogin(): Promise<string> {
  if (!ADMIN_SECRET) throw new Error("ADMIN_SECRET fehlt");
  const r = await fetch(`${BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: ADMIN_SECRET }),
  });
  if (!r.ok) throw new Error(`Login failed: ${r.status}`);
  const t = extractAdminToken(r.headers.get("set-cookie"));
  if (!t) throw new Error("no token");
  return t;
}

interface TenantListResponse {
  tenants: Array<{ id: string; slug: string }>;
}

interface RegenResponse {
  tenantId: string;
  dashboardLoginPath: string;
}

// API-Response liefert keinen Ablauf-Zeitpunkt fuer den Magic-Link.
// Quelle der Wahrheit: SESSION_EXPIRY_MS in der Auth-Modul, dort
// 30 Tage ab Login (Single-Use bis Login). Wir spiegeln den Wert
// hier als Anzeige-Schaetzung — exakt-genauer Wert kann erst nach
// dem ersten Tenant-Login bestimmt werden, vorher ist der Token
// nur "gueltig bis 30 Tage nach erstem Login". Hier zeigen wir
// stattdessen den 30-Tages-Horizont ab Generierung als Approximation.
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

async function main() {
  const sess = await adminLogin();
  console.log("Admin-Login ok.");

  const listRes = await fetch(`${BASE_URL}/api/admin/tenants`, {
    headers: { Authorization: `Bearer ${sess}` },
  });
  if (!listRes.ok) throw new Error(`list failed: ${listRes.status}`);
  const list = (await listRes.json()) as TenantListResponse;

  const generatedAt = new Date();
  const expiresAt = new Date(generatedAt.getTime() + TOKEN_TTL_MS);

  for (const t of TENANTS) {
    const found = list.tenants.find((x) => x.slug === t.slug);
    if (!found) {
      console.warn(`Tenant ${t.slug} nicht gefunden, ueberspringe.`);
      continue;
    }
    const regenRes = await fetch(`${BASE_URL}/api/admin/tenants/${found.id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sess}` },
    });
    if (!regenRes.ok) {
      throw new Error(`Regen failed fuer ${t.slug}: ${regenRes.status}`);
    }
    const data = (await regenRes.json()) as RegenResponse;

    // Strukturierter Schreibvorgang: alter Block fuer denselben
    // slug+env-Key wandert ins Archiv, neuer Block landet oben in
    // AKTUELLE TOKENS. Token-Wert nur in der Datei, niemals in stdout.
    writeTokenBlock({
      slug: t.slug,
      env: TOKEN_ENV,
      loginUrl: `${BASE_URL}${data.dashboardLoginPath}`,
      tenantId: found.id,
      extras: [
        { label: "Display-Name", value: t.label },
        { label: "Gueltig ab Login", value: "30 Tage (Single-Use bis dahin)" },
      ],
      expiresAt,
      generatedAt,
    });

    console.log(`${t.label}: Link regeneriert, in dashboard-links.txt gespeichert.`);
  }

  console.log("");
  console.log("Fertig. Links in dashboard-links.txt aktualisiert (gitignored).");
}

main().catch((err) => {
  console.error("Fehler:", err instanceof Error ? err.message : err);
  process.exit(1);
});
