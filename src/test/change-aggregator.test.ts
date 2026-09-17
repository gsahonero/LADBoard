import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChangeAggregator } from '../core/operations/change-aggregator';
import { LADOperation } from '../core/standard/types';

describe('Change Aggregator & 5-Second Commit Threshold', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aggregates transient edits and does not commit before threshold expires', () => {
    const committedOps: LADOperation[] = [];
    const aggregator = new ChangeAggregator(5000, (op) => {
      committedOps.push(op);
    });

    // Keystroke 1: title change
    aggregator.registerTransientChange({
      targetId: 'obj_100',
      type: 'object.update',
      actor: 'usr_alice',
      spaceId: 'spc_01',
      originalState: { title: 'Old' },
      currentState: { title: 'New T' },
      patch: { title: 'New T' },
    });

    // Advance 2 seconds (less than 5s threshold)
    vi.advanceTimersByTime(2000);
    expect(committedOps).toHaveLength(0);

    // Keystroke 2: title refined
    aggregator.registerTransientChange({
      targetId: 'obj_100',
      type: 'object.update',
      actor: 'usr_alice',
      spaceId: 'spc_01',
      originalState: { title: 'Old' },
      currentState: { title: 'New Title Completed' },
      patch: { title: 'New Title Completed' },
    });

    // Advance another 3 seconds (5s from start, but only 3s from keystroke 2)
    vi.advanceTimersByTime(3000);
    expect(committedOps).toHaveLength(0);

    // Advance remaining 2 seconds (5s quiet period reached)
    vi.advanceTimersByTime(2000);
    expect(committedOps).toHaveLength(1);
    expect(committedOps[0].patch).toEqual({ title: 'New Title Completed' });
    expect(committedOps[0].lamport_clock).toBe(1);
  });

  it('flushes pending changes immediately on demand', async () => {
    const committedOps: LADOperation[] = [];
    const aggregator = new ChangeAggregator(5000, (op) => {
      committedOps.push(op);
    });

    aggregator.registerTransientChange({
      targetId: 'obj_200',
      type: 'object.update',
      actor: 'usr_alice',
      spaceId: 'spc_01',
      originalState: {},
      currentState: { balance: 500 },
      patch: { balance: 500 },
    });

    expect(committedOps).toHaveLength(0);

    // Explicit flush on blur/save
    await aggregator.flush('obj_200');

    expect(committedOps).toHaveLength(1);
    expect(committedOps[0].target).toBe('obj_200');
    expect(committedOps[0].patch).toEqual({ balance: 500 });
  });

  it('supports configurable aggregation window thresholds', () => {
    const aggregator = new ChangeAggregator(5000, () => {});
    expect(aggregator.getThreshold()).toBe(5000);

    aggregator.setThreshold(2000);
    expect(aggregator.getThreshold()).toBe(2000);
  });
});
