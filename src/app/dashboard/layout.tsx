// ============================================================
// Dashboard-Layout (Phase 2b.2)
//
// Server Component, wrappt alle /dashboard/**-Pages mit
// gemeinsamem Brand-Header + Top-Nav. Tenant wird hier einmal
// pro Request via getDashboardTenant() aufgeloest und an die
// Header-Anzeige weitergereicht.
//
// Auth-Boundary: bei null-tenant -> redirect /dashboard/login.
// Die Middleware (src/middleware.ts:190-211) leitet bereits bei
// fehlendem Cookie um — dieser Redirect ist ein Defense-in-Depth
// fuer den Fall, dass das Cookie zwar existiert, der Token aber
// abgelaufen oder nicht mehr in der DB ist.
//
// Tenant-Isolation: getDashboardTenant() haelt seine eigene
// Boundary-Logik (Cookie-Token-Hash → Tenant-Lookup), kein neuer
// Datenfluss ueber Tenant-Grenzen. brandName/name landen nur in
// der Server-Component-Render-Output, kein Cross-Tenant-Leak.
//
// Der Login-Route-Handler (src/app/dashboard/login/route.ts) ist
// ein Route-Handler, kein Page-Render — er wird von diesem Layout
// NICHT umschlossen (Next-App-Router-Konvention).
// ============================================================

import { redirect } from "next/navigation";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { DashboardTopNav } from "./_components/DashboardTopNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getDashboardTenant();

  if (!tenant) {
    redirect("/dashboard/login");
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-30 border-b border-[var(--gold-border)] bg-[var(--bg)]/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between py-4">
            <h1 className="font-serif text-xl tracking-tight">
              AI Conversion ·{" "}
              <span className="text-[var(--gold)]">
                {tenant.brandName ?? tenant.name}
              </span>
            </h1>
            <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Bot aktiv
              </span>
            </div>
          </div>
          <DashboardTopNav />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
