/**
 * Agent & Integration Types for LAD Standard
 */

import { LADOperation } from '../standard/types';

export type AgentAutonomyMode = 'autonomous' | 'approval_required';

export interface LADAgent {
  agentId: string; // "agt_..."
  name: string;
  description: string;
  autonomyMode: AgentAutonomyMode;
  assignedDomains: string[];
  capabilities: string[];
  status: 'active' | 'paused' | 'revoked';
  createdAt: string;
}

export interface ProposedAgentAction {
  proposalId: string; // "prop_..."
  agentId: string;
  agentName: string;
  spaceId: string;
  description: string;
  operation: LADOperation;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}
