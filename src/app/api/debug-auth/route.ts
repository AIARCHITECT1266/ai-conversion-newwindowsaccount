// ============================================================
// Temporäre Debug-Route für Admin-Auth-Probleme
// Liegt AUSSERHALB von /api/admin/ um Middleware zu umgehen
// Gibt NUR Metadaten zurück – niemals Secret-Werte
// NACH DEM DEBUGGING WIEDER ENTFERNEN!
// ============================================================

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  const querySecret = req.nextUrl.searchParams.get("secret");
  const cookieToken = req.cookies.get("admin_token")?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  return NextResponse.json({
    // 1. Ist ADMIN_SECRET in der Umgebung gesetzt?
    adminSecretConfigured: !!secret,
    // 2. Länge des ADMIN_SECRET
    adminSecretLength: secret?.length ?? 0,
    // 3. Query-Parameter vorhanden?
    querySecretProvided: !!querySecret,
    querySecretLength: querySecret?.length ?? 0,
    // 4. Cookie vorhanden?
    cookieProvided: !!cookieToken,
    cookieLength: cookieToken?.length ?? 0,
    // 5. Bearer-Token vorhanden?
    bearerProvided: !!bearerToken,
    bearerLength: bearerToken?.length ?? 0,
    // 6. Stimmen sie überein?
    queryMatch: !!querySecret && !!secret && querySecret === secret,
    cookieMatch: !!cookieToken && !!secret && cookieToken === secret,
    bearerMatch: !!bearerToken && !!secret && bearerToken === secret,
    // 7. Umgebungs-Info
    nodeEnv: process.env.NODE_ENV,
  });
}
