/**
 * Sync Coordinator managing bidirectional synchronization between local IndexedDB and remote storage
 */

import { IStorageProvider } from '../storage/provider.interface';
import { OfflineQueue } from './offline-queue';
import { OperationLog } from '../operations/operation-log';
import { ConflictResolver } from './conflict-resolver';
import { SyncState } from './types';
import { LADOperation } from '../standard/types';
import { ObjectStore } from '../objects/object-store';
import { GraphStore } from '../graph/graph-store';
import { SchemaRegistry } from '../schemas/schema-registry';
import { ChangeAggregator } from '../operations/change-aggregator';

export class SyncCoordinator {
  private spaceId: string;
  public readonly localStorage: IStorageProvider;
  private remoteStorage: IStorageProvider | null;
  private offlineQueue: OfflineQueue;
  private operationLog: OperationLog;
  private objectStore?: ObjectStore;
  private graphStore?: GraphStore;
  private changeAggregator?: ChangeAggregator;
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
    objectStore?: ObjectStore;
    graphStore?: GraphStore;
    changeAggregator?: ChangeAggregator;
    onRemoteOperationsApplied?: (ops: LADOperation[]) => Promise<void>;
  }) {
    this.spaceId = params.spaceId;
    this.localStorage = params.localStorage;
    this.remoteStorage = params.remoteStorage || null;
    this.offlineQueue = params.offlineQueue;
    this.operationLog = params.operationLog;
    this.objectStore = params.objectStore;
    this.graphStore = params.graphStore;
    this.changeAggregator = params.changeAggregator;
    this.onRemoteOperationsApplied = params.onRemoteOperationsApplied;

    this.setupNetworkListeners();
  }

  setChangeAggregator(aggregator?: ChangeAggregator) {
    this.changeAggregator = aggregator;
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
      window.addEventListener('focus', () => {
        // Tab gained focus, re-sync quietly to catch multi-device updates
        this.triggerSync({ silent: true }).catch((err) => {
          console.debug('[LAD:SyncCoordinator] Focus sync check:', err);
        });
      });
      window.addEventListener('beforeunload', () => {
        // Immediately flush any debounced changes before closing or navigating away
        if (this.changeAggregator) {
          this.changeAggregator.flushAll().catch(() => {});
        }
      });
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          // Tab became visible again, sync changes from other devices
          this.triggerSync({ silent: true }).catch((err) => {
            console.debug('[LAD:SyncCoordinator] Visibility sync check:', err);
          });
        } else if (document.visibilityState === 'hidden') {
          // Tab hidden / mobile app put to background: immediately flush all debounced changes
          if (this.changeAggregator) {
            this.changeAggregator.flushAll().catch(() => {});
          }
        }
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

  async startPeriodicSync(intervalMs: number = 30000) {
    if (this.syncIntervalId) clearInterval(this.syncIntervalId);
    this.syncIntervalId = setInterval(() => {
      this.triggerSync({ silent: true }).catch((err) => {
        console.warn('[LAD:SyncCoordinator] Silent background sync error:', err);
      });
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
  async triggerSync(options?: { silent?: boolean }): Promise<void> {
    const isSilent = options?.silent ?? false;

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

    // Flush any pending debounced changes before checking offline queue
    if (this.changeAggregator) {
      try {
        await this.changeAggregator.flushAll();
      } catch (err) {
        console.warn('[LAD:SyncCoordinator] Warning flushing changeAggregator before sync:', err);
      }
    }

    const pendingOps = this.offlineQueue.getQueue();
    const hasLocalPending = pendingOps.length > 0;

    // Do NOT transition UI to 'syncing' if this is a silent check with no pending local ops
    if (!isSilent || hasLocalPending) {
      this.updateState({ status: 'syncing' });
    }

    try {
      // Step 1: Push pending local operations to remote
      if (hasLocalPending) {
        const remoteOpLog = new OperationLog(this.spaceId, this.remoteStorage);
        await remoteOpLog.loadAll();

        const remoteOps = remoteOpLog.getOperations();
        const localKnownOpIds = new Set(this.operationLog.getOperations().map((o) => o.operation_id));
        const newRemoteOps = remoteOps.filter((ro) => !localKnownOpIds.has(ro.operation_id));

        for (const localOp of pendingOps) {
          // If this target already has an unresolved active conflict, skip pushing
          if (this.state.activeConflicts.some((c) => c.targetId === localOp.target && !c.resolved)) {
            continue;
          }

          // Check for conflicts ONLY against unseen (new) remote operations
          const conflictingRemote = newRemoteOps
            .slice()
            .reverse()
            .find((ro) => ro.target === localOp.target && ro.actor !== localOp.actor);

          if (conflictingRemote) {
            const targetObj = this.objectStore?.get(localOp.target);
            const conflict = ConflictResolver.detectConflict(localOp, conflictingRemote, {
              title: targetObj?.title,
              domain: targetObj?.domain,
            });
            if (conflict) {
              if (!this.state.activeConflicts.some((c) => c.targetId === conflict.targetId && !c.resolved)) {
                this.state.activeConflicts.push(conflict);
              }
              this.updateState({
                status: 'conflict_detected',
                activeConflicts: this.state.activeConflicts,
              });
              // Do not overwrite remote with conflicting localOp until user resolves
              continue;
            }
          }

          // Push corresponding object, manifest, or graph files to remote storage
          try {
            if (localOp.type.startsWith('object.')) {
              if (localOp.type === 'object.delete') {
                try {
                  await this.remoteStorage.deleteFile(`LAD/${this.spaceId}/objects/${localOp.target}.json`);
                } catch {
                  // ignore if not found on remote
                }
              } else {
                const obj =
                  this.objectStore?.get(localOp.target) ||
                  (await this.localStorage.readFile(`LAD/${this.spaceId}/objects/${localOp.target}.json`));
                if (obj) {
                  await this.remoteStorage.writeFile(`LAD/${this.spaceId}/objects/${localOp.target}.json`, obj);
                }
              }
              // Mirror graph nodes and edges so card entities and relationships are backed up to cloud
              const nodes = await this.localStorage.readFile(`LAD/${this.spaceId}/graph/nodes.json`);
              if (nodes) await this.remoteStorage.writeFile(`LAD/${this.spaceId}/graph/nodes.json`, nodes);
              const edges = await this.localStorage.readFile(`LAD/${this.spaceId}/graph/edges.json`);
              if (edges) await this.remoteStorage.writeFile(`LAD/${this.spaceId}/graph/edges.json`, edges);
            } else if (localOp.type === 'space.manifest.update') {
              const manifest = await this.localStorage.readFile(`LAD/${this.spaceId}/manifest.json`);
              if (manifest) {
                await this.remoteStorage.writeFile(`LAD/${this.spaceId}/manifest.json`, manifest);
              }
            } else if (localOp.type.startsWith('graph.node.')) {
              const nodes = await this.localStorage.readFile(`LAD/${this.spaceId}/graph/nodes.json`);
              if (nodes) await this.remoteStorage.writeFile(`LAD/${this.spaceId}/graph/nodes.json`, nodes);
            } else if (localOp.type.startsWith('graph.edge.')) {
              const edges = await this.localStorage.readFile(`LAD/${this.spaceId}/graph/edges.json`);
              if (edges) await this.remoteStorage.writeFile(`LAD/${this.spaceId}/graph/edges.json`, edges);
            } else if (
              localOp.type.startsWith('graph.') ||
              localOp.type.startsWith('membership.') ||
              localOp.type.startsWith('member.') ||
              localOp.type.startsWith('invitation.')
            ) {
              const nodes = await this.localStorage.readFile(`LAD/${this.spaceId}/graph/nodes.json`);
              if (nodes) await this.remoteStorage.writeFile(`LAD/${this.spaceId}/graph/nodes.json`, nodes);
              const edges = await this.localStorage.readFile(`LAD/${this.spaceId}/graph/edges.json`);
              if (edges) await this.remoteStorage.writeFile(`LAD/${this.spaceId}/graph/edges.json`, edges);
              const manifest = await this.localStorage.readFile(`LAD/${this.spaceId}/manifest.json`);
              if (manifest) await this.remoteStorage.writeFile(`LAD/${this.spaceId}/manifest.json`, manifest);
            }
          } catch (fileErr) {
            console.warn(`[LAD:SyncCoordinator] Warning syncing file for op ${localOp.operation_id}:`, fileErr);
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
          // Check if local offlineQueue has a pending operation on the same target
          const conflictingPendingLocal = this.offlineQueue
            .getQueue()
            .find((lo) => lo.target === newOp.target && lo.actor !== newOp.actor);

          if (conflictingPendingLocal) {
            const targetObj = this.objectStore?.get(newOp.target);
            const conflict = ConflictResolver.detectConflict(conflictingPendingLocal, newOp, {
              title: targetObj?.title,
              domain: targetObj?.domain,
            });
            if (conflict) {
              if (!this.state.activeConflicts.some((c) => c.targetId === conflict.targetId && !c.resolved)) {
                this.state.activeConflicts.push(conflict);
              }
              this.updateState({
                status: 'conflict_detected',
                activeConflicts: this.state.activeConflicts,
              });
              // Do not mark conflicting remote operation as applied to local operationLog until resolved
              continue;
            }
          }

          await this.operationLog.append(newOp);

          // Apply remote operation data locally
          try {
            if (newOp.type.startsWith('object.')) {
              if (newOp.type === 'object.delete') {
                if (this.objectStore) {
                  await this.objectStore.delete(newOp.target);
                } else {
                  await this.localStorage.deleteFile(`LAD/${this.spaceId}/objects/${newOp.target}.json`);
                }
              } else {
                const remoteObj = await this.remoteStorage.readFile(`LAD/${this.spaceId}/objects/${newOp.target}.json`);
                if (remoteObj) {
                  await this.localStorage.writeFile(`LAD/${this.spaceId}/objects/${newOp.target}.json`, remoteObj);
                  if (this.objectStore) {
                    await this.objectStore.loadAll();
                  }
                }
              }
              // Also pull updated graph nodes and edges from remote
              const remoteNodes = await this.remoteStorage.readFile(`LAD/${this.spaceId}/graph/nodes.json`);
              if (remoteNodes) {
                await this.localStorage.writeFile(`LAD/${this.spaceId}/graph/nodes.json`, remoteNodes);
                if (this.graphStore) await this.graphStore.load();
              }
              const remoteEdges = await this.remoteStorage.readFile(`LAD/${this.spaceId}/graph/edges.json`);
              if (remoteEdges) {
                await this.localStorage.writeFile(`LAD/${this.spaceId}/graph/edges.json`, remoteEdges);
                if (this.graphStore) await this.graphStore.load();
              }
            } else if (newOp.type === 'space.manifest.update') {
              const remoteManifest = await this.remoteStorage.readFile<any>(`LAD/${this.spaceId}/manifest.json`);
              if (remoteManifest) {
                await this.localStorage.writeFile(`LAD/${this.spaceId}/manifest.json`, remoteManifest);
                if (remoteManifest.settings?.custom_card_types) {
                  SchemaRegistry.getInstance().importCustomCardTypes(remoteManifest.settings.custom_card_types);
                }
              }
            } else if (newOp.type.startsWith('graph.node.')) {
              const remoteNodes = await this.remoteStorage.readFile(`LAD/${this.spaceId}/graph/nodes.json`);
              if (remoteNodes) {
                await this.localStorage.writeFile(`LAD/${this.spaceId}/graph/nodes.json`, remoteNodes);
                if (this.graphStore) await this.graphStore.load();
              }
            } else if (newOp.type.startsWith('graph.edge.')) {
              const remoteEdges = await this.remoteStorage.readFile(`LAD/${this.spaceId}/graph/edges.json`);
              if (remoteEdges) {
                await this.localStorage.writeFile(`LAD/${this.spaceId}/graph/edges.json`, remoteEdges);
                if (this.graphStore) await this.graphStore.load();
              }
            } else if (
              newOp.type.startsWith('graph.') ||
              newOp.type.startsWith('membership.') ||
              newOp.type.startsWith('member.') ||
              newOp.type.startsWith('invitation.')
            ) {
              const remoteNodes = await this.remoteStorage.readFile(`LAD/${this.spaceId}/graph/nodes.json`);
              if (remoteNodes) {
                await this.localStorage.writeFile(`LAD/${this.spaceId}/graph/nodes.json`, remoteNodes);
                if (this.graphStore) await this.graphStore.load();
              }
              const remoteEdges = await this.remoteStorage.readFile(`LAD/${this.spaceId}/graph/edges.json`);
              if (remoteEdges) {
                await this.localStorage.writeFile(`LAD/${this.spaceId}/graph/edges.json`, remoteEdges);
                if (this.graphStore) await this.graphStore.load();
              }
              const remoteManifest = await this.remoteStorage.readFile<any>(`LAD/${this.spaceId}/manifest.json`);
              if (remoteManifest) {
                await this.localStorage.writeFile(`LAD/${this.spaceId}/manifest.json`, remoteManifest);
              }
            }
          } catch (fileErr) {
            console.warn(`[LAD:SyncCoordinator] Warning applying remote file for op ${newOp.operation_id}:`, fileErr);
          }
        }

        if (this.onRemoteOperationsApplied) {
          await this.onRemoteOperationsApplied(newRemoteOps);
        }
      }

      // Step 3: Direct Object & Graph State Reconciliation
      // Even if operation logs collided or lagged, reconcile objects directly from remote storage
      let directReconciliationApplied = false;
      try {
        const localDeletedTargets = new Set(
          this.operationLog
            .getOperations()
            .filter((o) => o.type === 'object.delete')
            .map((o) => o.target)
        );

        const remoteObjectFiles = await this.remoteStorage.listFiles(`LAD/${this.spaceId}/objects`);
        for (const file of remoteObjectFiles) {
          if (!file.name.endsWith('.json')) continue;
          const objectId = file.name.replace(/\.json$/, '');

          if (localDeletedTargets.has(objectId)) continue;

          // Do not overwrite an object that currently has an active conflict
          if (this.state.activeConflicts.some((c) => c.targetId === objectId && !c.resolved)) {
            continue;
          }

          const localObj =
            this.objectStore?.get(objectId) ||
            (await this.localStorage.readFile<any>(`LAD/${this.spaceId}/objects/${file.name}`));

          const remoteObj = await this.remoteStorage.readFile<any>(file.path);
          if (!remoteObj || !remoteObj.object_id) continue;

          if (!localObj) {
            // New object from remote storage not yet present locally!
            await this.localStorage.writeFile(`LAD/${this.spaceId}/objects/${file.name}`, remoteObj);
            directReconciliationApplied = true;
          } else {
            const remoteTime = new Date(remoteObj.updated_at || 0).getTime();
            const localTime = new Date(localObj.updated_at || 0).getTime();
            if (remoteTime > localTime) {
              await this.localStorage.writeFile(`LAD/${this.spaceId}/objects/${file.name}`, remoteObj);
              directReconciliationApplied = true;
            }
          }
        }

        // Reconcile graph if local graph is completely empty
        if (this.graphStore && this.graphStore.getNodes().length === 0) {
          const remoteNodes = await this.remoteStorage.readFile<any[]>(`LAD/${this.spaceId}/graph/nodes.json`);
          if (remoteNodes && Array.isArray(remoteNodes) && remoteNodes.length > 0) {
            await this.localStorage.writeFile(`LAD/${this.spaceId}/graph/nodes.json`, remoteNodes);
            await this.graphStore.load();
            directReconciliationApplied = true;
          }
          const remoteEdges = await this.remoteStorage.readFile<any[]>(`LAD/${this.spaceId}/graph/edges.json`);
          if (remoteEdges && Array.isArray(remoteEdges) && remoteEdges.length > 0) {
            await this.localStorage.writeFile(`LAD/${this.spaceId}/graph/edges.json`, remoteEdges);
            await this.graphStore.load();
            directReconciliationApplied = true;
          }
        }
      } catch (reconErr) {
        console.warn(`[LAD:SyncCoordinator] Direct object reconciliation note:`, reconErr);
      }

      if (directReconciliationApplied) {
        if (this.objectStore) {
          await this.objectStore.loadAll();
        }
        if (this.onRemoteOperationsApplied) {
          await this.onRemoteOperationsApplied([]);
        }
      }

      // If silent background check and nothing was pushed, pulled, or reconciled,
      // exit immediately: DO NOT update state, DO NOT bump lastSyncedAt, DO NOT trigger re-renders!
      if (isSilent && !hasLocalPending && newRemoteOps.length === 0 && !directReconciliationApplied) {
        return;
      }

      this.updateState({
        status: this.state.activeConflicts.length > 0 ? 'conflict_detected' : 'synced',
        pendingOpsCount: this.offlineQueue.size(),
        lastSyncedAt: new Date().toISOString(),
        errorMessage: null,
      });
    } catch (err: any) {
      console.warn('[LAD:SyncCoordinator] ⚠️ GDrive sync failed; falling back to local sync:', err);
      // Fall back to local sync: preserve pending changes locally in offlineQueue
      const queueCount = this.offlineQueue.size();
      this.updateState({
        status: 'needs_attention',
        pendingOpsCount: queueCount,
        errorMessage: `GDrive sync failed (${err.message || 'remote connection error'}). Preserved locally.`,
      });
    }
  }

  async resolveConflict(
    conflictId: string,
    choice: 'keep_local' | 'accept_remote' | 'merge',
    mergedPatch?: Record<string, any>
  ): Promise<void> {
    const conflict = this.state.activeConflicts.find((c) => c.conflictId === conflictId);
    if (!conflict) return;

    conflict.resolved = true;
    conflict.resolutionChoice = choice;
    conflict.mergedPatch = mergedPatch;

    const targetId = conflict.targetId;
    const remoteOp = conflict.remoteOperation;
    const localOp = conflict.localOperation;

    if (choice === 'keep_local') {
      // 1. Keep local: Push local object and operation to remote
      if (this.remoteStorage) {
        try {
          const remoteOpLog = new OperationLog(this.spaceId, this.remoteStorage);
          await remoteOpLog.loadAll();
          await remoteOpLog.append(localOp);

          const obj =
            this.objectStore?.get(targetId) ||
            (await this.localStorage.readFile(`LAD/${this.spaceId}/objects/${targetId}.json`));
          if (obj) {
            await this.remoteStorage.writeFile(`LAD/${this.spaceId}/objects/${targetId}.json`, obj);
          }
        } catch (err) {
          console.warn('[LAD:SyncCoordinator] Warning keeping local on remote storage:', err);
        }
      }
      // Remove from offline queue since localOp is now committed
      await this.offlineQueue.remove(localOp.operation_id);

    } else if (choice === 'accept_remote') {
      // 2. Accept remote: Apply remote patch/object to local object store and localStorage
      let applied = false;
      if (this.remoteStorage) {
        try {
          const remoteObj = await this.remoteStorage.readFile(`LAD/${this.spaceId}/objects/${targetId}.json`);
          if (remoteObj) {
            await this.localStorage.writeFile(`LAD/${this.spaceId}/objects/${targetId}.json`, remoteObj);
            if (this.objectStore) {
              await this.objectStore.loadAll();
            }
            applied = true;
          }
        } catch (err) {
          console.warn('[LAD:SyncCoordinator] Warning accepting remote object:', err);
        }
      }
      if (!applied && this.objectStore && remoteOp.patch) {
        await this.objectStore.update(targetId, remoteOp.patch);
      }
      // Discard conflicting local operation from offline queue
      await this.offlineQueue.remove(localOp.operation_id);

    } else if (choice === 'merge' && mergedPatch) {
      // 3. Custom merge: Apply mergedPatch to local object store, save locally, push to remote
      if (this.objectStore) {
        await this.objectStore.update(targetId, mergedPatch);
      }
      const updatedObj =
        this.objectStore?.get(targetId) ||
        (await this.localStorage.readFile(`LAD/${this.spaceId}/objects/${targetId}.json`));

      if (updatedObj) {
        await this.localStorage.writeFile(`LAD/${this.spaceId}/objects/${targetId}.json`, updatedObj);
        if (this.remoteStorage) {
          try {
            await this.remoteStorage.writeFile(`LAD/${this.spaceId}/objects/${targetId}.json`, updatedObj);
          } catch (err) {
            console.warn('[LAD:SyncCoordinator] Warning syncing merged object to remote:', err);
          }
        }
      }

      // Record merge operation to operationLog
      const mergeOp: LADOperation = {
        operation_id: `op_merge_${Math.random().toString(36).substring(2, 10)}`,
        space_id: this.spaceId,
        type: 'object.update',
        target: targetId,
        actor: localOp.actor,
        timestamp: new Date().toISOString(),
        lamport_clock: Date.now(),
        patch: mergedPatch,
      };
      await this.operationLog.append(mergeOp);
      if (this.remoteStorage) {
        try {
          const remoteOpLog = new OperationLog(this.spaceId, this.remoteStorage);
          await remoteOpLog.loadAll();
          await remoteOpLog.append(mergeOp);
        } catch (err) {
          console.warn('[LAD:SyncCoordinator] Warning appending mergeOp to remote:', err);
        }
      }
      // Remove conflicting local operation
      await this.offlineQueue.remove(localOp.operation_id);
    }

    // Ensure resolved remoteOp is recorded in local operation log so it is not treated as an unhandled new remote op
    if (!this.operationLog.getOperations().some((o) => o.operation_id === remoteOp.operation_id)) {
      await this.operationLog.append(remoteOp);
    }

    // Filter out resolved conflict
    this.state.activeConflicts = this.state.activeConflicts.filter((c) => c.conflictId !== conflictId && !c.resolved);
    this.updateState({
      activeConflicts: this.state.activeConflicts,
      status: this.state.activeConflicts.length > 0 ? 'conflict_detected' : 'synced',
      pendingOpsCount: this.offlineQueue.size(),
      lastSyncedAt: new Date().toISOString(),
    });
  }
}
