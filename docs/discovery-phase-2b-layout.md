# Discovery — Phase 2b: Layout-Extraktion + Design-Tokens

**Zweck:** Vollstaendige Inventur der Dashboard-Chrome-Struktur
(Inline-Header, Top-Nav, Inline-Tokens) vor dem Bau eines
gemeinsamen `/dashboard/layout.tsx`. Keine Annahmen — exakte
Zeilen-Ranges, alle Drift-Punkte aufgedeckt.

**Status:** Pure Inspektion. Master baut gruen verifiziert
(`npx next build` exit 0).

**Anmerkung zur Ausgangslage:** Es existiert **kein**
`PHASE_2B_KICKOFF.md` im Repo-Root. Den Phase-2b-Scope leite ich
aus dem aktuellen Discovery-Auftrag (Risiko-Spotting Sektion 7)
und dem bestehenden `docs/discovery-dashboard-redesign.md` (R-1
Inline-Tokens-Drift, R-2 Header/Nav-Duplikation) ab:
- Layout-Extraktion → `/dashboard/layout.tsx` neu
- Token-Migration → Inline `<style>` weg, in `globals.css`
- Konversationen als Top-Nav-Tab
- Back-Button-Removal in Sub-Pages

---

## Sektion 1 — Inventur `src/app/dashboard/page.tsx`

### Datei-Eckdaten

- **Zeilenzahl:** 871
- **Komponenten-Natur:** Client Component (`"use client";` Zeile 1)
- **Default-Export:** `TenantDashboard` (Zeile 289)

### Inline-`<style>`-Block (Design-Token-Definition)

- **Range:** Zeilen 451-464
- **Inhalt:** Definiert 9 CSS-Custom-Properties unter `:root`
  (siehe Sektion 3 fuer Vergleich mit globals.css):
  ```css
  // src/app/dashboard/page.tsx:451-464
  <style>{`
    :root {
      --bg: #07070d;
      --surface: #0e0e1a;
      --gold: #c9a84c;
      --gold-border: rgba(201,168,76,0.1);
      --gold-border-hover: rgba(201,168,76,0.35);
      --purple: #8b5cf6;
      --text: #ede8df;
      --text-muted: rgba(237,232,223,0.45);
      --serif: Georgia, serif;
      --sans: var(--font-inter), system-ui, sans-serif;
    }
  `}</style>
  ```

### Inline-Header (Brand + Bot-Status + Test-Links)

- **Range:** Zeilen 471-499 (gesamter `<header>`-Block bis ans
  Ende der "Obere Zeile"-`<div>`)
- **Strukturkomponenten:**
  - Brand-`<h1>`: Zeilen 477-480 (`AI Conversion.` + Tenant-Name)
  - Bot-Status-Indikator: Zeilen 482-487 (Pulse-Dot + Test-Link
    + Prompt-Link)
  - Action-Buttons rechts: Zeilen 489-498 (Refresh, Hilfe)
- **Server-Side-Daten:** Keine. Header ist komplett client-seitig
  und nutzt React-State:
  - `tenantName` aus `useTenantInfo()`-Hook (Zeilen 261-287),
    der `/api/dashboard/me` clientseitig fetcht
  - `loading` aus `fetchStats` (Zeile 323)
  - Der Bot-Status `Bot aktiv` ist **statisch hartcodiert** —
    keine echte Health-Check-Logik dahinter
- **Client-Interaktionen:** `onClick={fetchStats}` (Refresh),
  `onClick={() => setChatOpen(...)}` (Hilfe-Button)

### Inline-Top-Navigation

- **Range:** Zeilen 501-560
- **Tab-Array:** Zeilen 502-516 (inline-Literal, kein extraher
  Config-File)
- **Tab-Liste:**
  ```ts
  // src/app/dashboard/page.tsx:503-516
  [
    { href: "/dashboard",            label: "Uebersicht",   icon: Activity, active: true },
    { href: "/dashboard/crm",         label: "CRM",          icon: Kanban },
    { href: "/dashboard/campaigns",   label: "Kampagnen",    icon: Megaphone },
    { href: "/dashboard/broadcasts",  label: "Broadcasts",   icon: Send },
    { href: "/dashboard/clients",     label: "Clients",      icon: Users },
    { href: "/dashboard/settings",    label: "Einstellungen", icon: Settings },
  ]
  ```
- **Active-State-Logik:** `active: true` ist **hartcodiert auf
  Uebersicht**, nicht via `usePathname()` berechnet. Kommentar
  Zeilen 509-515 erklaert: "Tab-Bar-Code rendert nur im Kontext
  von dashboard/page.tsx" — d.h. die Sub-Pages haben **keine
  Top-Nav** und brauchen daher kein dynamisches Active.
- **AI-Studio-Dropdown:** Zeilen 532-559, separat (kein Tab-
  Listen-Eintrag, eigener `<div ref={aiStudioRef}>`-Block mit
  Click-Outside-Handling Zeilen 299-308)

### Konversationen — fehlt aktuell in Top-Nav

Die List-Page `/dashboard/conversations` (Phase 6.3, produktiv)
ist **nicht** als Top-Nav-Tab erreichbar. Nur via Footer-Link
"Alle anzeigen →" am Ende der Top-5-Conversations-Card
(`src/app/dashboard/page.tsx:668-674`).

---

## Sektion 2 — Sub-Page-Inventur

| Page | Zeilen | Comp.-Typ | Inline-`<style>` | Back-Button | Eigene H1 | Eigener `<header>` |
|---|---|---|---|---|---|---|
| `conversations/page.tsx` | 354 | **Server** | nein | Z. 232-238, `<Link href="/dashboard">` | Z. 242 (`Konversationen`) | nein, schlichter `<div>`-Wrapper |
| `conversations/[id]/page.tsx` | 487 | Client | Z. 170-184 (10 Tokens redefiniert) | Z. 188-195, `<button onClick={router.back()}>` (KEIN `/dashboard`-Pfad!) | Z. 167 (`Konversation`) | nein, Inline-`<div className="mb-8 flex">`-Block |
| `crm/page.tsx` | 1602 | Client | Z. 1502-1508 | Z. 1519-1521, `<a href="/dashboard">` | implizit im Header | Z. 1516 (`<header>`-Tag) |
| `campaigns/page.tsx` | 1278 | Client | Z. 1084-1090 | mehrere ArrowLeft (intern fuer Templates-Nav, nicht Dashboard) | implizit im Header | implizit (Wrapper) |
| `clients/page.tsx` | 160 | Client | Z. 67 (Single-Line) | Z. 77-79, `<a href="/dashboard">` | implizit im Header | Z. 74 (`<header>`-Tag) |
| `clients/[id]/page.tsx` | 388 | Client | Z. 151 (Single-Line) | Z. 157+ (`<header>`) | implizit | Z. 157 (`<header>`-Tag) |
| `broadcasts/page.tsx` | 356 | Client | Z. 255 (Single-Line) | Z. 266-268, `<a href="/dashboard">` | implizit | Z. 263 (`<header>`-Tag) |
| `campaigns/templates/page.tsx` | 521 | Client | OFFEN — nicht erfasst, aber Pattern wie campaigns/page.tsx zu erwarten | OFFEN | OFFEN | OFFEN |
| `settings/page.tsx` | 182 | **Server** | nein (Settings-Layout uebernimmt Wrapper) | Z. 102-105, `<Link href="/dashboard">` | OFFEN — kommt vom layout? | nein |
| `settings/prompt/page.tsx` | 134 | Client | nein | Z. 63-66, `<Link href="/dashboard">` | hat eigene H1 | nein |
| `settings/scoring/page.tsx` | 247 | Client | nein | Z. 131-134, `<Link href="/dashboard">` | hat eigene H1 | nein |
| `settings/widget/page.tsx` | 681 | Client | nein | Z. 492-495, `<Link href="/dashboard">` | hat eigene H1 | nein |
| `assets/page.tsx` | 54 | Client | nein | **kein** Back-Button | Z. 9 (`AI Studio`) | nein |
| `bot-test/page.tsx` | 175 | Client | nein | Z. 73-76, `<Link href="/dashboard">` | OFFEN | OFFEN |

### Beobachtungen aus dieser Tabelle

- **Drei Inline-Token-Patterns** koexistieren:
  - **Vollformat** (page.tsx, conversations/[id]) — multi-line mit
    Newlines + Kommentaren
  - **Single-Line-Compact** (clients, clients/[id], broadcasts,
    crm-mit-zwei-blocks, campaigns) — alle 6 Tokens auf einer Zeile
  - **Kein Token-Block** (settings-Sub-Pages, assets, bot-test) —
    nutzen Tailwind-Inline-Klassen mit Hex-Werten (z.B. `bg-[#07070d]`,
    `text-[#ede8df]`, `text-[#c9a84c]`) ODER Settings-Layout uebernimmt
- **Back-Button-Drift:**
  - **8 Sub-Pages** linken zurueck auf `/dashboard` (per `<Link>`
    oder `<a>`)
  - **`conversations/[id]/page.tsx`** nutzt `router.back()` —
    **Sonderfall**, weil die Detail-View aus verschiedenen
    Quellen erreicht wird (List-View, Dashboard-Top-5, CRM)
  - **`assets/page.tsx`** hat **gar keinen** Back-Button
- **CRM-Spezialfall:** `crm/page.tsx` hat **zwei** `<style>`-Blocks —
  Z. 1502-1508 ist der App-Style-Block (CSS-Variablen),
  Z. 1169-1180 ist Teil eines HTML-String-Templates fuer
  Proposal-PDF-Export (NICHT zu migrieren). Analog
  `campaigns/page.tsx:874-890`.
- **CRM-Header-Pattern als Referenz:** Mehrere Sub-Pages
  (clients, clients/[id], broadcasts, crm) haben einen eigenen
  `<header>`-Tag mit `backdrop-blur-md` + Border-Bottom + Back-
  Link. Das ist visuell ein Mini-Top-Nav-Replacement, das durch
  ein gemeinsames Layout obsolet wuerde.

---

## Sektion 3 — Globals.css und Theme-Konfiguration

### Aktueller Inhalt `src/app/globals.css` (174 Zeilen)

Voller `@theme`-Block (Zeilen 11-27, Tailwind v4 CSS-first-Config):

```css
// src/app/globals.css:11-27
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

Weitere globale CSS-Definitionen ausserhalb von `@theme`:
- **`body`-Default** (Zeilen 41-46): `background: var(--color-navy-950)`,
  `color: #e2e8f0`, `font-family: var(--font-family-body)`
- **Utility-Klassen** (Zeilen 49-173): `.text-gradient-purple`,
  `.glow-purple`, `.glow-green`, `.glass`, `.glass-card`,
  `.gradient-border`, `.noise-bg`, `.animate-pulse-green`,
  `.divider-purple`, `.btn-glow-green`, `.neural-grid`,
  `.pulse-h`, `.pulse-v`
- **Globale `h1, h2`-Modifikation** (Zeile 115):
  `letter-spacing: -0.03em`

### Tailwind-v4-Setup-Hinweise

- **Kein `tailwind.config.ts/js`** im Projekt. Tailwind v4 nutzt
  CSS-first-Config via `@theme`-Direktive in `globals.css`.
- `@source "../**/*.{js,ts,jsx,tsx,mdx}";` in Zeile 9
  garantiert dass `src/`-Subdirs gescannt werden.
- `@plugin "@tailwindcss/typography";` in Zeile 2 fuer
  Markdown-Render (Legal-Pages).

### Konflikt-Check fuer Phase-2b-Tokens

Die Dashboard-Tokens leben aktuell unter den **Kurz-Namen**
`--bg`, `--surface`, `--gold`, `--gold-border`, `--purple`,
`--text`, `--text-muted`, `--serif`, `--sans`. Globals.css nutzt
**Lang-Namen** im Tailwind-Stil (`--color-navy-950`,
`--color-purple-500`, `--font-family-body`).

**Kollisions-Check:**
- `--bg`, `--surface`, `--gold`, `--gold-border`,
  `--gold-border-hover`, `--text`, `--text-muted`, `--serif`,
  `--sans` — **null Treffer in globals.css** → frei verfuegbar
- `--purple` — der **Wert** `#8b5cf6` existiert bereits als
  `--color-purple-500`. Kein Naming-Konflikt, aber ein
  **Definitions-Drift** (zwei Wege denselben Farbwert zu
  referenzieren).

**Empfehlung fuer Migration (offen, ConvArch entscheidet):**
- Variante A: 1:1-Uebernahme der Kurz-Namen in `globals.css`
  unter `:root` (nicht `@theme`, weil sie keine Tailwind-Utility-
  Klassen erzeugen sollen). Schnell, keine Naming-Aenderung in
  bestehenden Files.
- Variante B: Renaming auf Tailwind-Stil
  (`--color-dashboard-bg`, `--color-dashboard-surface` etc.).
  Sauberer, aber alle Stellen mit `var(--bg)` etc. muessen
  aktualisiert werden — das sind nach Stichprobe **hunderte
  Treffer** ueber 7+ Pages.

---

## Sektion 4 — Login-Route-Architektur (KRITISCH)

### Verzeichnis-Listing `src/app/dashboard/login/`

```
src/app/dashboard/login/
└── route.ts            # 124 Zeilen, GET-Handler (Magic-Link-Verarbeitung)
```

**Es existiert KEINE `page.tsx` unter `/dashboard/login`.**

### Implikationen fuer Layout-Extraktion

`src/app/dashboard/login/route.ts` ist ein **Route-Handler**
(`export async function GET(req: NextRequest)`), kein
React-Component. Route-Handler in Next.js App Router werden
**nicht** von `layout.tsx`-Dateien umschlossen — Layouts wrappen
ausschliesslich `page.tsx`-Renders.

Das heisst: Ein neues `src/app/dashboard/layout.tsx` wuerde den
Login-Route-Handler **nicht** beeinflussen. Kein conditional
Rendering, keine Route-Group-Komplexitaet noetig.

**Edge-Case:** Bei Token-Fehlern liefert der Handler raw HTML
ueber die `loginPage()`-Helper (`route.ts:96-123`) — das ist
ebenfalls kein React-Tree und ignoriert Layouts.

### Middleware-Verifikation

`src/middleware.ts:144-150` whitelisted `/dashboard/login` und
`/dashboard/logout` explizit als public:

```ts
// src/middleware.ts:144-150
function isDashboardPath(pathname: string): boolean {
  if (pathname === DASHBOARD_LOGIN || pathname.startsWith(DASHBOARD_LOGIN + "/")) {
    return false;
  }
  if (pathname === DASHBOARD_LOGOUT || pathname.startsWith(DASHBOARD_LOGOUT + "/")) {
    return false;
  }
  return DASHBOARD_PATHS.some(...);
}
```

Auth-Check passiert in der Middleware (Zeile 190-211), nicht im
Layout. Ein Layout das `getDashboardTenant()` aufruft, kann sich
darauf verlassen, dass die Middleware den Token bereits geprueft
hat — oder der Tenant ist null und Layout muss `redirect()`
auswerfen.

---

## Sektion 5 — Settings-Sidebar (Sonderfall)

### Settings-Sub-Pages

```
src/app/dashboard/settings/
├── layout.tsx              # 35 Zeilen, Server Component, wrappt alle Sub-Pages
├── page.tsx                # 182 Zeilen, Server Component, Settings-Index
├── prompt/page.tsx         # 134 Zeilen, Client Component
├── scoring/page.tsx        # 247 Zeilen, Client Component
├── widget/page.tsx         # 681 Zeilen, Client Component
└── SettingsSidebar.tsx     # Client Component, von layout.tsx importiert
```

### Settings-Layout-Struktur

`src/app/dashboard/settings/layout.tsx` (vollstaendig):

```tsx
// src/app/dashboard/settings/layout.tsx (35 Zeilen)
import { SettingsSidebar } from "./SettingsSidebar";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#07070d] text-[#ede8df]">
      <div className="mx-auto flex max-w-7xl gap-8 px-6 py-8 sm:py-10">
        <SettingsSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
```

Die Sidebar selbst (`SettingsSidebar.tsx`) ist ein Client-Component
mit `usePathname()`, hartcodierten `ACTIVE_ITEMS` und Mobile-
Hamburger.

### Verhalten unter neuem `/dashboard/layout.tsx`

Wenn ein Top-Level-`/dashboard/layout.tsx` eingefuehrt wird,
**verschachteln sich die Layouts** automatisch (Next-App-Router-
Konvention):

```
RootLayout (src/app/layout.tsx)
└── DashboardLayout (NEU: src/app/dashboard/layout.tsx)
    └── SettingsLayout (src/app/dashboard/settings/layout.tsx)
        └── settings/*/page.tsx
```

**Risiken:**
- **Doppelter `min-h-screen` + `bg-[#07070d]`-Wrapper.** Sowohl
  das neue Dashboard-Layout als auch das Settings-Layout setzen
  einen Full-Page-Wrapper mit Background. Kosmetischer Drift,
  aber kein visueller Bruch (gleiche Farben).
- **z-index-Konflikt unwahrscheinlich:** SettingsSidebar nutzt
  `fixed inset-y-0 left-0 z-50` nur im Mobile-Overlay-Modus
  (`<640px`). Top-Nav waere `z-10` (analog `page.tsx:472`).
  Sidebar-Overlay (`z-50`) liegt darueber → korrekte
  Stacking-Order.
- **Settings-Sub-Pages haben jeweils einen redundanten
  `min-h-screen bg-[#07070d]`-Wrapper.** Beispiel
  `prompt/page.tsx:60` (`<div className="min-h-screen bg-[#07070d]
  text-[#ede8df]">`). Die Pages sind aber bereits doppelt
  gewrappt durch settings/layout.tsx — der Wrapper ist heute
  schon redundant. Ein Top-Level-Layout aendert daran nichts,
  fuegt aber eine dritte Wrap-Ebene hinzu. **Empfehlung fuer
  Build-Phase:** redundante `min-h-screen`-Wrapper aus den
  settings-Sub-Pages entfernen, sobald das Top-Level-Layout das
  uebernimmt.

---

## Sektion 6 — Tenant-Isolation und Auth-Kontext im Layout

### Aktuelle Tenant-Aufloesung

**Zwei Patterns koexistieren:**

| Pattern | Pages | Methode |
|---|---|---|
| Server Component + direktes Helper-Call | `conversations/page.tsx` (Z. 152), `settings/page.tsx` (implizit ueber Middleware), Settings-API-Routes | `await getDashboardTenant()` aus `@/modules/auth/dashboard-auth`, bei null `redirect("/dashboard/login")` |
| Client Component + `/api/dashboard/me`-Fetch | `dashboard/page.tsx` (`useTenantInfo()` Z. 261-287), alle anderen Client-Sub-Pages | `fetch("/api/dashboard/me")`, bei 401 `window.location.href = "/dashboard/login"` |

### Helper

`src/modules/auth/dashboard-auth.ts:28-67`:
- `getDashboardTenant()` — async, liest Cookie/Header, hashed Token,
  prueft `Tenant.dashboardToken` + `dashboardTokenExpiresAt`,
  liefert `{ id, name, brandName, paddlePlan } | null`
- `MAGIC_LINK_EXPIRY_MS = 72h`
- `SESSION_EXPIRY_MS = 30 Tage`

### Layout-Performance-Analyse

Wenn ein neues `/dashboard/layout.tsx` als **Server Component**
geschrieben wird und `getDashboardTenant()` aufruft, gibt es zwei
Implikationen:

1. **Tenant-Daten im Layout verfuegbar** (kein Client-Roundtrip
   noetig fuer Brand-Anzeige). Das ist die Hauptmotivation fuer
   die Extraktion.
2. **Sub-Pages koennen `getDashboardTenant()` ein zweites Mal
   aufrufen** — DB-Query passiert dann zweimal pro Request.

**React `cache()` als Mitigation:**
Next.js empfiehlt `import { cache } from "react"`-Wrap fuer
Server-Side-Helpers, sodass derselbe Funktionsaufruf innerhalb
eines Requests dedupliziert wird. **Aktuell ist
`getDashboardTenant()` NICHT mit `cache()` gewrappt** — das
muesste der Build-Schritt entweder mitliefern oder explizit
als Tech-Debt vermerken.

**Alternative:** Layout serialisiert Tenant via Children-Prop
oder React-Context (Client-Context-Provider) — aber das erfordert,
dass Sub-Pages Client Components sind. Die existierenden Server-
Component-Sub-Pages (`conversations/page.tsx`, `settings/page.tsx`)
wuerden diese Vereinheitlichung brechen.

**Empfehlung Build-Phase:** `getDashboardTenant()` in
`dashboard-auth.ts` **mit `react.cache()` wrappen** als Teil der
Layout-Einfuehrung. Aufwand: 3 Zeilen Code, kein Test-Impact.
Aktuelle Caller bleiben unveraendert.

---

## Sektion 7 — Risiko-Spotting

### a) Layout-Extraktion → visuelle Brueche?

**Mittel-Risiko.** Die Sub-Pages haben heute jeweils:
- Eigenen `<header>`-Block mit Back-Button (clients, clients/[id],
  broadcasts, crm)
- Eigenen `min-h-screen bg-[#07070d]`-Wrapper (settings-Sub-Pages,
  conversations, conversations/[id])
- Eigenen Inline-`<style>`-Block mit den 6-10 CSS-Variablen

Wenn ein Top-Level-Layout den Wrapper, das `<style>` und einen
gemeinsamen Top-Nav uebernimmt, **entstehen Doppelungen** bis die
Sub-Pages bereinigt sind. Build-Reihenfolge in Sektion 8.

### b) Konversationen als Top-Nav-Tab → Kollision mit "Alle anzeigen →"?

**Niedrig-Risiko, kosmetischer Hinweis.** Der "Alle anzeigen →"-
Footer-Link in der Top-5-Conversations-Card
(`page.tsx:668-674`) bleibt funktional. Er wird nach der Top-Nav-
Erweiterung redundant, aber nicht falsch — er linkt auf dieselbe
Route. **Empfehlung:** Footer-Link in der Card behalten (Stripe
hat aehnliche Doppelung als UX-Pattern: Top-Nav fuer
Power-User, Inline-Link fuer scroll-down-Discovery).

### c) Token-Migration nach globals.css → Tailwind-v4-Spezifika?

**Niedrig-Risiko.** Tailwind v4 mit `@theme`-Direktive ist
bereits aktiv (siehe Sektion 3). CSS-Custom-Properties unter
`:root` ausserhalb von `@theme` funktionieren wie in jedem
modernen Browser. Der Hauptpunkt ist, ob die Tokens in `@theme`
oder unter `:root` landen:
- Unter `:root` → reine CSS-Variablen, nicht als Tailwind-
  Utility-Klassen verfuegbar (`bg-bg` waere kein generierter
  Klassennamen)
- Unter `@theme` → wuerden `bg-bg`, `text-gold` etc. als
  Tailwind-Klassen generiert. Aber das passt nicht zur
  bestehenden Verwendung (`var(--bg)` ueberall im Code).

**Empfehlung:** Variante A aus Sektion 3 (Kurz-Namen unter
`:root`, nicht `@theme`). Konsistent mit bestehendem
`var(--bg)`-Usage, kein Code-Refactor in Sub-Pages noetig.

### d) Back-Button-Removal → Sub-Pages ohne Navigation?

**Mittel-Risiko.** Drei Sub-Pages erreichbar **nur via**
Back-Button-Logik aus anderen Pages:
- **`conversations/[id]/page.tsx`** — Detail-View, nur via
  Click aus List/CRM/Top-5. Hat `router.back()` (kein
  `/dashboard`-Hardlink). Wenn `router.back()` entfernt wird:
  Alternative noetig (z.B. `<Link>` zur Konversations-List statt
  Dashboard-Root).
- **`clients/[id]/page.tsx`** — Detail-View, sehr wahrscheinlich
  nur via Click aus `/dashboard/clients`. OFFEN: Back-Button-
  Pfad nicht detailliert geprueft.
- **`campaigns/templates/page.tsx`** — OFFEN: nicht inspiziert.

**Empfehlung:** Back-Button in den **Detail-Pages** (`[id]`-
Routes) belassen, nur in den **List-/Index-Pages** entfernen
(weil dort die Top-Nav den Pfad zurueck zum Dashboard liefert).

---

## Sektion 8 — Empfehlungen fuer Build-Phase

### Reihenfolge der Aenderungen (minimiert Build-Brueche)

1. **Token-Migration nach globals.css** (additive Aenderung,
   kein Behavior-Change). Schritt: in `globals.css` einen
   `:root { --bg, --surface, --gold, ... }` einfuegen. Sub-
   Pages funktionieren weiter, weil ihre Inline-`<style>`-Blocks
   die selben Werte definieren — die spaetere Tokens-Cascade
   wird durch die Inline-Definition ueberschrieben (oder im
   selben Wert harmonisiert).
   - **Build-Check 1:** `npm run build` muss gruen sein.

2. **`/dashboard/layout.tsx` neu anlegen** (Server Component)
   mit Top-Nav + Header + tenantSlug-Aufloesung via
   `getDashboardTenant()` (idealerweise via `react.cache()`-
   wrap). `dashboard/page.tsx`-Inline-Header **noch nicht
   entfernen** — beide existieren parallel kurz.
   - **Build-Check 2:** Page rendert mit doppeltem Header
     (Layout + Inline). Visuell haesslich, aber kein Crash.

3. **Inline-Header aus `dashboard/page.tsx` entfernen** (Z.
   471-562) inkl. AI-Studio-Dropdown → in Layout ueberfuehrt.
   Auch der `<style>`-Block (Z. 451-464) entfernen, weil
   globals.css ihn jetzt liefert.
   - **Build-Check 3:** Page rendert mit nur einem Header.

4. **Konversationen als Top-Nav-Tab im Layout hinzufuegen.**
   Single-Line-Aenderung im Tab-Array. usePathname() fuer
   Active-State (jetzt funktioniert es, weil das Layout auf
   allen `/dashboard/*`-Pfaden rendert).
   - **Build-Check 4:** Navigation auf allen Sub-Pages
     gleich, Active-State korrekt.

5. **Sub-Pages entschlacken** (eine pro Commit, oder gebuendelt
   mit Build-Check):
   - Inline-`<style>`-Block entfernen (alle ausser
     `crm/page.tsx`-PDF-Template)
   - `<header>`-Tag mit Back-Button entfernen (clients,
     clients/[id], broadcasts, crm)
   - Top-Level `min-h-screen bg-[#07070d]`-Wrapper entfernen
     (settings-Sub-Pages, conversations, conversations/[id])
   - Back-Buttons **nur in List-/Index-Pages** entfernen, in
     Detail-Pages (`[id]`) behalten
   - **Build-Check 5+:** nach jeder Sub-Page-Bearbeitung
     mindestens visuelle Sichtkontrolle, alle ~3 Pages ein
     `npm run build`

6. **Settings-Layout-Wrapper anpassen** (entfernt redundanten
   `min-h-screen bg-[#07070d]`, weil das Top-Layout das jetzt
   uebernimmt).

7. **Final-Build** — `npm run build`, `tsc --noEmit`, manuelle
   Sichtkontrolle des Dashboards in Dev-Server.

### TypeScript-Strict-Mode-Stolperfallen

- **Server-vs-Client-Boundary:** Layout als Server Component
  und Top-Nav-Komponenten (mit `usePathname()`,
  `useState` fuer AI-Studio-Dropdown) muessen als Client-Subcomponents
  ausgelagert werden. Pattern aus `settings/layout.tsx` +
  `SettingsSidebar.tsx` ist dafuer 1:1 uebernehmbar.
- **`react.cache()` braucht eine Re-Export-Strategie:** wenn
  `getDashboardTenant()` mit `cache()` gewrappt wird, muss der
  Cache-Wrap auf Modul-Ebene passieren (nicht innerhalb einer
  Komponente). Sonst greift die Deduplikation pro-Render statt
  pro-Request.
- **`useTenantInfo()`-Hook in `dashboard/page.tsx`** wird
  obsolet, sobald das Layout die Tenant-Daten liefert. Die
  Dashboard-Page kann dann **Server Component werden** (oder
  weiterhin Client + props vom Layout via Children-Pattern).
  Empfehlung: erstmal Client lassen, weniger Risiko fuer
  29.04.-Demo.

### "OFFEN"-Markierungen (siehe Hauptbericht unten)

---

## OFFEN-Liste (Schritte, die Build-Phase noch klaeren muss)

1. **`campaigns/templates/page.tsx`** Inline-Style/Back-Button
   nicht inspiziert. Vermutlich identisches Pattern wie
   `campaigns/page.tsx`. 521 Zeilen, niedrige Prio fuer 29.04.-
   Demo (Templates sind nicht Demo-Pfad).
2. **`bot-test/page.tsx`** Header-Struktur und H1 nicht im
   Detail erfasst, nur Back-Button-Existenz Z. 73-76 bestaetigt.
3. **`clients/[id]/page.tsx`** und **`crm/page.tsx`** Header-
   Detail-Struktur (welche Headline/Brand-Komponenten genau drin
   sind) nicht zeilenweise inspiziert.
4. **Settings-Page Header-Struktur:** `settings/page.tsx` hat
   Back-Button bei Z. 102, aber die Beziehung zwischen
   `settings/layout.tsx`-Wrapper und der Page-eigenen Header-
   Struktur ist nicht zeilenweise verifiziert.
5. **Token-Migrations-Variante (A vs. B in Sektion 3):**
   ConvArch-Entscheidung noetig.
6. **`react.cache()`-Wrap fuer `getDashboardTenant()`:**
   ConvArch-Entscheidung — als Teil von Phase 2b mitliefern oder
   als separaten Tech-Debt-Eintrag erfassen.
7. **Behandlung des "Alle anzeigen →"-Links** auf der Top-5-
   Card im Dashboard nach Konversationen-Tab-Einfuehrung —
   behalten oder entfernen?
