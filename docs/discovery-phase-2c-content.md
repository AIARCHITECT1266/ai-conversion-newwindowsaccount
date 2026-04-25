# Discovery — Phase 2c Dashboard-Content

**Zweck:** Vollstaendige Inventur des Dashboard-Content-Stands nach
Phase 2b. Alle Daten-Quellen, Dependencies, Tokens und Risiken
fuer den Phase-2c-Build (Stripe-Niveau Daily-Insights-Dashboard
fuer den MOD-Demo-Call 29.04.2026) dokumentiert.

**Status:** Pure Inspektion. Master baut gruen (verifiziert in Phase
2b.5.4). Keine Aenderungen.

---

## Sektion 1 — Aktueller Page-Inhalt (`src/app/dashboard/page.tsx`)

| Eckdaten | Wert |
|---|---|
| Zeilenzahl | **744** (nach Phase 2b.3 + Hotfix) |
| Komponenten-Natur | **Client Component** (`"use client";` Z. 1) |
| Default-Export | `TenantDashboard` (Z. 289) |

### Sub-Komponenten (alle inline im selben File)

- `ScoreBar` (Z. 118-129) — Mini-Fortschrittsbalken (intern, im
  Code aktuell **nicht gerendert** — toter Helfer aus alter Version)
- `HubSpotSettings` (Z. 133-256) — eigenstaendige Card-Komponente
  mit Connect-Toggle + API-Key-Input
- `useTenantInfo` (Z. 261-287) — Custom Hook fuer
  `/api/dashboard/me`-Fetch + Login-Redirect
- `TenantDashboard` (Z. 289-744) — Default-Export mit komplettem
  Render-Tree

### Render-Sektionen (Zeilen-Ranges nach Phase 2b.3)

| Sektion | Range | Inhalt |
|---|---|---|
| Outer-Wrapper | 430-438 | `<div className="relative"><div className="relative z-10 mx-auto max-w-7xl px-6 py-8">` |
| Fehler-Banner | 440-444 | bedingter Error-Render |
| Lade-Skeleton | 447-450 | `Loader2` zentriert wenn `loading && !stats` |
| **KPI-Karten-Grid** | 454-481 | 4 Karten in `grid sm:grid-cols-2 lg:grid-cols-4`, einzeln animiert via `motion.div` |
| **Letzte Gespraeche-Card** | 486-549 | `lg:col-span-2`, Top-5 mit `maskId`, `timeAgo`, Status-Badge, Footer-Link „Alle anzeigen →" |
| **Lead-Pipeline-Card** | 552-595 | gestapelter Bar + 5 Stage-Reihen + Total |
| **Bot-Aktivitaet-Card** | 599-632 | 3-Spalten-Grid mit Beantwortete/Termine/Gespraeche-heute |
| **HubSpot-Integration-Card** | 635 (`<HubSpotSettings />`) | Connect/Disconnect-Toggle |
| **Plattform-Bot-Chat-Widget** | 641-744 | Floating-Bubble unten rechts mit AnimatePresence-Modal |

### Hooks im Default-Export

- `useTenantInfo()` — Custom Hook (eigene Definition Z. 261)
- `useState` × 5: `stats`, `loading`, `error`, `chatOpen`,
  `chatMessages`, `chatInput`, `chatLoading`
- `useRef`: `chatEndRef`
- `useEffect` × 3: initial-fetch + 30s-Poll, scroll-to-end (Chat),
  fetch-on-mount (HubSpotSettings hat eigenen `useEffect`)
- `useCallback`: `fetchStats` (`Z. 307-321`)

### API-Routes-Calls

| Route | Aufrufer | Methode | Zweck |
|---|---|---|---|
| `/api/dashboard/me` | `useTenantInfo` Z. 266 | GET | Tenant-Info + Login-Redirect |
| `/api/dashboard/stats` | `fetchStats` Z. 312 | GET | KPIs + Pipeline + Top-5 + BotActivity |
| `/api/dashboard/settings` | `HubSpotSettings` Z. 140 | GET | HubSpot-Verbindungs-Status |
| `/api/dashboard/settings` | `HubSpotSettings` Z. 150 | PATCH | HubSpot-API-Key speichern |
| `/api/platform-bot` | `sendMessage` Z. 349 | POST | Chat-Bot-Antwort |

**Polling:** Alle 30 Sekunden, pausiert wenn Tab nicht sichtbar
(`document.visibilityState === "visible"`-Guard, Z. 327).

---

## Sektion 2 — Verfuegbare Daten-Quellen

### `/api/dashboard/stats/route.ts` (173 Zeilen, Server Component)

Liefert via `Promise.all` parallel **10 DB-Queries** und gibt
folgende Shape zurueck:

```ts
{
  kpis: {
    conversationsToday: number,    // count where createdAt >= todayStart
    activeConversations: number,   // count where status = "ACTIVE"
    newLeadsToday: number,         // count where createdAt >= todayStart
    conversionRate: number,        // round(customerLeads / totalLeads * 100)
  },
  conversations: Array<{           // Top-5 by updatedAt desc
    id, externalId, status, updatedAt, lastMessage, lastMessageAt
  }>,
  pipeline: Array<{                // 5 Stage-Eintraege in fester Reihenfolge
    qualification: LeadQualification,  // Enum-Key
    label: string,                     // tenant-spezifisch oder Default (ADR-002)
    count: number,
  }>,
  botActivity: {
    messagesLast24h: number,       // Messages.count where timestamp >= last24h
    appointments: number,          // Leads.count where status = APPOINTMENT_SET
  }
}
```

**Zeitfenster-Logik:** Nur `todayStart` und `last24h` verfuegbar
(Z. 17-18). **Keine** 7-Tage-Historie, keine Vergleichsperioden,
keine Sparkline-Daten.

### `/api/dashboard/leads/route.ts` (65 Zeilen)

Liefert pro Tenant **bis zu 200 Leads**, sortiert nach
`createdAt desc`. Felder im Response (Z. 18-44):

- `id`, `score`, `qualification`, `status`, `pipelineStatus`,
  `dealValue`, `notes`, `appointmentAt`, `createdAt`,
  `predictiveScore`, `predictiveScoreAt`
- `conversation: { externalId, channel, status, updatedAt,
  visitorDisplayName }`

**Wichtig: `scoringSignals` wird hier NICHT zurueckgegeben.** Das
Feld existiert im Schema, wird aber nur in
`/api/dashboard/conversations/[id]/route.ts:51, 88-90, 123`
selektiert und ausgeliefert.

### Trend-API-Suche

Grep `trends|timeseries|sparkline|trendData` in `src/app/api/`:
**0 Treffer.** **Es gibt keine Trend-API.** Phase 2c muss eine neue
`/api/dashboard/trends`-Route bauen, falls Sparklines auf den
KPI-Karten und ein 7-Tage-Area-Chart geplant sind.

**Was die neue Route braeuchte (gestaltbar in Phase 2c):**

- Aggregationen pro Tag fuer ein Zeitfenster (z.B. 7 oder 14 Tage):
  - `messagesPerDay`: GROUP BY DATE(timestamp) FROM `messages`
  - `conversationsPerDay`: GROUP BY DATE(createdAt) FROM `conversations`
  - `leadsPerDay`: GROUP BY DATE(createdAt) FROM `leads`
- Optional: `appointmentsPerDay`, `customersPerDay`
- Eingabe-Param: `?days=7` (default), max. 30 (Performance-Cap)
- Output-Shape: `{ days: string[], series: { messages: number[], conversations: number[], leads: number[] } }`

### Top-Signals-Aggregation

Grep `scoringSignals` in `src/app/`:
- **Persistierung:** `src/lib/bot/processMessage.ts:240, 249` und
  `src/modules/bot/handler.ts:251, 260` — beim Lead-Upsert
- **Lesen:** **nur** in `/api/dashboard/conversations/[id]/route.ts`
  (Detail-View) und `src/app/dashboard/conversations/[id]/page.tsx`
  (Bullet-List-Render)
- **Aggregation ueber alle Leads eines Tenants:** **existiert nicht.**

Phase 2c muesste fuer ein Top-Signals-Widget eine neue Aggregation
einfuehren — entweder als Erweiterung von `/api/dashboard/stats`
oder als separater Endpoint `/api/dashboard/signals`. Daten-Schema
am Lead: `scoringSignals: Json?` mit Array of String (siehe
Sektion 5).

---

## Sektion 3 — Dependency-Realitaet

### Aus `package.json` (Stand 25.04.):

| Library | Status | Version |
|---|---|---|
| **lucide-react** | ✅ installiert | `^0.468.0` |
| **framer-motion** | ✅ installiert | `^12.6.3` |
| **clsx** | ✅ installiert | `^2.1.1` |
| **tailwind-merge** | ✅ installiert | `^3.0.2` |
| **tailwindcss** | ✅ v4 (CSS-first config) | `^4.1.3` |
| **react** | ✅ | `^19.1.0` |
| **next** | ✅ | `^15.3.0` |
| **recharts** | ❌ **NICHT installiert** | — |
| **chart.js** | ❌ NICHT installiert | — |
| **swr** | ❌ NICHT installiert | — |
| **@tanstack/react-query** | ❌ NICHT installiert | — |
| **date-fns** | ❌ NICHT installiert | — |
| **dayjs** | ❌ NICHT installiert | — |

### Recharts fuer Phase 2c — Kompatibilitaets-Notiz

**Recharts 3.x** (aktuelle Major-Version, 25.04.2026) ist offiziell
React-19-kompatibel. Bundle-Size: **~95 KB gzipped** (laut
Bundle-Phobia-Daten, nur einmal pro Page bezahlt — alle
recharts-Komponenten teilen sich denselben Chunk). React-19-strict-
mode-clean.

Falls recharts zu schwer ist: **selbst gebaute SVG-Mini-Charts**
sind im Stack denkbar (kein Library-Overhead, aber pro Chart-Typ
manuell zu implementieren). `framer-motion` ist bereits installiert
und kann SVG-Pfade animieren.

### Existierende Chart-/Animations-Patterns im Repo

- **`framer-motion`-Verwendungen:** in `dashboard/page.tsx` 7
  `motion.div`-Instanzen fuer Card-Entry-Animations, AnimatePresence
  fuer Chat-Widget. In `dashboard/crm/page.tsx`,
  `dashboard/clients/[id]/page.tsx`, `admin/page.tsx` weitere.
- **Custom-Mini-Chart:** `dashboard/page.tsx:564-573` hat einen
  handgebauten **stacked Bar** fuer Pipeline-Verteilung (5
  farbige `<div>`s mit prozentualer Breite). Das ist das einzige
  bestehende Chart-Pattern.
- **Keine SVG-Mini-Charts oder Sparklines** im Repo. **Kein
  recharts**, **kein D3**.

---

## Sektion 4 — Mock-Daten-Strategie

### Aktuelle Daten-Holung

**Vollstaendig client-seitig** via `fetch("/api/dashboard/stats")`.
Polling alle 30 s mit Visibility-Guard.

### Mock-Daten-Konzept im Repo

**Existiert nicht** als generischer Helper. Aber drei produktive
Pfade fuer Demo-Daten:

1. **Demo-Seed via Admin-API** (`POST /api/admin/demo-seed/mod-education`):
   8 fiktive B2C-Leads mit verschluesselten Konversationen,
   vorgesetztem Score/Qualification/Pipeline,
   `aiSummary`-JSON. Idempotent ueber `externalId: "demo-seed-*"`-Marker.
2. **Lokale Seed-Scripts** unter `src/scripts/`:
   `seed-mod-education-demo-leads.ts` (ruft Admin-API),
   `seed-internal-admin.ts` (Direkt-DB), `seed-test-tenant-b.ts`.
3. **Production-Reality:** MOD-B2C-Tenant auf teal-battery
   hat echte Daten (32 Conversations, 29 Leads laut Phase-2b-Demo-Verifikation).

### Empty-State-Verhalten der aktuellen Page

- **Auth lädt:** Spinner-only (Z. 421-427)
- **`loading && !stats`:** Spinner mit Page-Padding (Z. 447-450)
- **`stats` mit leerem `conversations[]`:** Empty-State-Card mit
  "Noch keine Gespraeche – starte jetzt deine erste Kampagne" +
  CTA-Link (Z. 501-510)
- **`stats` mit leerem `pipeline[]` oder `totalLeads === 0`:**
  Stage-Reihen rendern alle mit count=0, gestapelter Bar bleibt
  leer (Z. 565-573 hat `totalLeads > 0`-Guard). Keine dedizierte
  Empty-Message, aber visuell verkraftbar.
- **HubSpot-Card:** eigenes `connected: null/true/false`-State-Modell.

**Phase-2c-Implikation:** Bei leerer DB (Dev-DB nach
seed-internal-admin) zeigt das Dashboard funktional aber mit
weitgehend leeren Karten. Fuer Localhost-Demo-Test mit
internal-admin-Tenant ist das **OK**, fuer den Produktions-Demo-
Call sollten echte MOD-Daten genutzt werden.

---

## Sektion 5 — MOD-spezifische Daten-Realitaet

### Scoring-Signal-Format

Quelle: `src/modules/bot/scoring/index.ts:39-49`

```ts
export const ScoringResponseSchema = z.object({
  score: z.number().int().min(0).max(100),
  qualification: z.enum([
    "UNQUALIFIED", "MARKETING_QUALIFIED", "SALES_QUALIFIED",
    "OPPORTUNITY", "CUSTOMER",
  ]),
  signals: z.array(z.string().min(1).max(200)).min(1).max(6),
});
```

**Format pro Lead:** `Lead.scoringSignals` ist `Json?` (Prisma),
inhaltlich **Array of Strings** mit 1-6 Eintraegen, jeder Eintrag
1-200 Zeichen. Beispiele aus dem MOD-Scoring-Prompt:
- `"Nennt Bildungsgutschein ohne Nachfrage"`
- `"AfA-Vermittler bereits kontaktiert"`
- `"Sucht aktiv nach Umschulung Pflege/IT"`

### Top-Signals-Aggregation — Konzept (existiert nicht)

Eine `/api/dashboard/signals`- oder erweiterte
`/api/dashboard/stats`-Route koennte:

```ts
// Pseudo-SQL:
const leads = await db.lead.findMany({
  where: { tenantId },
  select: { scoringSignals: true },
});
const counter = new Map<string, number>();
for (const lead of leads) {
  const signals = Array.isArray(lead.scoringSignals)
    ? lead.scoringSignals.filter(s => typeof s === "string")
    : [];
  for (const sig of signals) counter.set(sig, (counter.get(sig) ?? 0) + 1);
}
const topSignals = [...counter.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);
```

**Performance-Realitaet:** Bei aktuell ~32 Leads/Tenant trivial
(<5 ms). **Bei 1000+ Leads/Tenant** (Post-Pilot) waere
DB-side-Aggregation via raw SQL `unnest()` performanter — aber das
ist Phase-3-Optimierung, fuer Demo nicht relevant.

**Kein Schema-Change nötig** — `scoringSignals: Json?` existiert seit
ADR-002 (23.04.2026).

---

## Sektion 6 — Stripe-Pattern-Referenz

### Stripe-Look-Patterns im aktuellen Repo

Die `dashboard/page.tsx` rendert Cards bereits nach einem Pattern,
das visuell nahe an Stripe liegt:

```tsx
// src/app/dashboard/page.tsx:469-470 (Beispiel KPI-Karte)
className="group rounded-2xl p-6 transition-colors hover:border-[rgba(201,168,76,0.18)]"
style={{ background: 'var(--surface)', border: '1px solid var(--gold-border)' }}
```

**Stripe-Charakteristika** (vorhanden vs. fehlend):

| Pattern | Status |
|---|---|
| Subtile Borders (`var(--gold-border)`, `rgba(201,168,76,0.1)`) | ✅ vorhanden |
| Hover-State auf Cards | ✅ via `transition-colors hover:border-...` |
| Backdrop-Blur fuer Sticky-Header | ✅ Layout `backdrop-blur-md` Z. 42 |
| Big-Number-Displays mit Serif | ✅ `var(--serif)` + `text-4xl font-bold` |
| Sparklines auf KPI-Karten | ❌ **fehlt** |
| Trend-Pfeile (▲ +12% vs. gestern) | ❌ **fehlt** (Z. 477 hat statisches "Noch keine Vergleichsdaten") |
| Area-Chart mit Time-Series | ❌ **fehlt** |
| Action-Board mit Statusspalten | ❌ **fehlt** |

### Globals.css Utility-Klassen

Wiederverwendbar fuer Phase 2c:

| Klasse | Zweck | Quelle |
|---|---|---|
| `.glass` | Backdrop-Blur + leichter Lila-Border | `globals.css:65-70` |
| `.glass-card` | Subtile White-Border + Inset-Highlight | `globals.css:118-123` |
| `.gradient-border` | Gradient-Pseudo-Element-Border | `globals.css:73-85` |
| `.glow-purple`, `.glow-green` | Box-Shadow-Glows | `globals.css:57-62` |
| `.text-gradient-purple` | Gradient-Text via background-clip | `globals.css:49-54` |
| `.btn-glow-green` | Hover-Glow fuer CTAs | `globals.css:126-131` |
| `.divider-purple` | Gradient-Linie | `globals.css:106-109` |
| `.scrollbar-hide` | Scrollbar verstecken | `globals.css:35-37` |

### Verfuegbare Tokens fuer Phase 2c

**`@theme`-Block** (Tailwind v4 Utility-Generation, `globals.css:11-27`):
- `--color-navy-{950..600}` — dunkle Navy-Skala
- `--color-purple-{700..200}` — Lila-Skala
- `--color-emerald-{500..600}` — Gruen-Skala (WhatsApp-Brand)
- `--font-family-{heading,body}` — Inter

**Dashboard-Tokens unter `:root`** (Phase 2b.1, `globals.css:36-47`):
- `--bg: #07070d`, `--surface: #0e0e1a`
- `--gold: #c9a84c`, `--gold-border`, `--gold-border-hover`
- `--purple: #8b5cf6`
- `--text: #ede8df`, `--text-muted`
- `--serif: Georgia, serif`, `--sans: var(--font-inter), ...`

---

## Sektion 7 — Layout-Constraints

### Breite

`max-w-7xl` (Tailwind = 1280 px) ist konsistent verwendet:
- Layout-Header (Z. 43): `mx-auto max-w-7xl px-6`
- Page-Inner (Z. 438): `mx-auto max-w-7xl px-6 py-8`

**Phase 2c sollte bei `max-w-7xl` bleiben** — bricht sonst die
Layout-Cohesion mit dem Brand-Header.

### Wo passt ein Trend-Chart-Block?

Aktuelle Layout-Struktur ohne Trend-Chart:
```
KPI-Grid (4 Karten, lg:grid-cols-4)
└── Mittlerer Bereich: Conversations(2/3) + Pipeline(1/3) (lg:grid-cols-3)
└── Bot-Aktivitaet (full-width)
└── HubSpot (full-width)
```

**Phase-2c-Layout-Vorschlag:**
```
KPI-Grid (4 Karten, evtl. mit Sparklines pro Karte)
└── Trend-Chart (full-width oder 2/3) + Top-Signals-Widget (1/3)
└── Action-Board (full-width)
└── Mittlerer Bereich: Conversations(2/3) + Pipeline(1/3)
└── Bot-Aktivitaet
└── HubSpot
```

Genau eine Reihe fuer Trend + Top-Signals (idiomatisch
`lg:grid-cols-3` mit `lg:col-span-2` fuer Trend).

### Mobile-Verhalten

Aktuelle Page nutzt:
- KPI-Grid: `sm:grid-cols-2 lg:grid-cols-4` (Z. 454)
- Mittlerer Block: `lg:grid-cols-3` (Z. 484)
- Bot-Aktivitaet: `sm:grid-cols-3` (Z. 610)

→ Mobile-First, **aber nicht Mobile-Touch-optimiert** (kein
44×44-Touch-Target-Audit, keine spezifischen Mobile-Breakpoints
unter `sm:`).

**Phase-2c-Implikation:** Demo am Desktop, aber Mobile-Tauglichkeit
sollte erhalten bleiben (Recharts hat eingebauten Responsive-Container).

---

## Sektion 8 — Risiko-Spotting

### a) KPI-Kacheln mit Animation + Hover-Sparklines

**Risiken:**
- **Performance bei vielen Re-Renders:** 4 KPI-Karten je mit
  `motion.div`-Wrapper + Sparkline = potentiell 4 SVG-Rerenders bei
  jedem 30-s-Poll. Bei recharts: jeder Sparkline ist ein
  ResponsiveContainer + LineChart → 4× SVG-Reflow.
  **Mitigation:** Sparkline-Daten in `React.memo`-Komponenten kapseln,
  nur bei Daten-Aenderung neu rendern.
- **Animation-Stacking:** Bei 30-s-Poll werden alle Karten neu
  animiert (entry-Animation triggert bei `motion.div`-Mount). Da der
  State nur via `setStats` wechselt, **werden Karten nicht
  unmounted** — Animationen feuern nur einmal beim Initial-Mount.
  Kein Stacking erwartet.
- **Layout-Shift:** Sparklines mit `ResponsiveContainer` brauchen
  fixierte Container-Hoehe (z.B. `h-12`), sonst Layout-Shift beim
  ersten Render.

### b) Trend-Area-Chart

**Risiken:**
- **Server-vs-Client-Boundary:** `recharts` ist client-only
  (nutzt `window`/`ResizeObserver`). Wenn der Trend-Chart in einer
  Server-Component-Page genutzt wird, muss er als `"use client"`-
  Subcomponent extrahiert werden. Aktuelle `page.tsx` ist bereits
  Client Component → kein Boundary-Problem, aber **falls Phase 2c
  page.tsx zu Server Component umbaut, muss der Chart-Block in
  ein separates Client-File**.
- **Bundle-Size:** Recharts ~95 KB gzipped. Dashboard-Bundle
  aktuell `9.02 kB` (laut Phase-2b.5-Build) — Chart bringt ~10× so
  viel Code. **Akzeptabel** (alle Dashboard-Routes teilen denselben
  Chunk dank Webpack-Code-Splitting), aber bemerkenswert.
- **Trend-API muss zuerst stehen.** Ohne `/api/dashboard/trends`-
  Endpoint kann der Chart nicht rendern. Build-Reihenfolge: API
  zuerst, Chart-Komponente zweitens.

### c) Top-Signals-Widget

**Aggregations-Performance:**
- Bei aktuell ~32 Leads/Tenant: `findMany + take: 200 + JS-Counter`
  ist trivial (<5 ms).
- Bei 1000+ Leads/Tenant: gleiches Pattern mit `take: 1000` braucht
  ~50 ms. Akzeptabel fuer Demo + Pilot.
- Bei 10000+ Leads/Tenant: DB-side-Aggregation via raw SQL
  `unnest(scoringSignals)` + GROUP BY noetig. **Post-Demo-TD**.
- **Mitigation Phase 2c:** `take: 500`-Cap, mit Kommentar "TODO
  Post-Demo: DB-side-Aggregation".

### d) Action-Board (Warten-auf-Rueckruf)

**Datenmodell-Realitaet:**
- `Lead.status` ist Enum `{NEW, CONTACTED, APPOINTMENT_SET,
  CONVERTED, LOST}` — bietet **`CONTACTED`-Stage** als Indikator
  „bereits kontaktiert" ✓
- `Lead.appointmentAt: DateTime?` zeigt vereinbarte Termine ✓
- **Aber:** Es gibt **kein** Feld wie `lastContactAttempt`,
  `nextActionDue`, `assignedTo`, `dueDate`. Ein Action-Board mit
  „Warten-Spalten" muesste auf Heuristiken zurueckgreifen:
  - „**Heisse Leads ohne Kontakt**": `status = "NEW" AND score >= 70`
  - „**Termine heute**": `appointmentAt >= todayStart AND
    appointmentAt < tomorrowStart`
  - „**Follow-up faellig**": `lastFollowUpAt < (now - 3 days) AND
    followUpCount < 3` (Felder existieren in `prisma/schema.prisma:140-141`)
- **Konsequenz:** Action-Board ist **mit existierendem Schema
  baubar**, aber das UI-Konzept muss vor Build geklaert werden
  (welche Spalten? Wie viele? Welche Filter-Heuristiken?).

---

## Sektion 9 — Empfehlungen fuer Build-Phase

### Reihenfolge der Komponenten (technische Sinnigkeit)

1. **`/api/dashboard/trends`-API zuerst** — additive neue Route,
   minimaler Risiko-Footprint. Liefert die Daten-Grundlage fuer
   alle nachfolgenden Komponenten. Aufwand: ~30 min.
2. **Recharts installieren** (`npm install recharts`) — nach
   Trend-API, weil sonst der Trend-Chart-Build sofort schreit.
3. **Sparkline-Komponente extrahieren** — eigenes File
   `_components/Sparkline.tsx` (Client). Nutzt recharts
   `<LineChart>` + `<ResponsiveContainer>`. Wiederverwendbar
   fuer alle 4 KPI-Karten.
4. **KPI-Karten erweitern** — Sparkline-Prop pro Karte, Trend-Pfeil
   (▲ X% / ▼ X%) basierend auf Trend-Daten.
5. **Trend-Area-Chart-Komponente** — eigenes File
   `_components/TrendChart.tsx` (Client). Volle Breite oder
   2/3-Spalte.
6. **`/api/dashboard/signals`-API ODER `/api/dashboard/stats`-Erweiterung**
   — Top-5-Signals + Counter.
7. **Top-Signals-Widget** — eigenes File `_components/TopSignals.tsx`
   (Client). 1/3-Spalte neben Trend-Chart.
8. **Action-Board** — eigenes File `_components/ActionBoard.tsx`
   (Client). Volle Breite. Heuristiken aus existierenden Lead-
   Feldern.
9. **`page.tsx`-Layout zusammenstecken** — neue Section-Reihenfolge
   gemaess Sektion 7-Vorschlag.

### Punkte fuer Build-Prompt-Splits

- **Build-Prompt 1:** API-Routes (Trends + Signals). Klein,
  isoliert, additiv.
- **Build-Prompt 2:** Sparkline + KPI-Karten-Erweiterung +
  Trend-Chart. Visuell zusammenhaengend.
- **Build-Prompt 3:** Top-Signals + Action-Board.
- **Build-Prompt 4:** Final-Layout-Zusammensetzung + Polish.

Jeder Sub-Build kommt mit eigenem Commit. Bei Bruch ist Revert
auf Komponenten-Ebene moeglich.

### TypeScript-Strict-Mode-Stolperfallen

- **recharts-Typings**: Das Typings-Package ist mit
  `recharts@3.x` mitgeliefert, generell sauber. Aber:
  `<LineChart data={...}>` will einen spezifischen Type — wenn
  via API geliefert (Format `number[]`), muss der Index als
  `name`-Feld gemappt werden. Pattern:
  `data.map((value, idx) => ({ name: days[idx], value }))`.
- **Server-vs-Client-Boundary**: Wenn neue Charts in `page.tsx`
  importiert werden und `page.tsx` Client bleibt → kein Problem.
  Falls Phase 2c die Page zu Server Component umbaut (was Discovery-
  Sektion 6 als „post-Demo" empfiehlt) → Charts in eigene Client-
  Subcomponents.
- **Date-Formatting ohne date-fns/dayjs**: Aktuelle Codebase nutzt
  `Date.toLocaleDateString("de-DE", ...)` (z.B.
  `clients/page.tsx:21`). Fuer Trend-Chart-X-Achse („Mo, Di, ...")
  reicht das aus.

### "OFFEN"-Markierungen fuer ConvArch-Entscheidung

1. **Recharts vs. handgebaute SVG-Sparklines.** Recharts ist
   bequem (~95 KB Bundle), handgebaut ist leichter (~5 KB pro
   Chart-Typ, mehr Code-Aufwand). Empfehlung Discovery: Recharts —
   weil 4 Sparklines + 1 Trend-Chart + Top-Signals-Bars
   (potentiell weiterer Chart-Typ) bereits 6 Charts sind.
2. **Action-Board-Spalten-Konzept.** Welche Spalten soll das
   Action-Board zeigen? Vorschlag aus Sektion 8d:
   "Heisse Leads ohne Kontakt", "Termine heute", "Follow-up
   faellig". Alternative: Stripe-Style "Action-Required" /
   "Today" / "Done"-Spalten?
3. **Sparkline-Datenfenster.** 7 Tage oder 14 Tage Default?
   Sollte konfigurierbar sein, aber Default-Wahl prägt UX.
4. **Page-Component-Natur.** Bleibt `page.tsx` Client Component
   (aktueller Zustand) oder wird sie zu Server Component
   migriert (idiomatischer App-Router-Pattern + bessere SEO)?
   Empfehlung Discovery: **bleibt Client** fuer 29.04.-Demo
   (weniger Risiko, 30-s-Poll bleibt funktional). Server-Migration
   ist Post-Demo-TD.
5. **30-s-Poll fuer Trend-Chart.** Soll der Trend-Chart auch alle
   30 s neu fetchen? Bei 7-Tage-Daten ist das overkill, einmal pro
   Page-Load reicht. Empfehlung: separater `useEffect` nur fuer
   Trend-Daten, ohne Poll.
6. **Top-Signals-Anzeige.** Bullet-List mit Counter (`"Signal" — 7×`)
   oder horizontaler Bar-Chart? Bullet-List ist niedrigschwelliger,
   passt zur Stripe-Aesthetik.
7. **Mobile-Optimierung.** Phase-2c-Komponenten muessen auf Mobile
   nicht broken sein. Sparklines koennten auf Mobile ausgeblendet
   werden (Tailwind `hidden sm:block`). Action-Board auf Mobile als
   Tab-Navigation? **OFFEN, ConvArch entscheidet.**

---

## Anhang — Aktuelle Page-Render-Zeitlinie

```
useTenantInfo()
    └─→ fetch /api/dashboard/me → tenantId
        └─→ fetchStats() ausgeloest durch tenantId-Change
            └─→ fetch /api/dashboard/stats → setStats()
                └─→ Render KPI + Conversations + Pipeline + BotActivity
                └─→ HubSpotSettings rendert (eigener Lifecycle)
        └─→ setInterval 30s: fetchStats() solange Tab visible
```

Phase-2c-Plan: zusaetzliche Routes (`/trends`, `/signals`)
parallel zum bestehenden Stats-Call, kein Replacement der
bestehenden Logik.

---

## Sektion 10 — Phase-2c-Komplett-Uebersicht (Build-Outcome, 25.04.2026)

### Sub-Phasen-Reihenfolge und Commits

| Sub-Phase | Kurztitel | Commit(s) |
|---|---|---|
| 2c.1 | API-Routes (Trends + Signals + Labels) | `b6b61cc` (trends), `277c9ba` (signals), `e3d7656` (labels), `59db2a3` (recharts dep) |
| 2c.2 | KpiCards + TrendChart | `8007862` (KpiCards), `0408124` (TrendChart), `9aa5b8e` (Integration), zwei Hotfixes |
| 2c.3 | TopSignals + ActionBoard | `e9f22ae` (Build), `e8c60c5` (Status-Doc) |
| 2c.4 | Polish + Merge + Production | `d400ef5` (Clients-Tab Coming-Soon), `d4e1542` (LivePulse), `7eaa1b4` (ConversationAnalyticsTeaser), Doku-Commits, Merge-Commit |

### API-Routes (alle tenant-isoliert via Composite-Keys)

#### `/api/dashboard/trends`

`GET /api/dashboard/trends?range=7|14`

**Beispiel-Response:**

```json
{
  "range": 7,
  "days": ["2026-04-19", "2026-04-20", "...", "2026-04-25"],
  "series": {
    "messages": [12, 18, 22, 8, 15, 31, 24],
    "conversations": [3, 5, 4, 1, 2, 7, 6],
    "leads": [1, 2, 1, 0, 0, 3, 2],
    "appointments": [0, 1, 0, 0, 0, 1, 1]
  }
}
```

#### `/api/dashboard/signals`

`GET /api/dashboard/signals?limit=10`

**Beispiel-Response:**

```json
{
  "totalLeads": 32,
  "leadsWithSignals": 28,
  "coverage": 87,
  "topSignals": [
    { "signal": "Nennt Bildungsgutschein ohne Nachfrage", "count": 11 },
    { "signal": "Sucht aktiv nach Umschulung Pflege/IT", "count": 8 }
  ]
}
```

#### `/api/dashboard/labels`

`GET /api/dashboard/labels`

Liefert tenant-spezifische `qualificationLabels` (ADR-002) mit Default-Fallback.

```json
{
  "labels": {
    "UNQUALIFIED": "Unqualifiziert",
    "MARKETING_QUALIFIED": "Marketing-qualifiziert",
    "SALES_QUALIFIED": "Vertriebsqualifiziert",
    "OPPORTUNITY": "Opportunity",
    "CUSTOMER": "Kunde"
  }
}
```

#### `/api/dashboard/action-board`

`GET /api/dashboard/action-board`

Drei tenant-isolierte Buckets in einer Promise.all-Query (max. 25 Leads/Bucket):
- `waitingForFollowUp`: status NEW/CONTACTED, kein Termin, followUpCount<3, lastFollowUpAt null oder >24h alt
- `recentlyContacted`: status CONTACTED, lastFollowUpAt in letzten 24h
- `appointmentsToday`: appointmentAt im Berlin-Tag (DST-aware via Intl.DateTimeFormat longOffset)

```json
{
  "buckets": {
    "waitingForFollowUp": [
      {
        "id": "...",
        "displayIdentifier": "ABC •••• 42",
        "score": 78,
        "qualification": "OPPORTUNITY",
        "topSignal": "Nennt Bildungsgutschein ohne Nachfrage",
        "channel": "WEB",
        "status": "NEW"
      }
    ],
    "recentlyContacted": [],
    "appointmentsToday": []
  },
  "counts": {
    "waitingForFollowUp": 7,
    "recentlyContacted": 2,
    "appointmentsToday": 1
  }
}
```

### Component-Hierarchie (`src/app/dashboard/_components/`)

```
dashboard/page.tsx (Client Component, Tenant-Auth)
├── LivePulse                       — Pulsierender Live-Indikator (2c.4)
├── KpiCards                        — 4 KPI-Karten + Sparklines (2c.2a)
├── TrendChart                      — 7/14-Tage Area-Chart (2c.2b)
├── TopSignals                      — Aggregierte scoringSignals (2c.3)
├── ActionBoard                     — 3-Spalten-Lead-Board (2c.3)
├── (Conversations + Pipeline-Grid) — bestehende Sektion (Phase 2b)
├── (BotActivity-Card)              — bestehende Sektion (Phase 2b)
├── HubSpotSettings                 — bestehende Sektion (Phase 2b)
└── ConversationAnalyticsTeaser     — Coming-Soon-Teaser (2c.4)
```

Alle neuen Components sind self-contained (eigener Fetch, eigene
Loading-/Error-/Empty-States). Kein gemeinsamer State-Container.

### Tech-Debt-Befunde aus Phase 2c

| ID | Status | Kurzbeschreibung |
|---|---|---|
| TD-Post-Demo-19 | Aufgenommen | Identifier-Duplikate in dashboard/page.tsx, crm/page.tsx, conversations/[id]/page.tsx — lokale `maskId()`-Helper sollten auf `resolveLeadDisplayIdentifier()` aus `src/lib/widget/publicKey.ts` migriert werden |
| TD-Post-Demo-Timezone | Aufgenommen | Timezone-Berechnungen im Repo sind teilweise UTC-basiert, teilweise via `Intl.DateTimeFormat longOffset` (DST-aware). Audit aller Date-Range-Queries auf Konsistenz Post-Demo |
| TD-Post-Demo-Live-Pulse-Real | Aufgenommen | LivePulse zeigt nur Sekunden-seit-Mount, nicht echte Polling-Aktivitaet. Mit echtem Auto-Refresh fuer KpiCards/TrendChart/TopSignals/ActionBoard verbinden |
| TD-Pre-Demo-1 | Erledigt in 2c.4 | Clients-Tab als Coming-Soon markiert |

### Lessons Learned

**1. Schema-Audit-Wert (Sub-Phase 3.0).**
Der blockierende Schema-Audit vor Sub-Phase 2c.3 verhinderte einen
Migrations-Fehler: `displayName` ist kein Lead-Feld, sondern lebt
in `Conversation.widgetVisitorMeta` (Json). Ohne Audit waere ein
falsches Lead-Schema-Update vorgeschlagen worden. Dieser Audit-
Schritt wird in Phase-Patterns weiter beibehalten.

**2. Single-Source-of-Truth bei Identifier-Resolution.**
Die Erweiterung von `src/lib/widget/publicKey.ts` um
`maskExternalId()` und `resolveLeadDisplayIdentifier()`
zentralisiert die Display-Logik. Die drei lokalen `maskId()`-
Duplikate wurden bewusst nicht migriert (Scope-Disziplin), aber
in TD-Post-Demo-19 als zukuenftige Migration erfasst. Konsumenten-
Audit haette in Phase 2c.3 sonst zu unerwartetem Scope-Creep
gefuehrt.

**3. Component-Isolation-Pattern.**
Self-contained Components mit eigenem Fetch-Lifecycle haben sich
bewaehrt — kein gemeinsamer State, keine Cross-Component-
Dependencies. Loading-/Error-/Empty-States sind pro Component
explizit. Das macht spaetere Phasen (Auto-Refresh, Drill-Down)
einfacher, weil jede Component unabhaengig erweiterbar ist.

**4. Pattern-Wiederverwendung vor Neu-Erfindung.**
Sub-Phase 4.1 nutzte das bestehende Coming-Soon-Pattern aus
SettingsSidebar.tsx (gedimmt + cursor-not-allowed + title-Tooltip)
statt ein neues Tab-Pattern zu erfinden. Sub-Phase 4.3 spiegelte
die gestrichelte-Border-Aesthetik. Konsistenz schlaegt theoretische
Eleganz — der Reviewer (oder die Demo-Audience) sieht ein
einheitliches System, nicht zwei verschiedene Dialekte.

### Production-Verifikations-Stand

Production-Verifikation auf https://ai-conversion.ai/dashboard mit
MOD-B2C-Tenant ist Bestandteil der Sub-Phase 4.8 (siehe
PROJECT_STATUS.md fuer Live-Stand).
