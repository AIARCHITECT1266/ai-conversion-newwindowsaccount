// ============================================================
// Zentrale Loader-Funktion fuer plan-spezifische System-Prompts
// Laedt automatisch den richtigen Prompt basierend auf dem
// Tenant-Plan (paddlePlan-Feld in der DB).
// Exportiert auch Branchen-Templates fuer das Onboarding.
// ============================================================

import type { PlanType } from "./base";
import { STARTER_SYSTEM_PROMPT } from "./starter";
import { GROWTH_SYSTEM_PROMPT, GROWTH_IMMOBILIEN_PROMPT } from "./growth";
import { PROFESSIONAL_SYSTEM_PROMPT } from "./professional";
import branchTemplates from "@/data/branch-templates.json";

// Re-exports fuer Zugriff von aussen
export type { PlanType } from "./base";
export { STARTER_SYSTEM_PROMPT } from "./starter";
export { GROWTH_SYSTEM_PROMPT, GROWTH_IMMOBILIEN_PROMPT } from "./growth";
export { PROFESSIONAL_SYSTEM_PROMPT } from "./professional";

// ============================================================
// Template-Engine: Universelle Platzhalter-Ersetzung
// ============================================================

/**
 * Ersetzt beliebige [KEY]-Platzhalter im Prompt.
 * Skalierbar: Neue Platzhalter in branch-templates.json
 * werden automatisch aufgeloest ohne Code-Aenderung.
 */
export function fillTemplate(
  basePrompt: string,
  vars: Record<string, string>
): string {
  let result = basePrompt;
  Object.entries(vars).forEach(([key, value]) => {
    result = result.replace(
      new RegExp(`\\[${key}\\]`, "g"),
      value || ""
    );
  });
  return result;
}

// ============================================================
// Branchen-Metadaten (Fallbacks fuer Templates ohne JSON-Eintrag)
// ============================================================

function getBranchDescription(id: string): string {
  const descriptions: Record<string, string> = {
    immobilien: "Verkauf, Bewertung und Vermittlung von Immobilien",
    sanitaer: "Badsanierung, Notfälle, Installationen",
    coaching: "Persönliche und berufliche Weiterentwicklung",
    finanzen: "Vermögensaufbau, Absicherung, Optimierung",
    education: "Weiterbildung und berufliche Neuorientierung",
    handwerk: "Handwerk & Dienstleistungen",
    generisch: "Universeller Vertriebsrahmen",
  };
  return descriptions[id] ?? "Branchenspezifischer Vertrieb";
}

function getBranchIcon(id: string): string {
  const icons: Record<string, string> = {
    immobilien: "\u{1F3E0}",
    sanitaer: "\u{1F6BF}",
    coaching: "\u{1F3AF}",
    finanzen: "\u{1F4B0}",
    education: "\u{1F393}",
    handwerk: "\u{1F527}",
    generisch: "\u{26A1}",
  };
  return icons[id] ?? "\u{1F4BC}";
}

// ============================================================
// Branchen-Templates (fuer das Onboarding-UI)
// Automatisch aus branch-templates.json generiert.
// Neue Branchen hinzufuegen = nur JSON erweitern, kein Code.
// ============================================================

export interface BranchenPromptVariables {
  botName: string;
  firmenname: string;
  branche: string;
  region: string;
}

export interface BranchenTemplate {
  id: string;
  label: string;
  description: string;
  icon: string;
  template: string;
}

/**
 * Ersetzt Platzhalter in einem Branchen-Template.
 */
export function fillPromptTemplate(
  template: string,
  vars: BranchenPromptVariables
): string {
  return template
    .replace(/\[BOT_NAME\]/g, vars.botName)
    .replace(/\[FIRMENNAME\]/g, vars.firmenname)
    .replace(/\[BRANCHE\]/g, vars.branche)
    .replace(/\[REGION\]/g, vars.region);
}

// Dynamisch aus JSON generiert – neue Branchen brauchen keinen Code
// handwerk und generisch sind nicht im JSON und werden statisch angehaengt
export const BRANCHEN_TEMPLATES: BranchenTemplate[] = [
  ...Object.entries(branchTemplates).map(([id, template]) => {
    const basePrompt =
      id === "immobilien" ? GROWTH_IMMOBILIEN_PROMPT : GROWTH_SYSTEM_PROMPT;

    let filledTemplate = basePrompt;

    // Nur Branchen mit placeholders verarbeiten
    if (template.placeholders && typeof template.placeholders === "object") {
      filledTemplate = fillTemplate(basePrompt, template.placeholders as Record<string, string>);
    }

    return {
      id,
      label: template.label,
      description: getBranchDescription(id),
      icon: getBranchIcon(id),
      template: filledTemplate,
    };
  }),
  // Statische Branchen ohne JSON-Eintrag
  {
    id: "handwerk",
    label: "Handwerk & Dienstleistung",
    description: getBranchDescription("handwerk"),
    icon: getBranchIcon("handwerk"),
    template: GROWTH_SYSTEM_PROMPT,
  },
  {
    id: "generisch",
    label: "Andere Branche",
    description: getBranchDescription("generisch"),
    icon: getBranchIcon("generisch"),
    template: GROWTH_SYSTEM_PROMPT,
  },
];

/**
 * Gibt das Template fuer eine Branche zurueck.
 * Fallback auf generisches Template wenn ID nicht gefunden.
 */
export function getTemplateById(id: string): BranchenTemplate {
  return (
    BRANCHEN_TEMPLATES.find((t) => t.id === id) ??
    BRANCHEN_TEMPLATES[BRANCHEN_TEMPLATES.length - 1]
  );
}

// ---------- Plan → Prompt Zuordnung ----------

const PLAN_PROMPTS: Record<PlanType, string> = {
  STARTER: STARTER_SYSTEM_PROMPT,
  GROWTH: GROWTH_SYSTEM_PROMPT,
  PROFESSIONAL: PROFESSIONAL_SYSTEM_PROMPT,
  ENTERPRISE: PROFESSIONAL_SYSTEM_PROMPT, // Enterprise nutzt Professional als Basis
};

// ---------- Platzhalter ----------

interface PromptVariables {
  botName?: string;
  firmenname: string;
  branche?: string;
  region?: string;
}

/**
 * Ersetzt Platzhalter im Prompt-Template mit den Tenant-Daten.
 */
function fillVariables(template: string, vars: PromptVariables): string {
  return template
    .replace(/\[BOT_NAME\]/g, vars.botName || "Max")
    .replace(/\[FIRMENNAME\]/g, vars.firmenname)
    .replace(/\[BRANCHE\]/g, vars.branche || "Vertrieb")
    .replace(/\[REGION\]/g, vars.region || "DACH-Raum");
}

// ---------- Plan-Erkennung aus Paddle-Plan-String ----------

/**
 * Erkennt den Plan-Typ aus dem paddlePlan-String des Tenants.
 * Paddle speichert Strings wie "starter", "growth_monthly", "pro_yearly" etc.
 * Fallback: STARTER wenn nicht erkennbar.
 */
export function detectPlanType(paddlePlan: string | null | undefined): PlanType {
  if (!paddlePlan) return "STARTER";

  const normalized = paddlePlan.toLowerCase();

  if (normalized.includes("professional") || normalized.includes("pro")) {
    return "PROFESSIONAL";
  }
  if (normalized.includes("enterprise")) {
    return "ENTERPRISE";
  }
  if (normalized.includes("growth")) {
    return "GROWTH";
  }

  return "STARTER";
}

// ---------- Hauptfunktion: Prompt laden ----------

/**
 * Laedt den passenden System-Prompt basierend auf dem Tenant-Plan.
 *
 * Logik:
 * 1. Wenn der Tenant einen eigenen systemPrompt hat (nicht leer) → diesen verwenden
 * 2. Sonst: Plan-spezifischen Default-Prompt laden und Platzhalter ersetzen
 *
 * @param tenant - Tenant-Daten aus der DB
 * @returns Fertiger System-Prompt (bereit fuer Claude)
 */
export function loadSystemPrompt(tenant: {
  systemPrompt: string | null;
  paddlePlan?: string | null;
  brandName: string;
  name: string;
}): string {
  // 1. Tenant hat eigenen Prompt → direkt verwenden
  if (tenant.systemPrompt && tenant.systemPrompt.trim().length > 0) {
    return tenant.systemPrompt;
  }

  // 2. Plan-spezifischen Default-Prompt laden
  const planType = detectPlanType(tenant.paddlePlan);
  const template = PLAN_PROMPTS[planType];

  // 3. Platzhalter mit Tenant-Daten fuellen
  return fillVariables(template, {
    firmenname: tenant.brandName || tenant.name,
  });
}

/**
 * Laedt einen branchenspezifischen Prompt (z.B. Immobilien fuer Growth).
 * Nuetzlich wenn der Tenant im Onboarding eine Branche gewaehlt hat.
 *
 * @param plan - Plan-Typ
 * @param branche - Branchen-ID ("immobilien", "coaching", etc.)
 * @param vars - Platzhalter-Variablen
 * @returns Fertiger System-Prompt
 */
export function loadBranchenPrompt(
  plan: PlanType,
  branche: string,
  vars: PromptVariables
): string {
  // Immobilien-Spezialisierung fuer Growth und hoeher
  if (branche === "immobilien" && (plan === "GROWTH" || plan === "PROFESSIONAL" || plan === "ENTERPRISE")) {
    return fillVariables(GROWTH_IMMOBILIEN_PROMPT, vars);
  }

  // Standard: Plan-spezifischer Prompt mit Variablen
  const template = PLAN_PROMPTS[plan];
  return fillVariables(template, vars);
}

/**
 * Gibt die verfuegbaren Features pro Plan zurueck.
 * Nuetzlich fuer UI-Darstellung und Feature-Gating.
 */
export function getPlanFeatures(plan: PlanType): {
  disc: boolean;
  einwandHandling: boolean;
  socialProof: boolean;
  followUp: boolean;
  eskalation: boolean;
  coaching: boolean;
  personalisierung: boolean;
} {
  switch (plan) {
    case "STARTER":
      return {
        disc: false,
        einwandHandling: false,
        socialProof: false,
        followUp: false,
        eskalation: false,
        coaching: false,
        personalisierung: false,
      };
    case "GROWTH":
      return {
        disc: true,
        einwandHandling: true,
        socialProof: true,
        followUp: true,
        eskalation: true,
        coaching: false,
        personalisierung: false,
      };
    case "PROFESSIONAL":
    case "ENTERPRISE":
      return {
        disc: true,
        einwandHandling: true,
        socialProof: true,
        followUp: true,
        eskalation: true,
        coaching: true,
        personalisierung: true,
      };
  }
}
