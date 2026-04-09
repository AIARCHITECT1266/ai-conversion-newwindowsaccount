-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('WHATSAPP', 'WEB');

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "channel" "Channel" NOT NULL DEFAULT 'WHATSAPP';

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "webWidgetConfig" JSONB,
ADD COLUMN     "webWidgetEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "webWidgetPublicKey" TEXT;

-- CreateIndex
CREATE INDEX "conversations_tenantId_channel_idx" ON "conversations"("tenantId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_webWidgetPublicKey_key" ON "tenants"("webWidgetPublicKey");
