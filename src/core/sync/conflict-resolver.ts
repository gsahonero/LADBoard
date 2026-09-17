/**
 * Non-Destructive Conflict Detection & Resolution for Concurrent Operations
 */

import { LADOperation } from '../standard/types';
import { ConflictRecord } from './types';

export class ConflictResolver {
  /**
   * Checks whether two concurrent operations on the same target conflict on scalar properties.
   */
  static detectConflict(localOp: LADOperation, remoteOp: LADOperation): ConflictRecord | null {
    if (localOp.target !== remoteOp.target || localOp.actor === remoteOp.actor) {
      return null;
    }

    const localKeys = Object.keys(localOp.patch);
    const remoteKeys = Object.keys(remoteOp.patch);
    const overlappingKeys = localKeys.filter((k) => remoteKeys.includes(k));

    // Check if the overlapping values actually differ
    const conflictingKeys: string[] = [];
    for (const key of overlappingKeys) {
      const lVal = JSON.stringify(localOp.patch[key]);
      const rVal = JSON.stringify(remoteOp.patch[key]);
      if (lVal !== rVal) {
        conflictingKeys.push(key);
      }
    }

    if (conflictingKeys.length === 0) {
      return null;
    }

    return {
      conflictId: `cnf_${Math.random().toString(36).substring(2, 10)}`,
      targetId: localOp.target,
      localOperation: localOp,
      remoteOperation: remoteOp,
      conflictingKeys,
      resolved: false,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Performs a 3-way non-destructive merge when possible, combining non-conflicting keys
   */
  static mergeNonConflictingPatches(
    localPatch: Record<string, any>,
    remotePatch: Record<string, any>
  ): Record<string, any> {
    return {
      ...remotePatch,
      ...localPatch,
    };
  }
}
