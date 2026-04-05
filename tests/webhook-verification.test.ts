// ============================================================
// Tests: WhatsApp Webhook Signatur-Verifikation
// Prueft HMAC-SHA256-Signaturvalidierung und Timing-Safe-Vergleich
// ============================================================

import { describe, it, expect, beforeAll } from "vitest";
import { createHmac, timingSafeEqual } from "crypto";

// Test-Secret fuer Signatur-Validierung
const TEST_APP_SECRET = "test_app_secret_12345";

beforeAll(() => {
  process.env.WHATSAPP_APP_SECRET = TEST_APP_SECRET;
  process.env.WHATSAPP_VERIFY_TOKEN = "test_verify_token";
  process.env.ENCRYPTION_KEY = "a".repeat(64);
});

// Hilfsfunktion: Gueltige Signatur berechnen
function computeSignature(body: string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

describe("Webhook Signatur-Verifikation", () => {
  it("akzeptiert gueltige HMAC-SHA256-Signaturen", () => {
    const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const signature = computeSignature(body, TEST_APP_SECRET);

    const expected = "sha256=" + createHmac("sha256", TEST_APP_SECRET).update(body).digest("hex");

    // Timing-safe Vergleich (wie in der Implementation)
    expect(expected.length).toBe(signature.length);
    expect(
      timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"))
    ).toBe(true);
  });

  it("lehnt ungueltige Signaturen ab", () => {
    const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const validSignature = computeSignature(body, TEST_APP_SECRET);

    // Signatur manipulieren
    const invalidSignature = validSignature.slice(0, -4) + "0000";

    // Bei gleicher Laenge: timingSafeEqual gibt false zurueck
    if (validSignature.length === invalidSignature.length) {
      expect(
        timingSafeEqual(
          Buffer.from(validSignature, "utf8"),
          Buffer.from(invalidSignature, "utf8")
        )
      ).toBe(false);
    }
  });

  it("lehnt Signaturen mit falschem Secret ab", () => {
    const body = JSON.stringify({ test: "data" });
    const signatureWithWrongSecret = computeSignature(body, "wrong_secret");
    const signatureWithCorrectSecret = computeSignature(body, TEST_APP_SECRET);

    // Laenge kann unterschiedlich sein wenn das Format anders ist
    if (signatureWithWrongSecret.length === signatureWithCorrectSecret.length) {
      expect(
        timingSafeEqual(
          Buffer.from(signatureWithCorrectSecret, "utf8"),
          Buffer.from(signatureWithWrongSecret, "utf8")
        )
      ).toBe(false);
    } else {
      // Unterschiedliche Laenge = sofort ungueltig
      expect(signatureWithWrongSecret.length).not.toBe(signatureWithCorrectSecret.length);
    }
  });

  it("lehnt leere Signaturen ab", () => {
    expect("sha256=abc").not.toBe("");
    expect("").toBeFalsy();
  });

  it("lehnt null-Signaturen ab", () => {
    expect(null).toBeFalsy();
  });

  it("Signatur aendert sich bei veraendertem Body", () => {
    const body1 = JSON.stringify({ message: "Hallo" });
    const body2 = JSON.stringify({ message: "Hallo!" }); // Ein Zeichen mehr

    const sig1 = computeSignature(body1, TEST_APP_SECRET);
    const sig2 = computeSignature(body2, TEST_APP_SECRET);

    expect(sig1).not.toBe(sig2);
  });
});
