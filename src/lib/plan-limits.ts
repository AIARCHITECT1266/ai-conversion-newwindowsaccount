// ============================================================
// Plan-Limits & Feature-Gating
// Prueft ob ein Tenant sein Kontingent fuer eine Ressource
// (Campaigns, Broadcasts, Leads) ausgeschoepft hat.
// ============================================================

import { db } from "@/shared/db";
import { detectPlanType } from "@/modules/bot/system-prompts";

const PLAN_LIMITS = {
  STARTER:      { maxCampaigns: 1,        maxBroadcasts: 1,        maxLeads: 50 },
  GROWTH:       { maxCampaigns: 5,        maxBroadcasts: 10,       maxLeads: 500 },
  PROFESSIONAL: { maxCampaigns: 20,       maxBroadcasts: 50,       maxLeads: 5000 },
  ENTERPRISE:   { maxCampaigns: Infinity, maxBroadcasts: Infinity, maxLeads: Infinity },
} as const;

const RESOURCE_CONFIG = {
  campaigns:  { limitKey: "maxCampaigns",  model: "campaign" },
  broadcasts: { limitKey: "maxBroadcasts", model: "broadcast" },
  leads:      { limitKey: "maxLeads",      model: "lead" },
} as const;

export async function checkLimit(
  tenantId: string,
  paddlePlan: string | null,
  resource: "campaigns" | "broadcasts" | "leads",
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const plan = detectPlanType(paddlePlan);
  const config = RESOURCE_CONFIG[resource];
  const limit = PLAN_LIMITS[plan][config.limitKey];

  // ENTERPRISE: immer erlaubt
  if (limit === Infinity) {
    return { allowed: true, current: 0, limit };
  }

  // Prisma nutzt Singular-Namen (campaign, broadcast, lead)
  const current =
    config.model === "campaign"  ? await db.campaign.count({ where: { tenantId } }) :
    config.model === "broadcast" ? await db.broadcast.count({ where: { tenantId } }) :
                                   await db.lead.count({ where: { tenantId } });

  return { allowed: current < limit, current, limit };
}

// ============================================================
// Feature-Flags pro Plan
//
// Plan-Gating fuer Features, die entweder verfuegbar oder nicht
// verfuegbar sind (ja/nein-Entscheidung), im Gegensatz zu
// checkLimit() das Kontingente zaehlt (wie viele?).
//
// Spec-Bezug (CLAUDE.md Regel 5):
// WEB_WIDGET_INTEGRATION.md Phase 6 schrieb wortlich vor:
//   "await checkLimit(tenantId, paddlePlan, 'web_widget');"
// Das haette checkLimit zu einem polymorphen Count/Feature-Hybrid
// gemacht, was die Count-Semantik verwaessert. hasPlanFeature ist
// die saubere Trennung: reiner Feature-Check, kein DB-Call, kein
// current/limit-Ballast im Return-Shape. Die Abweichung von der
// wortlauts-Spec ist in docs/decisions/phase-6-dashboard-widget.md
// unter "Feature-Flag-Helper-Split" begruendet.
// ============================================================

export function hasPlanFeature(
  paddlePlan: string | null,
  feature: "web_widget",
): boolean {
  const plan = detectPlanType(paddlePlan);

  if (feature === "web_widget") {
    // STARTER hat kein Web-Widget. GROWTH, PROFESSIONAL und
    // ENTERPRISE haben es inkludiert.
    return plan !== "STARTER";
  }

  // Unerreichbar bei gueltiger feature-Union, aber TS will
  // einen return-Pfad fuer alle Code-Wege.
  return false;
}
