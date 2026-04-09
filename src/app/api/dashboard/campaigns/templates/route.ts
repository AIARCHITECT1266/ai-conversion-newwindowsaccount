// ============================================================
// Kampagnen-Vorlagen API
// GET: System-Templates + eigene Vorlagen laden
// POST: Eigene Vorlage aus erfolgreicher Kampagne speichern
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { db } from "@/shared/db";

const templateSchema = z.object({
  name: z.string().min(2).max(255),
  branche: z.string().min(1).max(255),
  beschreibung: z.string().max(2048).optional(),
  templateData: z.record(z.string(), z.unknown()).optional(),
});

// System-Templates: Werden beim ersten Aufruf geseeded
const SYSTEM_TEMPLATES = [
  {
    branche: "Immobilien",
    name: "Immobilien – Premium Akquise",
    beschreibung: "Fuer Makler die Eigentuemer-Leads qualifizieren und Besichtigungstermine buchen moechten.",
    briefing: {
      ziel: "Besichtigungstermine mit qualifizierten Eigentuemern vereinbaren",
      zielgruppe: "Immobilieneigentuemer 45-65, DACH-Raum, Bestandsimmobilien, Verkaufsinteresse",
      tonalitaet: "Serioes, vertrauensvoll, diskret – gehobenes Segment",
      ergebnis: "Qualifizierter Lead mit Termin fuer Vor-Ort-Bewertung",
    },
    openers: [
      "Guten Tag! Wir haben festgestellt, dass Immobilien in Ihrer Region aktuell stark nachgefragt werden. Moechten Sie wissen, was Ihre Immobilie heute wert ist? Kostenlos und unverbindlich.",
      "Hallo! Als lokaler Immobilienexperte moechte ich Ihnen eine kostenlose Marktanalyse fuer Ihre Region anbieten. Haben Sie 2 Minuten Zeit?",
      "Guten Tag! Wussten Sie, dass Immobilienpreise in Ihrer Gegend um 12% gestiegen sind? Ich berechne gerne den aktuellen Wert Ihrer Immobilie – kostenfrei.",
    ],
    abVarianten: {
      variantA: "Guten Tag! Wir bieten Ihnen eine kostenlose Immobilienbewertung an. Interesse?",
      variantB: "Hallo! Immobilienpreise steigen – wissen Sie schon was Ihre Immobilie wert ist? Kostenlose Analyse in 24h.",
    },
    ziele: ["Terminbuchung Vor-Ort-Bewertung", "Lead-Qualifizierung (Eigentuemer vs. Mieter)", "Kontaktdaten erfassen"],
  },
  {
    branche: "Handwerk",
    name: "Handwerk – Auftrags-Pipeline",
    beschreibung: "Fuer Handwerksbetriebe die Anfragen automatisch entgegennehmen und Termine koordinieren.",
    briefing: {
      ziel: "Auftragsanfragen qualifizieren und Vor-Ort-Termine vereinbaren",
      zielgruppe: "Hausbesitzer 35-65, Renovierungsbedarf, regional (30km Umkreis)",
      tonalitaet: "Freundlich, kompetent, regional verbunden",
      ergebnis: "Terminierte Auftragsbesichtigung mit konkretem Projektumfang",
    },
    openers: [
      "Hallo! Ihr Handwerksbetrieb aus der Region. Haben Sie ein Projekt, bei dem wir helfen koennen? Wir antworten auch am Wochenende!",
      "Guten Tag! Ob Bad, Kueche oder Fassade – wir sind Ihr Meisterbetrieb vor Ort. Beschreiben Sie kurz Ihr Projekt und wir melden uns innerhalb von 30 Minuten.",
      "Hi! Schnell, fair und zuverlaessig – so arbeiten wir. Erzaehlen Sie uns von Ihrem Vorhaben und erhalten Sie ein kostenloses Angebot.",
    ],
    abVarianten: {
      variantA: "Hallo! Haben Sie ein Renovierungsprojekt? Wir erstellen Ihnen ein kostenloses Festpreisangebot.",
      variantB: "Guten Tag! Meisterbetrieb aus der Region – wir antworten in unter 30 Min. Was koennen wir fuer Sie tun?",
    },
    ziele: ["Vor-Ort-Termin buchen", "Projektumfang erfassen", "Festpreisangebot erstellen"],
  },
  {
    branche: "Coaching",
    name: "Coaching – Kennenlerngespräch",
    beschreibung: "Fuer Coaches die Erstgespraeche vorqualifizieren und nur kaufbereite Interessenten einladen.",
    briefing: {
      ziel: "Kostenlose Kennenlerngespraeche mit vorqualifizierten Interessenten buchen",
      zielgruppe: "Berufstaetige 28-50, Veraenderungswunsch, Karriere oder persoenliches Wachstum",
      tonalitaet: "Empathisch, motivierend, professionell auf Augenhoehe",
      ergebnis: "Gebuchtes 15-Min Kennenlerngespraech mit qualifiziertem Interessenten",
    },
    openers: [
      "Hallo! Schoen, dass Sie sich fuer Coaching interessieren. Was ist aktuell Ihre groesste berufliche Herausforderung? Ich hoere gerne zu.",
      "Willkommen! Der erste Schritt zur Veraenderung ist der wichtigste. Erzaehlen Sie mir kurz: Was moechten Sie in den naechsten 90 Tagen erreichen?",
      "Hi! Viele meiner Klienten standen genau da, wo Sie jetzt stehen. Lassen Sie uns herausfinden, ob mein Coaching-Ansatz zu Ihnen passt. Was beschaeftigt Sie gerade?",
    ],
    abVarianten: {
      variantA: "Hallo! Was ist Ihre groesste berufliche Herausforderung? Ich biete ein kostenloses 15-Min Gespraech an.",
      variantB: "Willkommen! Erzaehlen Sie mir Ihr Ziel fuer die naechsten 90 Tage – und ich sage Ihnen ob ich helfen kann.",
    },
    ziele: ["Kennenlerngespraech buchen", "Veraenderungswunsch qualifizieren", "Budget-Bereitschaft erkennen"],
  },
  {
    branche: "Agentur",
    name: "Agentur – Lead-Qualifizierung",
    beschreibung: "Fuer Agenturen die Marketing-Anfragen bewerten und nur passende Projekte annehmen.",
    briefing: {
      ziel: "Projektanfragen qualifizieren und Strategiegespraeche buchen",
      zielgruppe: "Marketing-Leiter und Geschaeftsfuehrer KMU, 5-50 Mitarbeiter, DACH",
      tonalitaet: "Strategisch, datengetrieben, partnerschaftlich",
      ergebnis: "Gebuchtes 30-Min Strategiegespraech mit Budget-qualifiziertem Lead",
    },
    openers: [
      "Hallo! Sie suchen eine Agentur, die Ergebnisse liefert? Erzaehlen Sie uns kurz Ihre groesste Marketing-Herausforderung und wir zeigen Ihnen 3 Quick-Wins.",
      "Guten Tag! Wir helfen KMUs, mit dem gleichen Budget 40% mehr qualifizierte Leads zu generieren. Klingt das interessant? Welchen Kanal nutzen Sie aktuell?",
      "Hi! Bevor wir ein Angebot erstellen: Was ist Ihr Hauptziel – mehr Leads, bessere Conversion oder staerkere Marke? Damit koennen wir gezielt helfen.",
    ],
    abVarianten: {
      variantA: "Hallo! Was ist Ihre groesste Marketing-Herausforderung? Wir zeigen Ihnen 3 kostenlose Quick-Wins.",
      variantB: "Guten Tag! 40% mehr Leads bei gleichem Budget – wir zeigen Ihnen wie. Was ist Ihr aktueller Hauptkanal?",
    },
    ziele: ["Strategiegespraech buchen", "Budget qualifizieren", "Projektumfang erkennen"],
  },
  {
    branche: "E-Commerce",
    name: "E-Commerce – Umsatz-Booster",
    beschreibung: "Fuer Online-Shops die Kaufberatung via WhatsApp anbieten und Warenkorbabbrecher zurueckholen.",
    briefing: {
      ziel: "Warenkorbabbruch reduzieren und Cross-Selling per WhatsApp erhoehen",
      zielgruppe: "Online-Kaeufer 25-55, bestehende Kunden und Warenkorbabbrecher",
      tonalitaet: "Hilfreich, locker, service-orientiert mit persoenlicher Note",
      ergebnis: "Abgeschlossene Bestellung oder Upsell auf hoeherwertiges Produkt",
    },
    openers: [
      "Hey! Wir haben gesehen, dass Sie noch Artikel im Warenkorb haben. Kann ich Ihnen bei der Auswahl helfen oder haben Sie Fragen zu einem Produkt?",
      "Hallo! Als Dankeschoen fuer Ihr Interesse: Hier ist ein exklusiver 10%-Gutschein fuer Ihre naechste Bestellung. Kann ich Ihnen bei etwas helfen?",
      "Hi! Unsere Bestseller gehen gerade weg wie warme Semmeln. Moechten Sie eine persoenliche Empfehlung basierend auf Ihren Interessen?",
    ],
    abVarianten: {
      variantA: "Hey! Sie haben noch Artikel im Warenkorb – brauchen Sie Hilfe bei der Auswahl?",
      variantB: "Hallo! Exklusiv fuer Sie: 10% Rabatt auf Ihre naechste Bestellung. Interesse?",
    },
    ziele: ["Warenkorbabschluss", "Upselling/Cross-Selling", "Kundenbindung staerken"],
  },
];

// System-Templates seeden (einmalig pro Datenbank)
async function ensureSystemTemplates() {
  const count = await db.campaignTemplate.count({ where: { isSystem: true } });
  if (count > 0) return;

  for (const t of SYSTEM_TEMPLATES) {
    await db.campaignTemplate.create({
      data: {
        tenantId: null,
        branche: t.branche,
        name: t.name,
        beschreibung: t.beschreibung,
        briefing: JSON.stringify(t.briefing),
        openers: JSON.stringify(t.openers),
        abVarianten: JSON.stringify(t.abVarianten),
        ziele: JSON.stringify(t.ziele),
        isSystem: true,
      },
    });
  }
}

export async function GET() {
  const tenant = await getDashboardTenant();
  if (!tenant) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  // System-Templates bei Bedarf seeden
  await ensureSystemTemplates();

  // Alle System-Templates + eigene des Tenants laden
  const templates = await db.campaignTemplate.findMany({
    where: {
      OR: [
        { isSystem: true },
        { tenantId: tenant.id },
      ],
    },
    orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
  });

  // JSON-Felder parsen
  const parsed = templates.map((t) => ({
    ...t,
    briefing: JSON.parse(t.briefing),
    openers: JSON.parse(t.openers),
    abVarianten: t.abVarianten ? JSON.parse(t.abVarianten) : null,
    ziele: JSON.parse(t.ziele),
  }));

  return NextResponse.json({ templates: parsed });
}

// Eigene Vorlage aus Kampagnen-Daten speichern
export async function POST(request: NextRequest) {
  const tenant = await getDashboardTenant();
  if (!tenant) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const result = templateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe", details: result.error.flatten() },
      { status: 400 }
    );
  }
  const { name, branche } = result.data;
  const { beschreibung, briefing, openers, abVarianten, ziele } = body;

  const template = await db.campaignTemplate.create({
    data: {
      tenantId: tenant.id,
      branche: branche.trim(),
      name: name.trim(),
      beschreibung: beschreibung?.trim() || null,
      briefing: JSON.stringify(briefing || {}),
      openers: JSON.stringify(openers || []),
      abVarianten: abVarianten ? JSON.stringify(abVarianten) : null,
      ziele: JSON.stringify(ziele || []),
      isSystem: false,
    },
  });

  return NextResponse.json({ template }, { status: 201 });
}
