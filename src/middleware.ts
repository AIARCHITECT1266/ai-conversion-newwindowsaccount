import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { validateAdminSession } from "@/modules/auth/session-validate";

export const runtime = "nodejs";

// Kryptographisch zufaelliger CSP-Nonce pro Request (128 bit)
function generateNonce(): string {
  return randomBytes(16).toString("base64");
}

// Widget- und spaetere /embed-Routen duerfen in fremde Seiten eingebettet werden
function isWidgetRoute(pathname: string): boolean {
  return pathname.startsWith("/api/widget") || pathname.startsWith("/embed");
}

// Demo-/Test-Seite fuer das Embed-Widget. Diese Seite muss den
// statischen Widget-Loader (public/widget.js) per <script src> laden
// koennen. Mit der strikten 'strict-dynamic'-CSP ist das nicht moeglich,
// weil 'self' dann ignoriert wird. Die Demo-Route bekommt daher einen
// gelockerten script-src OHNE 'strict-dynamic' (siehe buildCspHeader).
// Phase 5 Hotfix Option D, docs/decisions/phase-5-embed-script.md.
function isDemoRoute(pathname: string): boolean {
  return pathname === "/widget-demo.html" || pathname.startsWith("/widget-demo");
}

// Baut den CSP-Header dynamisch pro Request mit injiziertem Nonce.
// Hinweis: style-src/style-src-attr behalten bewusst 'unsafe-inline',
// siehe docs/tech-debt.md (Phase 4-pre).
//
// Route-spezifische Abweichungen:
// - Widget-/Embed-Routen (isWidgetRoute): frame-ancestors '*' statt 'none',
//   damit das iframe in fremde Kundenseiten eingebettet werden kann.
// - Demo-Route (isDemoRoute): 'strict-dynamic' aus script-src entfernt,
//   damit widget.js ueber 'self' geladen werden kann. Nonce bleibt Pflicht
//   fuer SSR-Inline-Scripts, 'self' wird wieder wirksam. Nur fuer die
//   statische Marketing-/Test-Seite, kein User-Kontext, kein Auth.
//   Siehe ADR docs/decisions/phase-5-embed-script.md (CSP-Hotfix).
function buildCspHeader(
  nonce: string,
  widgetRoute: boolean,
  demoRoute: boolean,
): string {
  const frameAncestors = widgetRoute ? "*" : "'none'";

  // Dev-Mode: Next.js React-Refresh-Runtime nutzt eval() fuer
  // Hot Module Reload. Production hat kein HMR und braucht
  // daher kein 'unsafe-eval' - dort bleibt die CSP strikt.
  const isDev = process.env.NODE_ENV === "development";

  // Demo-Route: 'strict-dynamic' entfernt, damit 'self' wieder greift
  // und der Widget-Loader ueber <script src="/widget.js"> geladen werden
  // kann. Alle anderen Routen behalten 'strict-dynamic'.
  let scriptSrc: string;
  if (demoRoute) {
    scriptSrc = isDev
      ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`
      : `script-src 'self' 'nonce-${nonce}'`;
  } else {
    scriptSrc = isDev
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;
  }

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    `frame-ancestors ${frameAncestors}`,
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

// Basis-Security-Headers (ohne CSP, die wird dynamisch ergaenzt)
const BASE_SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
};

// Webhook-Pfade: nur transport-relevante Headers, kein CSP
const WEBHOOK_ONLY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function applySecurityHeaders(
  response: NextResponse,
  csp: string,
  widgetRoute: boolean,
): NextResponse {
  for (const [key, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  // CSP-String kommt vorberechnet rein — identisch zum Request-Header,
  // damit kein Drift zwischen Renderer-Nonce und Browser-CSP entsteht.
  response.headers.set("Content-Security-Policy", csp);
  // X-Frame-Options: DENY wuerde frame-ancestors * auf Widget-Routen
  // widersprechen. Auf Widget-Routen entfernen.
  if (widgetRoute) {
    response.headers.delete("X-Frame-Options");
  }
  return response;
}

// Webhook-Routen: nur Transport-Security, kein CSP (kein HTML-Output)
function applyWebhookHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(WEBHOOK_ONLY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Webhook-Routen: nur Transport-Security-Headers, kein CSP, kein Nonce.
  // Webhooks liefern kein HTML aus und brauchen keine Script-Kontrolle.
  if (pathname.startsWith("/api/webhook/")) {
    return applyWebhookHeaders(NextResponse.next());
  }

  // Nonce pro Request generieren und CSP berechnen.
  //
  // KRITISCH: Die CSP muss auf BEIDE Header-Ebenen gesetzt werden:
  // 1. Request-Headers — damit der Next.js 15 SSR-Renderer den Nonce
  //    aus dem Content-Security-Policy-Header extrahieren und automatisch
  //    auf alle Framework-generierten <script>-Tags propagieren kann
  //    (intern via getScriptNonceFromHeader in app-render.tsx).
  // 2. Response-Headers — damit der Browser die CSP durchsetzt.
  //
  // Ohne die CSP auf den Request-Headers fehlt der Nonce auf den
  // Framework-Scripts (webpack, main-app, page-chunks, Hydration-
  // Inline-Scripts) und der Browser blockiert sie.
  // Siehe: docs/production-regression-2026-04-12.md
  const nonce = generateNonce();
  const widgetRoute = isWidgetRoute(pathname);
  const demoRoute = isDemoRoute(pathname);
  const cspHeader = buildCspHeader(nonce, widgetRoute, demoRoute);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);
  const nextWithNonce = () =>
    NextResponse.next({ request: { headers: requestHeaders } });

  // Dashboard-Schutz via Magic-Link Cookie
  if (isDashboardPath(pathname)) {
    const dashboardToken = req.cookies.get("dashboard_token")?.value;
    if (!dashboardToken) {
      // API-Routen: 401 JSON
      if (pathname.startsWith("/api/dashboard")) {
        return applySecurityHeaders(
          NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 }),
          cspHeader,
          widgetRoute,
        );
      }
      // Seiten: Weiterleitung zur Login-Fehlerseite
      return applySecurityHeaders(
        NextResponse.redirect(new URL("/dashboard/login", req.url)),
        cspHeader,
        widgetRoute,
      );
    }
    // Token als Header weiterreichen (fuer API-Routen zur Tenant-Aufloesung)
    const response = nextWithNonce();
    response.headers.set("x-dashboard-token", dashboardToken);
    return applySecurityHeaders(response, cspHeader, widgetRoute);
  }

  if (!isAdminPath(pathname)) {
    return applySecurityHeaders(nextWithNonce(), cspHeader, widgetRoute);
  }

  // 1. API-Routen: Bearer-Token oder Cookie pruefen (Session-Token, nicht Secret)
  if (req.nextUrl.pathname.startsWith("/api/admin")) {
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    // Session-Token via Bearer-Header pruefen
    if (bearerToken && await validateAdminSession(bearerToken)) {
      return applySecurityHeaders(nextWithNonce(), cspHeader, widgetRoute);
    }

    // Fallback: Session-Cookie (Browser-Aufrufe aus dem Admin-Dashboard)
    const adminCookie = req.cookies.get("admin_token")?.value;
    if (adminCookie && await validateAdminSession(adminCookie)) {
      return applySecurityHeaders(nextWithNonce(), cspHeader, widgetRoute);
    }

    return applySecurityHeaders(
      NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 }),
      cspHeader,
      widgetRoute,
    );
  }

  // 2. Admin-Seiten (/admin): Cookie-basierte Authentifizierung
  const adminCookie = req.cookies.get("admin_token")?.value;
  if (adminCookie && await validateAdminSession(adminCookie)) {
    return applySecurityHeaders(nextWithNonce(), cspHeader, widgetRoute);
  }

  // Nicht authentifiziert → Login-Seite anzeigen
  const loginResponse = new NextResponse(
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
  <script nonce="${nonce}">
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
  return applySecurityHeaders(loginResponse, cspHeader, widgetRoute);
}

export const config = {
  matcher: [
    // Auth-geschuetzte Pfade
    "/admin/:path*",
    "/api/admin/:path*",
    "/dashboard/:path*",
    "/api/dashboard/:path*",
    // Security-Headers fuer alle weiteren Routen (ohne Static-Assets)
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
