-- Rollback für add_web_widget_support
-- Nur ausführen wenn Migration rückgängig gemacht werden muss.
-- Reihenfolge wichtig: erst Index, dann Spalten, dann Enum.

DROP INDEX IF EXISTS "conversations_tenantId_channel_idx";
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "channel";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "webWidgetConfig";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "webWidgetPublicKey";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "webWidgetEnabled";
DROP TYPE IF EXISTS "Channel";
