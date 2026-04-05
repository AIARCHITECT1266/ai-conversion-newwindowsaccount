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

// XSS-Schutz: HTML-Sonderzeichen escapen
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Einfache Fehlerseite
function loginPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Login</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=Geist:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #07070d; color: #ede8df; font-family: 'Geist', system-ui, -apple-system, sans-serif; }
    .card { background: #0e0e1a; border: 1px solid rgba(201,168,76,0.1); border-radius: 16px; padding: 40px; width: 100%; max-width: 400px; text-align: center; }
    h1 { font-family: 'Cormorant Garamond', Georgia, serif; color: #c9a84c; font-size: 1.5rem; margin-bottom: 4px; }
    h2 { font-size: 1rem; color: #ede8df; margin-bottom: 12px; font-weight: 400; }
    p { font-size: 0.875rem; color: #c9a84c; }
    .hint { color: rgba(237,232,223,0.45); margin-top: 16px; font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>AI Conversion.</h1>
    <h2>Dashboard-Zugang</h2>
    <p>${escapeHtml(message)}</p>
    <p class="hint">Bitte verwende den Login-Link, den du von deinem Administrator erhalten hast.</p>
  </div>
</body>
</html>`;
}
