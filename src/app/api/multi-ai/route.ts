import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// Typen für die Anfrage
interface MultiAiRequest {
  prompt: string;
  models: string[];
}

// Typ für ein einzelnes Modell-Ergebnis
interface ModelResult {
  model: string;
  response: string;
  durationMs: number;
  error?: string;
}

// Claude Sonnet Anfrage
async function queryClaude(prompt: string): Promise<ModelResult> {
  const start = Date.now();
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    return { model: "claude", response: text, durationMs: Date.now() - start };
  } catch {
    return {
      model: "claude",
      response: "",
      durationMs: Date.now() - start,
      error: "Anfrage an Claude fehlgeschlagen",
    };
  }
}

// GPT-4o Anfrage
async function queryGpt4o(prompt: string): Promise<ModelResult> {
  const start = Date.now();
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const text = completion.choices[0]?.message?.content ?? "";
    return { model: "gpt4o", response: text, durationMs: Date.now() - start };
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
      error: "GOOGLE_AI_API_KEY fehlt in .env.local",
    };
  }
  // Platzhalter – Google AI SDK hier einbinden wenn Key vorhanden
  void prompt;
  return {
    model: "gemini",
    response: "",
    durationMs: Date.now() - start,
    error: "Gemini-Integration noch nicht implementiert – GOOGLE_AI_API_KEY in .env.local setzen",
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
      error: "MISTRAL_API_KEY fehlt in .env.local",
    };
  }
  void prompt;
  return {
    model: "mistral",
    response: "",
    durationMs: Date.now() - start,
    error: "Mistral-Integration noch nicht implementiert – MISTRAL_API_KEY in .env.local setzen",
  };
}

// Modell-Zuordnung
const modelHandlers: Record<string, (prompt: string) => Promise<ModelResult>> =
  {
    claude: queryClaude,
    gpt4o: queryGpt4o,
    gemini: queryGemini,
    mistral: queryMistral,
  };

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MultiAiRequest;

    if (!body.prompt?.trim()) {
      return NextResponse.json(
        { error: "Prompt darf nicht leer sein" },
        { status: 400 }
      );
    }

    if (!body.models?.length) {
      return NextResponse.json(
        { error: "Mindestens ein Modell muss ausgewählt sein" },
        { status: 400 }
      );
    }

    // Nur gültige Modelle zulassen
    const validModels = body.models.filter((m) => m in modelHandlers);

    // Parallele Anfragen an alle aktivierten Modelle
    const results = await Promise.all(
      validModels.map((model) => modelHandlers[model](body.prompt))
    );

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error("[Multi-AI] Unerwarteter Fehler", { error });
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
