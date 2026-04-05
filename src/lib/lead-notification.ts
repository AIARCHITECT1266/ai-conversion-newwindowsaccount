// Lead-Benachrichtigung bei Hot-Leads (Score > 70)

interface HighScoreLeadParams {
  tenantName: string;
  score: number;
  qualification: string;
  lastMessage: string;
  conversationId: string;
}

export function notifyHighScoreLead(params: HighScoreLeadParams): void {
  console.log("[Lead-Notification] Hot-Lead erkannt:", {
    tenant: params.tenantName,
    score: params.score,
    qualification: params.qualification,
    conversationId: params.conversationId,
  });
}
