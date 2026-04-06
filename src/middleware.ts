import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/session";

// Geschuetzte Pfade: /admin und /api/admin/*
const ADMIN_PATHS = ["/admin", "/api/admin"];
// Dashboard-Pfade (geschuetzt via Magic-Link Token)
const DASHBOARD_PATHS = ["/dashboard", "/api/dashboard"];
// Oeffentliche Routen innerhalb geschuetzter Pfade
const DASHBOARD_LOGIN = "/dashboard/login";
const DASHBOARD_LOGOUT = "/dashboard/logout";
const ADMIN_LOGIN = "/api/admin/login";
// Onboarding-API ist oeffentlich (eigener Endpoint mit Rate-Limiting)
const ONBOARDING_PATH = "/api/onboarding";

function isAdminPath(pathname: string): boolean {
  // Login-Route nicht schuetzen (POST-basiertes Login)
  if (pathname === ADMIN_LOGIN) return false;
  // Onboarding-API ist oeffentlich
  if (pathname === ONBOARDING_PATH || pathname.startsWith(ONBOARDING_PATH + "/")) return false;
  return ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function isDashboardPath(pathname: string): boolean {
  // Login- und Logout-Routen nicht schuetzen
  if (pathname === DASHBOARD_LOGIN || pathname.startsWith(DASHBOARD_LOGIN + "/")) {
    return false;
  }
  if (pathname === DASHBOARD_LOGOUT || pathname.startsWith(DASHBOARD_LOGOUT + "/")) {
    return false;
  }
  return DASHBOARD_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

// Coming-Soon: Öffentliche Routen umleiten (außer Ausnahmen)
const COMING_SOON_BYPASS = ["/admin", "/api/", "/coming-soon", "/dashboard", "/_next", "/favicon"];

function shouldRedirectToComingSoon(pathname: string): boolean {
  return !COMING_SOON_BYPASS.some(
    (p) => pathname === p || pathname.startsWith(p)
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Coming-Soon Weiterleitung für alle öffentlichen Seiten
  if (shouldRedirectToComingSoon(pathname)) {
    return NextResponse.redirect(new URL("/coming-soon", req.url));
  }

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

  // 1. API-Routen: Bearer-Token oder Cookie pruefen (Session-Token, nicht Secret)
  if (req.nextUrl.pathname.startsWith("/api/admin")) {
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    // Session-Token via Bearer-Header pruefen
    if (bearerToken && validateAdminSession(bearerToken)) {
      return NextResponse.next();
    }

    // Fallback: Session-Cookie (Browser-Aufrufe aus dem Admin-Dashboard)
    const adminCookie = req.cookies.get("admin_token")?.value;
    if (adminCookie && validateAdminSession(adminCookie)) {
      return NextResponse.next();
    }

    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // 2. Admin-Seiten (/admin): Cookie-basierte Authentifizierung
  const adminCookie = req.cookies.get("admin_token")?.value;
  if (adminCookie && validateAdminSession(adminCookie)) {
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
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=Geist:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #07070d; color: #ede8df; font-family: 'Geist', system-ui, -apple-system, sans-serif; }
    .card { background: #0e0e1a; border: 1px solid rgba(201,168,76,0.1); border-radius: 16px; padding: 40px; width: 100%; max-width: 400px; }
    h1 { font-family: 'Cormorant Garamond', Georgia, serif; color: #c9a84c; font-size: 1.5rem; margin-bottom: 4px; }
    h2 { font-size: 1rem; color: #ede8df; margin-bottom: 4px; font-weight: 400; }
    p { font-size: 0.875rem; color: rgba(237,232,223,0.45); margin-bottom: 24px; margin-top: 8px; }
    input { width: 100%; padding: 12px 16px; background: #0e0e1a; border: 1px solid rgba(201,168,76,0.1); border-radius: 10px; color: #ede8df; font-size: 0.875rem; outline: none; margin-bottom: 16px; }
    input:focus { border-color: rgba(201,168,76,0.35); }
    button { width: 100%; padding: 12px; background: #8b5cf6; border: none; border-radius: 10px; color: #fff; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
    button:hover { background: #7c3aed; }
    .error { color: #c9a84c; font-size: 0.8rem; margin-bottom: 12px; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>AI Conversion.</h1>
    <h2>Admin-Bereich</h2>
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
  matcher: [
    // Coming-Soon: Alle Seiten-Routen abfangen
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
