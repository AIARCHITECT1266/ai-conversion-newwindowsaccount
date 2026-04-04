// ============================================================
// AES-256-GCM Verschlüsselung – DSGVO-konforme Datenspeicherung
// Nachrichteninhalte werden vor dem Speichern verschlüsselt
// und erst beim Abruf entschlüsselt.
//
// Umgebungsvariable: ENCRYPTION_KEY (32 Byte, hex-kodiert, 64 Zeichen)
// Erzeugen mit: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// ============================================================

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 Bit – empfohlen für GCM
const AUTH_TAG_LENGTH = 16; // 128 Bit

/**
 * Validiert und liest den Verschlüsselungsschlüssel beim Modul-Load.
 * Fehler werden sofort beim Serverstart erkannt, nicht erst beim ersten Request.
 */
function validateEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;

  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      "[Encryption] ENCRYPTION_KEY fehlt oder ist ungueltig. " +
        "Erwartet: 64 Hex-Zeichen (32 Byte). " +
        'Erzeugen mit: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error("[Encryption] ENCRYPTION_KEY ergibt keinen 32-Byte-Schluessel");
  }

  return key;
}

// Key wird beim Modul-Load validiert – Fehler sofort beim Serverstart
const ENCRYPTION_KEY_BUFFER = validateEncryptionKey();

/**
 * Verschlüsselt einen Klartext mit AES-256-GCM.
 * Rückgabe: Base64-String im Format [IV]:[AuthTag]:[Ciphertext]
 *
 * @param plaintext - Der zu verschlüsselnde Text
 */
export function encryptText(plaintext: string): string {
  const key = ENCRYPTION_KEY_BUFFER;
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (alle Base64-kodiert)
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Entschlüsselt einen mit encryptText verschlüsselten String.
 *
 * @param encryptedData - Verschlüsselter String im Format [IV]:[AuthTag]:[Ciphertext]
 */
export function decryptText(encryptedData: string): string {
  const key = ENCRYPTION_KEY_BUFFER;

  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("[Encryption] Ungültiges Datenformat – erwartet IV:AuthTag:Ciphertext");
  }

  const iv = Buffer.from(parts[0], "base64");
  const authTag = Buffer.from(parts[1], "base64");
  const ciphertext = Buffer.from(parts[2], "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
