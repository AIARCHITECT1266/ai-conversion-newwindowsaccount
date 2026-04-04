# AI Conversion

Multi-tenant SaaS platform for automated WhatsApp sales conversations and lead qualification, powered by AI.

## Overview

AI Conversion connects WhatsApp Business accounts to AI-powered sales bots. Each tenant gets an isolated environment with its own branding, system prompt, and conversation history. Leads are automatically scored and qualified through natural conversations.

### Key Features

- **Multi-Tenant Architecture** — Isolated data per tenant with custom branding and system prompts
- **WhatsApp Integration** — Cloud API v21.0 webhook with consent tracking
- **AI Sales Conversations** — Anthropic Claude generates context-aware sales dialogues
- **Lead Scoring** — OpenAI GPT-4o scores leads 0-100 based on conversation signals
- **Admin Dashboard** — Tenant management with create, edit, and delete
- **Tenant Dashboard** — Real-time KPIs, conversation history, and lead pipeline
- **GDPR Compliant** — AES-256-GCM message encryption, PostgreSQL hosted in Frankfurt (eu-central-1)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, Framer Motion |
| ORM | Prisma 7 with PrismaPg driver adapter |
| Database | PostgreSQL (Frankfurt, GDPR-compliant) |
| AI | Anthropic Claude (conversations), OpenAI GPT-4o (scoring) |
| Messaging | WhatsApp Cloud API v21.0 |
| Encryption | AES-256-GCM for message content |
| Hosting | Vercel |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/              # Admin dashboard (tenant management)
│   ├── dashboard/          # Tenant dashboard (KPIs, conversations)
│   ├── api/
│   │   ├── admin/          # Admin API (stats, tenants CRUD)
│   │   ├── dashboard/      # Dashboard API (stats, conversations)
│   │   ├── platform-bot/   # Embedded assistant API
│   │   ├── webhook/        # WhatsApp webhook handler
│   │   ├── multi-ai/       # Multi-model comparison
│   │   └── session-summary/# Notion session logging
│   ├── v2/                 # Landing page v2
│   └── (legal pages)       # datenschutz, impressum, faq
├── components/             # Reusable UI components (landing page)
├── lib/
│   ├── db.ts               # Prisma client singleton
│   ├── encryption.ts       # AES-256-GCM encryption
│   ├── tenant.ts           # Tenant resolution by phone ID
│   ├── whatsapp.ts         # WhatsApp message sender
│   ├── notion.ts           # Notion API integration
│   ├── utils.ts            # Tailwind merge utility
│   └── bot/
│       ├── handler.ts      # Central bot orchestration
│       ├── claude.ts       # Anthropic Claude integration
│       └── gpt.ts          # OpenAI GPT-4o lead scoring
└── generated/prisma/       # Auto-generated Prisma types
```

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL database
- WhatsApp Business API access
- Anthropic and OpenAI API keys

### Installation

```bash
git clone <repo-url>
cd AI-Conversion-New
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```
DATABASE_URL=             # PostgreSQL connection string
ANTHROPIC_API_KEY=        # Anthropic API key
OPENAI_API_KEY=           # OpenAI API key
WHATSAPP_TOKEN=           # WhatsApp Cloud API token
WEBHOOK_VERIFY_TOKEN=     # Webhook verification token
ENCRYPTION_KEY=           # AES-256 encryption key (hex)
NOTION_API_KEY=           # Notion integration token (optional)
NOTION_ROADMAP_DB_ID=     # Notion database ID (optional)
```

### Database

```bash
npx prisma generate
npx prisma db push
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page, `/admin` for tenant management, `/dashboard` for the tenant dashboard.

## Deployment

```bash
npx next build          # Verify build succeeds
vercel --prod           # Deploy to production
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/webhook/whatsapp` | GET/POST | WhatsApp webhook verification and message handling |
| `/api/admin/tenants` | GET/POST | List and create tenants |
| `/api/admin/tenants/[id]` | GET/PUT/DELETE | Tenant CRUD operations |
| `/api/admin/stats` | GET | Platform-wide statistics |
| `/api/dashboard/stats` | GET | Tenant KPIs and pipeline data |
| `/api/dashboard/conversations` | GET | Tenant conversation history |
| `/api/platform-bot` | POST | Embedded AI assistant |
| `/api/multi-ai` | POST | Multi-model AI comparison |

## License

Proprietary. All rights reserved.
