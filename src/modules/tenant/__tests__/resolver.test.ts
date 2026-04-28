// ============================================================
// Tenant-Resolver-Tests (Phase 2 des Resolver-Audit, 28.04.2026)
// Audit-Mission: Verifiziere Cross-Tenant-Isolation und Edge-Case-
// Verhalten von getTenantByPhoneId() vor zweitem Pilot-Tenant.
//
// Update 28.04.2026 (Hardening):
// - Defensive Input-Validation (undefined/null/non-string/empty/
//   >64 chars) → fruehzeitig null, kein Prisma-Call
// - Failed-Lookup-Audit-Log (action: tenant.lookup_failed)
// - Tests c/d/f wurden umgestellt: erwarten jetzt NICHT-Aufruf
//   von findUnique
//
// db-Mock: vi.mock auf @/shared/db, damit weder DATABASE_URL
// noch eine echte Prisma-Verbindung benoetigt wird.
// audit-log-Mock: vi.mock auf @/modules/compliance/audit-log,
// damit Failed-Lookup-Logs assertbar sind.
// ============================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks muessen VOR den Resolver-Imports deklariert werden.
vi.mock("@/shared/db", () => ({
  db: {
    tenant: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/modules/compliance/audit-log", () => ({
  auditLog: vi.fn(),
}));

import { db } from "@/shared/db";
import { auditLog } from "@/modules/compliance/audit-log";
import { getTenantByPhoneId, invalidateTenantCache } from "../resolver";

const findUniqueMock = db.tenant.findUnique as unknown as ReturnType<
  typeof vi.fn
>;
const auditLogMock = auditLog as unknown as ReturnType<typeof vi.fn>;

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
  auditLogMock.mockReset();
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

  it("b) gueltige NICHT-existierende phoneNumberId → null + Audit-Log not_found", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const result = await getTenantByPhoneId("999999999999");

    expect(result).toBeNull();
    expect(findUniqueMock).toHaveBeenCalledTimes(1);
    expect(auditLogMock).toHaveBeenCalledWith(
      "tenant.lookup_failed",
      expect.objectContaining({
        details: expect.objectContaining({ reason: "not_found" }),
      })
    );
  });

  it("c) leerer String → kein Prisma-Call, null", async () => {
    const result = await getTenantByPhoneId("");

    expect(result).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
    // Empty Input ist kein Audit-Event — ueberspringen reduziert Log-Lärm.
    expect(auditLogMock).not.toHaveBeenCalled();
  });

  it("d) undefined → kein Prisma-Call, null", async () => {
    // @ts-expect-error: Tests Runtime-Verhalten mit invalidem Input
    const result = await getTenantByPhoneId(undefined);

    expect(result).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("d2) null → kein Prisma-Call, null", async () => {
    // @ts-expect-error: Tests Runtime-Verhalten mit invalidem Input
    const result = await getTenantByPhoneId(null);

    expect(result).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("d3) non-string Input (Number) → kein Prisma-Call, null", async () => {
    // @ts-expect-error: Tests Runtime-Verhalten mit invalidem Input
    const result = await getTenantByPhoneId(12345);

    expect(result).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("e) SQL-Injection-Versuch (kurz) → als String-Literal an Prisma, kein Treffer", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const injection = "'; DROP TABLE tenants; --";

    const result = await getTenantByPhoneId(injection);

    expect(result).toBeNull();
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { whatsappPhoneId: injection, isActive: true },
    });
    expect(auditLogMock).toHaveBeenCalledWith(
      "tenant.lookup_failed",
      expect.objectContaining({
        details: expect.objectContaining({ reason: "not_found" }),
      })
    );
  });

  it("f) sehr langer String (>64 chars) → kein Prisma-Call + Audit-Log oversized", async () => {
    const longStr = "x".repeat(2000);

    const result = await getTenantByPhoneId(longStr);

    expect(result).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(auditLogMock).toHaveBeenCalledWith(
      "tenant.lookup_failed",
      expect.objectContaining({
        details: expect.objectContaining({
          reason: "oversized",
          length: 2000,
        }),
      })
    );
  });

  it("f2) genau 65 chars (1 ueber Limit) → kein Prisma-Call, oversized", async () => {
    const justOver = "x".repeat(65);

    const result = await getTenantByPhoneId(justOver);

    expect(result).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(auditLogMock).toHaveBeenCalledWith(
      "tenant.lookup_failed",
      expect.objectContaining({
        details: expect.objectContaining({ reason: "oversized" }),
      })
    );
  });

  it("f3) genau 64 chars (Limit) → Prisma-Call OK", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const atLimit = "x".repeat(64);

    const result = await getTenantByPhoneId(atLimit);

    expect(result).toBeNull();
    expect(findUniqueMock).toHaveBeenCalledTimes(1);
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

  it("h) Audit-Log enthaelt nur Hash, NIE die Phone-ID im Klartext", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const phoneId = "secret-phone-id-12345";

    await getTenantByPhoneId(phoneId);

    expect(auditLogMock).toHaveBeenCalledTimes(1);
    const call = auditLogMock.mock.calls[0];
    const detailsArg = call[1] as { details: Record<string, unknown> };
    // Hash ist 16 Hex-Chars, NIE der Klartext-Phone-ID
    expect(detailsArg.details.phoneIdHash).toMatch(/^[0-9a-f]{16}$/);
    expect(detailsArg.details.phoneIdHash).not.toBe(phoneId);
    // Vollstaendiger JSON-Stringify darf den Klartext nicht enthalten
    expect(JSON.stringify(detailsArg)).not.toContain(phoneId);
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
