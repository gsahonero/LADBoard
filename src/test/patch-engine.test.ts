import { describe, it, expect } from 'vitest';
import { PatchEngine } from '../core/operations/patch-engine';
import { LADOperation, LADObject } from '../core/standard/types';

describe('Patch Engine & Operation Log Replay', () => {
  it('correctly applies delta patches to a LADObject', () => {
    const original: LADObject = {
      object_id: 'obj_1',
      space_id: 'spc_1',
      title: 'Initial Title',
      domain: 'health',
      tags: ['meds'],
      priority: 'medium',
      status: 'active',
      attributes: { dosage: '10mg' },
      created_by: 'usr_1',
      created_at: '2026-09-16T10:00:00Z',
      updated_at: '2026-09-16T10:00:00Z',
      version: 1,
    };

    const op: LADOperation = {
      operation_id: 'op_1',
      space_id: 'spc_1',
      actor: 'usr_1',
      timestamp: '2026-09-16T11:00:00Z',
      lamport_clock: 2,
      type: 'object.update',
      target: 'obj_1',
      patch: {
        title: 'Updated Title',
        priority: 'high',
        attributes: { dosage: '20mg', instructions: 'Take with food' },
      },
    };

    const patched = PatchEngine.applyToObject(original, op);

    expect(patched.title).toBe('Updated Title');
    expect(patched.priority).toBe('high');
    expect(patched.version).toBe(2);
    expect(patched.attributes.dosage).toBe('20mg');
    expect(patched.attributes.instructions).toBe('Take with food');
  });

  it('correctly sets, updates, and clears due_date on a LADObject', () => {
    const original: LADObject = {
      object_id: 'obj_date_1',
      space_id: 'spc_1',
      title: 'Blood Pressure Check',
      domain: 'health',
      tags: ['meds'],
      priority: 'medium',
      status: 'active',
      attributes: {},
      created_by: 'usr_1',
      created_at: '2026-09-16T10:00:00Z',
      updated_at: '2026-09-16T10:00:00Z',
      version: 1,
    };

    // 1. Include a date
    const setDateOp: LADOperation = {
      operation_id: 'op_date_1',
      space_id: 'spc_1',
      actor: 'usr_1',
      timestamp: '2026-09-16T11:00:00Z',
      lamport_clock: 2,
      type: 'object.update',
      target: 'obj_date_1',
      patch: {
        due_date: '2026-09-20',
      },
    };

    const withDate = PatchEngine.applyToObject(original, setDateOp);
    expect(withDate.due_date).toBe('2026-09-20');
    expect(withDate.version).toBe(2);

    // 2. Change the date
    const updateDateOp: LADOperation = {
      operation_id: 'op_date_2',
      space_id: 'spc_1',
      actor: 'usr_1',
      timestamp: '2026-09-16T12:00:00Z',
      lamport_clock: 3,
      type: 'object.update',
      target: 'obj_date_1',
      patch: {
        due_date: '2026-09-25',
      },
    };

    const updatedDate = PatchEngine.applyToObject(withDate, updateDateOp);
    expect(updatedDate.due_date).toBe('2026-09-25');
    expect(updatedDate.version).toBe(3);

    // 3. Clear the date
    const clearDateOp: LADOperation = {
      operation_id: 'op_date_3',
      space_id: 'spc_1',
      actor: 'usr_1',
      timestamp: '2026-09-16T13:00:00Z',
      lamport_clock: 4,
      type: 'object.update',
      target: 'obj_date_1',
      patch: {
        due_date: undefined,
      },
    };

    const clearedDate = PatchEngine.applyToObject(updatedDate, clearDateOp);
    expect(clearedDate.due_date).toBeUndefined();
    expect(clearedDate.version).toBe(4);
  });

  it('replays a sequence of create, update, and delete operations deterministically', () => {
    const ops: LADOperation[] = [
      {
        operation_id: 'op_c1',
        space_id: 'spc_1',
        actor: 'usr_1',
        timestamp: '2026-09-16T10:00:00Z',
        lamport_clock: 1,
        type: 'object.create',
        target: 'obj_a',
        patch: { title: 'First Item', domain: 'shopping' },
      },
      {
        operation_id: 'op_c2',
        space_id: 'spc_1',
        actor: 'usr_2',
        timestamp: '2026-09-16T10:01:00Z',
        lamport_clock: 2,
        type: 'object.create',
        target: 'obj_b',
        patch: { title: 'Second Item', domain: 'finances' },
      },
      {
        operation_id: 'op_u1',
        space_id: 'spc_1',
        actor: 'usr_1',
        timestamp: '2026-09-16T10:02:00Z',
        lamport_clock: 3,
        type: 'object.update',
        target: 'obj_a',
        patch: { title: 'First Item (Renamed)' },
      },
      {
        operation_id: 'op_d1',
        space_id: 'spc_1',
        actor: 'usr_2',
        timestamp: '2026-09-16T10:03:00Z',
        lamport_clock: 4,
        type: 'object.delete',
        target: 'obj_b',
        patch: { object_id: 'obj_b' },
      },
    ];

    const result = PatchEngine.replayObjectLog(ops);

    expect(result.has('obj_b')).toBe(false);
    expect(result.has('obj_a')).toBe(true);
    expect(result.get('obj_a')?.title).toBe('First Item (Renamed)');
  });
});
