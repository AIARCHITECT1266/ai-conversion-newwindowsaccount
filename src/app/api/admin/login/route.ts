import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit-log";
import { createAdminSession, safeCompare } from "@/lib/session";

// POST /api/admin/login – Validiert Admin-Secret und setzt HttpOnly Session-Cookie
export async function POST(request: NextRequest) {
  // Rate-Limiting: 5 Login-Versuche pro Minute pro IP
  const ip = getClientIp(request);
  const limit = await checkRateLimit(`admin-login:${ip}`, { max: 5, windowMs: 60_000 });
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

  // Timing-sicherer Vergleich des Secrets
  if (!body.secret || !safeCompare(body.secret, secret)) {
    auditLog("admin.login_failed", { ip });
    return NextResponse.json(
      { error: "Falsches Secret" },
      { status: 401 }
    );
  }

  // Session-Token generieren (nicht das Secret selbst!)
  const sessionToken = createAdminSession();

  auditLog("admin.login", { ip });
  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 8, // 8 Stunden
    path: "/",
  });

  return response;
}
