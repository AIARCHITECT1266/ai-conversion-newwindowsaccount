import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/shared/db";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { decryptText } from "@/modules/encryption/aes";
import { parseVisitorDisplayName } from "@/lib/widget/publicKey";

// Zod-Schema fuer Query-Parameter
const statusSchema = z.enum(["ACTIVE", "PAUSED", "CLOSED", "ARCHIVED"]).optional();
const channelSchema = z.enum(["WHATSAPP", "WEB"]).optional();

// GET /api/dashboard/conversations?status=ACTIVE&channel=WEB&limit=20
//
// Kein auditLog() auf diesem Endpoint: Read-only Listen-Abfrage, analog
// zur Poll-Endpoint-Ausnahme in docs/decisions/phase-3b-spec-reconciliation.md
// (semantisch keine "Aktion", nur ein Lese-Heartbeat vom Dashboard).
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

  // Channel-Parameter validieren (Phase 6.3)
  const rawChannel = req.nextUrl.searchParams.get("channel");
  const channelResult = channelSchema.safeParse(rawChannel || undefined);
  if (!channelResult.success) {
    return NextResponse.json(
      { error: "Ungültiger Channel. Erlaubt: WHATSAPP, WEB" },
      { status: 400 }
    );
  }
  const channel = channelResult.data;

  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10) || 20,
    50
  );

  const conversations = await db.conversation.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
      ...(channel ? { channel } : {}),
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
      channel: c.channel, // Phase 6.3: Channel im Response-Shape
      status: c.status,
      language: c.language,
      consentGiven: c.consentGiven,
      // Phase-2-Demo-Fix: abgeleiteter displayName aus widgetVisitorMeta
      // fuer die Dashboard-Liste. Raw-JSON wird nicht ausgeliefert.
      visitorDisplayName: parseVisitorDisplayName(c.widgetVisitorMeta),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      lastMessage,
      lead: c.lead,
    };
  });

  return NextResponse.json({ conversations: result });
}
