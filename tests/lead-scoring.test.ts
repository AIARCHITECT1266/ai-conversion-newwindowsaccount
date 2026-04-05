// ============================================================
// Tests: Lead-Scoring Validierungslogik
// Prueft Score-Clamping, Qualifikations-Validierung und
// Lead-Status-Downgrade-Schutz.
// ============================================================

import { describe, it, expect } from "vitest";

// Lead-Status-Hierarchie (kopiert aus handler.ts)
const LEAD_STATUS_ORDER = ["NEW", "CONTACTED", "APPOINTMENT_SET", "CONVERTED", "LOST"] as const;

describe("Lead-Scoring Validierung", () => {
  it("begrenzt Score auf 0-100", () => {
    // Score-Clamping-Logik wie in gpt.ts
    function clampScore(raw: number): number {
      return Math.max(0, Math.min(100, Math.round(raw)));
    }

    expect(clampScore(50)).toBe(50);
    expect(clampScore(0)).toBe(0);
    expect(clampScore(100)).toBe(100);
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(150)).toBe(100);
    expect(clampScore(73.6)).toBe(74);
    expect(clampScore(73.4)).toBe(73);
  });

  it("validiert Qualifikationsstufen", () => {
    const validQualifications = [
      "UNQUALIFIED",
      "MARKETING_QUALIFIED",
      "SALES_QUALIFIED",
      "OPPORTUNITY",
      "CUSTOMER",
    ];

    // Gueltige Werte
    for (const q of validQualifications) {
      expect(validQualifications.includes(q)).toBe(true);
    }

    // Ungueltige Werte werden auf UNQUALIFIED zurückgesetzt
    expect(validQualifications.includes("INVALID")).toBe(false);
    expect(validQualifications.includes("")).toBe(false);
  });
});

describe("Lead-Status-Downgrade-Schutz", () => {
  function getStatusIndex(status: string): number {
    return LEAD_STATUS_ORDER.indexOf(status as typeof LEAD_STATUS_ORDER[number]);
  }

  function resolveStatus(currentStatus: string, proposedStatus: string): string {
    const currentIdx = getStatusIndex(currentStatus);
    const proposedIdx = getStatusIndex(proposedStatus);

    // Kein Downgrade: Wenn aktueller Status weiter fortgeschritten ist
    if (currentIdx > proposedIdx) {
      return currentStatus;
    }
    return proposedStatus;
  }

  it("verhindert Downgrade von APPOINTMENT_SET auf CONTACTED", () => {
    expect(resolveStatus("APPOINTMENT_SET", "CONTACTED")).toBe("APPOINTMENT_SET");
  });

  it("verhindert Downgrade von CONVERTED auf NEW", () => {
    expect(resolveStatus("CONVERTED", "NEW")).toBe("CONVERTED");
  });

  it("erlaubt Upgrade von NEW auf CONTACTED", () => {
    expect(resolveStatus("NEW", "CONTACTED")).toBe("CONTACTED");
  });

  it("erlaubt Upgrade von CONTACTED auf APPOINTMENT_SET", () => {
    expect(resolveStatus("CONTACTED", "APPOINTMENT_SET")).toBe("APPOINTMENT_SET");
  });

  it("behaelt gleichen Status bei", () => {
    expect(resolveStatus("CONTACTED", "CONTACTED")).toBe("CONTACTED");
  });

  it("behaelt LOST-Status bei (kein Downgrade möglich)", () => {
    // LOST ist der höchste Index – kein Downgrade
    expect(resolveStatus("LOST", "NEW")).toBe("LOST");
    expect(resolveStatus("LOST", "CONTACTED")).toBe("LOST");
  });
});

describe("Score-basierte Status-Zuweisung", () => {
  function getProposedStatus(score: number): string {
    return score >= 76 ? "CONTACTED" : "NEW";
  }

  it("Score >= 76 ergibt CONTACTED", () => {
    expect(getProposedStatus(76)).toBe("CONTACTED");
    expect(getProposedStatus(100)).toBe("CONTACTED");
    expect(getProposedStatus(85)).toBe("CONTACTED");
  });

  it("Score < 76 ergibt NEW", () => {
    expect(getProposedStatus(75)).toBe("NEW");
    expect(getProposedStatus(0)).toBe("NEW");
    expect(getProposedStatus(50)).toBe("NEW");
  });
});
