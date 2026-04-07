-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'DOCUMENT', 'LOCATION', 'TEMPLATE');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('PENDING', 'SENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "LeadQualification" AS ENUM ('UNQUALIFIED', 'MARKETING_QUALIFIED', 'SALES_QUALIFIED', 'OPPORTUNITY', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'APPOINTMENT_SET', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('NEU', 'QUALIFIZIERT', 'TERMIN', 'ANGEBOT', 'GEWONNEN');

-- CreateEnum
CREATE TYPE "AssetModel" AS ENUM ('GROK', 'CLAUDE', 'GEMINI', 'FLUX');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED', 'EDITED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "whatsappPhoneId" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "brandColor" TEXT NOT NULL DEFAULT '#000000',
    "retentionDays" INTEGER NOT NULL DEFAULT 90,
    "dashboardToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paddleCustomerId" TEXT,
    "paddleSubscriptionId" TEXT,
    "paddlePlan" TEXT,
    "paddleStatus" TEXT DEFAULT 'inactive',
    "billingEmail" TEXT,
    "hubspotApiKey" TEXT,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "language" TEXT NOT NULL DEFAULT 'de',
    "campaignSlug" TEXT,
    "leadSource" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "contentEncrypted" TEXT NOT NULL,
    "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "qualification" "LeadQualification" NOT NULL DEFAULT 'UNQUALIFIED',
    "appointmentAt" TIMESTAMP(3),
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "pipelineStatus" "PipelineStatus" NOT NULL DEFAULT 'NEU',
    "dealValue" DOUBLE PRECISION,
    "notes" TEXT,
    "followUpCount" INTEGER NOT NULL DEFAULT 0,
    "lastFollowUpAt" TIMESTAMP(3),
    "aiSummary" TEXT,
    "aiSummaryAt" TIMESTAMP(3),
    "predictiveScore" TEXT,
    "predictiveScoreAt" TIMESTAMP(3),
    "campaignId" TEXT,
    "abTestVariant" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ONBOARDING',
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "milestones" TEXT,
    "notes" TEXT,
    "docsGenerated" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "branche" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "beschreibung" TEXT,
    "briefing" TEXT NOT NULL,
    "openers" TEXT NOT NULL,
    "abVarianten" TEXT,
    "ziele" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ab_tests" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "variantA" TEXT NOT NULL,
    "variantB" TEXT NOT NULL,
    "sendsA" INTEGER NOT NULL DEFAULT 0,
    "sendsB" INTEGER NOT NULL DEFAULT 0,
    "responsesA" INTEGER NOT NULL DEFAULT 0,
    "responsesB" INTEGER NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "ab_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcasts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT,
    "message" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "status" "BroadcastStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_recipients" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "broadcast_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_messages" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "originalPrompt" TEXT NOT NULL,
    "modelUsed" "AssetModel" NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'PENDING',
    "imageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "exportedFormats" TEXT,
    "versionHistory" TEXT,
    "creditsUsed" INTEGER NOT NULL DEFAULT 1,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER,
    "editParams" TEXT,
    "brandKit" TEXT,
    "tags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_credits" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "monthlyIncluded" INTEGER NOT NULL DEFAULT 50,
    "used" INTEGER NOT NULL DEFAULT 0,
    "bonusCredits" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_asset_models" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "model" "AssetModel" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "apiKeyRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_asset_models_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_whatsappPhoneId_key" ON "tenants"("whatsappPhoneId");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_dashboardToken_key" ON "tenants"("dashboardToken");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_paddleCustomerId_key" ON "tenants"("paddleCustomerId");

-- CreateIndex
CREATE INDEX "conversations_tenantId_status_idx" ON "conversations"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_tenantId_externalId_key" ON "conversations"("tenantId", "externalId");

-- CreateIndex
CREATE INDEX "messages_conversationId_timestamp_idx" ON "messages"("conversationId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "leads_conversationId_key" ON "leads"("conversationId");

-- CreateIndex
CREATE INDEX "leads_tenantId_status_idx" ON "leads"("tenantId", "status");

-- CreateIndex
CREATE INDEX "leads_tenantId_qualification_idx" ON "leads"("tenantId", "qualification");

-- CreateIndex
CREATE INDEX "leads_tenantId_pipelineStatus_idx" ON "leads"("tenantId", "pipelineStatus");

-- CreateIndex
CREATE INDEX "leads_campaignId_idx" ON "leads"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_leadId_key" ON "clients"("leadId");

-- CreateIndex
CREATE INDEX "clients_tenantId_status_idx" ON "clients"("tenantId", "status");

-- CreateIndex
CREATE INDEX "campaign_templates_tenantId_idx" ON "campaign_templates"("tenantId");

-- CreateIndex
CREATE INDEX "campaign_templates_branche_idx" ON "campaign_templates"("branche");

-- CreateIndex
CREATE INDEX "campaigns_tenantId_isActive_idx" ON "campaigns"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_tenantId_slug_key" ON "campaigns"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "ab_tests_campaignId_isActive_idx" ON "ab_tests"("campaignId", "isActive");

-- CreateIndex
CREATE INDEX "broadcasts_tenantId_status_idx" ON "broadcasts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "broadcast_recipients_broadcastId_status_idx" ON "broadcast_recipients"("broadcastId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "processed_messages_messageId_key" ON "processed_messages"("messageId");

-- CreateIndex
CREATE INDEX "processed_messages_createdAt_idx" ON "processed_messages"("createdAt");

-- CreateIndex
CREATE INDEX "assets_tenantId_status_idx" ON "assets"("tenantId", "status");

-- CreateIndex
CREATE INDEX "assets_tenantId_modelUsed_idx" ON "assets"("tenantId", "modelUsed");

-- CreateIndex
CREATE INDEX "assets_tenantId_createdAt_idx" ON "assets"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "asset_credits_tenantId_key" ON "asset_credits"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_asset_models_tenantId_isActive_idx" ON "tenant_asset_models"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_asset_models_tenantId_model_key" ON "tenant_asset_models"("tenantId", "model");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_credits" ADD CONSTRAINT "asset_credits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_asset_models" ADD CONSTRAINT "tenant_asset_models_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

