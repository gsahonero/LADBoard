import { describe, it, expect } from 'vitest';
import { AgentRuntime } from '../core/agents/agent-runtime';
import { LADOperation } from '../core/standard/types';

describe('Agent Runtime & Autonomy Policies', () => {
  it('queues a proposal for human approval when agent is in approval_required mode', async () => {
    const executedOps: LADOperation[] = [];
    const runtime = new AgentRuntime('spc_test', async (op) => {
      executedOps.push(op);
    });

    const op: LADOperation = {
      operation_id: 'op_bot_1',
      space_id: 'spc_test',
      actor: 'agt_finance_bot',
      timestamp: new Date().toISOString(),
      lamport_clock: 10,
      type: 'object.update',
      target: 'obj_bank_01',
      patch: { balance: 1950 },
    };

    const dispatchRes = await runtime.dispatchAgentAction({
      agentId: 'agt_finance_bot',
      description: 'Update bank balance with current currency rate',
      operation: op,
    });

    expect(dispatchRes.executed).toBe(false);
    expect(dispatchRes.proposal).toBeDefined();
    expect(dispatchRes.proposal?.status).toBe('pending');
    expect(executedOps).toHaveLength(0);

    // Human owner reviews and approves the proposal
    await runtime.approveProposal(dispatchRes.proposal!.proposalId, 'usr_owner_01');

    expect(executedOps).toHaveLength(1);
    expect(executedOps[0].target).toBe('obj_bank_01');
    expect(runtime.getPendingProposals()).toHaveLength(0);
  });

  it('executes immediately when agent is configured in autonomous mode', async () => {
    const executedOps: LADOperation[] = [];
    const runtime = new AgentRuntime('spc_test', async (op) => {
      executedOps.push(op);
    });

    runtime.setAgentAutonomy('agt_health_bot', 'autonomous');

    const op: LADOperation = {
      operation_id: 'op_bot_2',
      space_id: 'spc_test',
      actor: 'agt_health_bot',
      timestamp: new Date().toISOString(),
      lamport_clock: 11,
      type: 'object.update',
      target: 'obj_health_01',
      patch: { status: 'completed' },
    };

    const dispatchRes = await runtime.dispatchAgentAction({
      agentId: 'agt_health_bot',
      description: 'Mark prescription refill as completed',
      operation: op,
    });

    expect(dispatchRes.executed).toBe(true);
    expect(executedOps).toHaveLength(1);
  });
});
