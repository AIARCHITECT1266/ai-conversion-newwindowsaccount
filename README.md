# AI Conversion

Multi-tenant SaaS platform for automated WhatsApp sales conversations and lead qualification, powered by AI.

## Overview

AI Conversion connects WhatsApp Business accounts to AI-powered sales bots. Each tenant gets an isolated environment with its own branding, system prompt, and conversation history. Leads are automatically scored and qualified through natural conversations.

### Key Features

- **Multi-Tenant Architecture** — Isolated data per tenant with custom branding and system prompts
- **WhatsApp Integration** — Cloud API v21.0 webhook with consent tracking
- **AI Sales Conversations** — Anthropic Claude generates context-aware sales dialogues
- **Lead Scoring** — OpenAI GPT-4o scores leads 0-100 based on conversation signals
- **Stripe Payments** — Checkout Sessions with subscriptions, setup fees, SEPA and card support
- **Automatic Provisioning** — Tenant created automatically after successful Stripe payment
- **Lead Notifications** — Hot-lead email alerts via Resend when score > 70
- **Admin Dashboard** — Tenant management with create, edit, and delete
- **Tenant Dashboard** — Real-time KPIs, conversation history, and lead pipeline
- **Premium Pricing Page** — Gold/purple design with animated chat mockup, ROI counters, feature comparison
- **Unified Navigation** — Shared responsive nav across all public pages with mobile hamburger menu
- **GDPR Compliant** — AES-256-GCM message encryption, PostgreSQL hosted in Frankfurt (eu-central-1)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, Framer Motion, Lucide React |
| ORM | Prisma 7 with PrismaPg driver adapter |
| Database | PostgreSQL (Frankfurt, GDPR-compliant) |
| AI | Anthropic Claude (conversations), OpenAI GPT-4o (scoring) |
| Messaging | WhatsApp Cloud API v21.0 |
| Payments | Stripe (Checkout, Subscriptions, Webhooks) |
| Email | Resend (lead notifications) |
| Encryption | AES-256-GCM for message content |
| Hosting | Vercel (Fluid Compute) |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── pricing/            # Premium pricing page
│   ├── admin/              # Admin dashboard (tenant management)
│   ├── dashboard/          # Tenant dashboard (KPIs, conversations)
│   ├── onboarding/         # Post-payment onboarding wizard
│   ├── multi-ai/           # Multi-model AI comparison
│   ├── faq/                # FAQ page
│   ├── api/
│   │   ├── admin/          # Admin API (login, stats, tenants CRUD)
│   │   ├── dashboard/      # Dashboard API (me, stats, conversations)
│   │   ├── stripe/         # Stripe checkout + webhook
│   │   ├── webhook/        # WhatsApp webhook handler
│   │   ├── platform-bot/   # Embedded assistant API
│   │   ├── multi-ai/       # Multi-model comparison
│   │   ├── cron/           # Scheduled jobs (GDPR cleanup)
│   │   └── session-summary/# Notion session logging
│   ├── v2/                 # Landing page v2
│   └── (legal pages)       # datenschutz, impressum
├── components/             # Reusable UI (Navigation, Hero, Pricing, Footer etc.)
├── lib/
│   ├── db.ts               # Prisma client singleton
│   ├── stripe.ts           # Stripe plan config and helpers
│   ├── lead-notification.ts# Hot-lead email alerts via Resend
│   ├── encryption.ts       # AES-256-GCM encryption
│   ├── tenant.ts           # Tenant resolution by phone ID
│   ├── whatsapp.ts         # WhatsApp message sender
│   ├── notion.ts           # Notion API integration
│   └── bot/
│       ├── handler.ts      # Central bot orchestration
│       ├── claude.ts       # Anthropic Claude integration
│       └── gpt.ts          # OpenAI GPT-4o lead scoring
└── generated/prisma/       # Auto-generated Prisma types
```

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL database (Frankfurt region recommended)
- WhatsApp Business API access
- Anthropic and OpenAI API keys
- Stripe account (for payments)
- Resend account (for email notifications)

### Installation

```bash
git clone <repo-url>
cd AI-Conversion-New
npm install
```

### Environment Variables

Set in `.env.local` for local dev, and in Vercel Dashboard for production:

```
# Database
DATABASE_URL=                       # PostgreSQL connection string

# AI
ANTHROPIC_API_KEY=                  # Anthropic API key
OPENAI_API_KEY=                     # OpenAI API key

# WhatsApp
WHATSAPP_TOKEN=                     # WhatsApp Cloud API token
WHATSAPP_PHONE_ID=                  # Default Phone Number ID
WHATSAPP_VERIFY_TOKEN=              # Webhook verification token
WHATSAPP_APP_SECRET=                # Webhook signature secret

# Admin
ADMIN_SECRET=                       # Admin dashboard access secret
ENCRYPTION_KEY=                     # AES-256 encryption key (hex)

# Stripe
STRIPE_SECRET_KEY=                  # Stripe API secret key
STRIPE_WEBHOOK_SECRET=              # Stripe webhook signing secret
STRIPE_PRICE_STARTER_MONTHLY=       # Price ID for Starter monthly
STRIPE_PRICE_STARTER_YEARLY=        # Price ID for Starter yearly
STRIPE_PRICE_STARTER_SETUP=         # Price ID for Starter setup fee
STRIPE_PRICE_GROWTH_MONTHLY=        # Price ID for Growth monthly
STRIPE_PRICE_GROWTH_YEARLY=         # Price ID for Growth yearly
STRIPE_PRICE_GROWTH_SETUP=          # Price ID for Growth setup fee
STRIPE_PRICE_PRO_MONTHLY=           # Price ID for Professional monthly
STRIPE_PRICE_PRO_YEARLY=            # Price ID for Professional yearly
STRIPE_PRICE_PRO_SETUP=             # Price ID for Professional setup fee

# Email
RESEND_API_KEY=                     # Resend API key for notifications

# App
NEXT_PUBLIC_APP_URL=https://ai-conversion.ai

# Optional
NOTION_API_KEY=                     # Notion integration token
NOTION_ROADMAP_DB_ID=               # Notion database ID
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
| `/api/admin/login` | POST | Admin authentication |
| `/api/admin/tenants` | GET/POST | List and create tenants |
| `/api/admin/tenants/[id]` | GET/PATCH | Tenant detail and update |
| `/api/admin/stats` | GET | Platform-wide statistics |
| `/api/dashboard/me` | GET | Current tenant info (via magic-link token) |
| `/api/dashboard/stats` | GET | Tenant KPIs and pipeline data |
| `/api/dashboard/conversations` | GET | Tenant conversation history |
| `/api/stripe/checkout` | POST | Create Stripe Checkout Session |
| `/api/stripe/webhook` | POST | Handle Stripe events (auto-creates tenant) |
| `/api/platform-bot` | POST | Embedded AI assistant |
| `/api/multi-ai` | POST | Multi-model AI comparison |
| `/api/cron/cleanup` | POST | GDPR data retention cleanup |

## License

Proprietary. All rights reserved.
