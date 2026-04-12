/*!
 * AI Conversion — Web-Widget Loader (Phase 5)
 *
 * Wird als statische Datei vom CDN ausgeliefert und von
 * Pilot-Kunden mit folgendem Snippet eingebunden:
 *
 *   <script src="https://ai-conversion.ai/widget.js"
 *           data-key="pub_xxx" async></script>
 *
 * Architektur:
 * - Vanilla JS, kein Build-Step, IIFE-kapselt.
 * - Erstellt ein <div> mit closed Shadow DOM (zero CSS-Bleed).
 * - Floating-Bubble unten rechts + iframe-Overlay beim Klick.
 * - Laedt /api/widget/config?key=xxx beim ersten Klick
 *   (lazy), iframe-Content ebenfalls lazy.
 * - Fail-safe: Bei Config-Fehler bleibt die Bubble mit
 *   Default-Look (#6366F1 → #22D3EE) klickbar.
 *
 * ADR: docs/decisions/phase-5-embed-script.md
 */
(function () {
  "use strict";

  // ---------- Script-Tag ermitteln ----------

  // Bei async-Ladeverhalten kann document.currentScript null sein.
  // Fallback: letztes Script-Element mit data-key-Attribut.
  var scriptEl =
    document.currentScript ||
    (function () {
      var all = document.querySelectorAll("script[data-key]");
      return all.length ? all[all.length - 1] : null;
    })();

  if (!scriptEl) return;

  var publicKey = scriptEl.getAttribute("data-key") || "";
  if (!/^pub_[A-Za-z0-9_\-]+$/.test(publicKey)) {
    console.warn("[ai-conversion-widget] Ungueltiger oder fehlender data-key.");
    return;
  }

  // Basis-URL vom Script-src ableiten (Origin der ai-conversion.ai CDN).
  // Faellt auf aktuelle Page-Origin zurueck, wenn src relativ ist.
  var scriptSrc = scriptEl.getAttribute("src") || "";
  var baseUrl;
  try {
    baseUrl = new URL(scriptSrc, window.location.href).origin;
  } catch (e) {
    baseUrl = window.location.origin;
  }

  // ---------- Doppel-Mount-Schutz ----------

  if (window.__aiConversionWidgetMounted) return;
  window.__aiConversionWidgetMounted = true;

  // ---------- State ----------

  var isOpen = false;
  var configFetched = false;
  var iframeLoaded = false;

  // ---------- Host + Shadow DOM ----------

  var host = document.createElement("div");
  host.setAttribute("data-ai-conversion-widget", "");
  // Vollflaechig ueber alles legen, Host selbst faengt keine Klicks ab -
  // nur die Kinder mit pointer-events:auto sind klickbar.
  host.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";

  var shadow = host.attachShadow({ mode: "closed" });

  // ---------- Styles ----------

  var style = document.createElement("style");
  style.textContent = [
    ":host{all:initial}",
    "*{box-sizing:border-box}",
    ".root{",
    "  --primary:#6366F1;",
    "  --accent:#22D3EE;",
    "  --bg:#18181B;",
    "  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;",
    "  font-size:14px;",
    "}",
    // ---------- Bubble ----------
    ".bubble{",
    "  position:fixed;",
    "  top:auto;",
    "  right:24px;",
    "  bottom:24px;",
    "  width:60px;",
    "  height:60px;",
    "  border-radius:50%;",
    "  border:0;",
    "  padding:0;",
    "  cursor:pointer;",
    "  pointer-events:auto;",
    "  color:#ffffff;",
    "  background:linear-gradient(135deg,var(--primary),var(--accent));",
    "  box-shadow:0 4px 12px rgba(0,0,0,.18),0 20px 44px -12px rgba(99,102,241,.45);",
    "  transform:translateY(0) scale(1);",
    "  transition:transform 320ms cubic-bezier(.4,0,.2,1),",
    "    box-shadow 320ms cubic-bezier(.4,0,.2,1);",
    "  display:flex;",
    "  align-items:center;",
    "  justify-content:center;",
    "  outline:none;",
    "}",
    ".bubble:hover{",
    "  transform:translateY(-2px) scale(1.05);",
    "  box-shadow:0 6px 16px rgba(0,0,0,.22),0 28px 56px -12px rgba(99,102,241,.55);",
    "}",
    ".bubble:active{transform:translateY(0) scale(0.97);}",
    ".bubble:focus-visible{",
    "  box-shadow:0 4px 12px rgba(0,0,0,.18),0 20px 44px -12px rgba(99,102,241,.45),",
    "    0 0 0 3px rgba(255,255,255,.9),0 0 0 5px var(--primary);",
    "}",
    // ---------- Icon-Container + Morph ----------
    ".icon-wrap{",
    "  position:relative;",
    "  width:28px;",
    "  height:28px;",
    "  color:#ffffff;",
    "}",
    ".icon-wrap svg,.icon-wrap img{",
    "  position:absolute;",
    "  inset:0;",
    "  width:100%;",
    "  height:100%;",
    "  transition:opacity 300ms cubic-bezier(.4,0,.2,1),",
    "    transform 300ms cubic-bezier(.4,0,.2,1);",
    "}",
    ".icon-bubble{opacity:1;transform:rotate(0deg) scale(1);}",
    ".icon-close{opacity:0;transform:rotate(-90deg) scale(.7);}",
    ".bubble.open .icon-bubble{opacity:0;transform:rotate(90deg) scale(.7);}",
    ".bubble.open .icon-close{opacity:1;transform:rotate(0deg) scale(1);}",
    // ---------- Overlay (Mobile-Dim-Layer) ----------
    ".overlay{",
    "  position:fixed;",
    "  inset:0;",
    "  background:rgba(9,9,11,0);",
    "  pointer-events:none;",
    "  transition:background 260ms ease-out;",
    "}",
    ".overlay.visible{pointer-events:auto;}",
    // ---------- Frame-Wrapper (Desktop) ----------
    ".frame-wrap{",
    "  position:fixed;",
    "  right:24px;",
    "  bottom:100px;",
    "  width:408px;",
    "  height:620px;",
    "  max-height:calc(100vh - 140px);",
    "  max-width:calc(100vw - 48px);",
    "  border-radius:20px;",
    "  overflow:hidden;",
    "  background:var(--bg);",
    "  box-shadow:0 10px 30px rgba(0,0,0,.18),0 32px 80px -18px rgba(0,0,0,.55);",
    "  opacity:0;",
    "  transform:translateY(16px) scale(.985);",
    "  transform-origin:bottom right;",
    "  pointer-events:none;",
    "  transition:opacity 280ms cubic-bezier(.4,0,.2,1),",
    "    transform 280ms cubic-bezier(.4,0,.2,1);",
    "}",
    ".frame-wrap.visible{",
    "  opacity:1;",
    "  transform:translateY(0) scale(1);",
    "  pointer-events:auto;",
    "}",
    ".frame-wrap iframe{",
    "  display:block;",
    "  width:100%;",
    "  height:100%;",
    "  border:0;",
    "  background:var(--bg);",
    "}",
    // ---------- Mobile ----------
    "@media (max-width:767px){",
    "  .bubble{right:18px;bottom:18px;width:56px;height:56px;}",
    // Mobile-Fix: Im geoeffneten Zustand wandert die Bubble/Close-X nach
    // oben-rechts, damit sie nicht den Senden-Button im iframe-Footer
    // ueberlagert. 44x44px = Minimum Touch-Target (WCAG 2.5.8).
    // Laut WEB_WIDGET_INTEGRATION.md Phase 5: Bubble ist Loader-Verantwortung,
    // iframe-Content hat keinen eigenen Close-Button.
    "  .bubble.open{top:12px;bottom:auto;right:12px;width:44px;height:44px;}",
    "  .frame-wrap{",
    "    inset:0;",
    "    right:0;",
    "    bottom:0;",
    "    width:100%;",
    "    height:100%;",
    "    max-height:100%;",
    "    max-width:100%;",
    "    border-radius:0;",
    "    transform:translateY(24px);",
    "  }",
    "  .frame-wrap.visible{transform:translateY(0);}",
    "  .overlay.visible{background:rgba(9,9,11,.62);}",
    "}",
    // ---------- Reduced Motion ----------
    "@media (prefers-reduced-motion:reduce){",
    "  .bubble,.icon-wrap svg,.icon-wrap img,.frame-wrap,.overlay{",
    "    transition-duration:0ms !important;",
    "  }",
    "}",
  ].join("\n");

  // ---------- DOM ----------

  var root = document.createElement("div");
  root.className = "root";

  var bubble = document.createElement("button");
  bubble.className = "bubble";
  bubble.setAttribute("type", "button");
  bubble.setAttribute("aria-label", "Chat oeffnen");
  bubble.setAttribute("aria-expanded", "false");

  var iconWrap = document.createElement("div");
  iconWrap.className = "icon-wrap";

  // Standard-Sprechblasen-Icon (inline - kein zusaetzlicher Request).
  // Entspricht public/widget-bubble-icon.svg.
  iconWrap.innerHTML =
    '<svg class="icon-bubble" viewBox="0 0 48 48" fill="none" aria-hidden="true">' +
    '<path d="M24 8C15.163 8 8 14.268 8 22c0 3.322 1.314 6.377 3.518 8.824L8.6 38.9c-.26.725.44 1.423 1.163 1.164l8.04-2.88C19.35 37.723 21.597 38 24 38c8.837 0 16-6.268 16-14S32.837 8 24 8Z" ' +
    'stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="17" cy="22" r="1.8" fill="currentColor"/>' +
    '<circle cx="24" cy="22" r="1.8" fill="currentColor"/>' +
    '<circle cx="31" cy="22" r="1.8" fill="currentColor"/>' +
    "</svg>" +
    '<svg class="icon-close" viewBox="0 0 48 48" fill="none" aria-hidden="true">' +
    '<path d="M14 14L34 34M34 14L14 34" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>' +
    "</svg>";

  bubble.appendChild(iconWrap);

  var overlay = document.createElement("div");
  overlay.className = "overlay";

  var frameWrap = document.createElement("div");
  frameWrap.className = "frame-wrap";

  var iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Chat");
  iframe.setAttribute(
    "sandbox",
    "allow-scripts allow-same-origin allow-forms",
  );
  iframe.setAttribute("loading", "lazy");
  frameWrap.appendChild(iframe);

  root.appendChild(overlay);
  root.appendChild(frameWrap);
  root.appendChild(bubble);

  shadow.appendChild(style);
  shadow.appendChild(root);

  // ---------- Config-Fetch (lazy, beim ersten Klick) ----------

  function fetchConfig() {
    if (configFetched) return;
    configFetched = true;
    var url =
      baseUrl + "/api/widget/config?key=" + encodeURIComponent(publicKey);
    fetch(url, { method: "GET", headers: { Accept: "application/json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        applyConfig(data);
      })
      .catch(function () {
        // Fail-safe: Bubble bleibt mit Defaults klickbar.
        console.warn(
          "[ai-conversion-widget] Config-Fetch fehlgeschlagen, nutze Defaults.",
        );
      });
  }

  function isHexColor(v) {
    return typeof v === "string" && /^#[0-9A-Fa-f]{6}$/.test(v);
  }

  function isSafeUrl(v) {
    if (typeof v !== "string" || v.length === 0) return false;
    return (
      v.indexOf("https://") === 0 ||
      v.indexOf("http://") === 0 ||
      v.charAt(0) === "/"
    );
  }

  function applyConfig(config) {
    if (!config || typeof config !== "object") return;

    if (isHexColor(config.primaryColor)) {
      root.style.setProperty("--primary", config.primaryColor);
    }
    if (isHexColor(config.accentColor)) {
      root.style.setProperty("--accent", config.accentColor);
    }
    if (isHexColor(config.backgroundColor)) {
      root.style.setProperty("--bg", config.backgroundColor);
    }

    // Tenant-Override: Bubble-Icon durch Custom-Image ersetzen.
    // SVG-Defaults bleiben im DOM, werden nur visuell ueberlagert.
    if (isSafeUrl(config.bubbleIconUrl)) {
      var existingOverride = iconWrap.querySelector(".icon-custom");
      if (!existingOverride) {
        var img = document.createElement("img");
        img.className = "icon-bubble icon-custom";
        img.setAttribute("alt", "");
        img.setAttribute("aria-hidden", "true");
        img.src = config.bubbleIconUrl;
        // Standard-SVG ersetzen (Morph-Transition laeuft trotzdem
        // ueber icon-bubble / icon-close Klassen).
        var existingSvg = iconWrap.querySelector("svg.icon-bubble");
        if (existingSvg) existingSvg.remove();
        iconWrap.insertBefore(img, iconWrap.firstChild);
      }
    }
  }

  // ---------- Open / Close ----------

  function openWidget() {
    if (isOpen) return;
    isOpen = true;
    bubble.classList.add("open");
    overlay.classList.add("visible");
    frameWrap.classList.add("visible");
    bubble.setAttribute("aria-label", "Chat schliessen");
    bubble.setAttribute("aria-expanded", "true");

    if (!iframeLoaded) {
      iframeLoaded = true;
      iframe.src =
        baseUrl + "/embed/widget?key=" + encodeURIComponent(publicKey);
    }
  }

  function closeWidget() {
    if (!isOpen) return;
    isOpen = false;
    bubble.classList.remove("open");
    overlay.classList.remove("visible");
    frameWrap.classList.remove("visible");
    bubble.setAttribute("aria-label", "Chat oeffnen");
    bubble.setAttribute("aria-expanded", "false");
  }

  bubble.addEventListener("click", function () {
    // Config-Fetch parallel zum Oeffnen (fire-and-forget).
    if (!configFetched) fetchConfig();
    if (isOpen) closeWidget();
    else openWidget();
  });

  overlay.addEventListener("click", closeWidget);

  // ESC schliesst das Widget (nur wenn geoeffnet, damit wir keine
  // Key-Events der Host-Seite abfangen wenn das Widget inaktiv ist).
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) closeWidget();
  });

  // ---------- Mount ----------

  function mount() {
    if (!document.body) {
      // body noch nicht da -> kurz warten
      setTimeout(mount, 30);
      return;
    }
    document.body.appendChild(host);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
