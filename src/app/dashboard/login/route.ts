// ============================================================
// Dashboard Magic-Link Login
// GET /dashboard/login?token=<dashboardToken>
// Validiert den Token, setzt Cookie, leitet zum Dashboard weiter.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse(loginPage("Kein Token angegeben."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Token in der Datenbank suchen
  const tenant = await db.tenant.findUnique({
    where: { dashboardToken: token },
    select: { id: true, name: true, isActive: true },
  });

  if (!tenant || !tenant.isActive) {
    return new NextResponse(loginPage("Ungültiger oder deaktivierter Link."), {
      status: 401,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Cookie setzen und zum Dashboard weiterleiten
  const response = NextResponse.redirect(new URL("/dashboard", req.url));
  response.cookies.set("dashboard_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30, // 30 Tage
    path: "/",
  });

  return response;
}

// Einfache Fehlerseite
function loginPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Login</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0a0a1a; color: #fff; font-family: system-ui, -apple-system, sans-serif; }
    .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 40px; width: 100%; max-width: 400px; text-align: center; }
    h1 { font-size: 1.25rem; margin-bottom: 12px; }
    p { font-size: 0.875rem; color: #f87171; }
    .hint { color: #64748b; margin-top: 16px; font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Dashboard-Zugang</h1>
    <p>${message}</p>
    <p class="hint">Bitte verwende den Login-Link, den du von deinem Administrator erhalten hast.</p>
  </div>
</body>
</html>`;
}
