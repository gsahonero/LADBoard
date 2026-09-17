/**
 * Sync Coordinator managing bidirectional synchronization between local IndexedDB and remote storage
 */

import { IStorageProvider } from '../storage/provider.interface';
import { OfflineQueue } from './offline-queue';
import { OperationLog } from '../operations/operation-log';
import { ConflictResolver } from './conflict-resolver';
import { SyncState } from './types';
import { LADOperation } from '../standard/types';

export class SyncCoordinator {
  private spaceId: string;
  public readonly localStorage: IStorageProvider;
  private remoteStorage: IStorageProvider | null;
  private offlineQueue: OfflineQueue;
  private operationLog: OperationLog;
  private onRemoteOperationsApplied?: (ops: LADOperation[]) => Promise<void>;

  private state: SyncState = {
    status: 'synced',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingOpsCount: 0,
    lastSyncedAt: null,
    activeConflicts: [],
    errorMessage: null,
  };

  private listeners: Array<(state: SyncState) => void> = [];
  private syncIntervalId: any = null;

  constructor(params: {
    spaceId: string;
    localStorage: IStorageProvider;
    remoteStorage?: IStorageProvider | null;
    offlineQueue: OfflineQueue;
    operationLog: OperationLog;
    onRemoteOperationsApplied?: (ops: LADOperation[]) => Promise<void>;
  }) {
    this.spaceId = params.spaceId;
    this.localStorage = params.localStorage;
    this.remoteStorage = params.remoteStorage || null;
    this.offlineQueue = params.offlineQueue;
    this.operationLog = params.operationLog;
    this.onRemoteOperationsApplied = params.onRemoteOperationsApplied;

    this.setupNetworkListeners();
  }

  private setupNetworkListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.updateState({ isOnline: true });
        this.triggerSync();
      });
      window.addEventListener('offline', () => {
        this.updateState({ isOnline: false, status: 'offline' });
      });
    }
  }

  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private updateState(partial: Partial<SyncState>) {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  getState(): SyncState {
    return this.state;
  }

  setRemoteStorage(remote: IStorageProvider | null) {
    this.remoteStorage = remote;
  }

  async startPeriodicSync(intervalMs: number = 15000) {
    if (this.syncIntervalId) clearInterval(this.syncIntervalId);
    this.syncIntervalId = setInterval(() => {
      this.triggerSync();
    }, intervalMs);
  }

  stopPeriodicSync() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  /**
   * Main synchronization routine: Push pending local ops, pull remote delta ops
   */
  async triggerSync(): Promise<void> {
    if (!this.remoteStorage) {
      // Local-only mode
      const queueCount = this.offlineQueue.size();
      this.updateState({
        status: queueCount > 0 ? 'pending_changes' : 'synced',
        pendingOpsCount: queueCount,
      });
      return;
    }

    if (!this.state.isOnline) {
      this.updateState({ status: 'offline' });
      return;
    }

    try {
      this.updateState({ status: 'syncing' });

      // Step 1: Push pending local operations to remote
      const pendingOps = this.offlineQueue.getQueue();
      if (pendingOps.length > 0) {
        const remoteOpLog = new OperationLog(this.spaceId, this.remoteStorage);
        await remoteOpLog.loadAll();

        const remoteOps = remoteOpLog.getOperations();

        for (const localOp of pendingOps) {
          // Check for conflicts against recent remote ops
          const conflictingRemote = remoteOps.find(
            (ro) => ro.target === localOp.target && ro.actor !== localOp.actor
          );

          if (conflictingRemote) {
            const conflict = ConflictResolver.detectConflict(localOp, conflictingRemote);
            if (conflict) {
              this.state.activeConflicts.push(conflict);
              this.updateState({
                status: 'conflict_detected',
                activeConflicts: this.state.activeConflicts,
              });
            }
          }

          // Append to remote log and remove from offline queue
          await remoteOpLog.append(localOp);
          await this.offlineQueue.remove(localOp.operation_id);
        }
      }

      // Step 2: Pull any remote operations not yet in local log
      const remoteOpLog = new OperationLog(this.spaceId, this.remoteStorage);
      await remoteOpLog.loadAll();
      const allRemoteOps = remoteOpLog.getOperations();

      const localOpIds = new Set(this.operationLog.getOperations().map((o) => o.operation_id));
      const newRemoteOps = allRemoteOps.filter((ro) => !localOpIds.has(ro.operation_id));

      if (newRemoteOps.length > 0) {
        for (const newOp of newRemoteOps) {
          await this.operationLog.append(newOp);
        }
        if (this.onRemoteOperationsApplied) {
          await this.onRemoteOperationsApplied(newRemoteOps);
        }
      }

      this.updateState({
        status: this.state.activeConflicts.length > 0 ? 'conflict_detected' : 'synced',
        pendingOpsCount: this.offlineQueue.size(),
        lastSyncedAt: new Date().toISOString(),
        errorMessage: null,
      });
    } catch (err: any) {
      console.warn('[LAD:SyncCoordinator] GDrive sync failed; falling back to local sync:', err);
      // Fall back to local sync: preserve pending changes locally in offlineQueue
      const queueCount = this.offlineQueue.size();
      this.updateState({
        status: queueCount > 0 ? 'pending_changes' : 'synced',
        pendingOpsCount: queueCount,
        errorMessage: `GDrive sync failed (${err.message || 'remote error'}). Preserved locally.`,
      });
    }
  }

  resolveConflict(conflictId: string, _choice: 'keep_local' | 'accept_remote') {
    this.state.activeConflicts = this.state.activeConflicts.filter((c) => c.conflictId !== conflictId);
    this.updateState({
      activeConflicts: this.state.activeConflicts,
      status: this.state.activeConflicts.length > 0 ? 'conflict_detected' : 'synced',
    });
  }
}
