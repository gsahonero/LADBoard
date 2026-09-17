import { describe, it, expect } from 'vitest';
import { PolicyEngine } from '../core/graph/policy-engine';
import { LADGraphEdge } from '../core/standard/types';

describe('Deterministic Policy Resolution Engine', () => {
  it('does not propagate notifications merely due to graph connectivity if policies are absent', () => {
    const edgeWithoutPolicy: LADGraphEdge = {
      edge_id: 'edge_a_b',
      source: 'node_a',
      target: 'node_b',
      type: 'collaborator',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = PolicyEngine.evaluateEdgePolicy(edgeWithoutPolicy, {
      action: 'modification',
      domain: 'health',
      sourceNodeId: 'node_a',
      targetNodeId: 'node_b',
      actorUserId: 'usr_a',
    });

    expect(result.allowed).toBe(false);
  });

  it('evaluates direct action boolean rules correctly', () => {
    const edgeWithDirectRule: LADGraphEdge = {
      edge_id: 'edge_a_b',
      source: 'node_a',
      target: 'node_b',
      type: 'collaborator',
      policies: {
        notification: {
          modification: true,
        },
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = PolicyEngine.evaluateEdgePolicy(edgeWithDirectRule, {
      action: 'modification',
      sourceNodeId: 'node_a',
      targetNodeId: 'node_b',
      actorUserId: 'usr_a',
    });

    expect(result.allowed).toBe(true);
    expect(result.matchedRuleKey).toBe('notification.modification');
  });

  it('resolves hierarchical domain specificity with override and inheritance', () => {
    // Policy tree:
    // modification: {
    //   default: true,
    //   health: {
    //     default: false,
    //     child_1: {
    //       medical_results: true
    //     }
    //   },
    //   finances: true
    // }
    const complexEdge: LADGraphEdge = {
      edge_id: 'edge_a_b',
      source: 'node_a',
      target: 'node_b',
      type: 'collaborator',
      policies: {
        notification: {
          modification: {
            default: true,
            health: {
              default: false,
              child_1: {
                medical_results: true,
              },
            },
            finances: true,
          },
        },
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Case 1: finances domain -> allowed (explicit true)
    const finRes = PolicyEngine.evaluateEdgePolicy(complexEdge, {
      action: 'modification',
      domain: 'finances',
      sourceNodeId: 'node_a',
      targetNodeId: 'node_b',
      actorUserId: 'usr_a',
    });
    expect(finRes.allowed).toBe(true);
    expect(finRes.matchedRuleKey).toBe('notification.modification.finances');

    // Case 2: health domain general -> denied (health.default = false)
    const healthGeneralRes = PolicyEngine.evaluateEdgePolicy(complexEdge, {
      action: 'modification',
      domain: 'health.general',
      sourceNodeId: 'node_a',
      targetNodeId: 'node_b',
      actorUserId: 'usr_a',
    });
    expect(healthGeneralRes.allowed).toBe(false);
    expect(healthGeneralRes.matchedRuleKey).toBe('notification.modification.health.default');

    // Case 3: health.child_1.medical_results -> allowed (deep leaf override)
    const childMedRes = PolicyEngine.evaluateEdgePolicy(complexEdge, {
      action: 'modification',
      domain: 'health.child_1.medical_results',
      sourceNodeId: 'node_a',
      targetNodeId: 'node_b',
      actorUserId: 'usr_a',
    });
    expect(childMedRes.allowed).toBe(true);
    expect(childMedRes.matchedRuleKey).toBe('notification.modification.health.child_1.medical_results');
    expect(childMedRes.specificityLevel).toBe(4); // 3 segments + 1

    // Case 4: unmentioned domain "documents" -> allowed by action default
    const docsRes = PolicyEngine.evaluateEdgePolicy(complexEdge, {
      action: 'modification',
      domain: 'documents',
      sourceNodeId: 'node_a',
      targetNodeId: 'node_b',
      actorUserId: 'usr_a',
    });
    expect(docsRes.allowed).toBe(true);
    expect(docsRes.matchedRuleKey).toBe('notification.modification.default');
  });

  it('correctly resolves notification recipients among multiple connected nodes', () => {
    const edges: LADGraphEdge[] = [
      // A <-> B with modification notifications allowed
      {
        edge_id: 'edge_a_b',
        source: 'node_a',
        target: 'node_b',
        type: 'collaborator',
        policies: { notification: { modification: true } },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      // A <-> C with NO notification policy
      {
        edge_id: 'edge_a_c',
        source: 'node_a',
        target: 'node_c',
        type: 'collaborator',
        policies: { notification: { modification: false } },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const recipients = PolicyEngine.resolveNotificationRecipients(
      edges,
      'node_a',
      'modification',
      'health',
      'usr_a'
    );

    expect(recipients).toHaveLength(1);
    expect(recipients[0].targetNodeId).toBe('node_b');
  });
});
