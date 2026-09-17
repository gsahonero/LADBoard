/**
 * Deterministic Hierarchical Policy Resolution Engine for LAD Standard 1.0
 */

import { LADGraphEdge } from '../standard/types';
import { PolicyEvaluationContext, PolicyResolutionResult } from './types';

export class PolicyEngine {
  /**
   * Resolves whether an action along an edge is permitted based on hierarchical policy trees.
   * Traversal starts at deepest domain specificity and cascades up to category default, then fails closed.
   */
  static evaluateEdgePolicy(
    edge: LADGraphEdge,
    context: PolicyEvaluationContext
  ): PolicyResolutionResult {
    if (!edge.policies) {
      return { allowed: false, matchedRuleKey: 'none', specificityLevel: 0, inherited: false };
    }

    const { action, domain } = context;

    // Search policy section for notification or interaction
    const notificationTree = edge.policies.notification;
    if (!notificationTree) {
      return { allowed: false, matchedRuleKey: 'no_notification_tree', specificityLevel: 0, inherited: false };
    }

    const actionBranch = notificationTree[action];
    if (actionBranch === undefined) {
      // Check top-level default if any
      if (typeof notificationTree.default === 'boolean') {
        return {
          allowed: notificationTree.default,
          matchedRuleKey: 'notification.default',
          specificityLevel: 0,
          inherited: true,
        };
      }
      return { allowed: false, matchedRuleKey: 'no_action_branch', specificityLevel: 0, inherited: false };
    }

    // Direct boolean on action (e.g. { modification: true })
    if (typeof actionBranch === 'boolean') {
      return {
        allowed: actionBranch,
        matchedRuleKey: `notification.${action}`,
        specificityLevel: 1,
        inherited: false,
      };
    }

    // Hierarchical domain evaluation
    if (domain && typeof actionBranch === 'object') {
      const domainParts = domain.split('.').filter(Boolean); // e.g. ["health", "child_1", "medical_results"]

      // Search from deepest path to root
      for (let i = domainParts.length; i > 0; i--) {
        const subPath = domainParts.slice(0, i);
        let cursor: any = actionBranch;
        let valid = true;

        for (const segment of subPath) {
          if (cursor && typeof cursor === 'object' && segment in cursor) {
            cursor = cursor[segment];
          } else {
            valid = false;
            break;
          }
        }

        if (valid) {
          if (typeof cursor === 'boolean') {
            return {
              allowed: cursor,
              matchedRuleKey: `notification.${action}.${subPath.join('.')}`,
              specificityLevel: subPath.length + 1,
              inherited: i < domainParts.length,
            };
          } else if (typeof cursor === 'object' && typeof cursor.default === 'boolean') {
            return {
              allowed: cursor.default,
              matchedRuleKey: `notification.${action}.${subPath.join('.')}.default`,
              specificityLevel: subPath.length + 1,
              inherited: i < domainParts.length,
            };
          }
        }
      }

      // Check action-level default (e.g. { modification: { default: true, health: false } })
      if (typeof actionBranch.default === 'boolean') {
        return {
          allowed: actionBranch.default,
          matchedRuleKey: `notification.${action}.default`,
          specificityLevel: 1,
          inherited: true,
        };
      }
    }

    // Fallback: Fail-safe closed
    return {
      allowed: false,
      matchedRuleKey: 'default_deny',
      specificityLevel: 0,
      inherited: false,
    };
  }

  /**
   * Resolves all recipients for an event within a graph
   */
  static resolveNotificationRecipients(
    edges: LADGraphEdge[],
    sourceNodeId: string,
    action: string,
    domain?: string,
    actorUserId?: string
  ): Array<{ targetNodeId: string; edgeId: string; policyResult: PolicyResolutionResult }> {
    const recipients: Array<{ targetNodeId: string; edgeId: string; policyResult: PolicyResolutionResult }> = [];

    // Filter directed edges originating from sourceNodeId or bidirectional connections
    const relevantEdges = edges.filter((e) => e.source === sourceNodeId || e.target === sourceNodeId);

    for (const edge of relevantEdges) {
      // Determine target node
      const targetNodeId = edge.source === sourceNodeId ? edge.target : edge.source;

      const evalResult = this.evaluateEdgePolicy(edge, {
        action,
        domain,
        sourceNodeId,
        targetNodeId,
        actorUserId: actorUserId || '',
      });

      if (evalResult.allowed) {
        recipients.push({
          targetNodeId,
          edgeId: edge.edge_id,
          policyResult: evalResult,
        });
      }
    }

    return recipients;
  }
}
