# Auftragsverarbeitungsvertrag (AVV)
## gemäß Art. 28 DSGVO

**zwischen**

dem Kunden (nachfolgend „Auftraggeber")

**und**

Individual Entrepreneur Philipp Motzer  
District Telavi, 2212 Ruispiri, Georgia
Registration No. 331187816  
(nachfolgend „Auftragnehmer")

---

## 1. Gegenstand und Dauer

Der Auftragnehmer verarbeitet personenbezogene Daten im Auftrag des 
Auftraggebers im Rahmen der Nutzung von AI Conversion – einem 
WhatsApp-basierten Revenue Operating System für DACH-Unternehmen.

Die Laufzeit entspricht der Laufzeit des Hauptvertrags.

---

## 2. Art und Zweck der Verarbeitung

**Art der Daten:**
- Telefonnummern (ausschließlich als SHA-256-Hash gespeichert)
- Gesprächsinhalte (AES-256-GCM verschlüsselt)
- Lead-Qualifikationsdaten (Score, Status, Branche)
- Kontaktdaten (Name, E-Mail, Unternehmen) soweit vom Auftraggeber erfasst

**Kategorien betroffener Personen:**
- Interessenten und Kunden des Auftraggebers

**Zweck der Verarbeitung:**
- Automatisierte Lead-Qualifikation via WhatsApp
- Terminbuchung und CRM-Integration
- Conversion-Optimierung

---

## 3. Pflichten des Auftragnehmers

Der Auftragnehmer verpflichtet sich:

1. Daten ausschließlich auf dokumentierte Weisung des Auftraggebers 
   zu verarbeiten
2. Vertraulichkeit der verarbeiteten Daten zu gewährleisten
3. Alle erforderlichen technischen und organisatorischen Maßnahmen 
   gemäß Art. 32 DSGVO umzusetzen
4. Keine Weitergabe an Dritte ohne Zustimmung des Auftraggebers, 
   außer an genehmigte Unterauftragsverarbeiter (siehe § 5)
5. Den Auftraggeber unverzüglich zu informieren bei 
   Datenschutzverletzungen gemäß Art. 33 DSGVO

---

## 4. Technische und organisatorische Maßnahmen (TOMs)

- **Verschlüsselung:** AES-256-GCM für alle gespeicherten Nachrichten
- **Pseudonymisierung:** SHA-256-Hashing aller Telefonnummern
- **Zugriffskontrolle:** Multi-Tenant-Isolation, rollenbasierte Zugriffsrechte
- **Datensparsamkeit:** Minimale Datenhaltung, konfigurierbare Löschfristen
- **Audit-Logging:** Vollständige Protokollierung aller Datenzugriffe
- **Verschlüsselte Übertragung:** TLS 1.2+ für alle Verbindungen

---

## 5. Unterauftragsverarbeiter

Der Auftraggeber stimmt dem Einsatz folgender Unterauftragsverarbeiter zu:

| Anbieter | Zweck | Sitz |
|----------|-------|------|
| Vercel Inc. | Hosting & Infrastruktur | USA (SCCs) |
| Neon Tech | Datenbankhosting | EU |
| Upstash | Redis Cache / Rate-Limiting | EU |
| Anthropic, PBC | KI-Verarbeitung (Bot-Konversationen, Lead-Qualifizierung) | USA (SCCs) |
| OpenAI | KI-Verarbeitung (Lead-Scoring) | USA (SCCs) |
| Meta (WhatsApp) | Nachrichtenübermittlung | USA (SCCs) |
| Functional Software, Inc. dba Sentry | Error-Monitoring (Server + Browser), Daten-Hosting EU/Frankfurt | USA (SCCs) |

SCCs = EU-Standardvertragsklauseln gemäß Art. 46 DSGVO

### 5.1 Anthropic, PBC — Details

- **Anbieter:** Anthropic, PBC
- **Sitz:** San Francisco, CA, USA
- **Zweck:** Verarbeitung der Bot-Konversationen (Lead-Qualifizierung,
  Antwortgenerierung via Claude-Sprachmodell)
- **Daten:** Chat-Inhalte, System-Prompts, Konversations-Metadaten
- **Rechtsgrundlage Drittlandtransfer:** EU-Standardvertragsklauseln (SCCs)
  gemäß Art. 46 Abs. 2 lit. c DSGVO + Anthropic DPA
  (https://www.anthropic.com/legal/dpa)
- **Aufbewahrung beim Subprozessor:** Zero Data Retention bei API-Nutzung
  gemäß Anthropic-Policy (keine Speicherung über die Request-Dauer hinaus,
  keine Verwendung zum Modell-Training)

---

## 6. Rechte der betroffenen Personen

Der Auftragnehmer unterstützt den Auftraggeber bei der Erfüllung 
folgender Betroffenenrechte:

- Auskunft (Art. 15 DSGVO)
- Berichtigung (Art. 16 DSGVO)
- Löschung (Art. 17 DSGVO) — automatisiert via Cleanup-Cron
- Einschränkung (Art. 18 DSGVO)
- Datenübertragbarkeit (Art. 20 DSGVO) — via /api/dashboard/export

---

## 7. Löschung und Rückgabe

Nach Vertragsende werden alle Daten des Auftraggebers innerhalb von 
30 Tagen unwiderruflich gelöscht. Ein Export ist vorher via 
Dashboard möglich.

---

## 8. Nachweispflichten

Der Auftragnehmer stellt dem Auftraggeber alle erforderlichen 
Informationen zum Nachweis der Einhaltung der Pflichten aus Art. 28 
DSGVO zur Verfügung.

---

## 9. Schlussbestimmungen

Es gilt deutsches Recht. Gerichtsstand ist Tbilisi, Georgia.

*Durch Akzeptieren dieses AVV im Onboarding-Prozess (mit Timestamp 
gespeichert) kommt dieser Vertrag rechtswirksam zustande.*

---

*Letzte Aktualisierung: 15. April 2026*
*Version: 1.2 (Sentry als Subprozessor ergänzt)*
