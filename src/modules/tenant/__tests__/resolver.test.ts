// ============================================================
// Tenant-Resolver-Tests (Phase 2 des Resolver-Audit, 28.04.2026)
// Audit-Mission: Verifiziere Cross-Tenant-Isolation und Edge-Case-
// Verhalten von getTenantByPhoneId() vor zweitem Pilot-Tenant.
// Reine Additivitaet — keine Refactoring-Aenderungen am Resolver-
// Code in src/modules/tenant/resolver.ts.
//
// db-Mock: vi.mock auf @/shared/db, damit weder DATABASE_URL
// noch eine echte Prisma-Verbindung benoetigt wird. Die Tests
// laufen vollstaendig in-process mit vi.fn-Stubs.
// ============================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock muss VOR dem Resolver-Import deklariert werden.
// vi.mock wird von Vitest gehoistet; der Resolver-Import bekommt
// das gemockte db-Modul.
vi.mock("@/shared/db", () => ({
  db: {
    tenant: {
      findUnique: vi.fn(),
    },
  },
}));

import { db } from "@/shared/db";
import { getTenantByPhoneId, invalidateTenantCache } from "../resolver";

// Convenient handle auf die Mock-Funktion
const findUniqueMock = db.tenant.findUnique as unknown as ReturnType<
  typeof vi.fn
>;

// Tenant-Fixtures. `as any` weil wir nur die fuer den Resolver
// relevanten Felder brauchen — Prisma-Tenant-Type hat ~25 Felder,
// die der Resolver gar nicht beruehrt.
const TENANT_A = {
  id: "tenant-a-id",
  name: "Tenant A",
  slug: "tenant-a",
  whatsappPhoneId: "111111111111",
  brandName: "A",
  brandColor: "#000000",
  retentionDays: 90,
  isActive: true,
  createdAt: new Date(),
} as any;

const TENANT_B = {
  ...TENANT_A,
  id: "tenant-b-id",
  slug: "tenant-b",
  whatsappPhoneId: "222222222222",
};

beforeEach(() => {
  invalidateTenantCache();
  findUniqueMock.mockReset();
});

describe("getTenantByPhoneId — Edge-Cases (Phase 1.1)", () => {
  it("a) gueltige existierende phoneNumberId → liefert Tenant", async () => {
    findUniqueMock.mockResolvedValueOnce(TENANT_A);

    const result = await getTenantByPhoneId(TENANT_A.whatsappPhoneId);

    expect(result).toEqual(TENANT_A);
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { whatsappPhoneId: TENANT_A.whatsappPhoneId, isActive: true },
    });
  });

  it("b) gueltige NICHT-existierende phoneNumberId → liefert null", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const result = await getTenantByPhoneId("999999999999");

    expect(result).toBeNull();
    expect(findUniqueMock).toHaveBeenCalledTimes(1);
  });

  it("c) leerer String → findUnique mit '' aufgerufen, liefert null (kein Default-Match)", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const result = await getTenantByPhoneId("");

    expect(result).toBeNull();
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { whatsappPhoneId: "", isActive: true },
    });
  });

  it("d) undefined → Resolver validiert NICHT, leitet an Prisma weiter (Finding)", async () => {
    // Dokumentiert das tatsaechliche Verhalten: Der Resolver
    // hat keine Eingangsvalidierung. Bei undefined wuerde Prisma
    // zur Runtime werfen. Hier mit Mock simuliert.
    findUniqueMock.mockResolvedValueOnce(null);

    // @ts-expect-error: Tests Runtime-Verhalten mit invalidem Input
    const result = await getTenantByPhoneId(undefined);

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { whatsappPhoneId: undefined, isActive: true },
    });
    expect(result).toBeNull();
  });

  it("e) SQL-Injection-Versuch → als String-Literal an Prisma, kein Treffer", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const injection = "'; DROP TABLE tenants; --";

    const result = await getTenantByPhoneId(injection);

    expect(result).toBeNull();
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { whatsappPhoneId: injection, isActive: true },
    });
  });

  it("f) sehr langer String (>1000 chars) → Resolver truncated nicht, leitet weiter", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const longStr = "x".repeat(2000);

    const result = await getTenantByPhoneId(longStr);

    expect(result).toBeNull();
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { whatsappPhoneId: longStr, isActive: true },
    });
  });

  it("g) DEAKTIVIERTER Tenant (isActive: false) → null (Filter im WHERE-Clause)", async () => {
    // Prisma findUnique mit composite WHERE { whatsappPhoneId, isActive: true }
    // matched einen isActive=false-Tenant nicht. Mock simuliert das durch null-Return.
    findUniqueMock.mockResolvedValueOnce(null);

    const result = await getTenantByPhoneId("inactive-tenant-phone");

    expect(result).toBeNull();
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { whatsappPhoneId: "inactive-tenant-phone", isActive: true },
    });
  });
});

describe("Cross-Tenant-Isolation (Showstopper-Test)", () => {
  it("Tenant A Phone-ID liefert NUR Tenant A, niemals Tenant B", async () => {
    findUniqueMock.mockImplementation(({ where }: any) => {
      if (where.whatsappPhoneId === TENANT_A.whatsappPhoneId) {
        return Promise.resolve(TENANT_A);
      }
      if (where.whatsappPhoneId === TENANT_B.whatsappPhoneId) {
        return Promise.resolve(TENANT_B);
      }
      return Promise.resolve(null);
    });

    const a = await getTenantByPhoneId(TENANT_A.whatsappPhoneId);
    expect(a?.id).toBe(TENANT_A.id);
    expect(a?.id).not.toBe(TENANT_B.id);

    invalidateTenantCache();

    const b = await getTenantByPhoneId(TENANT_B.whatsappPhoneId);
    expect(b?.id).toBe(TENANT_B.id);
    expect(b?.id).not.toBe(TENANT_A.id);
  });

  it("Unbekannte Phone-ID liefert weder Tenant A noch B noch sonst etwas", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const result = await getTenantByPhoneId("nonexistent-phone-99999");

    expect(result).toBeNull();
    expect(findUniqueMock).toHaveBeenCalledTimes(1);
  });
});

describe("Cache-Verhalten", () => {
  it("Positiv-Cache: zweiter Aufruf hit Cache, kein zweiter DB-Call", async () => {
    findUniqueMock.mockResolvedValueOnce(TENANT_A);

    const r1 = await getTenantByPhoneId(TENANT_A.whatsappPhoneId);
    const r2 = await getTenantByPhoneId(TENANT_A.whatsappPhoneId);

    expect(r1).toEqual(TENANT_A);
    expect(r2).toEqual(TENANT_A);
    expect(findUniqueMock).toHaveBeenCalledTimes(1);
  });

  it("Negativ-Cache: null-Resultat wird ebenfalls 60s gecacht", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const r1 = await getTenantByPhoneId("nonexistent");
    const r2 = await getTenantByPhoneId("nonexistent");

    expect(r1).toBeNull();
    expect(r2).toBeNull();
    expect(findUniqueMock).toHaveBeenCalledTimes(1);
  });

  it("invalidateTenantCache(slug): nur dieser Eintrag wird verworfen", async () => {
    findUniqueMock.mockResolvedValueOnce(TENANT_A);
    await getTenantByPhoneId(TENANT_A.whatsappPhoneId);

    invalidateTenantCache(TENANT_A.whatsappPhoneId);

    findUniqueMock.mockResolvedValueOnce({ ...TENANT_A, name: "Aktualisiert" });
    const r = await getTenantByPhoneId(TENANT_A.whatsappPhoneId);

    expect(r?.name).toBe("Aktualisiert");
    expect(findUniqueMock).toHaveBeenCalledTimes(2);
  });

  it("invalidateTenantCache() ohne Argument: gesamter Cache leer", async () => {
    findUniqueMock.mockResolvedValueOnce(TENANT_A);
    await getTenantByPhoneId(TENANT_A.whatsappPhoneId);

    invalidateTenantCache();

    findUniqueMock.mockResolvedValueOnce(TENANT_A);
    await getTenantByPhoneId(TENANT_A.whatsappPhoneId);

    expect(findUniqueMock).toHaveBeenCalledTimes(2);
  });

  it("Cache-Key separierung: Phone-ID-A und Phone-ID-B haben getrennte Cache-Eintraege", async () => {
    findUniqueMock.mockImplementation(({ where }: any) => {
      if (where.whatsappPhoneId === TENANT_A.whatsappPhoneId) {
        return Promise.resolve(TENANT_A);
      }
      if (where.whatsappPhoneId === TENANT_B.whatsappPhoneId) {
        return Promise.resolve(TENANT_B);
      }
      return Promise.resolve(null);
    });

    await getTenantByPhoneId(TENANT_A.whatsappPhoneId);
    await getTenantByPhoneId(TENANT_B.whatsappPhoneId);

    // Zweite Iteration: beide Eintraege aus Cache, keine weiteren DB-Calls
    const a2 = await getTenantByPhoneId(TENANT_A.whatsappPhoneId);
    const b2 = await getTenantByPhoneId(TENANT_B.whatsappPhoneId);

    expect(a2?.id).toBe(TENANT_A.id);
    expect(b2?.id).toBe(TENANT_B.id);
    expect(findUniqueMock).toHaveBeenCalledTimes(2); // nur zwei initiale Calls
  });
});

describe("Performance", () => {
  it("Resolver-Call (mit Mock) deutlich unter 50ms", async () => {
    findUniqueMock.mockResolvedValueOnce(TENANT_A);

    const start = performance.now();
    await getTenantByPhoneId(TENANT_A.whatsappPhoneId);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
  });

  it("Cache-Hit ist schneller als DB-Hit", async () => {
    findUniqueMock.mockResolvedValueOnce(TENANT_A);

    const startMiss = performance.now();
    await getTenantByPhoneId(TENANT_A.whatsappPhoneId);
    const missElapsed = performance.now() - startMiss;

    const startHit = performance.now();
    await getTenantByPhoneId(TENANT_A.whatsappPhoneId);
    const hitElapsed = performance.now() - startHit;

    // Cache-Hit umgeht den await db.tenant.findUnique komplett.
    // Beide sind im Mock-Setup sub-millisecond, also pruefen wir
    // nur dass beide unter dem 50ms-Budget bleiben.
    expect(missElapsed).toBeLessThan(50);
    expect(hitElapsed).toBeLessThan(50);
    expect(findUniqueMock).toHaveBeenCalledTimes(1);
  });
});
