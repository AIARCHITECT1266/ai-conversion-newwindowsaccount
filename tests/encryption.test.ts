// ============================================================
// Tests: AES-256-GCM Verschluesselung
// Prueft Roundtrip, fehlerhafte Eingaben, verschiedene Textlaengen
// ============================================================

import { describe, it, expect, beforeAll } from "vitest";

// ENCRYPTION_KEY muss vor dem Import gesetzt werden
beforeAll(() => {
  // 32 Byte = 64 Hex-Zeichen Test-Key
  process.env.ENCRYPTION_KEY = "a".repeat(64);
});

describe("Encryption", () => {
  it("verschluesselt und entschluesselt Text korrekt (Roundtrip)", async () => {
    const { encryptText, decryptText } = await import("@/lib/encryption");

    const plaintext = "Hallo, dies ist ein geheimer Text!";
    const encrypted = encryptText(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toContain(":"); // Format: IV:AuthTag:Ciphertext

    const decrypted = decryptText(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("erzeugt unterschiedliche Ciphertexte fuer denselben Klartext (zufaellige IV)", async () => {
    const { encryptText } = await import("@/lib/encryption");

    const plaintext = "Gleicher Text, unterschiedliche Verschluesselung";
    const encrypted1 = encryptText(plaintext);
    const encrypted2 = encryptText(plaintext);

    expect(encrypted1).not.toBe(encrypted2);
  });

  it("verschluesselt leere Strings korrekt", async () => {
    const { encryptText, decryptText } = await import("@/lib/encryption");

    const encrypted = encryptText("");
    const decrypted = decryptText(encrypted);
    expect(decrypted).toBe("");
  });

  it("verschluesselt lange Texte korrekt", async () => {
    const { encryptText, decryptText } = await import("@/lib/encryption");

    const plaintext = "A".repeat(10000);
    const encrypted = encryptText(plaintext);
    const decrypted = decryptText(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("verschluesselt Unicode/Emojis korrekt", async () => {
    const { encryptText, decryptText } = await import("@/lib/encryption");

    const plaintext = "Hallo Welt! Ä Ö Ü ß 日本語 🎉🔐";
    const encrypted = encryptText(plaintext);
    const decrypted = decryptText(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("wirft Fehler bei ungueltigem Datenformat", async () => {
    const { decryptText } = await import("@/lib/encryption");

    expect(() => decryptText("ungueltig")).toThrow("Ungültiges Datenformat");
    expect(() => decryptText("a:b")).toThrow("Ungültiges Datenformat");
    expect(() => decryptText("")).toThrow("Ungültiges Datenformat");
  });

  it("wirft Fehler bei manipiertem Ciphertext (Integritaetspruefung)", async () => {
    const { encryptText, decryptText } = await import("@/lib/encryption");

    const encrypted = encryptText("Geheimer Text");
    const parts = encrypted.split(":");

    // Ciphertext manipulieren
    const manipulated = [parts[0], parts[1], "AAAA" + parts[2].slice(4)].join(":");

    expect(() => decryptText(manipulated)).toThrow();
  });

  it("Ciphertext hat korrektes Format (IV:AuthTag:Ciphertext, Base64)", async () => {
    const { encryptText } = await import("@/lib/encryption");

    const encrypted = encryptText("Test");
    const parts = encrypted.split(":");

    expect(parts).toHaveLength(3);

    // Alle Teile muessen gueltige Base64-Strings sein
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    for (const part of parts) {
      expect(part).toMatch(base64Regex);
    }
  });
});
