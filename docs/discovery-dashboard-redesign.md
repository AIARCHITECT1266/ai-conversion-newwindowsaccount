# Discovery — Dashboard-Redesign Phase 1

**Zweck:** Vollstaendige Inspektion der bestehenden Dashboard-Infrastruktur
vor dem Komplett-Umbau der `/dashboard`-Uebersicht zum Stripe-stil
Daily-Insights-Dashboard fuer den MOD-Demo-Call am 29.04.2026.

**Status:** Pure Inspektion. Keine Code-Aenderungen, keine Vorschlaege.

---

## Sektion 1 — Tech-Stack-Inventar

Quelle: `package.json`.

| Thema | Wert |
|---|---|
| **Next.js** | `^15.3.0` — **App Router bestaetigt** (verwendet `next/font`, async `RootLayout`, `headers()` fuer Dynamic-Rendering, `src/app/...`-Struktur) |
| **React** | `^19.1.0` |
| **React DOM** | `^19.1.0` |
| **TypeScript** | `^5.8.2`, Strict-Mode aktiv (siehe Sektion 7) |
| **TailwindCSS** | `^4.1.3` (neue v4 CSS-first-Config — **kein `tailwind.config.ts/js`**) |
| **@tailwindcss/postcss** | `^4.1.3` (dev) |
| **@tailwindcss/typography** | `^0.5.19` |

### Libraries — installiert?

| Library | Status | Version |
|---|---|---|
| shadcn/ui | **Nicht installiert** | — |
| Radix-UI (`@radix-ui/react-*`) | **Nicht installiert** | — |
| recharts | **Nicht installiert** | — |
| chart.js | **Nicht installiert** | — |
| lucide-react | Installiert | `^0.468.0` |
| framer-motion | Installiert | `^12.6.3` |
| date-fns | **Nicht installiert** | — |
| dayjs | **Nicht installiert** | — |
| clsx | Installiert | `^2.1.1` |
| tailwind-merge | Installiert | `^3.0.2` |
| zod | Installiert | `^4.3.6` |
| @tanstack/react-query | **Nicht installiert** | — |
| swr | **Nicht installiert** | — |

### Weitere UI-/Chart-/Icon-Libraries im Projekt

Aus `package.json`:

- **`class-variance-authority`** `^0.7.1` — Tailwind-Variant-Helper
- **`konva`** `^10.2.3` + **`react-konva`** `^19.2.3` — Canvas-Rendering,
  wird ausschliesslich im AI-Asset-Studio genutzt (`src/components/ai-asset-studio/`, `src/app/dashboard/assets/*`)
- **`qrcode`** `^1.5.4` + **`@types/qrcode`** — QR-Code-Generierung
  (Kampagnen)
- **`remark`** `^15.0.1` + **`remark-html`** `^16.0.1` — Markdown-Render
- **`@sentry/nextjs`** `^10.48.0` — Error-Reporting

Ein **`src/components/ui/`-Ordner existiert nicht** (verifiziert via
`ls`). Auch kein `components.json` fuer shadcn-Konfiguration. Das
Projekt nutzt ausschliesslich **selbst geschriebene Komponenten**,
ohne Komponenten-Library-Abstraktion.

---

## Sektion 2 — Design-System

### Tailwind-Config

**Es gibt keine `tailwind.config.ts` oder `tailwind.config.js`.**
Tailwind v4 konfiguriert sich CSS-first ueber das `@theme`-Directive in
`src/app/globals.css`. Der PostCSS-Plugin-Setup liegt in
`postcss.config.mjs`:

```js
// postcss.config.mjs
const config = { plugins: { "@tailwindcss/postcss": {} } };
```

### Design-Tokens (globals.css)

Quelle: `src/app/globals.css:11-27`

```css
/* src/app/globals.css:11 */
@theme {
  --color-navy-950: #04040c;
  --color-navy-900: #08081a;
  --color-navy-800: #0c0b28;
  --color-navy-700: #151340;
  --color-navy-600: #1f1b5c;
  --color-purple-700: #6d28d9;
  --color-purple-600: #7c3aed;
  --color-purple-500: #8b5cf6;
  --color-purple-400: #a78bfa;
  --color-purple-300: #c4b5fd;
  --color-purple-200: #ddd6fe;
  --color-emerald-500: #25d366;
  --color-emerald-600: #1da851;
  --font-family-heading: "Inter", system-ui, sans-serif;
  --font-family-body: "Inter", system-ui, sans-serif;
}
```

Zusaetzliche CSS-Utilities in `globals.css`:

- **Scrollbar-Customization** (dunkler Navy-Bg, Purple-Hover)
- **`.text-gradient-purple`** — Linear-Gradient-Text
- **`.glow-purple`**, **`.glow-green`** — Box-Shadow-Glows
- **`.glass`**, **`.glass-card`**, **`.gradient-border`** — Glass-Morph
- **`.noise-bg`** — SVG-Noise-Overlay via `::after`
- **`.animate-pulse-green`**, **`.neural-grid`**, **`.pulse-h/.pulse-v`**
  — Animationen
- **`.divider-purple`** — Gradient-Divider
- **Editorial-Tracking** auf `h1, h2` (`letter-spacing: -0.03em`)
- **`.btn-glow-green`** — Hover-Glow fuer CTAs
- **Selection-Color** (lila)

### Dark-Mode-Strategie

**Fest Dark.** `src/app/layout.tsx:70`:

```tsx
<html lang="de" className={`${inter.variable} dark`}>
```

Das `dark`-Klasse ist statisch gesetzt — kein Toggle, keine
`prefers-color-scheme`-Abfrage. Body-Background ist `--color-navy-950`
(`globals.css:43`), Body-Text `#e2e8f0`.

### Dashboard-eigene CSS-Variablen (inline in page.tsx)

Das Dashboard definiert eine **zweite Palette** inline in der
Uebersicht-Page via `<style>`-Tag (`src/app/dashboard/page.tsx:451-464`):

```tsx
// src/app/dashboard/page.tsx:452
<style>{`
  :root {
    --bg: #07070d;            /* Dashboard-BG (leicht dunkler als Marketing --color-navy-950) */
    --surface: #0e0e1a;       /* Karten-BG */
    --gold: #c9a84c;           /* Primaere Akzent-Farbe */
    --gold-border: rgba(201,168,76,0.1);
    --gold-border-hover: rgba(201,168,76,0.35);
    --purple: #8b5cf6;
    --text: #ede8df;           /* Helle Creme-Farbe (nicht weiss) */
    --text-muted: rgba(237,232,223,0.45);
    --serif: Georgia, serif;
    --sans: var(--font-inter), system-ui, sans-serif;
  }
`}</style>
```

**Wichtig:** Diese Design-Tokens sind **nur auf der `/dashboard`-Page
gueltig**, weil sie inline als `<style>` injected werden. Andere
Dashboard-Sub-Pages re-definieren die Palette individuell (z.B.
`src/app/dashboard/conversations/[id]/page.tsx:140-154` hat ihre
eigene fast-identische Kopie). Das ist **ein Drift-Risiko** und
strukturell inkonsistent zum globals.css-Theme.

### shadcn/ui-Komponenten

**Nicht vorhanden** — kein `src/components/ui/`-Ordner, kein
`components.json`, keine Radix-Dependencies. Das Discovery-Ergebnis
ist hier: Wenn fuer den Redesign shadcn gewollt ist, muss es frisch
initialisiert werden.

### Styling-Patterns aus existierenden Dashboard-Komponenten

**Muster 1 — Karten-Background** (`/dashboard/page.tsx:596-608`):

```tsx
// src/app/dashboard/page.tsx:596
className="group rounded-2xl p-6 transition-colors hover:border-[rgba(201,168,76,0.18)]"
style={{ background: 'var(--surface)', border: '1px solid var(--gold-border)' }}
```

**Muster 2 — Sektionen-Header** (`/dashboard/page.tsx:619-626`):

```tsx
<div className="mb-6 flex items-center justify-between">
  <div className="flex items-center gap-2.5">
    <Phone className="h-4 w-4 text-[#c9a84c]/60" />
    <h2 className="text-sm font-semibold tracking-wide">Letzte Gespraeche</h2>
  </div>
  <span className="text-[11px] text-slate-600 uppercase tracking-wider">Live</span>
</div>
```

**Muster 3 — Framer-Motion-Entry** (`/dashboard/page.tsx:591-597`):

```tsx
<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ type: "spring", stiffness: 80, damping: 20, delay: i * 0.06 }}
>
```

**Muster 4 — Navigation (Tab-Stil)** (`/dashboard/page.tsx:521-528`):

```tsx
className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 ${
  item.active
    ? "border-[#c9a84c] text-[#c9a84c]"
    : "border-transparent text-slate-500 hover:text-[#ede8df]/80 hover:border-white/10"
}`}
```

**Muster 5 — CTA-Button (Gold-Gradient)**
(`/dashboard/page.tsx:215-219`):

```tsx
className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
```

**Spacing-Skalen:** `p-6` fuer grosse Karten, `p-4` fuer kleine, `gap-5`
zwischen Grid-Items, `px-6 py-8` als Page-Container-Padding.
**Border-Radii:** `rounded-2xl` (primaere Karten), `rounded-lg`
(Buttons, Input-Fields).
**Typografie:** `text-4xl font-bold tracking-tight` fuer KPI-Zahlen,
`text-xs uppercase tracking-wide` fuer Labels.

---

## Sektion 3 — Bestehende Dashboard-Struktur

### Datei-Baum (3 Ebenen tief)

```
src/app/dashboard/
├── page.tsx                        # Uebersicht (Client Component)
├── settings/
│   ├── layout.tsx                  # Wrapper mit Sidebar (Server Component)
│   ├── SettingsSidebar.tsx         # Client, Sidebar-Navigation
│   ├── page.tsx                    # Settings-Index
│   ├── prompt/page.tsx             # Client, System-Prompt-Editor
│   ├── scoring/page.tsx            # Client, Scoring-Prompt + Labels
│   └── widget/page.tsx             # Client, Widget-Config-Editor
├── conversations/
│   ├── page.tsx                    # Server Component, List-View
│   ├── ChannelBadge.tsx            # Shared-Component (WhatsApp/Web)
│   ├── ConversationsFilter.tsx     # Client-Filter-Steuerung
│   └── [id]/page.tsx               # Client, Detail-View mit Polling
├── crm/page.tsx                    # Client, Kanban-Board
├── campaigns/
│   ├── page.tsx                    # Client
│   └── templates/page.tsx          # Client
├── broadcasts/page.tsx             # Client
├── clients/
│   ├── page.tsx                    # Client
│   └── [id]/page.tsx               # Client
├── assets/
│   ├── page.tsx                    # Client
│   ├── generator/page.tsx          # Client, Konva-Editor
│   └── ai-modul/page.tsx           # Client
├── bot-test/page.tsx               # Client
├── login/route.ts                  # Magic-Link-Handler
└── logout/route.ts                 # Session-Logout
```

**Kein eigenes `/dashboard/layout.tsx`.** Nur `/dashboard/settings/
layout.tsx` existiert (wrappt nur die Settings-Section mit ihrer Sidebar).
Das gesamte Top-Navigations-Chrome der Uebersichts-Page lebt **inline
in `page.tsx`** (siehe unten).

### Aktuelle Uebersicht (`src/app/dashboard/page.tsx`) — Komponenten-Struktur

Die Page ist **eine einzelne Client Component** (`"use client"` Zeile 1,
872 Zeilen Code) mit vier lokalen Sub-Komponenten:

- **`ScoreBar`** (`page.tsx:118-129`) — Mini-Fortschrittsbalken
- **`HubSpotSettings`** (`page.tsx:133-256`) — Integration-Card,
  Client-seitig, eigene Fetch-Hooks
- **`useTenantInfo`** (`page.tsx:261-287`) — Custom Hook fuer
  `/api/dashboard/me`-Fetch + Login-Redirect
- **`TenantDashboard`** (`page.tsx:289-871`) — Default-Export,
  enthaelt Header, Navigation, KPI-Grid, Conversations-Liste,
  Pipeline-Chart, Bot-Aktivitaet, HubSpot-Integration, Chat-Widget

### Imports in page.tsx

```tsx
// src/app/dashboard/page.tsx:1-29
"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, MessageSquare, Users, TrendingUp, Send, Zap, Clock,
  CheckCircle2, XCircle, ArrowUpRight, Calendar, BarChart3,
  Activity, HelpCircle, Loader2, ChevronDown, Phone, RefreshCw,
  Kanban, Settings, Link2, Unlink, Megaphone,
} from "lucide-react";
```

**Keine Imports aus `@/components/...`, `@/lib/...` oder `@/modules/...`
in dieser Page.** Der gesamte Code lebt in einer Datei.

### Daten-Ladung

**Client-Side-Fetch mit Polling:**

```tsx
// src/app/dashboard/page.tsx:323-348
const fetchStats = useCallback(async () => {
  if (!tenantId) return;
  const res = await fetch("/api/dashboard/stats");
  if (!res.ok) throw new Error("Fehler beim Laden der Daten");
  const data: DashboardStats = await res.json();
  setStats(data);
}, [tenantId]);

useEffect(() => {
  fetchStats();
  const interval = setInterval(() => {
    if (document.visibilityState === "visible") {
      fetchStats();
    }
  }, 30_000);
  return () => clearInterval(interval);
}, [fetchStats]);
```

Drei API-Aufrufe werden vom Dashboard gemacht:

| Endpoint | Zweck |
|---|---|
| `GET /api/dashboard/me` | Tenant-Info (id, name, brandName, leadType) |
| `GET /api/dashboard/stats` | KPIs, Pipeline, Conversations, Bot-Aktivitaet |
| `GET /api/dashboard/settings` (HubSpot-Card) | HubSpot-Connection-Status |

### Top-Navigation — exakte Quelle

**Die Navigation ist nicht in einem Layout, sondern direkt in
`page.tsx:502-560`**. Jede andere Dashboard-Sub-Page (z.B.
`/dashboard/crm`, `/dashboard/conversations`) rendert ihre eigene
Kopie des Headers und der Navigation, oder keine Navigation.
Beispiel-Stelle zum Hinzufuegen eines neuen Nav-Eintrags:

```tsx
// src/app/dashboard/page.tsx:502-530
<nav className="flex items-center gap-1 -mb-px">
  {[
    { href: "/dashboard", label: "Uebersicht", icon: Activity, active: true },
    { href: "/dashboard/crm", label: "CRM", icon: Kanban },
    { href: "/dashboard/campaigns", label: "Kampagnen", icon: Megaphone },
    { href: "/dashboard/broadcasts", label: "Broadcasts", icon: Send },
    { href: "/dashboard/clients", label: "Clients", icon: Users },
    { href: "/dashboard/settings", label: "Einstellungen", icon: Settings },
  ].map((item) => {
    const Icon = item.icon;
    return (
      <a key={item.href} href={item.href}
        className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 ${
          item.active
            ? "border-[#c9a84c] text-[#c9a84c]"
            : "border-transparent text-slate-500 hover:text-[#ede8df]/80 hover:border-white/10"
        }`}>
        <Icon className="h-3.5 w-3.5" />
        {item.label}
      </a>
    );
  })}
  {/* AI Studio Dropdown (Zeilen 533-559) separater Bereich */}
</nav>
```

Das Array ist hardcoded in einem inline-expression. **Es gibt keinen
zentralen Nav-Config-File.** Ein neuer Tab wird als zusaetzliches
Objekt im Array eingefuegt; `active: true` ist hardcoded auf
"Uebersicht" und wird nicht aus `usePathname()` berechnet (Kommentar
an Zeile 509-515 erklaert das bewusst — auf Sub-Routes gibt es
eigene Navigationen bzw. keine).

---

## Sektion 4 — Daten-Layer

### Prisma-Schema — `Lead`-Model (vollstaendig)

Quelle: `prisma/schema.prisma:128-167`.

```prisma
// prisma/schema.prisma:128
model Lead {
  id                String            @id @default(cuid())
  tenantId          String
  conversationId    String            @unique
  score             Int               @default(0) // Lead-Score (0–100)
  qualification     LeadQualification @default(UNQUALIFIED)
  appointmentAt     DateTime?         // Vereinbarter Termin
  status            LeadStatus        @default(NEW)
  pipelineStatus    PipelineStatus    @default(NEU) // CRM-Pipeline Spalte
  dealValue         Float?            // Deal-Wert in EUR
  notes             String?           @db.Text
  followUpCount     Int               @default(0) // 0-3
  lastFollowUpAt    DateTime?
  aiSummary         String?           @db.Text     // JSON-String
  aiSummaryAt       DateTime?
  predictiveScore   String?           @db.Text     // JSON-String
  predictiveScoreAt DateTime?
  campaignId        String?
  abTestVariant     String?           // "A" / "B"
  source            String?           // "qr", "link", "organic", "broadcast"
  scoringSignals    Json?             // ADR-002 scoring-per-tenant
  createdAt         DateTime          @default(now())

  tenant       Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  campaign     Campaign?    @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  client       Client?

  @@index([tenantId, status])
  @@index([tenantId, qualification])
  @@index([tenantId, pipelineStatus])
  @@index([campaignId])
  @@index([tenantId, createdAt])
  @@map("leads")
}
```

### Prisma-Schema — `Conversation`-Model (vollstaendig)

Quelle: `prisma/schema.prisma:64-89`.

```prisma
// prisma/schema.prisma:64
model Conversation {
  id                 String             @id @default(cuid())
  tenantId           String
  externalId         String?            // WhatsApp Chat-ID (gehashed), null fuer WEB
  consentGiven       Boolean            @default(false)
  consentAt          DateTime?
  language           String             @default("de")
  campaignSlug       String?
  leadSource         String?            // "qr", "link", "organic", "web"
  channel            Channel            @default(WHATSAPP)
  status             ConversationStatus @default(ACTIVE)
  widgetSessionToken String?            @unique
  widgetVisitorMeta  Json?              // User-Agent, Referrer, Sprache
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  messages Message[]
  lead     Lead?

  @@unique([tenantId, externalId])
  @@index([tenantId, status])
  @@index([tenantId, channel])
  @@index([tenantId, createdAt])
  @@map("conversations")
}

enum ConversationStatus { ACTIVE; PAUSED; CLOSED; ARCHIVED }
```

### Prisma-Client-Import-Pattern

**Verifiziert** — der Prisma Client wird lokal nach `src/generated/prisma/`
generiert (siehe `schema.prisma:7-10`):

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

Die App nutzt einen Singleton-Wrapper mit `PrismaPg`-Adapter:

```ts
// src/shared/db.ts:8-21
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg(process.env.DATABASE_URL!);
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = db;
```

**Import-Konvention:** `import { db } from "@/shared/db";`. Dieses
Pattern wird durchgehend verwendet (z.B. `src/app/api/dashboard/
stats/route.ts:2`, `src/app/dashboard/conversations/page.tsx:38`).

### Bestehende Server-Actions / API-Routes fuer Lead/Conversation

`src/app/api/dashboard/`:

| Pfad | Methode(n) | Zweck |
|---|---|---|
| `me/route.ts` | GET | Tenant-Info |
| `stats/route.ts` | GET | KPIs, Pipeline, Recent-Conversations |
| `conversations/route.ts` | GET, PATCH | List-API, Status-Update |
| `conversations/[id]/route.ts` | GET | Detail inkl. Messages + Lead |
| `leads/...` | — (nicht inspiziert) | Lead-Management |
| `crm/...` | — (nicht inspiziert) | Pipeline-Operationen |
| `campaigns/...` | — | Kampagnen-CRUD |
| `broadcasts/...` | — | Broadcast-Versand |
| `clients/...` | — | Client-CRUD |
| `settings/route.ts` | GET, PATCH | HubSpot-Config + allgemeine Settings |
| `settings/prompt/route.ts` | GET, POST | System-Prompt |
| `settings/scoring/route.ts` | GET, PATCH | Scoring-Prompt + Labels |
| `widget-config/...` | — | Widget-Toggle |
| `export/...` | — | Daten-Export |

**Keine Next.js Server-Actions** (`"use server"`-Module) verwendet
— nur klassische API-Route-Handler.

### Service-Schicht vs. Prisma-direkt in UI

**Koexistierende Patterns**, je nach Page:

**Pattern A — Server Component + Prisma direkt**
(`src/app/dashboard/conversations/page.tsx:147-197`):

```tsx
// src/app/dashboard/conversations/page.tsx:147
export default async function ConversationsListPage({ searchParams }) {
  const tenant = await getDashboardTenant();
  if (!tenant) redirect("/dashboard/login");

  const where = { tenantId: tenant.id, ...(channel ? { channel } : {}) };

  const [total, conversations] = await Promise.all([
    db.conversation.count({ where }),
    db.conversation.findMany({ where, orderBy: {...}, skip, take, select: {...} }),
  ]);
  // ...
}
```

Kein Service-Layer, kein Repository — Prisma-Calls stehen direkt in
der Server Component.

**Pattern B — Client Component + Fetch-API**
(`src/app/dashboard/page.tsx:323-337`):

```tsx
// src/app/dashboard/page.tsx:323
const fetchStats = useCallback(async () => {
  if (!tenantId) return;
  const res = await fetch("/api/dashboard/stats");
  const data: DashboardStats = await res.json();
  setStats(data);
}, [tenantId]);
```

Der API-Handler (`api/dashboard/stats/route.ts`) enthaelt die Prisma-
Aggregations direkt.

**Kein formaler Service-Layer oder Repository-Pattern** existiert.
Prisma wird sowohl in Server Components als auch in API-Routes direkt
aufgerufen.

---

## Sektion 5 — Multi-Tenant-Kontext

### Auflosung des aktuellen Tenants

**Zentraler Helper:** `getDashboardTenant()` aus
`src/modules/auth/dashboard-auth.ts:28-67`.

```ts
// src/modules/auth/dashboard-auth.ts:28
export async function getDashboardTenant(): Promise<{
  id: string;
  name: string;
  brandName: string;
  paddlePlan: string | null;
} | null> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const token =
    cookieStore.get("dashboard_token")?.value ??
    headerStore.get("x-dashboard-token") ??
    null;
  if (!token) return null;

  const tokenHash = hashToken(token); // SHA-256
  const tenant = await db.tenant.findUnique({
    where: { dashboardToken: tokenHash },
    select: { id: true, name: true, brandName: true, paddlePlan: true,
              isActive: true, dashboardTokenExpiresAt: true },
  });

  if (!tenant || !tenant.isActive) return null;
  if (tenant.dashboardTokenExpiresAt && tenant.dashboardTokenExpiresAt < new Date()) return null;

  return { id: tenant.id, name: tenant.name, brandName: tenant.brandName, paddlePlan: tenant.paddlePlan };
}
```

### Wie lädt die aktuelle `page.tsx` den Tenant?

**Client-seitig ueber die API**, nicht serverseitig:

```tsx
// src/app/dashboard/page.tsx:261-287
function useTenantInfo(): { tenantId, tenantName, loading } {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/dashboard/me")
      .then((r) => { if (!r.ok) { window.location.href = "/dashboard/login"; return null; }
                     return r.json(); })
      .then((data) => {
        if (data) { setTenantId(data.tenantId); setTenantName(data.tenantName); }
      })
      .catch(() => { window.location.href = "/dashboard/login"; })
      .finally(() => setLoading(false));
  }, []);
  return { tenantId, tenantName, loading };
}
```

Die API-Route `api/dashboard/me/route.ts` ruft intern
`getDashboardTenant()` auf (Zeile 12).

**In Server Components hingegen direkt:** `conversations/page.tsx:152`
ruft `getDashboardTenant()` on-render auf und `redirect("/dashboard/
login")` bei null.

Der Helper liegt unter **`src/modules/auth/dashboard-auth.ts`**. Import-
Pfad: `import { getDashboardTenant } from "@/modules/auth/dashboard-auth"`.

---

## Sektion 6 — Bestehende Aggregations-Logik

Die Dashboard-KPIs ("Nachrichten heute", "Aktive Gespraeche", "Neue
Leads", "Konversionsrate") kommen vollstaendig aus
**`src/app/api/dashboard/stats/route.ts`** (161 Zeilen, `GET`-Handler).
Kein Aggregations-Service, keine Views, alles inline.

### Query-Struktur

```ts
// src/app/api/dashboard/stats/route.ts:14-91
const now = new Date();
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

const [
  conversationsToday,     // count(conversations createdAt >= todayStart)
  activeConversations,    // count(conversations status = ACTIVE)
  newLeadsToday,          // count(leads createdAt >= todayStart)
  totalLeads,             // count(leads) — fuer Konversionsrate-Divisor
  customerLeads,          // count(leads qualification = CUSTOMER)
  recentConversations,    // findMany last 5 + letzte Message
  pipelineRaw,            // groupBy qualification → _count.id
  messagesLast24h,        // count(messages timestamp >= last24h)
  appointmentsLast24h,    // count(leads status=APPOINTMENT_SET + appointmentAt != null)
] = await Promise.all([ ... ]);
```

### Konversionsrate-Berechnung

```ts
// src/app/api/dashboard/stats/route.ts:94-96
const conversionRate = totalLeads > 0
  ? Math.round((customerLeads / totalLeads) * 100)
  : 0;
```

Hinweis: **Konversionsrate = CUSTOMER-Leads / ALL-Leads** — unabhaengig
von "heute". Tenant ohne CUSTOMER-Leads sieht immer 0%.

### Pipeline-Labels und Reihenfolge

```ts
// src/app/api/dashboard/stats/route.ts:99-113
const qualificationLabels: Record<string, string> = {
  UNQUALIFIED: "Neu",
  MARKETING_QUALIFIED: "Kontaktiert",
  SALES_QUALIFIED: "Termin",
  OPPORTUNITY: "Konvertiert",
  CUSTOMER: "Verloren",       // WARNUNG: Label stimmt nicht mit Enum-Semantik
};
const qualificationOrder = [
  "UNQUALIFIED", "MARKETING_QUALIFIED", "SALES_QUALIFIED", "OPPORTUNITY", "CUSTOMER",
];
```

**Nebenbefund:** Die Labels hier widersprechen sowohl der aktuellen
Conversation-Detail-UI (`UNQUALIFIED → "Neu"`, `MARKETING_QUALIFIED →
"MQL"`, `SALES_QUALIFIED → "SQL"`, `OPPORTUNITY → "Opportunity"`,
`CUSTOMER → "Customer"`) als auch den Tenant-spezifischen
`qualificationLabels`, die via ADR-002 scoring-per-tenant eingefuehrt
wurden. Der Stats-Endpoint nutzt weder Tenant-Labels noch die
Default-Labels aus `src/modules/bot/scoring/defaults.ts` — er rendert
eigene, inkonsistente Bezeichnungen. **Drift zwischen drei Quellen:**
1. `api/dashboard/stats/route.ts:99-105` (hartcodiert, falsch fuer
   CUSTOMER)
2. `src/app/dashboard/conversations/[id]/page.tsx:123-129`
   (`DEFAULT_LABELS`)
3. `tenant.qualificationLabels` (ADR-002)

### Zeitfenster-Logik

**Nur `todayStart` und `last24h`** existieren (`stats/route.ts:15-16`):

```ts
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
```

Keine "7 Tage"-, "30 Tage"- oder "gestern vs. heute"-Aggregationen. Keine
Vergleichsperioden. Keine Historisierung. Keine Zeitzonen-Awareness
(lokale Server-TZ).

---

## Sektion 7 — Conventions-Inventar

### Import-Reihenfolge und -Stil

**Absolute Imports mit `@/`** sind Standard (`tsconfig.json:18` → `"@/*":
["./src/*"]`). Beispiele:

- `import { db } from "@/shared/db";` (Prisma-Singleton)
- `import { getDashboardTenant } from "@/modules/auth/dashboard-auth";`
- `import { decryptText } from "@/modules/encryption/aes";`

**Relative Imports nur fuer Geschwister-Komponenten** innerhalb derselben
Route, z.B. `/dashboard/conversations/[id]/page.tsx:18`:

```tsx
import { ChannelBadge } from "../ChannelBadge";
```

und `/dashboard/crm/page.tsx:41`:

```tsx
import { ChannelBadge } from "../conversations/ChannelBadge";
```

Reihenfolge im Header typischerweise: React/Next → Third-Party →
`@/`-Pfade → Relative Imports. Keine automatisierte Sortierung
erkennbar (kein `eslint-plugin-import`-Order sichtbar).

### TypeScript-Strict-Mode

**Aktiv** — `tsconfig.json:7`:

```json
"strict": true,
```

Zusaetzlich `"noEmit": true, "isolatedModules": true`. Typecheck via
`tsc --noEmit`.

### Server/Client-Trennung

**Explizit pro Datei**, ohne Ordner-Konvention. `"use client";` steht
immer in Zeile 1 der betroffenen Dateien. Stand heute:

- **Client Components:** alle `src/app/dashboard/*/page.tsx` ausser
  `conversations/page.tsx`
- **Server Components:** `src/app/dashboard/conversations/page.tsx`,
  `src/app/dashboard/settings/layout.tsx`, `src/app/layout.tsx`
- **Kein `src/components/client/`-Ordner.** Keine strikte Trennung, nur
  per `"use client"`-Direktive.

### Benennungs-Pattern

- **Komponenten-Dateien:** `page.tsx`, `layout.tsx` (Next-Convention) oder
  `PascalCase.tsx` fuer Mitlaeufer (`ChannelBadge.tsx`,
  `ConversationsFilter.tsx`, `SettingsSidebar.tsx`,
  `FoundingPartnerBanner.tsx`, `MarketingWidget.tsx`, `Navigation.tsx`)
- **Route-Handler-Dateien:** `route.ts` (kebab-case fuer Unterordner,
  z.B. `settings/scoring/route.ts`)
- **Shared-Libraries:** kebab-case-Dateien unter `@/modules/...`,
  `@/lib/...`, `@/shared/...` (z.B. `dashboard-auth.ts`,
  `audit-log.ts`)
- **Tests:** `kebab-case.test.ts` unter `tests/`

### Component-Export-Pattern

**Default-Export** fuer Pages und Layouts (Next-Anforderung). **Named
Exports** fuer Mitlaeufer-Komponenten:

```tsx
// src/app/dashboard/page.tsx:289
export default function TenantDashboard() { ... }

// src/app/dashboard/conversations/ChannelBadge.tsx (Beispielhaft)
export function ChannelBadge({ channel }: { channel: ... }) { ... }
```

### Error-Handling in Server Components

**Kein `error.tsx` unter `/dashboard/...`.** Auch kein `loading.tsx`
oder `not-found.tsx`. Einzige Error-Boundary: `src/app/global-error.tsx`
(App-Level-Fallback).

In Server Components wird Fehler-Handling **ad-hoc mit `try/catch`**
gemacht, z.B. `conversations/page.tsx:204-208`:

```tsx
try { lastMessage = decryptText(c.messages[0].contentEncrypted); }
catch { lastMessage = "[Nachricht nicht lesbar]"; }
```

API-Route-Handler catchen meist `async`-Fehler global mit `try/catch`,
z.B. `settings/scoring/route.ts` oder `admin/tenants/[id]/route.ts`.

---

## Sektion 8 — Risiken und offene Fragen

### Risiken fuer den Komplett-Umbau

**R-1 (HOCH) Inline-Design-Tokens in jeder Dashboard-Page**

Die Dashboard-Farbpalette (`--bg`, `--surface`, `--gold`,
`--gold-border`, `--text`, `--text-muted`) wird in jeder einzelnen
Dashboard-Page als inline `<style>`-Block redefiniert (z.B.
`/dashboard/page.tsx:452`, `/dashboard/conversations/[id]/page.tsx:140`).
Das ist schon heute Drift-anfaellig und wird beim Redesign zum Problem:
Eine einzelne zentrale Quelle in `globals.css` wuerde konsistent
greifen, aber der Umbau muss entweder (a) die globals.css um
Dashboard-Tokens erweitern oder (b) eine `/dashboard/layout.tsx` mit
Theme-Setter einfuehren. Entscheidung vor Bau noetig.

**R-2 (HOCH) Header/Nav-Duplikation ueber alle Dashboard-Pages**

Der gesamte Header mit Brand, Bot-Status und Top-Navigation lebt inline
in `/dashboard/page.tsx:472-562`. Andere Pages (CRM, Campaigns etc.)
haben ihre eigenen Varianten oder gar keinen Header. Beim Redesign
wird die neue Top-Nav vermutlich in ein `/dashboard/layout.tsx`
wandern (Layout-Refactor) — das heisst **alle anderen Dashboard-Pages
muessen mitziehen** (ihre inline-Header entfernen oder anpassen).
Scope-Risiko fuer die 29.04.-Deadline.

**R-3 (MITTEL) Gemischte Datenlade-Patterns**

Heute koexistieren Client-Fetch-Polling (`/dashboard/page.tsx`) und
Server-Components-mit-direktem-Prisma (`/dashboard/conversations/
page.tsx`). Der Daily-Insights-Redesign muss sich fuer einen Weg
entscheiden:
- Server Components laden serverseitig beim Request → frisch, aber
  keine 30s-Auto-Refresh ohne Client-Hydration
- Client Components mit Fetch → kann pollen, aber braucht extra
  API-Route und Loading-State
Die aktuelle Uebersicht nutzt Pattern B (Client-Fetch + 30s-Poll). Der
Redesign koennte Pattern A bevorzugen (Stripe-Dashboard nutzt sehr
haeufig Server Components fuer initialen Render + Revalidate-Hooks).
Muss entschieden werden.

### Offene Fragen vor Bau

1. **Scope des Layout-Refactors.** Wird `/dashboard/layout.tsx`
   neu angelegt (mit gemeinsamer Top-Navigation fuer alle
   Dashboard-Routes), oder bleibt das inline in `/dashboard/page.tsx`?
   Die Entscheidung bestimmt Aufwand (einfach vs. Kettenreaktion durch
   alle Sub-Pages).

2. **Chart-Library-Entscheidung.** Stripe-Dashboard nutzt viele
   Mini-Charts (Sparklines, Area-Charts, Bar-Charts). Aktuell ist
   **weder recharts noch chart.js installiert** — die einzige
   Charting-Logik heute ist ein handgebauter stacked-Bar in
   `page.tsx:692-701`. Soll recharts installiert werden (mehr
   Features, 90kb+), oder bleiben wir bei SVG/Div-basierten
   Mini-Charts (kleiner Footprint, aber jeder Chart-Typ muss
   selbst gebaut werden)?

3. **Tenant-Labels fuer Pipeline im Redesign.** Der Stats-Endpoint
   haelt eigene (teilweise falsche) `qualificationLabels`, die
   Conversation-Detail-UI nutzt Defaults, und ADR-002 fuehrt
   tenant-konfigurierbare Labels ein. Welche Quelle nutzt das neue
   Dashboard? Wenn tenant-Labels: der Stats-Endpoint muss erweitert
   werden (ein Read auf `tenant.qualificationLabels`).

4. **Vergleichs-Zeitfenster fuer KPIs.** Heute nur "today" und
   "last24h". Stripe-Dashboard zeigt typisch "% vs. gestern", "% vs.
   letzte 7 Tage". Braucht das Redesign Vergleichsperioden? Das
   verdoppelt/verdreifacht die DB-Queries.

5. **Dark-only oder Theme-Switch.** Aktuell ist Dark fix
   (`layout.tsx:70` → `className="dark"`). Das stimmt fuer das
   Premium-SaaS-Motto — Frage: soll der Redesign den Light-Mode
   mindestens vorbereiten (CSS-Variable-Struktur erlaubt spaeteren
   Toggle) oder weiterhin Dark-only bleiben?

6. **Framer-Motion-Budget.** Die bestehende Page nutzt Framer-Motion
   fuer Entry-Animations pro Karte. Bei einer Dashboard-Dichte mit
   20+ Kacheln wird das zum Layout-Jank-Risiko. Halten wir am
   `motion.div`-Pattern fest oder reduzieren wir auf CSS-Transitions?

7. **Build-Disziplin: CLAUDE.md verlangt `npx next build` vor jedem
   Commit.** Bei einem 800+-Zeilen-Umbau muss der Scope klar
   eingegrenzt werden, damit nicht jeder Test-Commit 45s Build-Zeit
   kostet. Empfehlung: Redesign in einem Working-Branch
   (ggf. Worktree), dann am Ende einmal gruener Build.
