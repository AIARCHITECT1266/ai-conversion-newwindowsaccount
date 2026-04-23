-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "scoringSignals" JSONB;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "qualificationLabels" JSONB,
ADD COLUMN     "scoringPrompt" TEXT;
