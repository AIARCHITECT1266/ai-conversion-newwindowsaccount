-- ============================================================
-- Rollback: Phase 3a.5 Widget-Session-Felder
-- Gehoert zu Migration 20260410120000_add_widget_session_fields
-- ============================================================
--
-- WARNUNG: Dieses Rollback macht externalId wieder NOT NULL.
-- Falls bereits Web-Conversations mit externalId=NULL existieren,
-- muss dieser Schritt vorher behoben werden (z.B. externalId
-- = widgetSessionToken setzen oder Records loeschen).
--
-- Vor Ausfuehrung pruefen:
--   SELECT COUNT(*) FROM conversations WHERE "externalId" IS NULL;
-- Wenn > 0: entweder fixen oder per DELETE entfernen, sonst
-- schlaegt der SET NOT NULL-Schritt fehl.
-- ============================================================

ALTER TABLE "conversations" DROP COLUMN IF EXISTS "widgetSessionToken";
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "widgetVisitorMeta";
ALTER TABLE "conversations" ALTER COLUMN "externalId" SET NOT NULL;
