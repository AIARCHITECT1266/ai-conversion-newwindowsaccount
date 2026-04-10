// ============================================================
// Web-Widget Session-Token
//
// Verwaltet Tokens, die eine Widget-Konversation identifizieren.
// Das Token ist KEIN Auth-Token im klassischen Sinn - es
// identifiziert nur die Conversation serverseitig. Gueltigkeit
// beschraenkt durch:
//   - Schema-Unique auf widgetSessionToken
//   - channel === "WEB"
//   - status !== "CLOSED"
//   - createdAt juenger als 24 Stunden
//
// Entscheidung 1 (docs/decisions/phase-0-decisions.md):
// crypto.randomBytes statt nanoid, keine neue Dependency.
// ============================================================

import { randomBytes, createHash } from "crypto";
import { db } from "@/shared/db";
import type { Conversation } from "@/generated/prisma/client";

// Session-TTL: 24 Stunden. Aeltere Tokens gelten als abgelaufen.
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Generiert ein neues Widget-Session-Token.
 * 16 Bytes = 128 Bit Entropie (deutlich mehr als Public Key,
 * weil das Token de-facto-Auth fuer die Conversation ist).
 */
export function generateSessionToken(): string {
  return `ws_${randomBytes(16).toString("base64url")}`;
}

/**
 * Hasht einen Session-Token fuer die Verwendung als Rate-Limit-
 * Schluessel. Verhindert dass Klartext-Tokens in Upstash-Cache-Keys
 * (oder anderen Backend-Logs) landen.
 *
 * SHA-256, abgeschnitten auf 16 Hex-Zeichen: ausreichend Eindeutigkeit
 * fuer Rate-Limiting (64 Bit) ohne den Schluessel unnoetig aufzublaehen.
 */
export function hashTokenForRateLimit(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 16);
}

/**
 * Prueft ein Session-Token und gibt die zugehoerige Conversation
 * zurueck - oder null, wenn das Token ungueltig, abgelaufen,
 * geschlossen oder von einem anderen Kanal stammt.
 *
 * tenantId kommt aus der Conversation selbst; der Caller muss
 * sie NICHT als Parameter liefern.
 */
export async function verifySessionToken(
  token: string,
): Promise<Conversation | null> {
  // findUnique nutzt das @unique aus Phase 3a.5
  const conversation = await db.conversation.findUnique({
    where: { widgetSessionToken: token },
  });

  if (!conversation) return null;

  // Strenge Validierung: Kanal, Status, Alter
  if (conversation.channel !== "WEB") return null;
  if (conversation.status === "CLOSED") return null;

  const ageMs = Date.now() - conversation.createdAt.getTime();
  if (ageMs > SESSION_TTL_MS) return null;

  return conversation;
}
