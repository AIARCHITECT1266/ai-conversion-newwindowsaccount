-- CreateIndex
CREATE INDEX "conversations_tenantId_createdAt_idx" ON "conversations"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "leads_tenantId_createdAt_idx" ON "leads"("tenantId", "createdAt");
