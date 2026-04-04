import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit-log";

// POST /api/admin/login – Validiert Admin-Secret und setzt HttpOnly Cookie
export async function POST(request: NextRequest) {
  // Rate-Limiting: 5 Login-Versuche pro Minute pro IP
  const ip = getClientIp(request);
  const limit = checkRateLimit(`admin-login:${ip}`, { max: 5, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Zu viele Versuche. Bitte warten." },
      { status: 429 }
    );
  }

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
    auditLog("admin.login_failed", { ip });
    return NextResponse.json(
      { error: "Falsches Secret" },
      { status: 401 }
    );
  }

  auditLog("admin.login", { ip });
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
