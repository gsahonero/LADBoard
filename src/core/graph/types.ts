/**
 * Graph & Policy Types for LAD Standard
 */

export interface PolicyEvaluationContext {
  action: 'modification' | 'creation' | 'deletion' | 'interaction' | string;
  domain?: string; // e.g., "finances.bank_accounts" or "health"
  sourceNodeId: string;
  targetNodeId: string;
  actorUserId: string;
}

export interface PolicyResolutionResult {
  allowed: boolean;
  matchedRuleKey: string;
  specificityLevel: number; // Higher number = more specific domain path
  inherited: boolean;
}
