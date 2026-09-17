/**
 * Deterministic Patch Engine applying LADOperation delta patches to LADObjects and Graph Entities
 */

import { LADObject, LADOperation } from '../standard/types';

export class PatchEngine {
  /**
   * Applies an operation patch to an existing LADObject
   */
  static applyToObject(obj: LADObject, operation: LADOperation): LADObject {
    if (operation.target !== obj.object_id) {
      return obj;
    }

    const updated: LADObject = {
      ...obj,
      version: (obj.version || 1) + 1,
      updated_at: operation.timestamp,
    };

    const patch = operation.patch;

    for (const [key, value] of Object.entries(patch)) {
      if (key === 'title' && typeof value === 'string') {
        updated.title = value;
      } else if (key === 'description') {
        updated.description = value;
      } else if (key === 'domain' && typeof value === 'string') {
        updated.domain = value;
      } else if (key === 'priority') {
        updated.priority = value;
      } else if (key === 'status') {
        updated.status = value;
      } else if (key === 'due_date') {
        updated.due_date = value;
      } else if (key === 'assigned_to') {
        updated.assigned_to = value;
      } else if (key === 'tags' && Array.isArray(value)) {
        updated.tags = value;
      } else if (key === 'attributes' && typeof value === 'object') {
        updated.attributes = { ...updated.attributes, ...value };
      } else {
        // Dynamic extensible attribute
        updated.attributes = {
          ...updated.attributes,
          [key]: value,
        };
      }
    }

    return updated;
  }

  /**
   * Replays an entire operation log on an initial state map
   */
  static replayObjectLog(operations: LADOperation[]): Map<string, LADObject> {
    const objectMap = new Map<string, LADObject>();

    for (const op of operations) {
      if (op.type === 'object.create') {
        const newObj: LADObject = {
          object_id: op.target,
          space_id: op.space_id,
          title: op.patch.title || 'Untitled',
          description: op.patch.description || '',
          domain: op.patch.domain || 'general',
          tags: op.patch.tags || [],
          priority: op.patch.priority || 'medium',
          status: op.patch.status || 'active',
          due_date: op.patch.due_date,
          assigned_to: op.patch.assigned_to,
          attributes: op.patch.attributes || {},
          created_by: op.actor,
          created_at: op.timestamp,
          updated_at: op.timestamp,
          version: 1,
        };
        objectMap.set(op.target, newObj);
      } else if (op.type === 'object.update') {
        const existing = objectMap.get(op.target);
        if (existing) {
          const patched = this.applyToObject(existing, op);
          objectMap.set(op.target, patched);
        }
      } else if (op.type === 'object.delete') {
        objectMap.delete(op.target);
      }
    }

    return objectMap;
  }
}
