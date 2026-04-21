import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { db } from "@/shared/db";
import { detectPlanType } from "@/modules/bot/system-prompts";
import { auditLog } from "@/modules/compliance/audit-log";
import { getClientIp } from "@/shared/rate-limit";
import { createHash } from "crypto";

// GET: System-Prompt und Plan laden
export async function GET() {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const data = await db.tenant.findUnique({
    where: { id: tenant.id },
    select: { systemPrompt: true, paddlePlan: true },
  });

  if (!data) {
    return NextResponse.json({ error: "Tenant nicht gefunden" }, { status: 404 });
  }

  const planType = detectPlanType(data.paddlePlan);

  return NextResponse.json({
    systemPrompt: data.systemPrompt ?? "",
    plan: planType,
  });
}

// POST: System-Prompt speichern
const updateSchema = z.object({
  systemPrompt: z.string().max(20000, "System-Prompt darf maximal 20.000 Zeichen lang sein"),
});

export async function POST(req: NextRequest) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const rawBody: unknown = await req.json();
  const parseResult = updateSchema.safeParse(rawBody);
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map((i) => i.message).join(", ");
    return NextResponse.json({ error: errors }, { status: 400 });
  }

  const { systemPrompt } = parseResult.data;

  await db.tenant.update({
    where: { id: tenant.id },
    data: { systemPrompt: systemPrompt || "" },
  });

  const ip = getClientIp(req);
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 16);
  auditLog("dashboard.prompt_updated", {
    tenantId: tenant.id,
    ip: ipHash,
    details: { length: systemPrompt.length },
  });

  return NextResponse.json({ success: true });
}
