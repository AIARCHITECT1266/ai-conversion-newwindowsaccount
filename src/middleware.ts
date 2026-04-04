import { NextRequest, NextResponse } from "next/server";

// Geschuetzte Pfade: /admin und /api/admin/*
const ADMIN_PATHS = ["/admin", "/api/admin"];
// Dashboard-Pfade (geschuetzt via Magic-Link Token)
const DASHBOARD_PATHS = ["/dashboard", "/api/dashboard"];
// Login-Routen sind oeffentlich
const DASHBOARD_LOGIN = "/dashboard/login";
const ADMIN_LOGIN = "/api/admin/login";

function isAdminPath(pathname: string): boolean {
  // Login-Route nicht schuetzen (POST-basiertes Login)
  if (pathname === ADMIN_LOGIN) return false;
  return ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function isDashboardPath(pathname: string): boolean {
  // Login-Route nicht schuetzen
  if (pathname === DASHBOARD_LOGIN || pathname.startsWith(DASHBOARD_LOGIN + "/")) {
    return false;
  }
  return DASHBOARD_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Dashboard-Schutz via Magic-Link Cookie
  if (isDashboardPath(pathname)) {
    const dashboardToken = req.cookies.get("dashboard_token")?.value;
    if (!dashboardToken) {
      // API-Routen: 401 JSON
      if (pathname.startsWith("/api/dashboard")) {
        return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
      }
      // Seiten: Weiterleitung zur Login-Fehlerseite
      return NextResponse.redirect(new URL("/dashboard/login", req.url));
    }
    // Token als Header weiterreichen (fuer API-Routen zur Tenant-Aufloesung)
    const response = NextResponse.next();
    response.headers.set("x-dashboard-token", dashboardToken);
    return response;
  }

  if (!isAdminPath(pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    // Kein Secret konfiguriert → Zugriff verweigern
    return NextResponse.json(
      { error: "Server-Konfigurationsfehler" },
      { status: 500 }
    );
  }

  // 1. API-Routen: Bearer-Token, Cookie oder Query-Param pruefen
  if (req.nextUrl.pathname.startsWith("/api/admin")) {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (token === secret) {
      return NextResponse.next();
    }

    // Fallback: Cookie (Browser-Aufrufe aus dem Admin-Dashboard)
    const adminCookie = req.cookies.get("admin_token")?.value;
    if (adminCookie === secret) {
      return NextResponse.next();
    }

    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // 2. Admin-Seiten (/admin): Cookie-basierte Authentifizierung
  const adminCookie = req.cookies.get("admin_token")?.value;
  if (adminCookie === secret) {
    return NextResponse.next();
  }

  // Nicht authentifiziert → Login-Seite anzeigen
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Login</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0a0a1a; color: #fff; font-family: system-ui, -apple-system, sans-serif; }
    .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 40px; width: 100%; max-width: 400px; }
    h1 { font-size: 1.25rem; margin-bottom: 8px; }
    p { font-size: 0.875rem; color: #64748b; margin-bottom: 24px; }
    input { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #fff; font-size: 0.875rem; outline: none; margin-bottom: 16px; }
    input:focus { border-color: rgba(139,92,246,0.5); }
    button { width: 100%; padding: 12px; background: rgba(139,92,246,0.2); border: 1px solid rgba(139,92,246,0.3); border-radius: 10px; color: #c4b5fd; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
    button:hover { background: rgba(139,92,246,0.3); }
    .error { color: #f87171; font-size: 0.8rem; margin-bottom: 12px; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Admin-Bereich</h1>
    <p>Bitte Admin-Secret eingeben</p>
    <div class="error" id="error">Falsches Secret</div>
    <form id="form">
      <input type="password" id="secret" placeholder="Admin Secret" autocomplete="off" autofocus />
      <button type="submit">Anmelden</button>
    </form>
  </div>
  <script>
    document.getElementById('form').addEventListener('submit', function(e) {
      e.preventDefault();
      var s = document.getElementById('secret').value.trim();
      if (!s) return;
      var btn = document.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Prüfe…';
      fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: s })
      }).then(function(res) {
        if (res.ok) {
          window.location.reload();
        } else {
          document.getElementById('error').style.display = 'block';
          btn.disabled = false;
          btn.textContent = 'Anmelden';
        }
      }).catch(function() {
        document.getElementById('error').style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Anmelden';
      });
    });
  </script>
</body>
</html>`,
    {
      status: 401,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/dashboard/:path*", "/api/dashboard/:path*"],
};
