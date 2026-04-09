/**
 * Dashboard Bot-Preview Endpoint.
 *
 * HINWEIS: Dies ist Teil des Legacy-Test-Modus (siehe
 * docs/decisions/phase-0-decisions.md, Entscheidung 4).
 * Wird nach Widget-Launch (Phase 5+) entfernt und durch
 * das Web-Widget-API ersetzt.
 *
 * Neue Features NICHT auf dieser Route aufbauen.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/shared/rate-limit";
import { generateReply } from "@/modules/bot/claude";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { loadSystemPrompt } from "@/modules/bot/system-prompts";
import { db } from "@/shared/db";

// ---------- Zod-Schemas ----------

const historyItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(5000),
});

const requestSchema = z.object({
  message: z.string().min(1, "Nachricht fehlt").max(2000, "Nachricht darf maximal 2.000 Zeichen lang sein"),
  history: z.array(historyItemSchema).max(20).optional().default([]),
});

// ---------- POST Handler ----------

export async function POST(req: NextRequest) {
  // Authentifizierung: Tenant muss eingeloggt sein
  const authTenant = await getDashboardTenant();
  if (!authTenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Rate-Limiting: 10 Anfragen pro Minute pro IP
  const ip = getClientIp(req);
  const limit = await checkRateLimit(`bot-preview:${ip}`, { max: 10, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Zu viele Anfragen – bitte kurz warten" }, { status: 429 });
  }

  try {
    const rawBody: unknown = await req.json();
    const parseResult = requestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errors = parseResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { message, history } = parseResult.data;

    // Tenant-Daten fuer plan-spezifischen System-Prompt laden
    const tenant = await db.tenant.findUnique({
      where: { id: authTenant.id },
      select: { systemPrompt: true, paddlePlan: true, brandName: true, name: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant nicht gefunden" }, { status: 404 });
    }

    // Plan-bewussten System-Prompt laden (gleiche Logik wie der echte Bot)
    const systemPrompt = loadSystemPrompt(tenant);

    const result = await generateReply(
      systemPrompt,
      tenant.brandName || tenant.name,
      history,
      message,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Fehler bei der Antwortgenerierung" },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply: result.reply });
  } catch (error) {
    console.error("[Bot-Preview] Fehler", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json(
      { error: "Interner Fehler beim Bot-Preview" },
      { status: 500 },
    );
  }
}
