# AI Asset Studio

Multi-Model Bildgenerierung und -bearbeitung für AI Conversion Tenants.

## Struktur

```
modules/ai-asset-studio/
├── lib/
│   ├── models/          # Multi-Model-Handler (Grok, Claude, Gemini, Flux)
│   ├── credits.ts       # Credit-Verwaltung und Abrechnung
│   ├── edit.ts          # Bildbearbeitungs-Pipeline (Sharp)
│   └── types.ts         # Shared Types
├── api/                 # Next.js API Route Handler
│   ├── generate/
│   └── edit/
├── cli/                 # CLI Entry-Point
│   └── index.ts
└── components/          # UI-Komponenten (Dashboard)
```

## CLI Nutzung

```bash
npx tsx modules/ai-asset-studio/cli/index.ts generate "Beschreibung" --model grok --variations 4
npx tsx modules/ai-asset-studio/cli/index.ts edit asset.png --sharpen 75 --round-corners 18 --brand-kit "premium-gold"
```
