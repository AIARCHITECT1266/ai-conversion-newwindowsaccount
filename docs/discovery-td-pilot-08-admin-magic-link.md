# Discovery — TD-Pilot-08: Admin-Magic-Link-Generator

**Zweck:** Stilkonforme Umsetzung eines Magic-Link-Generators im
Admin-Dashboard vorbereiten. Preview-URL-Login-Problem loesen (Cookie
haengt an `ai-conversion.ai`, Vercel-Preview nutzt Subdomain).

**Scope:** Keine Code-Aenderungen, keine Dependencies, reine Inspektion.

---

## Sektion 1 — Admin-Dashboard-Struktur

### Datei-Baum `src/app/admin/` (3 Ebenen)

```
src/app/admin/
└── page.tsx               # einzige Datei — alles in einem 1604-Zeilen-File
```

Keine `layout.tsx`, keine `route.ts`-Handler unterhalb `/admin`. Kein
`components/`-Ordner. **Nur eine Datei** — das macht den Einbau
trivial (ein Ort, eine Komponente), aber das File ist gross.

### Hauptseite `page.tsx`

- **Komponenten-Natur:** Client Component (`"use client";` in Zeile 1).
- **Server-Rendering:** keins — alles clientseitig, Daten via
  `fetch("/api/admin/tenants")` + `fetch("/api/admin/stats")` in
  `loadData()` (`page.tsx:130-153`).
- **Tenant-Laden:** paralleler Fetch auf `/api/admin/tenants` +
  `/api/admin/stats` (`page.tsx:133-137`). `loadTenantDetail(id)`
  laedt Detail erst on-click (`page.tsx:155-168`).
- **Top-Level-Default-Export:** `AdminDashboard` (`page.tsx:79`).
- **Private Sub-Komponenten im selben File:** `KpiCard`
  (`page.tsx:647`), `MiniPipeline` (`page.tsx:693`),
  `CreateTenantModal` (`page.tsx:719`), `TenantDetailModal`
  (`page.tsx:948`), `EditTenantModal` (`page.tsx:1211`),
  `DetailField` (`page.tsx:1185`), `Field` (`page.tsx:1567`).

### Bestehendes Modal-System

Kein Portal, kein Library. Jedes Modal ist ein **Inline-Pattern** mit
fixem Overlay, zentriertem Inhalt und `onClick={(e) =>
e.stopPropagation()}` im Panel-Container gegen Backdrop-Click.

Pattern-Skelett (z.B. `DeleteConfirmation` in `page.tsx:538-585`):

```tsx
// src/app/admin/page.tsx:538-585
{deleteTarget && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    onClick={() => setDeleteTarget(null)}
  >
    <div
      className="w-full max-w-sm rounded-2xl p-6"
      style={{ background: "var(--surface)", border: "1px solid var(--gold-border)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="mb-2 text-lg font-semibold text-white">Tenant loeschen</h3>
      ...
    </div>
  </div>
)}
```

Escape-Key-Handling steckt zentral in einem `useEffect`
(`page.tsx:97-109`) und schliesst die Modale in Prioritaets-Reihenfolge:
`deleteTarget → editingTenant → selectedTenant → openMenuId`.

Toast-Pattern existiert auch als Inline-Snippet (`page.tsx:528-536`)
mit Auto-Hide nach 3 s (`page.tsx:123-128`).

### `...`-Dropdown pro Tenant-Zeile

Der Dropdown lebt in der Zellen-Definition der Tabelle
(`page.tsx:476-517`), nicht als extrahierte Komponente. State:
`openMenuId` (`page.tsx:91`). Click-Outside-Handling in einem eigenen
`useEffect` mit `menuRef` (`page.tsx:112-121`). Animation via
`<AnimatePresence>` / `framer-motion`.

**Aktuell zwei Actions** (Zeilen 496-513):

```tsx
// src/app/admin/page.tsx:496-513
<button
  onClick={() => {
    setOpenMenuId(null);
    loadTenantDetail(tenant.id);
  }}
  className="w-full px-4 py-2.5 text-left text-sm text-gray-300 transition-colors hover:bg-white/[0.04] hover:text-white"
>
  Bearbeiten
</button>
<button
  onClick={() => {
    setOpenMenuId(null);
    setDeleteTarget({ id: tenant.id, name: tenant.name });
  }}
  className="w-full px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
>
  Loeschen
</button>
```

**Struktur:** kein Array, kein Config-Objekt — zwei hand-geschriebene
`<button>`-Elemente direkt im JSX. Das ist wichtig fuer den Build-
Prompt: eine neue Action bedeutet ein **drittes `<button>`-Element**
direkt im Dropdown, **nicht** ein Array-Eintrag. Stil-Referenz fuer
die neue Action: "Bearbeiten"-Variante (neutrale Farbe), nicht die
"Loeschen"-Variante (rot).

---

## Sektion 2 — Magic-Link-Bestandsaufnahme

### Token-Format

- **Generierung:** `randomBytes(32).toString("hex")` — 64-Zeichen-
  Hex-String, kryptografisch zufaellig
  (`src/app/api/admin/tenants/[id]/route.ts:312`).
- **DB-Speicherung:** SHA-256-Hash (`hashToken()` aus
  `dashboard-auth.ts:19-21`), nicht der Klartext. Feld
  `Tenant.dashboardToken` ist `@unique` (`schema.prisma:26`).
- **Kein JWT.** Simple Opaque-Token, Session-State steht in der DB.
- **TTL-Feld:** `Tenant.dashboardTokenExpiresAt` (`DateTime?`,
  `schema.prisma:27`) — Expiry wird bei Token-Lookup in
  `getDashboardTenant()` geprueft (`dashboard-auth.ts:62-64`).

### Existierender Rotations-Pfad (**wichtig!**)

**Es gibt bereits einen Rotations-Endpoint** —
`POST /api/admin/tenants/[id]` — volle Implementierung in
`src/app/api/admin/tenants/[id]/route.ts:299-342`:

```tsx
// src/app/api/admin/tenants/[id]/route.ts:299-330
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idResult = idSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: "Ungueltige Tenant-ID" }, { status: 400 });
    }

    const rawToken = randomBytes(32).toString("hex");

    const tenant = await db.tenant.update({
      where: { id },
      data: {
        dashboardToken: hashToken(rawToken),
        dashboardTokenExpiresAt: new Date(Date.now() + MAGIC_LINK_EXPIRY_MS),
      },
      select: { id: true, name: true },
    });

    console.log("[Admin] Dashboard-Token regeneriert", { tenantId: tenant.id });

    // Klartext-Token einmalig dem Admin zeigen – in DB nur als Hash gespeichert
    return NextResponse.json({
      tenantId: tenant.id,
      message: "Dashboard-Token wurde regeneriert",
      dashboardLoginPath: `/dashboard/login?token=${rawToken}`,
    });
  } catch (error) {
    ...
  }
}
```

**Verwendet von:** `src/scripts/refresh-mod-magic-links.ts:79-86`,
d.h. der Endpoint ist produktiv, getestet, wird via Admin-Session-
Token von CLI-Scripts aufgerufen.

**Wiederverwendbare Helper** (in `src/modules/auth/dashboard-auth.ts`):

- `hashToken(token: string): string` — SHA-256-Hash fuer DB-Storage
- `MAGIC_LINK_EXPIRY_MS = 72 * 60 * 60 * 1000` — **72 Stunden**
  (hartcodierte Konstante, nicht konfigurierbar)
- `SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000` — 30 Tage nach Login
- `getDashboardTenant()` prueft Expiry transparent

### TTL-Konflikt mit Scope-Anforderung

Die Scope-Vorgabe nennt **Token-TTL: 1 Stunde**. Die aktuelle
`MAGIC_LINK_EXPIRY_MS`-Konstante ist aber 72 Stunden. Zwei Optionen:

1. Den Expiry-Wert **inline** im neuen Feature setzen (z.B.
   `new Date(Date.now() + 60 * 60 * 1000)`), statt die globale
   Konstante zu benutzen. Konstant bleibt 72 h als Default fuer den
   Create-Flow; das neue Feature hat eigene kurz-lebige Semantik
   (Preview-Login vs. Kunden-Einladung).
2. Die Konstante verallgemeinern (`MAGIC_LINK_EXPIRY_MS_LONG` +
   `MAGIC_LINK_EXPIRY_MS_SHORT`) — groesserer Scope, mehr Aenderungen.

**Empfehlung fuer den Build:** Variante 1 — inline, dedizierter Expiry,
keine globale Konstanten-Aenderung.

### Frontend-Aufruf-Muster (existiert bereits im Create-Flow)

Beim **Tenant-Anlegen** wird der zurueckgegebene `dashboardLoginPath`
direkt im Create-Modal als kopierbarer Link angezeigt
(`page.tsx:586-620`):

```tsx
// src/app/admin/page.tsx:606-612
if (result.dashboardLoginPath) {
  setCreatedMagicLink(
    `${window.location.origin}${result.dashboardLoginPath}`
  );
}
```

Der Anzeige-Teil (`CreateTenantModal` in der Success-Variante,
`page.tsx:772-836`) enthaelt bereits einen Copy-Button mit
2-Sekunden-"Kopiert!"-Feedback. Diesen Teil **kann der Build
wiederverwenden** als Pattern (nicht als Komponente — der Code ist
inline im `CreateTenantModal`, nicht extrahiert).

---

## Sektion 3 — Audit-Log-Integration

### Bestehende AuditAction-Enum-Werte

Quelle: `src/modules/compliance/audit-log.ts:7-40`. Vollstaendige
Liste:

| Gruppe | Werte |
|---|---|
| admin | `admin.login`, `admin.login_failed`, `admin.tenant_created`, `admin.tenant_updated`, `admin.tenant_deleted`, **`admin.token_regenerated`**, `admin.demo_seed_mod_education` |
| dashboard | `dashboard.login`, `dashboard.login_failed`, `dashboard.prompt_updated`, `dashboard.scoring_updated` |
| webhook | `webhook.received`, `webhook.duplicate`, `webhook.invalid_signature`, `webhook.handler_error` |
| bot | `bot.conversation_created`, `bot.consent_requested`, `bot.consent_given`, `bot.conversation_stopped`, `bot.reply_sent`, `bot.reply_failed`, `bot.lead_scored`, `bot.hubspot_pushed` |
| widget | `widget.config_fetched`, `widget.session_started`, `widget.message_received`, `widget.config_updated`, `widget.public_key_generated`, `widget.toggled` |
| cron / gdpr / rate_limit | `cron.cleanup_completed`, `rate_limit.exceeded`, `gdpr.data_export`, `gdpr.dpa_accepted` |

**Wichtiger Befund:** `admin.token_regenerated` ist **schon im Enum
deklariert** — aber der bestehende POST-Endpoint ruft `auditLog()`
NICHT auf. Er schreibt nur ein `console.log`
(`src/app/api/admin/tenants/[id]/route.ts:323`). Das ist eine
unausgefuellte Enum-Deklaration. Der Build-Prompt sollte das addressieren:

- **Naming-Konsistenz-Check bestanden:** `admin.token_regenerated`
  existiert bereits; `admin.magic_link_regenerated` ist semantisch
  redundant. Der Build hat zwei Optionen:
  - (a) bestehenden `admin.token_regenerated` verwenden — semantisch
    identisch, Enum bleibt sauber
  - (b) neuen `admin.magic_link_regenerated` einfuehren und den
    bestehenden (ungenutzten) Enum-Wert beibehalten oder entfernen

  **Empfehlung (stilkonform):** Option (a). Die bestehende Enum-
  Deklaration ist da — sie einfach nutzen. Kein neuer Enum-Wert,
  keine Enum-Erweiterung. Falls ConvArch unbedingt den neuen Namen
  will: den ADD-Pfad nehmen, aber `admin.token_regenerated`
  nicht loeschen (Backward-Compat fuer externen Log-Drain).

### `auditLog()`-Call-Format

Referenz: `src/app/api/dashboard/settings/scoring/route.ts:103-111`
(aktuellster Admin-Nahe-Call):

```tsx
// src/app/api/dashboard/settings/scoring/route.ts:103
auditLog("dashboard.scoring_updated", {
  tenantId: tenant.id,
  ip: ipHash,
  details: {
    promptLength: scoringPrompt?.length ?? 0,
    promptIsDefault: scoringPrompt === null,
    labelsAreCustom: qualificationLabels !== null,
  },
});
```

Weitere Referenz mit minimalen Details: `admin/login/route.ts:51` und
`:61` — nur `ip` oder gar keine Details.

### DSGVO-Filter in Details

`SENSITIVE_FIELDS` (Zeile 43-46 in `audit-log.ts`): `phone, telefon,
email, name, address, adresse, password, secret, token, key, content,
message, nachricht`. Diese Keys werden **automatisch** von
`sanitizeDetails()` entfernt — der Build-Prompt muss das nicht selbst
sicherstellen, aber er sollte auch keine sensitiven Werte ueber
Work-Around-Keys einschmuggeln.

**Fuer den neuen Endpoint empfohlenes Details-Payload:**

```tsx
auditLog("admin.token_regenerated", {
  tenantId: id,
  ip: ipHash,  // Admin-IP, SHA-256-Prefix wie im scoring-Handler
  details: {
    expiresInSeconds: 3600,  // TTL explizit fuer Log-Auswertung
    purpose: "preview-login",  // semantischer Unterschied zu Create-Flow
  },
});
```

`token` wuerde ohnehin vom SENSITIVE_FIELDS-Filter entfernt — der Build
sollte ihn **gar nicht erst in die Details packen**.

---

## Sektion 4 — API-Route-Pattern

### Bestehende Admin-API-Routes

Auflistung aus `find src/app/api/admin -type f`:

| Pfad | Methoden | Zweck |
|---|---|---|
| `src/app/api/admin/login/route.ts` | POST | Admin-Secret → Session-Token in Redis + `admin_token`-Cookie |
| `src/app/api/admin/logout/route.ts` | POST | Session invalidieren + Cookie loeschen |
| `src/app/api/admin/tenants/route.ts` | GET, POST | Tenant-Liste + Tenant-Create (inkl. initialer Magic-Link-Generierung) |
| `src/app/api/admin/tenants/[id]/route.ts` | GET, PATCH, DELETE, **POST** | Tenant-Detail + Update + Delete + **Magic-Link-Regen (POST)** |
| `src/app/api/admin/stats/route.ts` | GET | Pipeline + Tenant-Stats |
| `src/app/api/admin/plan-prompts/route.ts` | GET | Plan-/Branchen-spezifische System-Prompts |
| `src/app/api/admin/demo-seed/mod-education/route.ts` | POST, GET | MOD-Demo-Leads seeden + Status |

### Auth-Pattern

**Middleware-basiert.** `src/middleware.ts:219-236` prueft alle
`/api/admin/*`-Requests:

```ts
// src/middleware.ts (zusammengefasst)
if (req.nextUrl.pathname.startsWith("/api/admin")) {
  // Bearer-Header ODER admin_token-Cookie
  const bearerToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (bearerToken && await validateAdminSession(bearerToken)) return NextResponse.next();

  const adminCookie = req.cookies.get("admin_token")?.value;
  if (adminCookie && await validateAdminSession(adminCookie)) return NextResponse.next();

  // sonst 401 / Redirect auf /api/admin/login
}
```

`validateAdminSession()` (`src/modules/auth/session.ts:57-75`) prueft
gegen Upstash-Redis-Set mit 8h-TTL (`SESSION_TTL_S`). **Einzelne
Route-Handler machen KEINE eigene Admin-Auth-Pruefung** — sie
verlassen sich auf die Middleware-Vorfilterung.

Das gilt auch fuer den bestehenden POST-Handler in
`tenants/[id]/route.ts:301` — keine eigene Auth-Verifikation, nur
Zod-Input-Validierung.

### Response-Format-Konvention

- **Success:** `return NextResponse.json({ ... }, { status: 2xx })`
- **Error:** `return NextResponse.json({ error: "Deutsche Nachricht" }, { status: 4xx|5xx })` mit optionalem `details: parseResult.error.flatten()` bei Zod-Fehlern
- **Kein HTTP-Status-Wrapper-Objekt**, kein generisches `{ success: true, data: ... }`-Envelope. Das Response-Objekt **ist** die Payload.

### Beispiel: POST mit Zod + AuditLog

Referenz-Beispiel **aus dem Admin-Scope** (der Login-Endpoint, der
beide Elemente hat):

```tsx
// src/app/api/admin/login/route.ts (gekuerzt)
const loginSchema = z.object({
  secret: z.string().min(1).max(512),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = await checkRateLimit(`admin-login:${ip}`, { max: 5, windowMs: 60_000 });
  if (!limit.allowed) { ... return 429 }

  let rawBody: unknown;
  try { rawBody = await request.json(); }
  catch { return NextResponse.json({ error: "Ungueltige Anfrage" }, { status: 400 }); }

  const parsed = loginSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "...", details: parsed.error.flatten() }, { status: 400 });
  }

  if (!safeCompare(parsed.data.secret, secret)) {
    auditLog("admin.login_failed", { ip });
    return NextResponse.json({ error: "Falsches Secret" }, { status: 401 });
  }

  const sessionToken = await createAdminSession();
  auditLog("admin.login", { ip });
  const response = NextResponse.json({ success: true });
  response.cookies.set(...);
  return response;
}
```

**Naechst-bester Referenz-POST mit Zod + AuditLog + Tenant-Context:**
`src/app/api/dashboard/settings/scoring/route.ts:72-113` — PATCH mit
Zod-safeParse, `ipHash` via SHA-256 (Zeile 99-100), AuditLog-Call
(Zeile 103-111), JSON-Success-Response.

---

## Sektion 5 — Empfohlener Umsetzungs-Pfad

### Build-Struktur (stilkonform)

**Kein neuer API-Endpoint noetig.** Der bestehende
`POST /api/admin/tenants/[id]` macht genau das, was fuer Magic-Link-
Regen gebraucht wird. Zwei moegliche Pfade:

**Pfad A — Wiederverwendung (schlank, minimaler Diff)**
- Frontend: neue Dropdown-Action `"Magic-Link generieren"` ruft
  `POST /api/admin/tenants/${id}`, oeffnet Modal mit Copy-Button
  (Pattern identisch zu `CreateTenantModal` Success-Variante)
- Backend: **eine** Ergaenzung im bestehenden POST-Handler —
  `auditLog("admin.token_regenerated", {...})` Zeile ~323 einfuegen
- **TTL-Problem:** Der bestehende Handler nutzt `MAGIC_LINK_EXPIRY_MS`
  = 72h. Wenn der Scope 1h zwingend vorschreibt, geht Pfad A **nur**
  mit einer Signatur-Aenderung (z.B. optionaler Body-Parameter
  `{ ttlHours?: 1 | 72 }`) oder einer globalen TTL-Kuerzung.
  Beides ist groesser Scope als "reine UI-Erweiterung".

**Pfad B — Neuer dedizierter Endpoint
(`POST /api/admin/tenants/[id]/magic-link`)**
- Sauber getrennte Semantik: Preview-Login (kurz, 1h) vs. Kunden-
  Einladung (lang, 72h)
- Neuer File: `src/app/api/admin/tenants/[id]/magic-link/route.ts` —
  ~30 Zeilen Code, Pattern aus bestehendem POST-Handler kopiert,
  TTL inline mit `new Date(Date.now() + 60 * 60 * 1000)`
- AuditLog-Call direkt mit integriert (bestehender `admin.token_regenerated`)
- Frontend identisch zu Pfad A

**Empfehlung:** Pfad B. Zwei Argumente:
1. Die zwei Token-Zwecke haben unterschiedliche Lebenszyklen und
   sollten nicht in einer Signatur gemischt werden.
2. Der bestehende `POST /api/admin/tenants/[id]` wird vom CLI-Script
   `refresh-mod-magic-links.ts` genutzt, das die 72h-TTL erwartet
   (fuer 30-Tage-Login-Sessions nach Erst-Click). Sein Verhalten
   zu aendern erzeugt Script-Regression. Ein neuer Endpoint vermeidet
   Overlap.

### UI-Integration

- **Dropdown-Erweiterung:** drittes `<button>`-Element im
  Actions-Dropdown (`page.tsx:486-516`) zwischen "Bearbeiten" und
  "Loeschen". Styling wie "Bearbeiten" (gray-text, hover white).
- **Modal-Pattern:** Neues Modal `MagicLinkModal` als Inline-
  Komponente nach dem Vorbild `TenantDetailModal` (`page.tsx:948`).
  Inhalt analog zur Create-Success-Variante: Link anzeigen +
  Copy-Button mit "Kopiert!"-Feedback.
- **Domain-Input (laut Scope):** ein Text-Input fuer die Ziel-Domain
  im Modal, Default = `window.location.origin`. Der Admin kann das
  auf `https://ai-conversion-git-fix-xxx.vercel.app` umschreiben,
  **bevor** er kopiert oder "Oeffnen" klickt. Der zurueckgegebene
  `dashboardLoginPath` ist domain-agnostisch
  (`/dashboard/login?token=xxx`), das passt zum Scope-Ziel.
- **Toast-Integration:** nach erfolgreicher Generierung Toast
  `"Magic-Link generiert (gueltig 1 Stunde)"` via bestehenden
  `setToast`-Mechanismus (`page.tsx:94`).

### Server-Action vs. API-Route

**Das Projekt verwendet keine Next.js Server-Actions.** Bestaetigt
im Discovery-Report des Dashboard-Redesigns (Sektion 4): "Keine
Next.js Server-Actions (`"use server"`-Module) verwendet — nur
klassische API-Route-Handler." Der Build folgt diesem Muster.

### Offene Fragen vor Bau

1. **Enum-Name:** Bestehenden `admin.token_regenerated` verwenden
   oder neuen `admin.magic_link_regenerated` einfuehren? Empfehlung
   des Reports: bestehenden nutzen; ConvArch entscheidet.
2. **Endpoint-Pfad:** `POST /api/admin/tenants/[id]/magic-link` (wie
   hier empfohlen) oder doch `POST /api/admin/tenants/[id]` mit
   Flag? ConvArch entscheidet Pfad A vs. Pfad B.
3. **Rate-Limiting?** Der bestehende POST-Handler hat **kein**
   Rate-Limit. Bei oeffentlichem Missbrauch ist das unkritisch
   (Admin-Session erforderlich), aber bei versehentlichem Dauer-Klick
   im UI waere ein IP-basiertes Limit (z.B. 20/h) ein Safety-Net.
   Offen, ob im MVP noetig.

---

## Sektion 6 — Risiken

### Blast-Radius

- **Bestehender POST-Endpoint wird vom CLI-Script
  `refresh-mod-magic-links.ts` genutzt.** Wenn Pfad A
  (Wiederverwendung) mit Signatur-Aenderung gewaehlt wird, muss das
  Script mit-angepasst werden — sonst schlagen MOD-Magic-Link-Refreshs
  fehl. Pfad B vermeidet das.
- **Kein bestehender Consumer der Enum-Werte** ausser `console.log`
  und dem Vercel-Log-Drain. Log-Drain ist text-basiert (JSON-Lines) —
  neuer Enum-Wert bricht nichts.
- **Middleware und Redis-Session-Layer unveraendert.** Der neue
  Endpoint kommt unter `/api/admin/**`, die Middleware schuetzt ihn
  automatisch.

### Sicherheits-Check

**Primaer-Risiko: ein Admin-Bug fuehrt zu Tenant-Login-Leak.** Quellen:

- **Token im Response-Body:** der Klartext-Token wird serverseitig
  erzeugt und einmalig zurueckgegeben. Das ist by design. Aber: der
  `admin_token`-Cookie-Scope ist `httpOnly: true` + `sameSite: strict`
  (`admin/login/route.ts:63-68`). Das heisst, der Response-Body mit
  dem Tenant-Magic-Link landet **nur im Admin-Browser**, nicht in
  Drittanbieter-Frames. Low-Risk, aber dokumentieren.
- **Modal-Autoclose / Zwischenablage:** Der aktuelle
  `CreateTenantModal` haelt den Klartext-Magic-Link im Component-
  State, bis Admin "Fertig" klickt. Bei XSS-Injection auf `/admin`
  koennte dieser State ausgelesen werden — aber CSP (nonce-basiert,
  siehe architecture.md Sektion 7) schliesst das effektiv aus.
  Low-Risk.
- **Cross-Tenant-Leak:** Der Endpoint nimmt `tenant.id` aus dem URL-
  Pfad. Die Admin-Session hat Zugriff auf ALLE Tenants (Admin ist
  nicht tenant-scoped). Ein Bug im URL-Routing koennte theoretisch
  den falschen Tenant treffen, aber `db.tenant.update({ where: { id }})`
  bricht mit `RecordNotFound` bei ungueltiger ID. Low-Risk.

**Mitigations-Ideen:**
- `getClientIp()` + Audit-Log-Eintrag mit IP-Hash (wie im
  scoring-Handler) — fuer Forensik nach-Missbrauch.
- Optional: In der Modal-Anzeige den letzten Charakter-Bereich des
  Tokens kuerzen (`token.slice(0, 8) + "..."` + voller Copy-Button),
  damit ein Schulter-Blick ueber den Admin-Bildschirm den Link nicht
  komplett enthuellt. Post-MVP-Idee.

### Backward-Compatibility

- **Pfad B (dedizierter neuer Endpoint):** keine Backward-Breakage.
  Neuer File, neuer Pfad, bestehende Consumer unveraendert.
- **Pfad A (bestehenden POST erweitern):** nur sicher, wenn Signatur
  additiv bleibt (z.B. optionaler Query-Parameter). Andernfalls bricht
  `refresh-mod-magic-links.ts`.
- **CLAUDE.md Regel 2 (Konsumenten-Audit bei Schema-Aenderungen):**
  greift hier nicht — keine Prisma-Schema-Aenderung, weder `Tenant.
  dashboardToken` noch `dashboardTokenExpiresAt` wird in Struktur
  veraendert, nur der Wert wird geschrieben.
- **Keine Migration noetig.** Additive Code-Aenderung.
