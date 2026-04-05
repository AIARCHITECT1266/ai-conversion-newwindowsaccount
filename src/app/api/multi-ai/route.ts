import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// ---------- API-Client Singletons (Lazy-Init) ----------

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// ---------- Typen ----------

interface ModelResult {
  model: string;
  response: string;
  durationMs: number;
  error?: string;
}

// ---------- Zod-Schema ----------

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt darf nicht leer sein").max(5000, "Prompt darf maximal 5.000 Zeichen lang sein"),
  models: z.array(z.string()).min(1, "Mindestens ein Modell muss ausgewählt sein"),
});

// ---------- Modell-Handler ----------

async function queryClaude(prompt: string): Promise<ModelResult> {
  const start = Date.now();
  try {
    const client = getAnthropic();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const message = await client.messages.create(
        {
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        },
        { signal: controller.signal }
      );
      const text =
        message.content[0]?.type === "text" ? message.content[0].text : "";
      return { model: "claude", response: text, durationMs: Date.now() - start };
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return {
      model: "claude",
      response: "",
      durationMs: Date.now() - start,
      error: "Anfrage an Claude fehlgeschlagen",
    };
  }
}

async function queryGpt4o(prompt: string): Promise<ModelResult> {
  const start = Date.now();
  try {
    const client = getOpenAI();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const completion = await client.chat.completions.create(
        {
          model: "gpt-4o",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        },
        { signal: controller.signal }
      );
      const text = completion.choices[0]?.message?.content ?? "";
      return { model: "gpt4o", response: text, durationMs: Date.now() - start };
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return {
      model: "gpt4o",
      response: "",
      durationMs: Date.now() - start,
      error: "Anfrage an GPT-4o fehlgeschlagen",
    };
  }
}

// Gemini Pro – Platzhalter (GOOGLE_AI_API_KEY benötigt)
async function queryGemini(prompt: string): Promise<ModelResult> {
  const start = Date.now();
  if (!process.env.GOOGLE_AI_API_KEY) {
    return {
      model: "gemini",
      response: "",
      durationMs: Date.now() - start,
      error: "GOOGLE_AI_API_KEY nicht konfiguriert",
    };
  }
  void prompt;
  return {
    model: "gemini",
    response: "",
    durationMs: Date.now() - start,
    error: "Gemini-Integration noch nicht implementiert",
  };
}

// Mistral – Platzhalter (MISTRAL_API_KEY benötigt)
async function queryMistral(prompt: string): Promise<ModelResult> {
  const start = Date.now();
  if (!process.env.MISTRAL_API_KEY) {
    return {
      model: "mistral",
      response: "",
      durationMs: Date.now() - start,
      error: "MISTRAL_API_KEY nicht konfiguriert",
    };
  }
  void prompt;
  return {
    model: "mistral",
    response: "",
    durationMs: Date.now() - start,
    error: "Mistral-Integration noch nicht implementiert",
  };
}

// Modell-Zuordnung
const modelHandlers: Record<string, (prompt: string) => Promise<ModelResult>> = {
  claude: queryClaude,
  gpt4o: queryGpt4o,
  gemini: queryGemini,
  mistral: queryMistral,
};

export async function POST(request: NextRequest) {
  // Rate-Limiting: 10 Anfragen pro Minute pro IP
  const ip = getClientIp(request);
  const limit = await checkRateLimit(`multi-ai:${ip}`, { max: 10, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 });
  }

  try {
    const rawBody: unknown = await request.json();
    const parseResult = requestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errors = parseResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { prompt, models } = parseResult.data;

    // Nur gültige Modelle zulassen
    const validModels = models.filter((m) => m in modelHandlers);

    if (validModels.length === 0) {
      return NextResponse.json(
        { error: "Keine gültigen Modelle angegeben. Erlaubt: claude, gpt4o, gemini, mistral" },
        { status: 400 }
      );
    }

    // Parallele Anfragen an alle aktivierten Modelle
    const results = await Promise.all(
      validModels.map((model) => modelHandlers[model](prompt))
    );

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error("[Multi-AI] Unerwarteter Fehler", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
