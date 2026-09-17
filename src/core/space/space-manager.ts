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
      await this.remoteStorage.writeFile(this.getManifestPath(spaceId), manifest);
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

    // Try reading manifest from local storage first
    let manifest = await this.localStorage.readFile<LADSpaceManifest>(this.getManifestPath(spaceId));

    if (!manifest && this.remoteStorage) {
      manifest = await this.remoteStorage.readFile<LADSpaceManifest>(this.getManifestPath(spaceId));
      if (manifest) {
        // Cache to local storage
        await this.localStorage.writeFile(this.getManifestPath(spaceId), manifest);
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

    const operationLog = new OperationLog(spaceId, this.localStorage);
    await operationLog.loadAll();

    const offlineQueue = new OfflineQueue(spaceId, this.localStorage);
    await offlineQueue.load();

    const activeEngine = new ActiveEngine(spaceId);

    const changeAggregator = new ChangeAggregator(commitThresholdMs, async (op) => {
      // On commit callback: append to log and enqueue for sync
      await operationLog.append(op);
      await offlineQueue.enqueue(op);
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

    const syncCoordinator = new SyncCoordinator({
      spaceId,
      localStorage: this.localStorage,
      remoteStorage: this.remoteStorage,
      offlineQueue,
      operationLog,
      onRemoteOperationsApplied: async (_ops) => {
        // Reload local memory
        await objectStore.loadAll();
        await graphStore.load();
        activeEngine.evaluateObjects(objectStore.getAll());
      },
    });

    // Ensure current user is present as a node in the graph with real display name
    const resolvedName = currentUserName || 'Owner';
    await graphStore.ensureNodeForEntity(currentUserId, 'user', resolvedName, {
      name: resolvedName,
      email: currentUserEmail,
      role: 'owner',
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
    const invId = `inv_${Math.random().toString(36).substring(2, 10)}`;
    const displayName = invitedName?.trim() || invitedEmail.split('@')[0];

    const invitation: LADInvitation = {
      invitation_id: invId,
      space_id: spaceId,
      invited_by: invitedByUserId,
      invited_name: invitedName?.trim() || undefined,
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

    return invitation;
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
}
