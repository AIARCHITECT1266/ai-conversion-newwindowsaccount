// ============================================================
// Dashboard Logout
// GET /dashboard/logout — Cookie löschen und zur Login-Seite weiterleiten
// ============================================================

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/dashboard/login", req.url));
  response.cookies.set("dashboard_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return response;
}
