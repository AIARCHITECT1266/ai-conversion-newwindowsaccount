// ============================================================
// Tests: Admin-Session-Token Verwaltung
// Prueft Session-Erstellung, Validierung, Invalidierung und
// timing-sicheren Secret-Vergleich.
// ============================================================

import { describe, it, expect } from "vitest";
import {
  createAdminSession,
  validateAdminSession,
  invalidateAdminSession,
  safeCompare,
} from "@/modules/auth/session";

describe("Admin Session Management", () => {
  it("erstellt einen 64-Zeichen-Hex-Token", () => {
    const token = createAdminSession();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generiert einzigartige Tokens", () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(createAdminSession());
    }
    expect(tokens.size).toBe(100);
  });

  it("validiert einen gerade erstellten Token", () => {
    const token = createAdminSession();
    expect(validateAdminSession(token)).toBe(true);
  });

  it("lehnt ungueltige Tokens ab", () => {
    expect(validateAdminSession("")).toBe(false);
    expect(validateAdminSession("zu-kurz")).toBe(false);
    expect(validateAdminSession("a".repeat(64))).toBe(false); // Nicht erstellt
    expect(validateAdminSession("x".repeat(100))).toBe(false); // Falsche Laenge
  });

  it("invalidiert einen Token (Logout)", () => {
    const token = createAdminSession();
    expect(validateAdminSession(token)).toBe(true);

    invalidateAdminSession(token);
    expect(validateAdminSession(token)).toBe(false);
  });

  it("laesst andere Tokens intakt nach Invalidierung", () => {
    const token1 = createAdminSession();
    const token2 = createAdminSession();

    invalidateAdminSession(token1);

    expect(validateAdminSession(token1)).toBe(false);
    expect(validateAdminSession(token2)).toBe(true);
  });
});

describe("safeCompare (Timing-sicherer Vergleich)", () => {
  it("gibt true fuer identische Strings", () => {
    expect(safeCompare("geheim", "geheim")).toBe(true);
    expect(safeCompare("a".repeat(100), "a".repeat(100))).toBe(true);
  });

  it("gibt false fuer unterschiedliche Strings", () => {
    expect(safeCompare("geheim", "falsch")).toBe(false);
    expect(safeCompare("abc", "abd")).toBe(false);
  });

  it("gibt false fuer unterschiedlich lange Strings", () => {
    expect(safeCompare("kurz", "laenger")).toBe(false);
    expect(safeCompare("a", "ab")).toBe(false);
  });

  it("gibt false fuer leere Strings vs. nicht-leere", () => {
    expect(safeCompare("", "nicht-leer")).toBe(false);
  });

  it("gibt true fuer zwei leere Strings", () => {
    expect(safeCompare("", "")).toBe(true);
  });

  it("gibt false fuer nicht-String-Inputs", () => {
    // TypeScript wuerde das verhindern, aber zur Sicherheit
    expect(safeCompare(null as unknown as string, "test")).toBe(false);
    expect(safeCompare("test", undefined as unknown as string)).toBe(false);
  });
});
