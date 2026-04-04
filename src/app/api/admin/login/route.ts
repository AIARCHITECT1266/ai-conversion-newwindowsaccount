import { NextRequest, NextResponse } from "next/server";

// POST /api/admin/login – Validiert Admin-Secret und setzt HttpOnly Cookie
export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Server-Konfigurationsfehler" },
      { status: 500 }
    );
  }

  let body: { secret?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungueltige Anfrage" },
      { status: 400 }
    );
  }

  if (!body.secret || body.secret !== secret) {
    return NextResponse.json(
      { error: "Falsches Secret" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_token", secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 Stunden
    path: "/",
  });

  return response;
}
