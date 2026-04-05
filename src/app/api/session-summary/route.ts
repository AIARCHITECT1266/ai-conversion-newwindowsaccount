// ============================================================
// Session-Summary API – Speichert Zusammenfassungen in Notion
// POST: Titel und Inhalt entgegennehmen → Notion-Seite erstellen
// Absicherung: Nur mit CRON_SECRET aufrufbar (interne API)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSessionNote } from "@/lib/notion";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { safeCompare } from "@/lib/session";

// Zod-Schema fuer den Request-Body
const bodySchema = z.object({
  title: z.string().min(1, "Titel fehlt").max(500, "Titel darf maximal 500 Zeichen lang sein"),
  content: z.string().min(1, "Inhalt fehlt").max(50000, "Inhalt darf maximal 50.000 Zeichen lang sein"),
});

// ---------- POST: Session-Zusammenfassung speichern ----------

export async function POST(request: NextRequest) {
  // Rate-Limiting: 10 Requests pro Minute pro IP
  const ip = getClientIp(request);
  const limit = await checkRateLimit(`session-summary:${ip}`, { max: 10, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 });
  }

  // Authentifizierung: CRON_SECRET als Bearer-Token (interne API)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token || !safeCompare(token, cronSecret)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }
  }

  try {
    const rawBody: unknown = await request.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errors = parseResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { title, content } = parseResult.data;

    // Notion-Seite erstellen
    const result = await createSessionNote(title, content);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        pageId: result.pageId,
        url: result.url,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Session-Summary] Fehler", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
