// ============================================================
// Dashboard Auth – Tenant aus Cookie/Header auflösen
// ============================================================

import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";

/**
 * Löst den Tenant anhand des dashboard_token Cookies auf.
 * Gibt null zurück wenn kein gültiger Token vorhanden.
 */
export async function getDashboardTenant(): Promise<{
  id: string;
  name: string;
  brandName: string;
} | null> {
  // Token aus Cookie oder Middleware-Header lesen
  const cookieStore = await cookies();
  const headerStore = await headers();
  const token =
    cookieStore.get("dashboard_token")?.value ??
    headerStore.get("x-dashboard-token") ??
    null;

  if (!token) return null;

  const tenant = await db.tenant.findUnique({
    where: { dashboardToken: token },
    select: { id: true, name: true, brandName: true, isActive: true },
  });

  if (!tenant || !tenant.isActive) return null;

  return { id: tenant.id, name: tenant.name, brandName: tenant.brandName };
}
