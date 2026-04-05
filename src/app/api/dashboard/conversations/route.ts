import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getDashboardTenant } from "@/lib/dashboard-auth";
import { decryptText } from "@/lib/encryption";

// Zod-Schema fuer Query-Parameter
const statusSchema = z.enum(["ACTIVE", "PAUSED", "CLOSED", "ARCHIVED"]).optional();

// GET /api/dashboard/conversations?status=ACTIVE&limit=20
export async function GET(req: NextRequest) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const tenantId = tenant.id;

  // Status-Parameter validieren
  const rawStatus = req.nextUrl.searchParams.get("status");
  const statusResult = statusSchema.safeParse(rawStatus || undefined);
  if (!statusResult.success) {
    return NextResponse.json(
      { error: "Ungültiger Status. Erlaubt: ACTIVE, PAUSED, CLOSED, ARCHIVED" },
      { status: 400 }
    );
  }
  const status = statusResult.data;

  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10) || 20,
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

  // Verschluesselte Nachrichten entschluesseln bevor sie an den Client gehen
  const result = conversations.map((c) => {
    let lastMessage: { content: string; role: string; timestamp: string } | null = null;
    if (c.messages[0]) {
      let content: string;
      try {
        content = decryptText(c.messages[0].contentEncrypted);
      } catch {
        content = "[Nachricht nicht lesbar]";
      }
      lastMessage = {
        content,
        role: c.messages[0].role,
        timestamp: c.messages[0].timestamp.toISOString(),
      };
    }

    return {
      id: c.id,
      externalId: c.externalId,
      status: c.status,
      language: c.language,
      consentGiven: c.consentGiven,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      lastMessage,
      lead: c.lead,
    };
  });

  return NextResponse.json({ conversations: result });
}
