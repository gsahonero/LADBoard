/**
 * Agent Runtime for LAD Board
 * Enforces autonomy mode policies (autonomous vs approval_required)
 */

import { LADAgent, ProposedAgentAction, AgentAutonomyMode } from './types';
import { LADOperation } from '../standard/types';

export class AgentRuntime {
  private spaceId: string;
  private agents: Map<string, LADAgent> = new Map();
  private proposals: Map<string, ProposedAgentAction> = new Map();
  private onExecuteOperation?: (operation: LADOperation) => Promise<void>;
  private listeners: Array<(proposals: ProposedAgentAction[]) => void> = [];

  constructor(spaceId: string, onExecuteOperation?: (operation: LADOperation) => Promise<void>) {
    this.spaceId = spaceId;
    this.onExecuteOperation = onExecuteOperation;
    this.registerDefaultAgents();
  }

  private registerDefaultAgents() {
    // Financial Follow-up Bot
    this.registerAgent({
      agentId: 'agt_finance_bot',
      name: 'Finance Sync Assistant',
      description: 'Monitors bank balances and updates currency conversion rates',
      autonomyMode: 'approval_required',
      assignedDomains: ['finances'],
      capabilities: ['object.update', 'rate_lookup'],
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    // Medical Schedule Bot
    this.registerAgent({
      agentId: 'agt_health_bot',
      name: 'Health Schedule Assistant',
      description: 'Coordinates appointment follow-ups and reminders',
      autonomyMode: 'approval_required',
      assignedDomains: ['health'],
      capabilities: ['object.update'],
      status: 'active',
      createdAt: new Date().toISOString(),
    });
  }

  registerAgent(agent: LADAgent) {
    this.agents.set(agent.agentId, agent);
  }

  getAgents(): LADAgent[] {
    return Array.from(this.agents.values());
  }

  getAgent(agentId: string): LADAgent | undefined {
    return this.agents.get(agentId);
  }

  setAgentAutonomy(agentId: string, mode: AgentAutonomyMode) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.autonomyMode = mode;
    }
  }

  subscribeProposals(listener: (proposals: ProposedAgentAction[]) => void): () => void {
    this.listeners.push(listener);
    listener(this.getPendingProposals());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const pending = this.getPendingProposals();
    for (const listener of this.listeners) {
      listener(pending);
    }
  }

  getPendingProposals(): ProposedAgentAction[] {
    return Array.from(this.proposals.values()).filter((p) => p.status === 'pending');
  }

  /**
   * Dispatches an action initiated by an agent.
   * If autonomous, executes immediately. If approval_required, queues as a proposal.
   */
  async dispatchAgentAction(params: {
    agentId: string;
    description: string;
    operation: LADOperation;
  }): Promise<{ executed: boolean; proposal?: ProposedAgentAction }> {
    const agent = this.agents.get(params.agentId);
    if (!agent || agent.status !== 'active') {
      throw new Error(`Agent ${params.agentId} is not active`);
    }

    if (agent.autonomyMode === 'autonomous') {
      if (this.onExecuteOperation) {
        await this.onExecuteOperation(params.operation);
      }
      return { executed: true };
    } else {
      // Queue for user approval
      const proposalId = `prop_${Math.random().toString(36).substring(2, 10)}`;
      const proposal: ProposedAgentAction = {
        proposalId,
        agentId: agent.agentId,
        agentName: agent.name,
        spaceId: this.spaceId,
        description: params.description,
        operation: params.operation,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      this.proposals.set(proposalId, proposal);
      this.notify();
      return { executed: false, proposal };
    }
  }

  async approveProposal(proposalId: string, reviewerUserId: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== 'pending') return;

    proposal.status = 'approved';
    proposal.reviewedAt = new Date().toISOString();
    proposal.reviewedBy = reviewerUserId;

    if (this.onExecuteOperation) {
      await this.onExecuteOperation(proposal.operation);
    }
    this.notify();
  }

  rejectProposal(proposalId: string, reviewerUserId: string) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== 'pending') return;

    proposal.status = 'rejected';
    proposal.reviewedAt = new Date().toISOString();
    proposal.reviewedBy = reviewerUserId;
    this.notify();
  }
}
