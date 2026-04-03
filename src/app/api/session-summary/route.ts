// ============================================================
// Session-Summary API – Speichert Zusammenfassungen in Notion
// POST: Titel und Inhalt entgegennehmen → Notion-Seite erstellen
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createSessionNote } from "@/lib/notion";

// ---------- POST: Session-Zusammenfassung speichern ----------

interface SessionSummaryBody {
  title: string;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SessionSummaryBody;

    // Pflichtfelder prüfen
    if (!body.title || !body.content) {
      return NextResponse.json(
        { error: "Pflichtfelder: title, content" },
        { status: 400 }
      );
    }

    // Notion-Seite erstellen
    const result = await createSessionNote(body.title, body.content);

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
