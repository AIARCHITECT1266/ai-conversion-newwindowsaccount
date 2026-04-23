// ============================================================
// Dashboard-API: Scoring-Einstellungen
// GET:   scoringPrompt + qualificationLabels laden
// PATCH: scoringPrompt + qualificationLabels aktualisieren
// Auth:  getDashboardTenant (Cookie)
// ADR:   docs/decisions/adr-002-scoring-per-tenant.md
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/shared/db";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { auditLog } from "@/modules/compliance/audit-log";
import { getClientIp } from "@/shared/rate-limit";
import {
  DEFAULT_SCORING_PROMPT,
  DEFAULT_QUALIFICATION_LABELS,
  QualificationLabelsSchema,
  loadQualificationLabels,
} from "@/modules/bot/scoring";

// ---------- GET ----------

export async function GET() {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const data = await db.tenant.findUnique({
    where: { id: tenant.id },
    select: {
      scoringPrompt: true,
      qualificationLabels: true,
    },
  });

  if (!data) {
    return NextResponse.json({ error: "Tenant nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json({
    scoringPrompt: data.scoringPrompt ?? "",
    defaultScoringPrompt: DEFAULT_SCORING_PROMPT,
    qualificationLabels: loadQualificationLabels({
      qualificationLabels: data.qualificationLabels,
    }),
    defaultQualificationLabels: DEFAULT_QUALIFICATION_LABELS,
    hasCustomLabels: data.qualificationLabels !== null,
  });
}

// ---------- PATCH ----------
//
// scoringPrompt:   min 50 / max 30000 Zeichen, oder null = Default nutzen
// qualificationLabels: 5-Key-Objekt (Enum-Key-Exaktmatch), oder null = Default
const ScoringSettingsSchema = z.object({
  scoringPrompt: z
    .string()
    .min(50, "Scoring-Prompt zu kurz (mind. 50 Zeichen)")
    .max(30000, "Scoring-Prompt zu lang (max. 30.000 Zeichen)")
    .nullable(),
  qualificationLabels: QualificationLabelsSchema.nullable(),
});

export async function PATCH(req: NextRequest) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const rawBody: unknown = await req.json();
  const parseResult = ScoringSettingsSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Ungueltige Eingabe",
        details: parseResult.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { scoringPrompt, qualificationLabels } = parseResult.data;

  // Labels als Prisma-JSON serialisieren. Prisma unterscheidet zwischen
  // JSON-Wert `null` und DB-NULL — fuer "Default verwenden" brauchen wir
  // DbNull, damit die Spalte auf echtes SQL-NULL gesetzt wird.
  const labelsUpdate: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue =
    qualificationLabels === null ? Prisma.DbNull : (qualificationLabels as Prisma.InputJsonValue);

  await db.tenant.update({
    where: { id: tenant.id },
    data: {
      scoringPrompt: scoringPrompt,
      qualificationLabels: labelsUpdate,
    },
  });

  const ip = getClientIp(req);
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 16);
  auditLog("dashboard.scoring_updated", {
    tenantId: tenant.id,
    ip: ipHash,
    details: {
      promptLength: scoringPrompt?.length ?? 0,
      promptIsDefault: scoringPrompt === null,
      labelsAreCustom: qualificationLabels !== null,
    },
  });

  return NextResponse.json({ success: true });
}
