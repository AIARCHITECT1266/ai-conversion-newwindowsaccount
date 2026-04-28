// ============================================================
// Tests: Admin-Session-Token Verwaltung
// Prueft Session-Erstellung, Validierung, Invalidierung und
// timing-sicheren Secret-Vergleich.
//
// 28.04.2026: createAdminSession + validateAdminSession +
// invalidateAdminSession sind seit TD-Pilot-08-Admin-Magic-Link
// async (Upstash-Redis cluster-weit). Tests wurden im selben
// Commit nicht migriert — hier als Drive-By repariert.
// ============================================================

import { describe, it, expect } from "vitest";
import {
  createAdminSession,
  validateAdminSession,
  invalidateAdminSession,
  safeCompare,
} from "@/modules/auth/session";

describe("Admin Session Management", () => {
  it("erstellt einen 64-Zeichen-Hex-Token", async () => {
    const token = await createAdminSession();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generiert einzigartige Tokens", async () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(await createAdminSession());
    }
    expect(tokens.size).toBe(100);
  });

  it("validiert einen gerade erstellten Token", async () => {
    const token = await createAdminSession();
    expect(await validateAdminSession(token)).toBe(true);
  });

  it("lehnt ungueltige Tokens ab", async () => {
    expect(await validateAdminSession("")).toBe(false);
    expect(await validateAdminSession("zu-kurz")).toBe(false);
    expect(await validateAdminSession("a".repeat(64))).toBe(false); // Nicht erstellt
    expect(await validateAdminSession("x".repeat(100))).toBe(false); // Falsche Laenge
  });

  it("invalidiert einen Token (Logout)", async () => {
    const token = await createAdminSession();
    expect(await validateAdminSession(token)).toBe(true);

    await invalidateAdminSession(token);
    expect(await validateAdminSession(token)).toBe(false);
  });

  it("laesst andere Tokens intakt nach Invalidierung", async () => {
    const token1 = await createAdminSession();
    const token2 = await createAdminSession();

    await invalidateAdminSession(token1);

    expect(await validateAdminSession(token1)).toBe(false);
    expect(await validateAdminSession(token2)).toBe(true);
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
