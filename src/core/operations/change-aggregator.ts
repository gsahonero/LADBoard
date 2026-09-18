/**
 * Change Aggregator separating transient editing state from durable committed LADOperations.
 * Configurable aggregation window (default: 5000ms / 5s).
 */

import { LADOperation, LADOperationType } from '../standard/types';
import { DEFAULT_COMMIT_THRESHOLD_MS } from '../standard/constants';
import { PendingChange } from './types';

export type CommitCallback = (operation: LADOperation) => Promise<void> | void;

export class ChangeAggregator {
  private thresholdMs: number;
  private pendingChanges: Map<string, PendingChange> = new Map();
  private onCommit: CommitCallback;
  private lamportClock = 0;

  constructor(thresholdMs: number = DEFAULT_COMMIT_THRESHOLD_MS, onCommit: CommitCallback) {
    this.thresholdMs = thresholdMs;
    this.onCommit = onCommit;
  }

  setThreshold(thresholdMs: number) {
    this.thresholdMs = Math.max(500, thresholdMs);
  }

  getThreshold(): number {
    return this.thresholdMs;
  }

  setLamportClock(clock: number) {
    this.lamportClock = Math.max(this.lamportClock, clock);
  }

  getLamportClock(): number {
    return this.lamportClock;
  }

  private nextLamportClock(): number {
    this.lamportClock += 1;
    return this.lamportClock;
  }

  generateOperationId(): string {
    const rand = Math.random().toString(36).substring(2, 10);
    return `op_${rand}`;
  }

  /**
   * Registers a transient edit. Debounces commit for `thresholdMs`.
   */
  registerTransientChange(params: {
    targetId: string;
    type: LADOperationType;
    actor: string;
    spaceId: string;
    originalState: any;
    currentState: any;
    patch: Record<string, any>;
  }) {
    const { targetId, type, actor, spaceId, originalState, currentState, patch } = params;
    const now = Date.now();

    const existing = this.pendingChanges.get(targetId);
    if (existing) {
      if (existing.timerId) {
        clearTimeout(existing.timerId);
      }

      // Merge patches
      existing.currentState = currentState;
      existing.patch = { ...existing.patch, ...patch };
      existing.lastModifiedAt = now;

      existing.timerId = setTimeout(() => {
        this.commitPendingChange(targetId);
      }, this.thresholdMs);
    } else {
      const newPending: PendingChange = {
        targetId,
        type,
        actor,
        spaceId,
        originalState,
        currentState,
        patch,
        firstModifiedAt: now,
        lastModifiedAt: now,
        timerId: setTimeout(() => {
          this.commitPendingChange(targetId);
        }, this.thresholdMs),
      };

      this.pendingChanges.set(targetId, newPending);
    }
  }

  /**
   * Immediately commits a single pending change (e.g. on blur, save button, or modal close)
   */
  async flush(targetId?: string): Promise<void> {
    if (targetId) {
      await this.commitPendingChange(targetId);
    } else {
      const targetIds = Array.from(this.pendingChanges.keys());
      for (const id of targetIds) {
        await this.commitPendingChange(id);
      }
    }
  }

  /**
   * Commits all pending changes across all targets immediately
   */
  async flushAll(): Promise<void> {
    await this.flush();
  }

  private async commitPendingChange(targetId: string): Promise<void> {
    const pending = this.pendingChanges.get(targetId);
    if (!pending) return;

    if (pending.timerId) {
      clearTimeout(pending.timerId);
    }
    this.pendingChanges.delete(targetId);

    // If no net changes were made, discard
    if (Object.keys(pending.patch).length === 0) return;

    const op: LADOperation = {
      operation_id: this.generateOperationId(),
      space_id: pending.spaceId,
      actor: pending.actor,
      timestamp: new Date().toISOString(),
      lamport_clock: this.nextLamportClock(),
      type: pending.type as LADOperationType,
      target: pending.targetId,
      patch: pending.patch,
    };

    await this.onCommit(op);
  }

  /**
   * Creates an immediate, non-debounced operation (e.g. object create or delete)
   */
  async commitImmediate(params: {
    targetId: string;
    type: LADOperationType;
    actor: string;
    spaceId: string;
    patch: Record<string, any>;
  }): Promise<LADOperation> {
    // Flush any pending changes for this target first
    if (this.pendingChanges.has(params.targetId)) {
      await this.flush(params.targetId);
    }

    const op: LADOperation = {
      operation_id: this.generateOperationId(),
      space_id: params.spaceId,
      actor: params.actor,
      timestamp: new Date().toISOString(),
      lamport_clock: this.nextLamportClock(),
      type: params.type,
      target: params.targetId,
      patch: params.patch,
    };

    await this.onCommit(op);
    return op;
  }

  hasPendingChanges(targetId?: string): boolean {
    if (targetId) return this.pendingChanges.has(targetId);
    return this.pendingChanges.size > 0;
  }
}
