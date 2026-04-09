import { NextRequest, NextResponse } from "next/server";
import {
  STARTER_SYSTEM_PROMPT,
  GROWTH_SYSTEM_PROMPT,
  PROFESSIONAL_SYSTEM_PROMPT,
} from "@/modules/bot/system-prompts";
import branchTemplates from "@/data/branch-templates.json";

const PROMPTS: Record<string, string> = {
  starter: STARTER_SYSTEM_PROMPT,
  growth: GROWTH_SYSTEM_PROMPT,
  professional: PROFESSIONAL_SYSTEM_PROMPT,
};

interface BranchTemplate {
  label: string;
  firmenname_placeholder: string;
  einstieg: string;
  termin_bridge: string;
  einwaende: Record<string, string>;
}

const BRANCHES = branchTemplates as Record<string, BranchTemplate>;

export async function GET(req: NextRequest) {
  const plan = req.nextUrl.searchParams.get("plan")?.toLowerCase();
  const branch = req.nextUrl.searchParams.get("branch")?.toLowerCase() ?? null;

  if (!plan || !PROMPTS[plan]) {
    return NextResponse.json(
      { error: "Ungueltiger Plan. Erlaubt: starter, growth, professional" },
      { status: 400 },
    );
  }

  if (branch && !BRANCHES[branch]) {
    return NextResponse.json(
      { error: `Ungueltige Branche. Erlaubt: ${Object.keys(BRANCHES).join(", ")}` },
      { status: 400 },
    );
  }

  let prompt = PROMPTS[plan];

  // Branchen-spezifische Platzhalter ersetzen
  if (branch && BRANCHES[branch]) {
    const tpl = BRANCHES[branch];
    prompt = prompt
      .replace(/\[BRANCHE\]/g, tpl.label)
      .replace(/\[EINSTIEG\]/g, tpl.einstieg)
      .replace(/\[TERMIN_BRIDGE\]/g, tpl.termin_bridge);
  }

  return NextResponse.json({
    prompt,
    branch: branch ?? null,
    branches: Object.entries(BRANCHES).map(([id, t]) => ({ id, label: t.label })),
  });
}
