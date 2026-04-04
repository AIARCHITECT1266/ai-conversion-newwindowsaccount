import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDashboardTenant } from "@/lib/dashboard-auth";

// GET /api/dashboard/conversations?status=ACTIVE&limit=20
export async function GET(req: NextRequest) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const tenantId = tenant.id;

  const status = req.nextUrl.searchParams.get("status") as
    | "ACTIVE"
    | "PAUSED"
    | "CLOSED"
    | "ARCHIVED"
    | null;
  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10),
    50
  );

  const conversations = await db.conversation.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      messages: {
        orderBy: { timestamp: "desc" },
        take: 1,
        select: { contentEncrypted: true, timestamp: true, role: true },
      },
      lead: {
        select: {
          id: true,
          score: true,
          qualification: true,
          status: true,
          appointmentAt: true,
          createdAt: true,
        },
      },
    },
  });

  const result = conversations.map((c) => ({
    id: c.id,
    externalId: c.externalId,
    status: c.status,
    language: c.language,
    consentGiven: c.consentGiven,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    lastMessage: c.messages[0]
      ? {
          content: c.messages[0].contentEncrypted,
          role: c.messages[0].role,
          timestamp: c.messages[0].timestamp.toISOString(),
        }
      : null,
    lead: c.lead,
  }));

  return NextResponse.json({ conversations: result });
}
