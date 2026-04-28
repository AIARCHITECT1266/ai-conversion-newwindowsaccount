// ============================================================
// Cache-Invalidation-Tests fuer Admin-Tenant-Routes (28.04.2026)
//
// Pflicht-Test fuer Bug 1 (HIGH) — verifiziert dass
// invalidateTenantCache() nach jeder mutierenden DB-Operation
// auf Tenants aufgerufen wird:
//
// - POST /api/admin/tenants            → invalidiert neue PhoneId
// - PATCH /api/admin/tenants/[id]      → invalidiert tenant.PhoneId
// - DELETE /api/admin/tenants/[id]     → invalidiert geloeschte PhoneId
//
// Strategie: vi.mock auf @/shared/db und @/modules/tenant/resolver,
// Spy auf invalidateTenantCache. NextRequest-Konstruktor wird mit
// minimalen Body/URL-Stubs aufgerufen.
// ============================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mocks (muessen VOR Route-Imports stehen, vi.mock ist gehoistet) ----

vi.mock("@/shared/db", () => ({
  db: {
    tenant: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/modules/tenant/resolver", () => ({
  invalidateTenantCache: vi.fn(),
}));

// auditLog: harmlos stubben damit Console-JSON nicht laermt
vi.mock("@/modules/compliance/audit-log", () => ({
  auditLog: vi.fn(),
}));

// dashboard-auth: hashToken muss deterministisch sein
vi.mock("@/modules/auth/dashboard-auth", () => ({
  hashToken: (raw: string) => `hashed-${raw.slice(0, 8)}`,
  MAGIC_LINK_EXPIRY_MS: 24 * 60 * 60 * 1000,
}));

// rate-limit: getClientIp deterministisch
vi.mock("@/shared/rate-limit", () => ({
  getClientIp: () => "127.0.0.1",
}));

// publicKey + plan-limits: nur fuer PATCH-Pfad relevant, neutrale Defaults
vi.mock("@/lib/widget/publicKey", () => ({
  generatePublicKey: () => "pk_test_dummy",
}));

vi.mock("@/lib/plan-limits", () => ({
  hasPlanFeature: () => true,
}));

// scoring-Modul: QualificationLabelsSchema wird im PATCH-Schema referenziert.
// Wir liefern ein minimales Zod-Schema das alles akzeptiert.
vi.mock("@/modules/bot/scoring", async () => {
  const { z } = await import("zod");
  return { QualificationLabelsSchema: z.any() };
});

// ---- Imports nach Mocks ----

import { db } from "@/shared/db";
import { invalidateTenantCache } from "@/modules/tenant/resolver";
import { POST as POST_CREATE } from "../route";
import { PATCH, DELETE } from "../[id]/route";

const dbMock = db as unknown as {
  tenant: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
};
const invalidateSpy = invalidateTenantCache as unknown as ReturnType<
  typeof vi.fn
>;

beforeEach(() => {
  dbMock.tenant.create.mockReset();
  dbMock.tenant.update.mockReset();
  dbMock.tenant.delete.mockReset();
  dbMock.tenant.findUnique.mockReset();
  invalidateSpy.mockReset();
});

// Helper: NextRequest-Stub mit JSON-Body
function makeRequest(url: string, init: { method: string; body?: unknown }) {
  const body = init.body ? JSON.stringify(init.body) : undefined;
  return new Request(url, {
    method: init.method,
    body,
    headers: { "content-type": "application/json" },
  }) as any;
}

describe("POST /api/admin/tenants → invalidiert neue Phone-ID", () => {
  it("CREATE-Erfolg loest invalidateTenantCache(neue PhoneId) aus", async () => {
    dbMock.tenant.create.mockResolvedValueOnce({
      id: "new-tenant-id",
      name: "Demo",
      slug: "demo",
      whatsappPhoneId: "999888777666",
      systemPrompt: "",
      brandName: "Demo",
      brandColor: "#000000",
      retentionDays: 90,
      paddlePlan: null,
      webWidgetEnabled: false,
      webWidgetPublicKey: null,
      webWidgetConfig: null,
      isActive: true,
      createdAt: new Date(),
    });

    const req = makeRequest("http://localhost/api/admin/tenants", {
      method: "POST",
      body: {
        name: "Demo",
        slug: "demo",
        whatsappPhoneId: "999888777666",
        brandName: "Demo",
      },
    });

    const res = await POST_CREATE(req);

    expect(res.status).toBe(201);
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith("999888777666");
  });

  it("CREATE-Fehler (Zod-Validation) ruft invalidateTenantCache NICHT auf", async () => {
    const req = makeRequest("http://localhost/api/admin/tenants", {
      method: "POST",
      body: { name: "" /* invalide */ },
    });

    const res = await POST_CREATE(req);

    expect(res.status).toBe(400);
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(dbMock.tenant.create).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/tenants/[id] → invalidiert tenant.PhoneId", () => {
  it("Erfolgreicher PATCH ruft invalidateTenantCache(tenant.whatsappPhoneId) auf", async () => {
    dbMock.tenant.update.mockResolvedValueOnce({
      id: "tenant-1",
      name: "Updated",
      slug: "updated",
      whatsappPhoneId: "111222333444",
      systemPrompt: "",
      brandName: "Updated",
      brandColor: "#000000",
      retentionDays: 90,
      paddlePlan: null,
      webWidgetEnabled: false,
      webWidgetPublicKey: null,
      webWidgetConfig: null,
      isActive: true,
      createdAt: new Date(),
      _count: { conversations: 0, leads: 0 },
    });

    const req = makeRequest("http://localhost/api/admin/tenants/tenant-1", {
      method: "PATCH",
      body: { name: "Updated" },
    });

    const res = await PATCH(req, {
      params: Promise.resolve({ id: "tenant-1" }),
    });

    expect(res.status).toBe(200);
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith("111222333444");
  });

  it("PATCH mit isActive: false invalidiert ebenfalls (Critical Path)", async () => {
    dbMock.tenant.update.mockResolvedValueOnce({
      id: "tenant-1",
      name: "T1",
      slug: "t1",
      whatsappPhoneId: "555555555555",
      systemPrompt: "",
      brandName: "T1",
      brandColor: "#000000",
      retentionDays: 90,
      paddlePlan: null,
      webWidgetEnabled: false,
      webWidgetPublicKey: null,
      webWidgetConfig: null,
      isActive: false,
      createdAt: new Date(),
      _count: { conversations: 0, leads: 0 },
    });

    const req = makeRequest("http://localhost/api/admin/tenants/tenant-1", {
      method: "PATCH",
      body: { isActive: false },
    });

    const res = await PATCH(req, {
      params: Promise.resolve({ id: "tenant-1" }),
    });

    expect(res.status).toBe(200);
    expect(invalidateSpy).toHaveBeenCalledWith("555555555555");
  });

  it("PATCH mit invalider Zod-Body ruft invalidateTenantCache NICHT auf", async () => {
    const req = makeRequest("http://localhost/api/admin/tenants/tenant-1", {
      method: "PATCH",
      body: {}, // refine() schlaegt fehl: mind. 1 Feld noetig
    });

    const res = await PATCH(req, {
      params: Promise.resolve({ id: "tenant-1" }),
    });

    expect(res.status).toBe(400);
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(dbMock.tenant.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/tenants/[id] → invalidiert geloeschte PhoneId", () => {
  it("DELETE liest whatsappPhoneId via select und invalidiert", async () => {
    dbMock.tenant.delete.mockResolvedValueOnce({
      whatsappPhoneId: "777777777777",
    });

    const req = makeRequest("http://localhost/api/admin/tenants/tenant-1", {
      method: "DELETE",
    });

    const res = await DELETE(req, {
      params: Promise.resolve({ id: "tenant-1" }),
    });

    expect(res.status).toBe(200);
    expect(dbMock.tenant.delete).toHaveBeenCalledWith({
      where: { id: "tenant-1" },
      select: { whatsappPhoneId: true },
    });
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith("777777777777");
  });

  it("DELETE auf nicht existenten Tenant invalidiert NICHT", async () => {
    dbMock.tenant.delete.mockRejectedValueOnce(
      new Error("Record to delete does not exist")
    );

    const req = makeRequest("http://localhost/api/admin/tenants/missing", {
      method: "DELETE",
    });

    const res = await DELETE(req, {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(res.status).toBe(404);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
