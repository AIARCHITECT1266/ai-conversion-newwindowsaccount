// POST /api/admin/logout — Admin-Session invalidieren und Cookie löschen
import { NextRequest, NextResponse } from "next/server";
import { invalidateAdminSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (token) {
    await invalidateAdminSession(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return response;
}
