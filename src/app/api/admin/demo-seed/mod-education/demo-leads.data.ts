// ============================================================
// MOD Education Demo-Leads — fiktive Personen fuer Sales-Demo
//
// DSGVO: Alle Namen sind fiktiv, E-Mails liegen auf example.com,
// Telefonnummern folgen dem Pattern +49-555-XXX-XXXX (keine echten
// Rufnummern). Die Chat-Historien sind frei erfunden, inhaltlich
// aber plausibel im MOD-Education-Bildungsberatungs-Kontext.
//
// Verteilung:
//   2 A-Leads   (Score 80-95)   — Anna M., Stefan K.
//   2 Borderline A/B (55-75)    — Yasemin D., Thomas R.
//   2 B-Leads   (30-55)         — Birgit H., Marco S.
//   2 C-Leads   (0-30)          — Ahmad K., Jennifer B.
//
// Jeder Lead hat:
// - externalId (Slug) als Idempotenz-Marker: "demo-seed-<name>"
// - vollstaendige Chat-Historie (User & Assistant, 8-14 Messages)
// - score + qualification + pipelineStatus vorgesetzt
// - aiSummary-JSON mit topSignals + einschaetzung (Phase 2)
// - predictiveScore-JSON mit probability + reasoning + nextBestAction
// - createdAtDaysAgo: Staffelung ueber die letzten 14 Tage
// ============================================================

import type {
  LeadQualification,
  PipelineStatus,
} from "../../../../../generated/prisma/enums";

export interface DemoMessage {
  role: "USER" | "ASSISTANT";
  content: string;
  minutesAfterStart: number;
}

export interface DemoAiSummary {
  interesse: string;
  budgetSignal: { erkannt: boolean; betrag: number | null; details: string };
  naechsterSchritt: string;
  zusammenfassung: string;
  kaufbereitschaft: "hoch" | "mittel" | "niedrig";
  einwaende: string[];
  topSignals: string[];
  einschaetzung: string;
}

export interface DemoPrediction {
  probability: number;
  reasoning: string;
  nextBestAction: string;
}

export interface DemoLead {
  slug: string; // "anna-m" etc., fuer externalId-Marker
  displayName: string;
  age: number;
  emailDummy: string;
  phoneDummy: string;
  course: string;
  score: number;
  qualification: LeadQualification;
  pipelineStatus: PipelineStatus;
  createdAtDaysAgo: number;
  messages: DemoMessage[];
  aiSummary: DemoAiSummary;
  prediction: DemoPrediction;
}

// ============================================================
// LEAD 1 — Anna M. (A-Lead, Score 88)
// ============================================================

const ANNA_M: DemoLead = {
  slug: "anna-m",
  displayName: "Anna M.",
  age: 34,
  emailDummy: "anna.m@example.com",
  phoneDummy: "+49-555-101-2345",
  course: "Digital Marketing Manager",
  score: 88,
  qualification: "OPPORTUNITY",
  pipelineStatus: "QUALIFIZIERT",
  createdAtDaysAgo: 2,
  messages: [
    {
      role: "USER",
      content: "Hallo, ich würde gern mehr über die Digital-Marketing-Weiterbildung erfahren.",
      minutesAfterStart: 0,
    },
    {
      role: "ASSISTANT",
      content:
        "Hi, schön dass du da bist! Digital Marketing Manager ist einer unserer gefragtesten Kurse. Erzähl mir kurz — wo stehst du gerade beruflich?",
      minutesAfterStart: 1,
    },
    {
      role: "USER",
      content:
        "Ich bin seit zwei Monaten arbeitslos, vorher war ich 8 Jahre im Event-Management. Die Branche ist nach Corona nie wieder richtig hochgekommen.",
      minutesAfterStart: 3,
    },
    {
      role: "ASSISTANT",
      content:
        "Das ist sicher frustrierend gewesen nach so vielen Jahren in der Branche. Bist du bei der Agentur für Arbeit gemeldet?",
      minutesAfterStart: 4,
    },
    {
      role: "USER",
      content:
        "Ja, seit März. Mein Arbeitsvermittler war auch schon sehr hilfreich — er hat mir den Bildungsgutschein quasi in Aussicht gestellt, wenn ich eine passende Weiterbildung finde.",
      minutesAfterStart: 6,
    },
    {
      role: "ASSISTANT",
      content:
        "Das klingt nach einer guten Ausgangslage. Warum Digital Marketing — ist das eine neue Richtung oder baust du auf Event-Erfahrung auf?",
      minutesAfterStart: 7,
    },
    {
      role: "USER",
      content:
        "Beides eigentlich. Ich habe im Event-Job auch Social-Media-Kampagnen betreut, aber immer nebenbei. Jetzt will ich das professionell können — SEA, Analytics, Performance-Marketing richtig verstehen.",
      minutesAfterStart: 10,
    },
    {
      role: "ASSISTANT",
      content:
        "Das passt sehr gut zum Digital-Marketing-Manager-Profil. Hast du schon einen Startzeitpunkt im Kopf?",
      minutesAfterStart: 11,
    },
    {
      role: "USER",
      content:
        "Mein ALG-1 läuft noch bis Oktober, aber ich will nicht so lange warten. Am liebsten Start im Mai oder Juni. Ist das realistisch?",
      minutesAfterStart: 13,
    },
    {
      role: "ASSISTANT",
      content:
        "Mai/Juni ist absolut machbar — die nächsten Kursstarts liegen genau in diesem Fenster. Eine letzte Frage noch: Gibt es eine Zielrolle, die du nach der Weiterbildung anpeilst?",
      minutesAfterStart: 15,
    },
    {
      role: "USER",
      content:
        "Ich würde gern bei einer Agentur als Performance-Marketing-Managerin einsteigen, oder als Freelancerin für kleinere Unternehmen arbeiten. Beides wäre okay.",
      minutesAfterStart: 18,
    },
    {
      role: "ASSISTANT",
      content:
        "Klares Bild, konkrete Ziele. Danke für das ausführliche Gespräch, Anna. Ich fasse kurz zusammen: 34, Event-Management-Hintergrund, arbeitsvermittler-gemeldet, Gutschein in Aussicht, Wunsch-Start Mai/Juni, Zielrolle Performance-Marketing. Mein Kollege meldet sich in den nächsten zwei Tagen für die Details. Magst du mir deine Handynummer oder E-Mail hinterlassen?",
      minutesAfterStart: 20,
    },
    {
      role: "USER",
      content: "Klar, 0151-555-10123 oder anna.m@example.com. Danke dir!",
      minutesAfterStart: 22,
    },
  ],
  aiSummary: {
    interesse:
      "Quereinstieg in Performance-Marketing nach Event-Management-Karriere, konkrete Kurswahl Digital Marketing Manager",
    budgetSignal: {
      erkannt: true,
      betrag: null,
      details:
        "Arbeitsvermittler hat Bildungsgutschein in Aussicht gestellt, Förderung über § 81 SGB III sehr wahrscheinlich",
    },
    naechsterSchritt:
      "Rückruf innerhalb 48h, Terminvereinbarung für formellen Antrag beim Arbeitsvermittler + Kursstart Mai/Juni konkretisieren",
    zusammenfassung:
      "Hoch qualifizierter A-Lead mit klarem Berufsziel, vorhandener Arbeitsagentur-Anbindung und in Aussicht gestelltem Bildungsgutschein. Konkreter Wunsch-Starttermin Mai/Juni, realistische Zeitplanung, eloquent, stellt selbst Rückfragen.",
    kaufbereitschaft: "hoch",
    einwaende: [],
    topSignals: [
      "Gutschein vom Arbeitsvermittler bereits in Aussicht",
      "Konkrete Kurswahl: Digital Marketing Manager (Mai/Juni)",
      "Klare Zielrolle: Performance-Marketing oder Freelance",
    ],
    einschaetzung:
      "Motivierter Top-Lead mit klarem Ziel und vorhandener Förderperspektive — Rückruf binnen 48h priorisieren, direkte Kursstart-Planung möglich.",
  },
  prediction: {
    probability: 82,
    reasoning:
      "Starke Signale: gemeldeter Status, Gutschein in Aussicht, konkretes Zeitfenster, eloquent-engagierte Kommunikation, klare Zielrolle. Kaum Risiko-Faktoren.",
    nextBestAction:
      "Rückruf innerhalb 48h, konkreten Kursstart fixieren, Unterstützung bei Antragstellung anbieten",
  },
};

// ============================================================
// LEAD 2 — Stefan K. (A-Lead, Score 84)
// ============================================================

const STEFAN_K: DemoLead = {
  slug: "stefan-k",
  displayName: "Stefan K.",
  age: 42,
  emailDummy: "s.kuehn@example.com",
  phoneDummy: "+49-555-202-3456",
  course: "Webdesigner / Mediengestaltung",
  score: 84,
  qualification: "OPPORTUNITY",
  pipelineStatus: "QUALIFIZIERT",
  createdAtDaysAgo: 1,
  messages: [
    {
      role: "USER",
      content:
        "Guten Tag. Ich habe mir auf Ihrer Seite die Kurse Webdesigner und Social Media Manager angesehen. Beide klingen interessant.",
      minutesAfterStart: 0,
    },
    {
      role: "ASSISTANT",
      content:
        "Guten Tag, schön dass Sie sich melden. Beide Kurse haben unterschiedliche Schwerpunkte — was reizt Sie denn an beiden?",
      minutesAfterStart: 2,
    },
    {
      role: "USER",
      content:
        "Ich wurde zum 30. Juni gekündigt — war 15 Jahre bei einer Druckerei in der Satztechnik. Webdesign fühlt sich wie die natürliche Fortsetzung an, Social Media fände ich aber als Kombination reizvoll.",
      minutesAfterStart: 5,
    },
    {
      role: "ASSISTANT",
      content:
        "Die Kombination aus Satz-Erfahrung und Webdesign ist inhaltlich stark — da bauen Sie auf echtem Handwerk auf. Sind Sie schon bei der Arbeitsagentur gemeldet?",
      minutesAfterStart: 6,
    },
    {
      role: "USER",
      content:
        "Noch nicht, aber ich habe bereits ein Gespräch beim Arbeitgeberservice und einen Termin für Mitte Mai beim Arbeitsvermittler. Der Gutschein wäre dort Thema.",
      minutesAfterStart: 9,
    },
    {
      role: "ASSISTANT",
      content:
        "Gut vorbereitet. Was wissen Sie schon über die Kursinhalte — fehlt Ihnen noch etwas Konkretes zur Entscheidung?",
      minutesAfterStart: 10,
    },
    {
      role: "USER",
      content:
        "Mich interessiert der Abschluss: Ist das eine IHK-Zertifizierung, ein Kammer-Zeugnis oder ein internes MOD-Zertifikat? Und wie groß sind die Gruppen?",
      minutesAfterStart: 13,
    },
    {
      role: "ASSISTANT",
      content:
        "Das sind genau die richtigen Fragen. Die Zertifikats-Details klärt mein Kollege im Rückruf — er hat die genauen Kammer-Listen da. Eine letzte inhaltliche Frage noch: Haben Sie eine Präferenz beim Standort, oder wäre Online auch okay für Sie?",
      minutesAfterStart: 15,
    },
    {
      role: "USER",
      content:
        "Präsenz in Essen oder Dortmund wäre ideal, Online als Backup. Ich arbeite besser im Klassenzimmer.",
      minutesAfterStart: 17,
    },
    {
      role: "ASSISTANT",
      content:
        "Essen und Dortmund sind beides MOD-Standorte. Danke für das Gespräch, Stefan. Zusammenfassung: Satztechnik-Hintergrund, Kündigung zum 30.06., Arbeitsvermittler-Termin Mitte Mai, Fokus Webdesign + ggf. Social Media, Standort Essen/Dortmund präferiert. Mein Kollege ruft Sie in den nächsten Werktagen an mit den offenen Antworten. Beste Durchwahl?",
      minutesAfterStart: 19,
    },
    {
      role: "USER",
      content: "0171-555-20234. Vormittags ab 9 Uhr gut erreichbar. Vielen Dank.",
      minutesAfterStart: 21,
    },
  ],
  aiSummary: {
    interesse:
      "Berufliche Neuorientierung von Satztechnik zu Webdesign/Mediengestaltung, optional mit Social Media Manager kombiniert",
    budgetSignal: {
      erkannt: true,
      betrag: null,
      details:
        "Arbeitsvermittler-Termin Mitte Mai geplant, Gutschein wird dort Thema — Förderung plausibel bei AG-Wechsel-Szenario",
    },
    naechsterSchritt:
      "Rückruf Vormittag ab 9 Uhr, Zertifikats-Details klären (IHK/Kammer), Kursstart nach 30.06. vorbereiten",
    zusammenfassung:
      "A-Lead mit 15 Jahren Satztechnik-Erfahrung, Kündigung zum 30.06., präziser und gut informiert. Stellt fundierte Fragen zu Zertifizierung und Standort. Inhaltlicher Fit Webdesign/Mediengestaltung ist stark. Arbeitsvermittler-Termin bereits gesetzt.",
    kaufbereitschaft: "hoch",
    einwaende: [
      "Noch unklar welcher Abschluss/Zertifikat vergeben wird",
      "Präferiert Präsenz, Online nur als Backup",
    ],
    topSignals: [
      "Kündigung zum 30.06. — harter Zeitrahmen",
      "Arbeitsvermittler-Termin Mitte Mai bereits fix",
      "Inhaltlicher Fit durch 15 Jahre Satztechnik-Background",
    ],
    einschaetzung:
      "Präziser A-Lead mit hartem Timing-Anker (30.06.) und fundierten Rückfragen — Zertifikats-Details beim Rückruf vorbereiten, Essen/Dortmund-Standortverfügbarkeit checken.",
  },
  prediction: {
    probability: 78,
    reasoning:
      "Kündigung mit klarem Datum, bereits terminierter Arbeitsvermittler-Kontakt, präzise Fragen signalisieren Entscheidungsreife. Leicht reduziertes Rating wegen offener Zertifikats-Frage.",
    nextBestAction:
      "Vormittag-Rückruf mit vollständigen Zertifikats-Info und Standort-Liste (Essen/Dortmund)",
  },
};

// ============================================================
// LEAD 3 — Yasemin D. (Borderline A/B, Score 68)
// ============================================================

const YASEMIN_D: DemoLead = {
  slug: "yasemin-d",
  displayName: "Yasemin D.",
  age: 28,
  emailDummy: "y.demir@example.com",
  phoneDummy: "+49-555-303-4567",
  course: "Digital Marketing Manager",
  score: 68,
  qualification: "SALES_QUALIFIED",
  pipelineStatus: "NEU",
  createdAtDaysAgo: 3,
  messages: [
    {
      role: "USER",
      content: "Hi! Ich bin seit 6 Monaten arbeitssuchend und überlege mir eine Weiterbildung.",
      minutesAfterStart: 0,
    },
    {
      role: "ASSISTANT",
      content:
        "Hi Yasemin, schön dass du dich meldest. Sechs Monate sind lang — gibt es eine Richtung, die dich besonders interessiert?",
      minutesAfterStart: 2,
    },
    {
      role: "USER",
      content:
        "Ich schwanke zwischen Digital Marketing und HR. Ich habe vorher im Empfang eines Hotels gearbeitet, also beide Richtungen wären möglich.",
      minutesAfterStart: 4,
    },
    {
      role: "ASSISTANT",
      content:
        "Das sind zwei sehr unterschiedliche Pfade — was zieht dich bei Digital Marketing, was bei HR an?",
      minutesAfterStart: 5,
    },
    {
      role: "USER",
      content:
        "Digital Marketing ist spannender, weil viel kreativ und messbar. HR wäre näher an meinen bisherigen Stärken — Menschen gut einschätzen, Gespräche führen. Aber im Hotel hatte ich keine reine HR-Rolle, eher Mischform.",
      minutesAfterStart: 8,
    },
    {
      role: "ASSISTANT",
      content:
        "Dein Bauchgefühl klingt nach Digital Marketing. Bist du bei der Agentur für Arbeit gemeldet, und gab es schon Gespräche über einen Bildungsgutschein?",
      minutesAfterStart: 9,
    },
    {
      role: "USER",
      content:
        "Gemeldet ja, aber mein Arbeitsvermittler wechselt gerade und ich hatte den Neuen noch nicht. Gutschein war beim Alten nicht konkret Thema.",
      minutesAfterStart: 12,
    },
    {
      role: "ASSISTANT",
      content:
        "Das lässt sich beim neuen Vermittler nachholen. Hast du einen Zeitrahmen, wann die Weiterbildung starten könnte?",
      minutesAfterStart: 13,
    },
    {
      role: "USER",
      content:
        "Ich würde gern bald starten, aber ich weiß nicht, ob der Gutschein rechtzeitig kommt. Und ehrlich gesagt bin ich unsicher, ob Digital Marketing oder HR das Richtige ist.",
      minutesAfterStart: 16,
    },
    {
      role: "ASSISTANT",
      content:
        "Beide Punkte kann mein Kollege mit dir besprechen — er hat auch Tipps, wie du bei der Entscheidung Digital Marketing vs. HR weiter kommst, zum Beispiel über Schnuppertermine. Wie erreichen wir dich?",
      minutesAfterStart: 18,
    },
    {
      role: "USER",
      content: "y.demir@example.com oder 0176-555-30345. Danke!",
      minutesAfterStart: 20,
    },
  ],
  aiSummary: {
    interesse:
      "Digital Marketing oder HR nach 6 Monaten Arbeitssuche; Vorerfahrung Hotel-Empfang, beide Richtungen denkbar",
    budgetSignal: {
      erkannt: false,
      betrag: null,
      details:
        "Arbeitsvermittler-Wechsel aktuell, Gutschein bisher nicht konkret besprochen — Förderung offen",
    },
    naechsterSchritt:
      "Rückruf mit Orientierungsgespräch DM vs. HR + Guidance für Gespräch mit neuem Arbeitsvermittler",
    zusammenfassung:
      "Warme Kandidatin mit 6-monatiger Arbeitssuche und klarem Wunsch, aber noch unentschieden zwischen DM und HR. Arbeitsvermittler-Wechsel bremst Gutschein-Prozess. Sprachlich stark, motiviert, aber Entscheidungsfindung offen.",
    kaufbereitschaft: "mittel",
    einwaende: [
      "Unsicher zwischen Digital Marketing und HR",
      "Gutschein-Prozess durch Arbeitsvermittler-Wechsel verzögert",
    ],
    topSignals: [
      "Motivation klar, konkrete Richtung noch offen",
      "Arbeitsvermittler-Wechsel verzögert Gutschein-Klärung",
      "Deutsch-Niveau stark, Hotel-Empfang-Vorerfahrung",
    ],
    einschaetzung:
      "Borderline-Lead mit gutem Potenzial — Entscheidungsgespräch DM vs. HR und Unterstützung beim neuen Arbeitsvermittler sind Hebel, um sie zum A-Lead zu machen.",
  },
  prediction: {
    probability: 55,
    reasoning:
      "Motivation und Eignung vorhanden, aber zwei offene Blocker: Kurs-Entscheidung und Gutschein-Verzögerung durch Arbeitsvermittler-Wechsel. Nicht negativ, nur offen.",
    nextBestAction:
      "Orientierungsgespräch buchen, parallele Info-Mail mit DM- und HR-Kurs-Profilen senden",
  },
};

// ============================================================
// LEAD 4 — Thomas R. (Borderline A/B, Score 58)
// ============================================================

const THOMAS_R: DemoLead = {
  slug: "thomas-r",
  displayName: "Thomas R.",
  age: 51,
  emailDummy: "t.richter@example.com",
  phoneDummy: "+49-555-404-5678",
  course: "KI-Anwendungskompetenz",
  score: 58,
  qualification: "SALES_QUALIFIED",
  pipelineStatus: "NEU",
  createdAtDaysAgo: 5,
  messages: [
    {
      role: "USER",
      content:
        "Guten Tag. Ich informiere mich über Ihre KI-Anwendungskompetenz-Weiterbildung. Ich bin aktuell noch angestellt, aber die Druck-Branche macht mir Sorgen.",
      minutesAfterStart: 0,
    },
    {
      role: "ASSISTANT",
      content:
        "Guten Tag Thomas, danke dass Sie sich proaktiv informieren. Die Druckbranche hat in der Tat viel Umwälzung erlebt. Was genau ist bei Ihnen die Sorge?",
      minutesAfterStart: 3,
    },
    {
      role: "USER",
      content:
        "Meine Firma hat zuletzt zwei Kollegen entlassen, und ich sehe dass alles in Richtung Automatisierung und KI geht. Ich will vorbereitet sein, falls mich es auch erwischt — oder besser noch, rechtzeitig wechseln.",
      minutesAfterStart: 6,
    },
    {
      role: "ASSISTANT",
      content:
        "Sehr vorausschauender Ansatz. Haben Sie schon eine Idee, in welche Richtung Sie sich entwickeln möchten, oder ist das Thema KI der Ausgangspunkt?",
      minutesAfterStart: 7,
    },
    {
      role: "USER",
      content:
        "KI ist der Ausgangspunkt. Ich stelle mir vor, dass ich als erfahrene Print-Kraft mit KI-Kompetenz in einer Druckerei interner Digitalisierungstreiber sein könnte — oder in einer Agentur als Brückenkopf zwischen alt und neu.",
      minutesAfterStart: 11,
    },
    {
      role: "ASSISTANT",
      content:
        "Das ist ein spannendes Profil, genau das was Unternehmen aktuell suchen. Wissen Sie schon, wie lange Sie zeitlich planen möchten?",
      minutesAfterStart: 12,
    },
    {
      role: "USER",
      content:
        "Nicht sofort — erst mal brauche ich einen Überblick. Ich denke in 6 bis 12 Monaten wäre realistisch. Ich will nicht überstürzen, solange die Stelle noch läuft.",
      minutesAfterStart: 15,
    },
    {
      role: "ASSISTANT",
      content:
        "Sinnvoll. Da der Bildungsgutschein typischerweise erst bei arbeitssuchend oder Kündigungsvermeidung greift, wäre bei Ihnen der Weg über das Qualifizierungschancengesetz interessant — das läuft über den Arbeitgeber. Hat Ihr Unternehmen sowas schon mal genutzt?",
      minutesAfterStart: 16,
    },
    {
      role: "USER",
      content:
        "Nein, das habe ich noch nie gehört. Klingt aber interessant. Wie läuft das genau?",
      minutesAfterStart: 19,
    },
    {
      role: "ASSISTANT",
      content:
        "Die Details erklärt Ihnen mein Kollege im Gespräch — inklusive wie Sie das Thema bei Ihrem Arbeitgeber ansprechen. Erreichen wir Sie über E-Mail oder Telefon?",
      minutesAfterStart: 21,
    },
    {
      role: "USER",
      content: "E-Mail am besten: t.richter@example.com, abends 0171-555-40456 wenn dringend.",
      minutesAfterStart: 23,
    },
  ],
  aiSummary: {
    interesse:
      "KI-Anwendungskompetenz als proaktive Absicherung gegen Druckbranchen-Umbruch; Brückenfunktion Print → Digital",
    budgetSignal: {
      erkannt: false,
      betrag: null,
      details:
        "Noch angestellt, kein Bildungsgutschein möglich — Qualifizierungschancengesetz über Arbeitgeber wäre Alternative",
    },
    naechsterSchritt:
      "Info-E-Mail mit Qualifizierungschancengesetz-Erklärung, dann Rückruf mit Gesprächsleitfaden für AG-Gespräch",
    zusammenfassung:
      "Angestellter Print-Profi (51) informiert sich proaktiv über KI-Weiterbildung als Absicherung. Zeitrahmen 6–12 Monate, Förderweg unklar — Qualifizierungschancengesetz wurde als Option eingeführt, aber nie gehört.",
    kaufbereitschaft: "mittel",
    einwaende: [
      "Zeitrahmen 6–12 Monate ist lang",
      "Kennt Qualifizierungschancengesetz noch nicht",
    ],
    topSignals: [
      "Proaktive Weiterbildungs-Motivation (noch angestellt)",
      "KI-Kompetenz + Print-Erfahrung als klare Positionierung",
      "Förderweg unklar — Arbeitgeber noch nicht informiert",
    ],
    einschaetzung:
      "Mittel-warmer Lead mit langfristigem Zeitrahmen — Pflege-Lead für Nurture-Sequenz, Qualifizierungschancengesetz als Ansatzpunkt für nächsten Gesprächszyklus.",
  },
  prediction: {
    probability: 42,
    reasoning:
      "Starke Motivation, aber langer Zeitrahmen und unklarer Förderweg reduzieren Abschlusswahrscheinlichkeit im 3-Monats-Fenster. Bleibt als Nurture-Kandidat relevant.",
    nextBestAction:
      "Info-Package Qualifizierungschancengesetz + Follow-Up in 4-6 Wochen",
  },
};

// ============================================================
// LEAD 5 — Birgit H. (B-Lead, Score 44)
// ============================================================

const BIRGIT_H: DemoLead = {
  slug: "birgit-h",
  displayName: "Birgit H.",
  age: 38,
  emailDummy: "b.hoffmann@example.com",
  phoneDummy: "+49-555-505-6789",
  course: "Kaufmännische Berufe",
  score: 44,
  qualification: "MARKETING_QUALIFIED",
  pipelineStatus: "NEU",
  createdAtDaysAgo: 7,
  messages: [
    {
      role: "USER",
      content: "Hallo, ich bin arbeitslos und würde gerne eine Weiterbildung machen.",
      minutesAfterStart: 0,
    },
    {
      role: "ASSISTANT",
      content:
        "Hallo, schön dass du dich meldest. Gibt es eine Richtung, die dich interessiert?",
      minutesAfterStart: 2,
    },
    {
      role: "USER",
      content: "Ich dachte so an irgendwas Digitales. Aber ich bin da echt unsicher.",
      minutesAfterStart: 4,
    },
    {
      role: "ASSISTANT",
      content:
        "Digitale Kurse sind breit gestreut. Was ist dein beruflicher Hintergrund — damit wir gucken, was anschlussfähig ist?",
      minutesAfterStart: 5,
    },
    {
      role: "USER",
      content:
        "Ich war lange im Büro, kaufmännische Sachbearbeitung. Aber nach der Elternzeit wollte ich was Neues machen und jetzt bin ich seit 4 Monaten raus.",
      minutesAfterStart: 8,
    },
    {
      role: "ASSISTANT",
      content:
        "Verstehe. Für kaufmännische Vorerfahrung sind kaufmännische Modernisierungs-Kurse interessant — oder aber der direkte Sprung ins Digitale. Bist du bei der Arbeitsagentur gemeldet?",
      minutesAfterStart: 10,
    },
    {
      role: "USER",
      content: "Ja schon. Aber der Gutschein war noch nicht wirklich Thema.",
      minutesAfterStart: 12,
    },
    {
      role: "ASSISTANT",
      content: "Hattest du schon ein Gespräch mit deinem Arbeitsvermittler?",
      minutesAfterStart: 13,
    },
    {
      role: "USER",
      content: "Einmal kurz, ging aber nur um Lebenslauf. Weiterbildung hat er nicht erwähnt.",
      minutesAfterStart: 15,
    },
    {
      role: "ASSISTANT",
      content:
        "Dann wäre das ein erster Schritt — das Thema beim nächsten Termin aktiv ansprechen. Mein Kollege kann dir im Rückruf einen kleinen Leitfaden dafür geben. Wie erreichen wir dich?",
      minutesAfterStart: 17,
    },
    {
      role: "USER",
      content: "b.hoffmann@example.com. Danke.",
      minutesAfterStart: 19,
    },
  ],
  aiSummary: {
    interesse:
      "Unklarer Weiterbildungswunsch Richtung digital; kaufmännischer Büro-Hintergrund, nach Elternzeit noch orientierend",
    budgetSignal: {
      erkannt: false,
      betrag: null,
      details:
        "Gemeldet, aber Arbeitsvermittler hat Weiterbildung noch nicht thematisiert — Gutschein-Perspektive offen",
    },
    naechsterSchritt:
      "Rückruf mit Kurs-Orientierungs-Mail (kaufmännisch modernisiert vs. Digital Marketing) + Gesprächsleitfaden für AV-Termin",
    zusammenfassung:
      "Unentschlossene Kandidatin, 4 Monate arbeitslos nach Elternzeit, mit kaufmännischer Vorerfahrung. Richtung 'irgendwas Digitales' ist vage — braucht Orientierung. Arbeitsvermittler-Weiterbildungs-Thema ungenutzt.",
    kaufbereitschaft: "niedrig",
    einwaende: ["Unklare Kurs-Vorstellung ('irgendwas Digitales')"],
    topSignals: [
      "Kaufmännische Vorerfahrung als Anschlusspunkt",
      "Unklare Kurs-Richtung, Entscheidungs-Guidance nötig",
      "Arbeitsvermittler-Weiterbildungs-Thema ungenutzt",
    ],
    einschaetzung:
      "B-Lead mit echter Motivation, aber niedriger Klarheit — Nurture mit Kurs-Orientierungs-Material und AV-Gesprächs-Leitfaden, Re-Kontakt in 2-3 Wochen.",
  },
  prediction: {
    probability: 28,
    reasoning:
      "Motivation vorhanden, aber Kurs-Unklarheit + ungenutzter AV-Kanal reduzieren Abschluss-Chance. Nurture-Potenzial mittel.",
    nextBestAction:
      "Orientierungs-Mail mit 3 Kurs-Optionen + AV-Leitfaden, Re-Kontakt in 3 Wochen",
  },
};

// ============================================================
// LEAD 6 — Marco S. (B-Lead, Score 36)
// ============================================================

const MARCO_S: DemoLead = {
  slug: "marco-s",
  displayName: "Marco S.",
  age: 29,
  emailDummy: "marco.s@example.com",
  phoneDummy: "+49-555-606-7890",
  course: "KI-Anwendungskompetenz",
  score: 36,
  qualification: "MARKETING_QUALIFIED",
  pipelineStatus: "NEU",
  createdAtDaysAgo: 9,
  messages: [
    {
      role: "USER",
      content:
        "Hi, ich überlege einen Quereinstieg. Will was mit Daten machen, Richtung Data oder KI.",
      minutesAfterStart: 0,
    },
    {
      role: "ASSISTANT",
      content:
        "Hi Marco, Quereinstieg in Daten ist populär. Was machst du aktuell beruflich?",
      minutesAfterStart: 2,
    },
    {
      role: "USER",
      content:
        "Angestellt als Lagerkoordinator, aber unzufrieden. Ich mache viel mit Excel und will in eine analytischere Richtung.",
      minutesAfterStart: 4,
    },
    {
      role: "ASSISTANT",
      content:
        "Von Excel in Richtung Daten/KI ist ein ziemlicher Sprung — aber machbar. Hast du schon konkret geschaut, welche Kurse du gut finden würdest?",
      minutesAfterStart: 6,
    },
    {
      role: "USER",
      content: "Eigentlich nicht. Ich dachte an Data Analyst oder sowas, aber konkret noch nichts.",
      minutesAfterStart: 9,
    },
    {
      role: "ASSISTANT",
      content:
        "Bei MOD haben wir KI-Anwendungskompetenz — das könnte ein guter Einstieg sein. Bist du bei der Arbeitsagentur gemeldet?",
      minutesAfterStart: 10,
    },
    {
      role: "USER",
      content: "Nein, ich bin ja noch angestellt. Ich wollte erst gucken was überhaupt möglich ist.",
      minutesAfterStart: 12,
    },
    {
      role: "ASSISTANT",
      content:
        "Verstehe — da läuft der Förderweg dann über das Qualifizierungschancengesetz, wenn der Arbeitgeber mitzieht. Oder du kündigst selbst und gehst über den Gutschein. Hast du darüber schon nachgedacht?",
      minutesAfterStart: 14,
    },
    {
      role: "USER",
      content: "Nee, so konkret bin ich noch nicht. Ist noch alles im Wolkigen.",
      minutesAfterStart: 16,
    },
    {
      role: "ASSISTANT",
      content:
        "Dann würde ich vorschlagen: Mein Kollege schickt dir eine Übersicht über unsere KI- und Daten-Kurse und die Finanzierungswege. Dann kannst du dir in Ruhe angucken, was passt. E-Mail?",
      minutesAfterStart: 18,
    },
    {
      role: "USER",
      content: "marco.s@example.com, passt.",
      minutesAfterStart: 20,
    },
  ],
  aiSummary: {
    interesse:
      "Quereinstieg von Lagerkoordination in Daten/KI-Richtung, konkret aber noch nicht entschieden",
    budgetSignal: {
      erkannt: false,
      betrag: null,
      details:
        "Noch angestellt, nicht gemeldet — beide Förderwege (Selbstkündigung/Gutschein oder QCG über AG) sind denkbar, aber nicht angestoßen",
    },
    naechsterSchritt:
      "Info-E-Mail mit Kurs-Übersicht + Finanzierungs-Optionen; Re-Engagement nach 2-3 Wochen",
    zusammenfassung:
      "Noch-angestellter Lagerkoordinator mit Quereinstiegs-Interesse, aber wenig konkret. Keine Bindung an Förderweg. Exploratives Stadium, Entscheidungsreife niedrig.",
    kaufbereitschaft: "niedrig",
    einwaende: [
      "Keine konkrete Kurs-Idee, zu generisch",
      "Keine Entscheidungsreife ('noch im Wolkigen')",
    ],
    topSignals: [
      "Excel-Erfahrung, Motivation analytischer zu arbeiten",
      "Keine Meldung, Förderweg vollkommen offen",
      "Entscheidungsreife niedrig, exploratives Stadium",
    ],
    einschaetzung:
      "Früher B-Lead mit Awareness-Stadium — nicht pushen, Nurture-Mails über KI-Kurs und Finanzierung, Geduld.",
  },
  prediction: {
    probability: 18,
    reasoning:
      "Exploratives Stadium ohne konkrete Kurs- oder Förderwahl, noch angestellt ohne Agentur-Kontakt. Abschluss-Fenster 3 Monate ist unrealistisch.",
    nextBestAction:
      "Nurture-Sequenz starten: Kurs-Übersicht + QCG-Erklärer, Re-Kontakt nach 4 Wochen",
  },
};

// ============================================================
// LEAD 7 — Ahmad K. (C-Lead, Score 22)
// ============================================================

const AHMAD_K: DemoLead = {
  slug: "ahmad-k",
  displayName: "Ahmad K.",
  age: 45,
  emailDummy: "ahmad.k@example.com",
  phoneDummy: "+49-555-707-8901",
  course: "Kaufmännische Berufe",
  score: 22,
  qualification: "UNQUALIFIED",
  pipelineStatus: "NEU",
  createdAtDaysAgo: 11,
  messages: [
    {
      role: "USER",
      content: "hallo ich suche arbeit und will lernen bitte",
      minutesAfterStart: 0,
    },
    {
      role: "ASSISTANT",
      content:
        "Hallo Ahmad, schön dass du schreibst. Bei welchem Thema kann ich dir helfen?",
      minutesAfterStart: 2,
    },
    {
      role: "USER",
      content: "ich will job finden und kurs lernen. welche kurs ist gut?",
      minutesAfterStart: 5,
    },
    {
      role: "ASSISTANT",
      content:
        "Welche Arbeit hast du vorher gemacht? Das hilft mir, einen passenden Kurs vorzuschlagen.",
      minutesAfterStart: 6,
    },
    {
      role: "USER",
      content: "ich war taxi fahrer viele jahre. aber jetzt keine arbeit 8 monate.",
      minutesAfterStart: 9,
    },
    {
      role: "ASSISTANT",
      content:
        "Verstehe. Bist du bei der Arbeitsagentur gemeldet?",
      minutesAfterStart: 10,
    },
    {
      role: "USER",
      content: "ja gemeldet. arbeitsvermittler sagt ich muss deutsch besser machen. ich will aber auch kurs machen.",
      minutesAfterStart: 13,
    },
    {
      role: "ASSISTANT",
      content:
        "Das ist wichtig, dass dein Arbeitsvermittler das anspricht. Unsere Kurse sind auf Deutsch und setzen ein bestimmtes Sprachniveau voraus. Es könnte sein, dass zuerst ein Sprachkurs sinnvoll ist — das entscheidet dein Arbeitsvermittler. Soll ich meinem Kollegen deine Anfrage weiterleiten?",
      minutesAfterStart: 15,
    },
    {
      role: "USER",
      content: "ja bitte. ich will arbeiten schnell.",
      minutesAfterStart: 17,
    },
    {
      role: "ASSISTANT",
      content:
        "Danke, ich leite das weiter. Mein Kollege wird dir auch sagen können, welche Vorbereitung Sinn macht. Wie erreichen wir dich?",
      minutesAfterStart: 19,
    },
    {
      role: "USER",
      content: "telefon 0176-555-70789 bitte.",
      minutesAfterStart: 20,
    },
  ],
  aiSummary: {
    interesse:
      "Arbeitsuchende Weiterbildungsabsicht, Vorerfahrung Taxi-Fahrer; Motivation hoch, aber sprachliche Barrieren",
    budgetSignal: {
      erkannt: false,
      betrag: null,
      details:
        "Gemeldet, Arbeitsvermittler hat Deutschkurs als Voraussetzung thematisiert — MOD-Kurse setzen höheres Sprachniveau voraus",
    },
    naechsterSchritt:
      "Rückruf mit Empfehlung: zuerst Sprachkurs über Arbeitsagentur, dann MOD-Weiterbildung in zweiter Phase",
    zusammenfassung:
      "Hochmotivierter Kandidat mit Taxi-Vorerfahrung, seit 8 Monaten arbeitslos. Arbeitsvermittler hat bereits Sprachkurs-Bedarf identifiziert. MOD-Kurse aktuell noch zu sprachlich anspruchsvoll — empathischer Rückruf, Roadmap über Sprachkurs zuerst.",
    kaufbereitschaft: "niedrig",
    einwaende: [
      "Sprachniveau Deutsch aktuell nicht ausreichend für MOD-Fachkurse",
      "Arbeitsvermittler hat Sprachkurs priorisiert",
    ],
    topSignals: [
      "Hohe Motivation, konkrete Dringlichkeit ('schnell arbeiten')",
      "Sprachliche Barrieren bei allen MOD-Kursen relevant",
      "Arbeitsvermittler hat bereits Roadmap vorgegeben",
    ],
    einschaetzung:
      "C-Lead durch Sprachniveau, nicht durch fehlende Motivation — empathisch priorisieren, ADW-Sprachkurs empfehlen, in 6-12 Monaten Re-Kontakt sinnvoll.",
  },
  prediction: {
    probability: 8,
    reasoning:
      "Sprachniveau ist harter Blocker für alle aktuellen MOD-Kurse. Motivation hoch, aber 3-Monats-Abschluss unrealistisch — Sprachvorbereitung benötigt Monate.",
    nextBestAction:
      "Empathischer Kurz-Rückruf, Sprachkurs-Empfehlung, Re-Kontakt in 6-9 Monaten nach B2-Niveau-Erreichen",
  },
};

// ============================================================
// LEAD 8 — Jennifer B. (C-Lead, Score 12)
// ============================================================

const JENNIFER_B: DemoLead = {
  slug: "jennifer-b",
  displayName: "Jennifer B.",
  age: 32,
  emailDummy: "j.baum@example.com",
  phoneDummy: "+49-555-808-9012",
  course: "Social Media Manager",
  score: 12,
  qualification: "UNQUALIFIED",
  pipelineStatus: "NEU",
  createdAtDaysAgo: 13,
  messages: [
    {
      role: "USER",
      content: "hi",
      minutesAfterStart: 0,
    },
    {
      role: "ASSISTANT",
      content:
        "Hi, schön dass du da bist. Erzähl mir kurz, was dich zu uns führt.",
      minutesAfterStart: 1,
    },
    {
      role: "USER",
      content: "mal schauen was es so gibt",
      minutesAfterStart: 4,
    },
    {
      role: "ASSISTANT",
      content:
        "Klar, gerne. Gibt es einen Bereich, der dich besonders interessiert — Digital Marketing, HR, kaufmännisch, KI?",
      minutesAfterStart: 5,
    },
    {
      role: "USER",
      content: "weiß nicht",
      minutesAfterStart: 10,
    },
    {
      role: "ASSISTANT",
      content:
        "Wie sieht dein beruflicher Hintergrund aus?",
      minutesAfterStart: 11,
    },
    {
      role: "USER",
      content: "dies und das",
      minutesAfterStart: 18,
    },
    {
      role: "ASSISTANT",
      content:
        "Alles klar. Wenn du magst, schick ich dir per Mail eine Übersicht unserer Kurse zum In-Ruhe-Anschauen. Passt eine E-Mail-Adresse?",
      minutesAfterStart: 19,
    },
    {
      role: "USER",
      content: "j.baum@example.com",
      minutesAfterStart: 25,
    },
  ],
  aiSummary: {
    interesse:
      "Keine konkrete Motivation erkennbar; exploratives 'mal schauen'-Verhalten",
    budgetSignal: {
      erkannt: false,
      betrag: null,
      details: "Kein Budget-Signal, keine Agentur-Klärung, kein Bildungsgutschein-Bezug",
    },
    naechsterSchritt:
      "Nurture-Mail mit Kurs-Übersicht + Newsletter-Opt-in; kein proaktiver Rückruf",
    zusammenfassung:
      "Sehr unengagiertes Gespräch mit Ein-Wort-Antworten, keine konkrete Zielrichtung, kein beruflicher Kontext preisgegeben. Typisches 'Umschauen'-Verhalten ohne Entscheidungs-Substanz.",
    kaufbereitschaft: "niedrig",
    einwaende: [
      "Keine konkrete Kursidee",
      "Keine Rückfragen, Ein-Wort-Antworten",
      "Kein Zeitrahmen, keine Motivation",
    ],
    topSignals: [
      "Ein-Wort-Antworten, keine Rückfragen",
      "Kein Zeitrahmen, keine Kurs-Vorstellung",
      "Kein Agentur-Bezug erwähnt",
    ],
    einschaetzung:
      "Typischer Awareness-Visit ohne Entscheidungsreife — kein proaktiver Call, nur Newsletter/Info-Mail; re-engagen wenn eine Nurture-Mail gelesen wird.",
  },
  prediction: {
    probability: 4,
    reasoning:
      "Keine Qualifizierungs-Signale, Ein-Wort-Kommunikation, keine konkrete Zielrichtung. Typischer Top-of-Funnel-Besuch ohne Kaufabsicht.",
    nextBestAction:
      "Nur Nurture-Content, kein Rückruf. Automatische Sequenz über 3-4 Monate.",
  },
};

// ============================================================
// Export: alle 8 Demo-Leads
// ============================================================

export const MOD_DEMO_LEADS: DemoLead[] = [
  ANNA_M,
  STEFAN_K,
  YASEMIN_D,
  THOMAS_R,
  BIRGIT_H,
  MARCO_S,
  AHMAD_K,
  JENNIFER_B,
];
