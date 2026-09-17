/**
 * Space Manager orchestrating Space Manifests, Folders, and Space Discovery
 */

import { LADSpaceManifest, LADInvitation, LADGraphNode } from '../standard/types';
import { LAD_STANDARD_VERSION } from '../standard/constants';
import { validateSpaceManifest } from '../standard/validators';
import { IStorageProvider } from '../storage/provider.interface';
import { GraphStore } from '../graph/graph-store';
import { ObjectStore } from '../objects/object-store';
import { OperationLog } from '../operations/operation-log';
import { OfflineQueue } from '../sync/offline-queue';
import { SyncCoordinator } from '../sync/sync-coordinator';
import { ActiveEngine } from '../active/active-engine';
import { AgentRuntime } from '../agents/agent-runtime';
import { ChangeAggregator } from '../operations/change-aggregator';

export interface LoadedSpace {
  manifest: LADSpaceManifest;
  graphStore: GraphStore;
  objectStore: ObjectStore;
  operationLog: OperationLog;
  offlineQueue: OfflineQueue;
  syncCoordinator: SyncCoordinator;
  activeEngine: ActiveEngine;
  agentRuntime: AgentRuntime;
  changeAggregator: ChangeAggregator;
}

export class SpaceManager {
  private localStorage: IStorageProvider;
  private remoteStorage: IStorageProvider | null = null;
  private loadedSpaces: Map<string, LoadedSpace> = new Map();
  private activeSpaceId: string | null = null;

  constructor(localStorage: IStorageProvider, remoteStorage?: IStorageProvider | null) {
    this.localStorage = localStorage;
    this.remoteStorage = remoteStorage || null;
  }

  setRemoteStorage(remote: IStorageProvider | null) {
    this.remoteStorage = remote;
    for (const space of this.loadedSpaces.values()) {
      space.syncCoordinator.setRemoteStorage(remote);
    }
  }

  private getManifestPath(spaceId: string): string {
    return `LAD/${spaceId}/manifest.json`;
  }

  /**
   * Creates a new Space with standard manifest and directory layout
   */
  async createSpace(params: {
    spaceId?: string;
    spaceName: string;
    icon?: string;
    color?: string;
    description?: string;
    categories?: string[];
    createdByUserId: string;
  }): Promise<LADSpaceManifest> {
    const rand = Math.random().toString(36).substring(2, 10);
    const spaceId = params.spaceId || `spc_${rand}`;

    const manifest: LADSpaceManifest = {
      lad_standard: LAD_STANDARD_VERSION,
      schema_version: '1.0.0',
      space_id: spaceId,
      space_name: params.spaceName,
      icon: params.icon || '🪐',
      color: params.color || 'blue',
      description: params.description || '',
      categories: params.categories,
      created_by: params.createdByUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      schema_extensions: [],
    };

    validateSpaceManifest(manifest);

    // Write manifest to storage
    await this.localStorage.writeFile(this.getManifestPath(spaceId), manifest);
    if (this.remoteStorage) {
      try {
        await this.remoteStorage.writeFile(this.getManifestPath(spaceId), manifest);
      } catch (err) {
        console.warn('[LAD:SpaceManager] Remote storage write failed for new space manifest, falling back to local:', err);
      }
    }

    return manifest;
  }

  /**
   * Loads a Space into active memory
   */
  async loadSpace(
    spaceId: string,
    currentUserId: string,
    commitThresholdMs: number = 5000,
    fallbackSpaceName?: string,
    currentUserName?: string,
    currentUserEmail?: string
  ): Promise<LoadedSpace> {
    if (this.loadedSpaces.has(spaceId)) {
      this.activeSpaceId = spaceId;
      const loaded = this.loadedSpaces.get(spaceId)!;
      // If a human-friendly fallback name is provided and the existing manifest has an ID-like name, heal it
      if (
        fallbackSpaceName &&
        (loaded.manifest.space_name.startsWith('Space ') ||
          loaded.manifest.space_name.startsWith('spc_') ||
          loaded.manifest.space_name === spaceId)
      ) {
        loaded.manifest.space_name = fallbackSpaceName;
        await this.localStorage.writeFile(this.getManifestPath(spaceId), loaded.manifest);
      }
      return loaded;
    }

    let isReplicatingFromRemote = false;
    let manifest = await this.localStorage.readFile<LADSpaceManifest>(this.getManifestPath(spaceId));

    if (!manifest && this.remoteStorage) {
      console.log(`[LAD:SpaceManager] Local manifest missing for ${spaceId}. Reading from remote storage...`);
      manifest = await this.remoteStorage.readFile<LADSpaceManifest>(this.getManifestPath(spaceId));
      if (manifest) {
        // Cache to local storage
        await this.localStorage.writeFile(this.getManifestPath(spaceId), manifest);
        isReplicatingFromRemote = true;
        console.log(`[LAD:SpaceManager] ✅ Cached remote manifest to local storage`);
      }
    }

    if (!manifest) {
      // Auto-create manifest if brand new space with a clean human name
      const defaultName = fallbackSpaceName || 'Personal';
      const defaultCategories = defaultName.toLowerCase().includes('person')
        ? ['health', 'finances', 'documents', 'shopping', 'home']
        : undefined;
      manifest = await this.createSpace({
        spaceId,
        spaceName: defaultName,
        categories: defaultCategories,
        createdByUserId: currentUserId,
      });
    } else if (
      fallbackSpaceName &&
      (manifest.space_name.startsWith('Space ') ||
        manifest.space_name.startsWith('spc_') ||
        manifest.space_name === spaceId)
    ) {
      // Heal legacy or ID-derived placeholder names
      manifest.space_name = fallbackSpaceName;
      await this.localStorage.writeFile(this.getManifestPath(spaceId), manifest);
      if (this.remoteStorage) {
        await this.remoteStorage.writeFile(this.getManifestPath(spaceId), manifest);
      }
    }

    validateSpaceManifest(manifest);

    // Initialize subsystems
    const graphStore = new GraphStore(spaceId, this.localStorage);
    await graphStore.load();

    const objectStore = new ObjectStore(spaceId, this.localStorage);
    await objectStore.loadAll();

    // If replicating from remote or local stores are completely empty while remote is connected:
    if (this.remoteStorage && (isReplicatingFromRemote || (objectStore.getAll().length === 0 && graphStore.getNodes().length === 0))) {
      try {
        console.log(`[LAD:SpaceManager] Replicating remote space data for ${spaceId}...`);
        // Replicate graph
        const remoteNodes = await this.remoteStorage.readFile<any[]>(`LAD/${spaceId}/graph/nodes.json`);
        if (remoteNodes && Array.isArray(remoteNodes)) {
          await this.localStorage.writeFile(`LAD/${spaceId}/graph/nodes.json`, remoteNodes);
          await graphStore.load();
        }
        const remoteEdges = await this.remoteStorage.readFile<any[]>(`LAD/${spaceId}/graph/edges.json`);
        if (remoteEdges && Array.isArray(remoteEdges)) {
          await this.localStorage.writeFile(`LAD/${spaceId}/graph/edges.json`, remoteEdges);
          await graphStore.load();
        }

        // Replicate objects
        const remoteObjectFiles = await this.remoteStorage.listFiles(`LAD/${spaceId}/objects`);
        for (const file of remoteObjectFiles) {
          if (file.name.endsWith('.json')) {
            const obj = await this.remoteStorage.readFile<any>(file.path);
            if (obj) {
              await this.localStorage.writeFile(`LAD/${spaceId}/objects/${file.name}`, obj);
            }
          }
        }
        await objectStore.loadAll();
        console.log(`[LAD:SpaceManager] ✅ Replicated ${objectStore.getAll().length} objects and ${graphStore.getNodes().length} nodes from remote`);
      } catch (err) {
        console.warn(`[LAD:SpaceManager] Error replicating remote space data:`, err);
      }
    }

    const operationLog = new OperationLog(spaceId, this.localStorage);
    await operationLog.loadAll();

    const offlineQueue = new OfflineQueue(spaceId, this.localStorage);
    await offlineQueue.load();

    const activeEngine = new ActiveEngine(spaceId);

    let syncCoordinator: SyncCoordinator;

    const changeAggregator = new ChangeAggregator(commitThresholdMs, async (op) => {
      // On commit callback: append to log and enqueue for sync
      await operationLog.append(op);
      await offlineQueue.enqueue(op);
      if (syncCoordinator) {
        syncCoordinator.triggerSync().catch((err) => {
          console.warn('[LAD:SpaceManager] Auto-sync failed:', err);
        });
      }
    });

    changeAggregator.setLamportClock(operationLog.getLatestLamportClock());

    const agentRuntime = new AgentRuntime(spaceId, async (op) => {
      await changeAggregator.commitImmediate({
        targetId: op.target,
        type: op.type,
        actor: op.actor,
        spaceId: op.space_id,
        patch: op.patch,
      });
    });

    syncCoordinator = new SyncCoordinator({
      spaceId,
      localStorage: this.localStorage,
      remoteStorage: this.remoteStorage,
      offlineQueue,
      operationLog,
      objectStore,
      graphStore,
      onRemoteOperationsApplied: async (_ops) => {
        // Reload local memory
        await objectStore.loadAll();
        await graphStore.load();
        activeEngine.evaluateObjects(objectStore.getAll());
      },
    });

    // Ensure current user is present as a node in the graph with real display name & correct role
    const existingUserNode = graphStore.getNodes().find(
      (n) => n.ref_id === currentUserId || n.node_id === `node_${currentUserId}`
    );
    const isOwner = manifest.created_by === currentUserId;
    const resolvedRole = (existingUserNode?.metadata?.role as any) || (isOwner ? 'owner' : 'editor');
    const resolvedName = currentUserName || existingUserNode?.label || (isOwner ? 'Owner' : 'Collaborator');

    await graphStore.ensureNodeForEntity(currentUserId, 'user', resolvedName, {
      name: resolvedName,
      email: currentUserEmail || existingUserNode?.metadata?.email,
      role: resolvedRole,
      status: 'active',
    });

    const loaded: LoadedSpace = {
      manifest,
      graphStore,
      objectStore,
      operationLog,
      offlineQueue,
      syncCoordinator,
      activeEngine,
      agentRuntime,
      changeAggregator,
    };

    this.loadedSpaces.set(spaceId, loaded);
    this.activeSpaceId = spaceId;

    // Initial active engine evaluation
    activeEngine.evaluateObjects(objectStore.getAll());

    return loaded;
  }

  getActiveSpace(): LoadedSpace | null {
    if (!this.activeSpaceId) return null;
    return this.loadedSpaces.get(this.activeSpaceId) || null;
  }

  getActiveSpaceId(): string | null {
    return this.activeSpaceId;
  }

  /**
   * Creates an invitation record in the graph & operations log
   */
  async createInvitation(
    spaceId: string,
    invitedByUserId: string,
    invitedEmail: string,
    role: 'owner' | 'editor' | 'viewer' = 'editor',
    invitedName?: string
  ): Promise<LADInvitation> {
    const space = await this.loadSpace(spaceId, invitedByUserId);
    const rawName = invitedName?.trim();
    let displayName = rawName;
    if (!displayName) {
      const prefix = invitedEmail.split('@')[0];
      const parts = prefix.split(/[._-]/).filter(Boolean);
      displayName = parts.length > 0
        ? parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
        : prefix;
    }

    const invId = 'inv_' + Math.random().toString(36).substring(2, 10);
    const invitation: LADInvitation = {
      invitation_id: invId,
      space_id: spaceId,
      invited_by: invitedByUserId,
      invited_name: rawName || undefined,
      invited_email: invitedEmail,
      role,
      status: 'invited',
      created_at: new Date().toISOString(),
    };

    // Find existing node for this email if already invited or registered
    const existingNode = space.graphStore.getNodes().find(
      (n) => n.type === 'user' && (n.metadata?.email || '').toLowerCase() === invitedEmail.toLowerCase()
    );

    let invitedNode: LADGraphNode;
    if (existingNode) {
      invitedNode = (await space.graphStore.updateNode(existingNode.node_id, {
        label: displayName,
        metadata: {
          ...existingNode.metadata,
          invitation_id: invId,
          name: displayName,
          invited_name: rawName || undefined,
          email: invitedEmail,
          status: 'invited',
          role,
        },
      })) || existingNode;
    } else {
      invitedNode = await space.graphStore.ensureNodeForEntity(
        `usr_invited_${invId}`,
        'user',
        displayName,
        {
          invitation_id: invId,
          name: displayName,
          invited_name: rawName || undefined,
          email: invitedEmail,
          status: 'invited',
          role,
        }
      );
    }

    // Add or update edge between inviter and invited
    const existingEdge = space.graphStore.getEdges().find(
      (e) => e.target === invitedNode.node_id && e.type === 'proposed_membership'
    );
    if (existingEdge) {
      await space.graphStore.updateEdge(existingEdge.edge_id, {
        metadata: {
          ...existingEdge.metadata,
          invitation_id: invId,
          status: 'invited',
          role,
        },
      });
    } else {
      await space.graphStore.addEdge({
        edge_id: `edge_inv_${invId}`,
        source: `node_${invitedByUserId}`,
        target: invitedNode.node_id,
        type: 'proposed_membership',
        metadata: {
          invitation_id: invId,
          status: 'invited',
        },
        policies: {
          notification: {
            modification: true,
          },
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Commit operation
    await space.changeAggregator.commitImmediate({
      targetId: invId,
      type: 'invitation.create',
      actor: invitedByUserId,
      spaceId,
      patch: invitation as any,
    });

    // Synchronize invitation node and manifest to remote storage if connected
    if (this.remoteStorage) {
      try {
        console.log(`[LAD:SpaceManager] Syncing invitation graph & manifest to Google Drive for space ${spaceId}...`);
        await this.remoteStorage.writeFile(this.getManifestPath(spaceId), space.manifest);
        await this.remoteStorage.writeFile(`LAD/${spaceId}/graph/nodes.json`, space.graphStore.getNodes());
        await this.remoteStorage.writeFile(`LAD/${spaceId}/graph/edges.json`, space.graphStore.getEdges());
        console.log(`[LAD:SpaceManager] ✅ Synced invitation node to Google Drive`);
      } catch (err) {
        console.warn(`[LAD:SpaceManager] Could not sync invitation to remote storage:`, err);
      }
    }

    return invitation;
  }

  /**
   * Uploads and repairs all space data (manifest, graph, objects, operations) on Google Drive
   */
  async repairAndUploadSpaceToRemote(
    spaceId: string,
    currentUserId: string
  ): Promise<{
    success: boolean;
    manifestUploaded: boolean;
    nodesUploaded: number;
    edgesUploaded: number;
    objectsUploaded: number;
    opsUploaded: number;
    error?: string;
  }> {
    if (!this.remoteStorage) {
      return {
        success: false,
        manifestUploaded: false,
        nodesUploaded: 0,
        edgesUploaded: 0,
        objectsUploaded: 0,
        opsUploaded: 0,
        error: 'Remote storage provider (Google Drive) is not connected',
      };
    }

    console.log(`[LAD:SpaceManager] 🚀 Repairing & Uploading Space "${spaceId}" to Google Drive...`);

    try {
      const space = await this.loadSpace(spaceId, currentUserId);

      // 1. Ensure space folder exists
      await this.remoteStorage.ensureDirectory(`LAD/${spaceId}`);

      // 2. Upload manifest
      await this.remoteStorage.writeFile(this.getManifestPath(spaceId), space.manifest);
      console.log(`[LAD:SpaceManager] ✅ Uploaded manifest.json for ${spaceId}`);

      // 3. Upload graph nodes and edges
      await this.remoteStorage.ensureDirectory(`LAD/${spaceId}/graph`);
      const nodes = space.graphStore.getNodes();
      await this.remoteStorage.writeFile(`LAD/${spaceId}/graph/nodes.json`, nodes);
      const edges = space.graphStore.getEdges();
      await this.remoteStorage.writeFile(`LAD/${spaceId}/graph/edges.json`, edges);
      console.log(`[LAD:SpaceManager] ✅ Uploaded ${nodes.length} nodes and ${edges.length} edges`);

      // 4. Upload all objects
      await this.remoteStorage.ensureDirectory(`LAD/${spaceId}/objects`);
      const objects = space.objectStore.getAll();
      for (const obj of objects) {
        await this.remoteStorage.writeFile(`LAD/${spaceId}/objects/${obj.object_id}.json`, obj);
      }
      console.log(`[LAD:SpaceManager] ✅ Uploaded ${objects.length} objects`);

      // 5. Upload operations
      await this.remoteStorage.ensureDirectory(`LAD/${spaceId}/operations`);
      const ops = space.operationLog.getOperations();
      if (ops.length > 0) {
        const remoteOpLog = new OperationLog(spaceId, this.remoteStorage);
        for (const op of ops) {
          await remoteOpLog.append(op);
        }
      }
      console.log(`[LAD:SpaceManager] ✅ Uploaded ${ops.length} operations`);

      return {
        success: true,
        manifestUploaded: true,
        nodesUploaded: nodes.length,
        edgesUploaded: edges.length,
        objectsUploaded: objects.length,
        opsUploaded: ops.length,
      };
    } catch (err: any) {
      console.error(`[LAD:SpaceManager] ❌ Failed to repair & upload space ${spaceId}:`, err);
      return {
        success: false,
        manifestUploaded: false,
        nodesUploaded: 0,
        edgesUploaded: 0,
        objectsUploaded: 0,
        opsUploaded: 0,
        error: err.message || 'Failed to upload space to Google Drive',
      };
    }
  }

  /**
   * Updates space manifest metadata (e.g. human-readable name, icon, color, description)
   */
  async updateSpaceManifest(
    spaceId: string,
    patch: Partial<Pick<LADSpaceManifest, 'space_name' | 'icon' | 'color' | 'description' | 'categories' | 'settings'>>
  ): Promise<LADSpaceManifest> {
    const loaded = this.loadedSpaces.get(spaceId);
    let manifest = loaded
      ? loaded.manifest
      : await this.localStorage.readFile<LADSpaceManifest>(this.getManifestPath(spaceId));

    if (!manifest) throw new Error(`Space manifest for ${spaceId} not found`);

    manifest = {
      ...manifest,
      ...patch,
      settings: patch.settings
        ? { ...(manifest.settings || {}), ...patch.settings }
        : manifest.settings,
      updated_at: new Date().toISOString(),
    };
    validateSpaceManifest(manifest);

    if (loaded) {
      loaded.manifest = manifest;
    }

    await this.localStorage.writeFile(this.getManifestPath(spaceId), manifest);
    if (this.remoteStorage) {
      await this.remoteStorage.writeFile(this.getManifestPath(spaceId), manifest);
    }

    return manifest;
  }

  /**
   * Deletes a space. If currentUserId is owner, deletes from both local and remote storage.
   * If editor/viewer, only cleans up local cached files and preserves remote files.
   */
  async deleteSpace(spaceId: string, currentUserId: string): Promise<boolean> {
    const loaded = this.loadedSpaces.get(spaceId);
    let isOwner = false;
    if (loaded) {
      isOwner = loaded.manifest.created_by === currentUserId;
      loaded.syncCoordinator.stopPeriodicSync();
      this.loadedSpaces.delete(spaceId);
    } else {
      const manifest = await this.localStorage.readFile<LADSpaceManifest>(this.getManifestPath(spaceId));
      isOwner = manifest ? manifest.created_by === currentUserId : false;
    }

    if (this.activeSpaceId === spaceId) {
      this.activeSpaceId = null;
    }

    // Delete local space directory
    await this.localStorage.deleteDirectory(`LAD/${spaceId}`);

    // If owner and remote storage is active, delete remote space directory
    if (isOwner && this.remoteStorage) {
      try {
        await this.remoteStorage.deleteDirectory(`LAD/${spaceId}`);
        console.log(`[LAD:SpaceManager] ✅ Deleted remote space directory LAD/${spaceId}`);
      } catch (err) {
        console.warn(`[LAD:SpaceManager] Failed to delete remote space directory LAD/${spaceId}:`, err);
      }
    }

    return true;
  }
}
