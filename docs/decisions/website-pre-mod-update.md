# Website-Anpassungen vor MOD-Pilot-Akquise — Pre-Analyse

**Datum:** 2026-04-15
**Status:** Pre-Analyse, wartet auf User-Freigabe vor Code-Aenderungen
**Ziel:** Fake-Testimonials raus, Positionierung "KI-Vertrieb fuer DACH-KMU",
Founding-Partner-Phase + Pricing (Listenpreis + Founding-Partner-Preis),
Branche E-Commerce raus / Bildung rein, ROI-Disclaimer.

---

## 1. Betroffene Dateien (vollstaendiges Konsumenten-Audit)

### Aktive Dateien (werden geaendert)

| Datei | Umfang | Enthaelt |
|---|---|---|
| `src/app/page.tsx` | 16 Z. | Meta-Title mit "Revenue Operating System" (Z.5) |
| `src/app/page-v2.tsx` | 699 Z. | **Homepage** — Hero, Social-Proof-Testimonials, Vergleichstabelle, ROI, Branchen, Pricing-Kurz, Final CTA, Inline-Footer |
| `src/app/pricing/PricingClient.tsx` | 1129 Z. | Detail-Pricing-Seite: Plan-Daten (monthlyPrice 497/1297/2497, setupFee 697/1.297/1.997) |
| `src/components/Navigation.tsx` | 189 Z. | Top-Navigation — erhaelt Founding-Partner-Banner direkt darunter |

### Neue Datei (wird angelegt)

| Datei | Zweck |
|---|---|
| `src/components/FoundingPartnerBanner.tsx` | Schmaler Streifen ueber Navigation oder darunter (wird in `app/layout.tsx` oder Navigation-Top eingehaengt). Client-Component, optional dismissible, aber DEFAULT sichtbar |

### Verwaiste Dateien (NICHT anfassen)

| Datei | Status | Grund |
|---|---|---|
| `src/components/Pricing.tsx` | nirgends importiert | Alte Preise 497/1.497/2.997 — aber komplett tot. NICHT anfassen, ggf. spaeter loeschen (ausserhalb Scope) |
| `src/components/Footer.tsx` | nirgends importiert | Homepage nutzt Inline-Footer in `page-v2.tsx:685-696`. Nicht anfassen |
| `src/components/HeroSection.tsx` / `ProblemSolution.tsx` / `Features.tsx` / `PilotSection.tsx` / `HowItWorks.tsx` / `LogoCloud.tsx` / `CalendarSection.tsx` / `FloatingChat.tsx` / `NeuralGrid.tsx` | nirgends in `/`, `/pricing`, `/faq` importiert | Tote/alte Komponenten. Out-of-scope |

### Backend-Code mit Pricing-Bezug (VORSICHTIG — NICHT aendern in diesem Scope)

| Datei | Enthaelt | Risiko |
|---|---|---|
| `src/modules/billing/paddle.ts` | `monthlyPrice`/`setupFee` in Cent (49700/149700/299700 + setupFees) | **PADDLE-INTEGRATION**. Aenderung haette sofortige Wirkung auf Checkout-Preise. Preis-Ids sind in Paddle-Sandbox/Prod separat gepflegt. **Nicht in diesem Scope.** Neue Founding-Partner-Preise muessen ggf. separat als neue Paddle-Price-Ids angelegt werden — Folge-Task |
| `src/app/api/paddle/checkout/route.ts` | liest Plan-Config | out-of-scope |

### Dateien mit "Immobilienmakler", "Handwerk", "E-Commerce", "Business Coach" ausserhalb Homepage

Die Branchen-/Testimonial-Begriffe tauchen auch im **Dashboard-Bereich** und in **Bot-System-Prompts** auf — das sind PRODUKT-Features, keine Marketing-Inhalte. **NICHT anfassen**:

- `src/modules/bot/system-prompts/growth.ts` — Bot-Spezialisierung "Immobilienmakler" (Produkt)
- `src/app/dashboard/campaigns/page.tsx`, `src/app/dashboard/campaigns/templates/page.tsx` — Campaign-Templates "E-Commerce", "Handwerk" (Produkt)
- `src/app/api/dashboard/campaigns/templates/route.ts` — Backend fuer Campaign-Templates (Produkt)
- `src/app/agb/page.tsx` — "Setup-Gebuehr" in AGB (juristisch, separat anzupassen wenn Setup-Fee entfaellt — **Folge-Task, out-of-scope heute**)

### DSGVO-Doku (out-of-scope, aber verweisbar)

- `public/dpa.md`, `docs/architecture.md` enthalten Preis/Setup-Bezug nur in Historien-Abschnitten — nicht anfassen.

---

## 2. Sektion-fuer-Sektion: Stand + geplante Aenderung

### 2.1 Meta-Title `src/app/page.tsx:5`
- **Ist:** `"AI Conversion | Das Revenue Operating System fuer DACH-Unternehmen"`
- **Soll:** `"AI Conversion | KI-Vertrieb fuer DACH-KMU"` (+ Description angepasst)

### 2.2 Hero — `page-v2.tsx:162-321`
- **Ist:** H1 "Das Revenue Operating System / fuer DACH-Unternehmen", Subhead "Ihr Vertrieb arbeitet 24/7", Body mit "Sales Agent, CRM Pipeline, Marketing Suite und Client Portal in einer Plattform"
- **Soll:**
  - H1: `"KI-Vertrieb fuer DACH-KMU"`
  - Subhead: `"WhatsApp, Web, CRM und Pipeline in einem System – qualifiziert Ihre Leads automatisch und uebergibt nur die heissen."`
  - Body-Absatz bleibt inhaltlich, wird leicht gekuerzt

### 2.3 Founding-Partner-Banner (NEU)
- **Ist:** nicht existent
- **Soll:** Neue Komponente `FoundingPartnerBanner.tsx`, eingehaengt in `app/layout.tsx` direkt UNTER `<MarketingWidget />` oder im Layout als erstes Kind vor dem Page-Content. Schmaler Streifen, gelber Akzent (#c9a84c), Text: `"Founding-Partner-Phase – Die ersten 10 Pilotkunden erhalten lebenslang 33% Rabatt. Aktuell verfuegbar: 10 Plaetze."`, CTA-Link auf `#founding-partner` (Anchor auf Homepage).
- **Risiko:** Banner sollte auf Dashboard/Admin/Embed-Widget NICHT erscheinen → Path-Gate wie bei `MarketingWidget` via `usePathname` (nur auf `/`, `/pricing`, `/faq`, `/datenschutz`, `/impressum`, `/agb`, `/multi-ai`, `/onboarding`). Muss getestet werden.

### 2.4 Social Proof / Testimonials — `page-v2.tsx:323-357`
- **Ist:** 3 Fake-Karten mit `"+47 Leads/Monat — Immobilienmakler"`, `"3,4x Conversion — Handwerksbetrieb"`, `"-80% Qualifizierungszeit — Business Coach"`. Hart kodiert im JSX als Array mit `metric`/`unit`/`branche`/`desc`.
- **Soll:** Komplett ersetzen durch Founding-Partner-Sektion (Einleitungs-Block an GLEICHER Stelle):
  - Ueberschrift: `"Founding-Partner-Phase – Bauen Sie mit uns auf"`
  - Body wie Prompt vorgibt (Ehrlichkeit + Angebot)
  - CTA: "Founding Partner werden →" mit Anchor-Link zur detaillierten Founding-Partner-Sektion (Aufgabe 3.3) oder mailto-Demo
- **Verifikations-Check:** nach Edit darf `grep "47 Leads|3,4x|3\.4x|Immobilienmakler|Handwerksbetrieb|Business Coach"` in `src/` keine Treffer mehr liefern

### 2.5 Vergleichstabelle — `page-v2.tsx:450-538`
- **Ist:** Ueberschrift "Warum AI Conversion?" + 13-Zeilen-Tabelle "AI Conversion vs. Typische WhatsApp-Bots vs. Automatisierungs-Tools vs. Standard CRM + Bot-Loesungen" + Legende + Asset-Studio-Hinweis
- **Soll:** Komplette Tabelle + Legende entfernen, durch 3 Karten ersetzen:
  - Karte 1: "Eine Plattform statt fuenf"
  - Karte 2: "Ein KI-Verkaeufer, kein Antwort-Bot"
  - Karte 3: "Made in Germany, gehostet in Frankfurt"
- Ueberschrift `"Warum AI Conversion?"` bleibt, Subline angepasst (ohne "Revenue Operating System")

### 2.6 ROI-Rechner — `page-v2.tsx:540-541` (Komponente: Z.45-133)
- **Ist:** Keine Disclaimer-Zeile
- **Soll:** Ueber `<motion.div ...>` in der Komponente (`page-v2.tsx:81-88` Header-Block) neuer Hinweis-Absatz:
  `"Beispielrechnung – noch keine echten Pilot-Daten. Diese Rechnung zeigt theoretische Einsparungen basierend auf branchenueblichen Annahmen. Echte Pilot-Daten werden ab Q3 2026 hier publiziert."`
- **Plan-Daten im RoiCalculator Z.57-61:** `{ name: "Starter", monthly: 497, setup: 697 }` etc. — muessen auf neue Listen-Preise 349/699/1.299 (Setup=0 in Pilotphase) oder auf Founding-Partner-Preise 233/467/869 aktualisiert werden. **OFFENE ENTSCHEIDUNG (siehe offene Fragen unten)**

### 2.7 Branchen-Sektion — `page-v2.tsx:543-572`
- **Ist:** Ueberschrift "Gebaut fuer Ihre Branche". 5 Branchen: Immobilien, Handwerk, Coaching, Agentur, **E-Commerce**
- **Soll:**
  - Ueberschrift: `"Fuer diese Branchen besonders geeignet"`
  - Body-Absatz NEU: `"AI Conversion eignet sich besonders fuer DACH-Unternehmen mit hohem Inbound-Volumen und Bedarf an strukturierter Lead-Qualifizierung."`
  - Karten: Immobilien, Handwerk, Coaching, Agentur, **Bildung & Weiterbildung** (ersetzt E-Commerce)
  - Icon fuer Bildung: `GraduationCap` ist bereits fuer Coaching in Gebrauch — nehme `BookOpen` oder `School`-aequivalent (lucide-react: `School` oder `GraduationCap` fuer Coaching tauschen gegen `Users` und `GraduationCap` fuer Bildung). **Vorschlag: Coaching bekommt `Users`-Icon, Bildung bekommt `GraduationCap`.**

### 2.8 Pricing-Kurz auf Homepage — `page-v2.tsx:601-653`
- **Ist:** 3 Karten mit `{ name, price: 497/1297/2497, setup: 697/1297/1997, features }`, Preisanzeige `price.toLocaleString + "EUR/Monat"`, Setup-Zeile `+ setup.toLocaleString EUR einmalig Setup`
- **Soll:**
  - Disclaimer-Absatz ueber den 3 Karten: `"Founding Partner zahlen lebenslang 33% weniger. Die durchgestrichenen Preise gelten ab Vollverfuegbarkeit. Founding Partner aus der aktuellen Pilotphase erhalten dauerhaft 33% Rabatt auf alle Pakete."`
  - Plan-Daten: `{ name, listPrice, foundingPrice }`:
    - Starter: list 349, founding 233
    - Growth: list 699, founding 467
    - Professional: list 1.299, founding 869
  - Darstellung: Founding-Preis GROSS+FETT als Hauptpreis, daneben Listenpreis durchgestrichen (`<del>` oder `line-through`). `/Monat`-Suffix bleibt.
  - Setup-Zeile: entweder komplett entfernen oder ersetzen durch `"0 EUR Setup in der Pilotphase"`. **Empfehlung:** ersetzen (ehrlicher, verstaerkt Founding-Partner-Angebot).
  - Features bleiben unveraendert.
  - CTA-Text auf Karten: `"Founding Partner werden"` statt `"Jetzt starten"` (einheitlich mit Banner)

### 2.9 Detail-Pricing — `src/app/pricing/PricingClient.tsx`
- **Ist:** `monthlyPrice: 497/1297/2497`, `setupFee: "697"/"1.297"/"1.997"`. Weitere Preis-Darstellung in `PricingClient.tsx:433` (`+ {plan.setupFee}€ einmalige Setup-Fee`).
- **Soll:** Analog zur Homepage:
  - `monthlyPrice` und `yearlyPrice` ersetzen. Interface `Plan` um `listPrice` erweitern (oder `monthlyPrice` = Founding-Preis, neues Feld `listMonthlyPrice`).
  - Ueberall wo Preis angezeigt wird: Founding-Preis gross, Listenpreis durchgestrichen.
  - `setupFee` → `"0"` oder String `"0 (Pilotphase)"`.
  - Disclaimer-Block oben auf der Pricing-Seite mit gleichem Wortlaut wie Homepage.
  - Yearly-Preise proportional: Starter 2.800 (statt 4970), Growth 5.608 (statt 12970), Professional 10.428 (statt 24970). **Muss vom User bestaetigt werden.**
- **Risiko:** Die Seite ist 1129 Zeilen lang und zeigt Preise an mehreren Stellen (Vergleichstabelle, Hero, Plan-Karten, Addons-Block, FAQ-Block). Jede Stelle muss gepflegt werden. **Grep-Verifikation vor Commit Pflicht.**

### 2.10 Founding-Partner-Detail-Sektion (NEU) — nach Pricing-Kurz
- **Soll:** Neue Sektion auf Homepage nach Pricing (vor Final CTA), Id `founding-partner` fuer Anchor. Inhalt wie Prompt spezifiziert (Ueberschrift, Bullet-Liste mit 6 Punkten, Gegenleistung, CTA-Button "Founding-Partner werden – 15-Min-Call buchen →").
- CTA-Link: `mailto:hello@ai-conversion.ai?subject=Founding%20Partner%20werden` oder — **Offene Entscheidung** — separater Calendly-/Cal.com-Slot falls vorhanden.

### 2.11 Footer — `page-v2.tsx:685-696`
- **Soll:** Direkt ueber `{new Date().getFullYear()}...`-Absatz einen kleinen Hinweis:
  `"AI Conversion befindet sich in der Founding-Partner-Phase. Erste Case Studies werden ab Q3 2026 publiziert."`

### 2.12 Final-CTA-Sektion — `page-v2.tsx:656-683`
- **Ist:** "Bereit, Ihren Revenue zu skalieren?" + Buttons "Jetzt starten" / "WhatsApp Kontakt" + Trust-Strip "48h Setup / DSGVO / Monatlich kuendbar"
- **Soll:** Headline angepasst ("Bereit, Founding Partner zu werden?"), "48h Setup" durch "Persoenliches Onboarding" ersetzen (Setup-Fee entfaellt ja). CTA-Text auf "Founding Partner werden".

---

## 3. Risiko-Hinweise

1. **Paddle-Integration:** `src/modules/billing/paddle.ts` + Paddle-Price-Ids (ENV-Vars `PADDLE_PRICE_STARTER_MONTHLY` etc.) werden **nicht** in dieser Session veraendert. Wenn ein Founding-Partner tatsaechlich den Kauf abschliesst, wuerden aktuell die ALTEN Preise gebucht. **Mitigation:** Vor Go-Live mit realem Pilotkunden muss (a) Paddle neue Founding-Partner-Price-Ids bekommen oder (b) manuelle Paddle-Rechnung erstellt werden. Folge-Task. **Vor Commit/Merge mit User absprechen.**

2. **AGB-Setup-Gebuehr:** `src/app/agb/page.tsx:222, 318, 369` verweist auf Setup-Gebuehr. Wenn Pilotphase keine Setup-Fee mehr hat, ist die AGB-Formulierung technisch noch korrekt (optional), aber inkonsistent mit Marketing. Folge-Task.

3. **Dashboard-Inhalte:** "E-Commerce" als Branche bleibt in Dashboard-Campaign-Templates erhalten — das ist ein **Produkt-Feature** fuer Tenants, nicht Marketing. Kein Cleanup hier.

4. **Mobile-Banner:** Founding-Partner-Banner oberhalb der Navigation kann auf Mobile (<400px) Header-Hoehe erhoehen und die `pt-36`-Padding vom Hero ueberlappen. Muss im Browser getestet werden. Ggf. responsive Padding auf `pt-44 sm:pt-40`.

5. **Vergleichstabelle entfernen:** Die Tabelle hatte eine "Warum wir" Narrative. 3 Karten sind kompakter aber muessen inhaltlich genauso schlagkraeftig sein. Kein SEO-Impact erwartet (keine speziellen Keywords darin).

6. **Konsistenz zwischen Homepage-Pricing und Detail-Pricing-Seite:** Muss im Test explizit durch Vergleich beider Seiten verifiziert werden.

7. **ROI-Rechner Plan-Daten:** Amortisierungsberechnung nutzt `monthly + setup`. Wenn Setup = 0 in Pilotphase, wird Amortisierung viel schneller — schoen, aber unrealistisch fuer den durchgestrichenen Listenpreis. Empfehlung: ROI-Rechner nutzt **Founding-Partner-Preise + setup=0**, Disclaimer macht klar dass es theoretisch ist.

8. **lucide-react `School`-Icon:** Muss verfuegbar sein (ist es in aktuellen Versionen). Fallback `GraduationCap` fuer Bildung + `Users` fuer Coaching.

---

## 4. Offene Entscheidungen (VOR Freigabe klaeren)

1. **Founding-Partner-CTA-Ziel:** mailto mit Subject oder echtes Demo-Booking-Widget (Cal.com / Calendly)? Aktuell nur mailto im Repo gefunden.
2. **Yearly-Preise:** Soll das Yearly-Angebot bleiben (Factor 10 = 2 Monate geschenkt) oder in der Founding-Partner-Phase ausschliesslich monatlich? Prompt adressiert nur Monatspreise.
3. **ROI-Rechner:** Founding-Preise (233/467/869) oder Listenpreise (349/699/1299) als Baseline fuer Amortisierungs-Rechnung?
4. **Setup-Fee-Darstellung:** komplett entfernen oder als "0 EUR in Pilotphase" explizit ausweisen?
5. **Banner dismissible:** Soll der Top-Banner ein X zum Schliessen bekommen (LocalStorage-Merker)? Default in Prompt: nicht dismissible. Ich empfehle **nicht dismissible** in Founding-Phase (Pilot-Akquise-Prioritaet).

---

## 5. Freigabe-Checkliste fuer User

- [ ] Offene Entscheidungen 1–5 aus §4 beantwortet
- [ ] Paddle-Preis-Umstellung als separater Folge-Task anerkannt
- [ ] AGB-Setup-Gebuehr-Passage als separater Folge-Task anerkannt
- [ ] Freigabe fuer Aufgabe 2 (kritisch) + Aufgabe 3 (mittel) erteilt

**STOPP.** Keine Code-Aenderungen bis User-Freigabe.
