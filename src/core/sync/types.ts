/**
 * Synchronization and Conflict Resolution Types for LAD Board
 */

import { LADOperation } from '../standard/types';

export type SyncStatus =
  | 'synced'
  | 'saving_locally'
  | 'syncing'
  | 'offline'
  | 'pending_changes'
  | 'needs_attention'
  | 'conflict_detected';

export interface ConflictRecord {
  conflictId: string;
  targetId: string;
  targetTitle?: string;
  targetDomain?: string;
  localOperation: LADOperation;
  remoteOperation: LADOperation;
  conflictingKeys: string[];
  resolved: boolean;
  resolutionChoice?: 'keep_local' | 'accept_remote' | 'merge';
  mergedPatch?: Record<string, any>;
  createdAt: string;
}

export interface SyncState {
  status: SyncStatus;
  isOnline: boolean;
  pendingOpsCount: number;
  lastSyncedAt: string | null;
  activeConflicts: ConflictRecord[];
  errorMessage: string | null;
}
