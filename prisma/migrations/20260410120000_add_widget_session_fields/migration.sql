-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "widgetSessionToken" TEXT,
ADD COLUMN     "widgetVisitorMeta" JSONB,
ALTER COLUMN "externalId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "conversations_widgetSessionToken_key" ON "conversations"("widgetSessionToken");
