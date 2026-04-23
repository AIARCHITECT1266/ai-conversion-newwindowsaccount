// ============================================================
// Tests: Scoring-Per-Tenant (ADR scoring-per-tenant, 23.04.2026)
//
// Deckt ab:
// - ScoringResponseSchema: valide/invalide GPT-Responses
// - loadScoringPrompt: Tenant-Override vs. Default
// - loadQualificationLabels: Tenant-Override, Teil-Override, Fallback
// - QualificationLabelsSchema: strikte Key-Validierung
// ============================================================

import { describe, it, expect } from "vitest";
import {
  ScoringResponseSchema,
  QualificationLabelsSchema,
  loadScoringPrompt,
  loadQualificationLabels,
  DEFAULT_SCORING_PROMPT,
  DEFAULT_QUALIFICATION_LABELS,
} from "../src/modules/bot/scoring";

describe("ScoringResponseSchema", () => {
  it("akzeptiert gueltige Response mit 2-4 Signals", () => {
    const valid = {
      score: 72,
      qualification: "SALES_QUALIFIED",
      signals: [
        "Arbeitssuchend gemeldet seit Februar",
        "Konkreter Kurswunsch: Digital Marketing",
      ],
    };
    expect(ScoringResponseSchema.safeParse(valid).success).toBe(true);
  });

  it("akzeptiert Score am Min- und Max-Rand", () => {
    const min = ScoringResponseSchema.safeParse({
      score: 0,
      qualification: "UNQUALIFIED",
      signals: ["Keine Foerderaussicht"],
    });
    const max = ScoringResponseSchema.safeParse({
      score: 100,
      qualification: "CUSTOMER",
      signals: ["Vertrag unterschrieben"],
    });
    expect(min.success).toBe(true);
    expect(max.success).toBe(true);
  });

  it("lehnt Score ausserhalb 0-100 ab", () => {
    expect(
      ScoringResponseSchema.safeParse({
        score: 150,
        qualification: "CUSTOMER",
        signals: ["x"],
      }).success
    ).toBe(false);
    expect(
      ScoringResponseSchema.safeParse({
        score: -5,
        qualification: "UNQUALIFIED",
        signals: ["x"],
      }).success
    ).toBe(false);
  });

  it("lehnt ungueltige Qualification ab", () => {
    const result = ScoringResponseSchema.safeParse({
      score: 50,
      qualification: "MQL", // Legacy-Key, existiert im Enum nicht
      signals: ["x"],
    });
    expect(result.success).toBe(false);
  });

  it("lehnt leeres Signals-Array ab", () => {
    const result = ScoringResponseSchema.safeParse({
      score: 50,
      qualification: "MARKETING_QUALIFIED",
      signals: [],
    });
    expect(result.success).toBe(false);
  });

  it("lehnt >6 Signals ab (Token-Explosion-Schutz)", () => {
    const result = ScoringResponseSchema.safeParse({
      score: 50,
      qualification: "MARKETING_QUALIFIED",
      signals: ["a", "b", "c", "d", "e", "f", "g"],
    });
    expect(result.success).toBe(false);
  });

  it("lehnt leere Signal-Strings ab", () => {
    const result = ScoringResponseSchema.safeParse({
      score: 50,
      qualification: "MARKETING_QUALIFIED",
      signals: [""],
    });
    expect(result.success).toBe(false);
  });
});

describe("loadScoringPrompt", () => {
  it("gibt Tenant-Prompt zurueck wenn gesetzt", () => {
    const result = loadScoringPrompt({ scoringPrompt: "MOD-B2C-Spezial-Prompt" });
    expect(result).toBe("MOD-B2C-Spezial-Prompt");
  });

  it("faellt auf DEFAULT_SCORING_PROMPT zurueck wenn null", () => {
    const result = loadScoringPrompt({ scoringPrompt: null });
    expect(result).toBe(DEFAULT_SCORING_PROMPT);
  });

  it("faellt auf DEFAULT zurueck wenn undefined", () => {
    const result = loadScoringPrompt({ scoringPrompt: undefined });
    expect(result).toBe(DEFAULT_SCORING_PROMPT);
  });

  it("faellt auf DEFAULT zurueck wenn leer / whitespace", () => {
    expect(loadScoringPrompt({ scoringPrompt: "" })).toBe(DEFAULT_SCORING_PROMPT);
    expect(loadScoringPrompt({ scoringPrompt: "   " })).toBe(DEFAULT_SCORING_PROMPT);
  });
});

describe("loadQualificationLabels", () => {
  it("gibt Defaults zurueck wenn Feld null", () => {
    const result = loadQualificationLabels({ qualificationLabels: null });
    expect(result).toEqual(DEFAULT_QUALIFICATION_LABELS);
  });

  it("gibt Defaults zurueck wenn Feld undefined", () => {
    const result = loadQualificationLabels({ qualificationLabels: undefined });
    expect(result).toEqual(DEFAULT_QUALIFICATION_LABELS);
  });

  it("verwendet Tenant-Override wenn vollstaendig", () => {
    const override = {
      UNQUALIFIED: "Nicht foerderfaehig",
      MARKETING_QUALIFIED: "Grundinteresse",
      SALES_QUALIFIED: "Gutschein-Aussicht",
      OPPORTUNITY: "Vermittler-Kontakt",
      CUSTOMER: "Kursanmeldung",
    };
    const result = loadQualificationLabels({ qualificationLabels: override });
    expect(result).toEqual(override);
  });

  it("merged Teil-Override mit Defaults (fehlende Keys via Default)", () => {
    const partial = {
      UNQUALIFIED: "Nicht foerderfaehig",
      CUSTOMER: "Kursanmeldung",
    };
    const result = loadQualificationLabels({ qualificationLabels: partial });
    expect(result.UNQUALIFIED).toBe("Nicht foerderfaehig");
    expect(result.CUSTOMER).toBe("Kursanmeldung");
    // fehlende Keys: Default
    expect(result.MARKETING_QUALIFIED).toBe(DEFAULT_QUALIFICATION_LABELS.MARKETING_QUALIFIED);
    expect(result.SALES_QUALIFIED).toBe(DEFAULT_QUALIFICATION_LABELS.SALES_QUALIFIED);
    expect(result.OPPORTUNITY).toBe(DEFAULT_QUALIFICATION_LABELS.OPPORTUNITY);
  });

  it("ignoriert leere Strings und nutzt Default", () => {
    const malformed = {
      UNQUALIFIED: "",
      MARKETING_QUALIFIED: "   ",
      SALES_QUALIFIED: "SQL-Custom",
      OPPORTUNITY: "Opp",
      CUSTOMER: "Won",
    };
    const result = loadQualificationLabels({ qualificationLabels: malformed });
    expect(result.UNQUALIFIED).toBe(DEFAULT_QUALIFICATION_LABELS.UNQUALIFIED);
    expect(result.MARKETING_QUALIFIED).toBe(DEFAULT_QUALIFICATION_LABELS.MARKETING_QUALIFIED);
    expect(result.SALES_QUALIFIED).toBe("SQL-Custom");
  });

  it("ignoriert non-string-Werte und nutzt Default", () => {
    const weird = {
      UNQUALIFIED: 123,
      MARKETING_QUALIFIED: null,
      SALES_QUALIFIED: "OK",
      OPPORTUNITY: { nested: "no" },
      CUSTOMER: true,
    };
    const result = loadQualificationLabels({
      qualificationLabels: weird as unknown as Record<string, unknown>,
    });
    expect(result.UNQUALIFIED).toBe(DEFAULT_QUALIFICATION_LABELS.UNQUALIFIED);
    expect(result.SALES_QUALIFIED).toBe("OK");
    expect(result.OPPORTUNITY).toBe(DEFAULT_QUALIFICATION_LABELS.OPPORTUNITY);
  });
});

describe("QualificationLabelsSchema (Dashboard-Save)", () => {
  const valid = {
    UNQUALIFIED: "Nicht foerderfaehig",
    MARKETING_QUALIFIED: "Grundinteresse",
    SALES_QUALIFIED: "Gutschein-Aussicht",
    OPPORTUNITY: "Vermittler-Kontakt",
    CUSTOMER: "Kursanmeldung",
  };

  it("akzeptiert vollstaendige 5-Key-Struktur", () => {
    expect(QualificationLabelsSchema.safeParse(valid).success).toBe(true);
  });

  it("lehnt fehlende Keys ab", () => {
    const incomplete = { ...valid } as Record<string, unknown>;
    delete incomplete.CUSTOMER;
    expect(QualificationLabelsSchema.safeParse(incomplete).success).toBe(false);
  });

  it("lehnt leere Label-Strings ab", () => {
    const empty = { ...valid, UNQUALIFIED: "" };
    expect(QualificationLabelsSchema.safeParse(empty).success).toBe(false);
  });

  it("lehnt Label > 50 Zeichen ab", () => {
    const tooLong = { ...valid, CUSTOMER: "x".repeat(51) };
    expect(QualificationLabelsSchema.safeParse(tooLong).success).toBe(false);
  });
});
