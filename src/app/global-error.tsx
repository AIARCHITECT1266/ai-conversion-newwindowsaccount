"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body style={{ background: "#07070d", color: "#ede8df", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>Etwas ist schiefgelaufen</h2>
          <p style={{ color: "rgba(237,232,223,0.45)", marginBottom: 24 }}>
            {process.env.NODE_ENV === "production"
              ? "Ein unerwarteter Fehler ist aufgetreten."
              : error.message}
          </p>
          <button
            onClick={reset}
            style={{ background: "#c9a84c", color: "#07070d", border: "none", padding: "10px 24px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
          >
            Erneut versuchen
          </button>
        </div>
      </body>
    </html>
  );
}
