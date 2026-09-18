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
      onRemoteOperationsApplied: async (ops) => {
        // If space manifest or settings were updated remotely, reload the manifest
        const hasManifestUpdate = ops.some(
          (op) => op.type === 'space.manifest.update' || op.type.startsWith('membership.')
        );
        if (hasManifestUpdate) {
          const freshManifest = await this.localStorage.readFile<LADSpaceManifest>(this.getManifestPath(spaceId));
          if (freshManifest && this.loadedSpaces.has(spaceId)) {
            this.loadedSpaces.get(spaceId)!.manifest = freshManifest;
          }
        }
        // Reload local memory
        await objectStore.loadAll();
        await graphStore.load();
        await this.deduplicateUserNodes(spaceId);
        activeEngine.evaluateObjects(objectStore.getAll());
      },
    });

    // Ensure current user is present as a node in the graph with real display name & correct role
    const normalizedCurrentEmail = currentUserEmail?.trim().toLowerCase();
    const existingUserNode = graphStore.getNodes().find((n) => {
      if (n.type !== 'user') return false;
      if (n.ref_id === currentUserId || n.node_id === `node_${currentUserId}` || n.node_id === currentUserId) return true;
      if (normalizedCurrentEmail) {
        const nodeEmail = (n.metadata?.email || (n.label.includes('@') ? n.label : '')).trim().toLowerCase();
        return nodeEmail === normalizedCurrentEmail;
      }
      return false;
    });

    const isOwner = manifest.created_by === currentUserId;
    const resolvedRole = (existingUserNode?.metadata?.role as any) || (isOwner ? 'owner' : 'editor');
    const resolvedName = currentUserName || existingUserNode?.metadata?.name || existingUserNode?.label || (isOwner ? 'Owner' : 'Collaborator');

    if (existingUserNode) {
      const prevInvitedName =
        existingUserNode.metadata?.invited_name ||
        (existingUserNode.label !== resolvedName && !existingUserNode.label.includes('@')
          ? existingUserNode.label
          : undefined);

      await graphStore.updateNode(existingUserNode.node_id, {
        label: resolvedName,
        ref_id: currentUserId,
        metadata: {
          ...existingUserNode.metadata,
          name: resolvedName,
          email: currentUserEmail || existingUserNode.metadata?.email,
          role: resolvedRole,
          status: 'active',
          user_id: currentUserId,
          ...(prevInvitedName ? { invited_name: prevInvitedName } : {}),
        },
      });

      // Update edges pointing to this node to active membership
      const edges = graphStore.getEdges().filter((e) => e.target === existingUserNode.node_id);
      for (const edge of edges) {
        if (edge.type === 'proposed_membership') {
          await graphStore.updateEdge(edge.edge_id, {
            type: 'member_of',
            metadata: {
              ...edge.metadata,
              status: 'active',
              role: resolvedRole,
            },
          });
        }
      }
    } else {
      await graphStore.ensureNodeForEntity(currentUserId, 'user', resolvedName, {
        name: resolvedName,
        email: currentUserEmail,
        role: resolvedRole,
        status: 'active',
      });
    }

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

    // Self-healing: Deduplicate any pre-existing duplicate user nodes sharing the same email
    await this.deduplicateUserNodes(spaceId);

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
      const isAlreadyActive = existingNode.metadata?.status === 'active';
      invitedNode = (await space.graphStore.updateNode(existingNode.node_id, {
        label: isAlreadyActive ? existingNode.label : displayName,
        metadata: {
          ...existingNode.metadata,
          invitation_id: invId,
          name: isAlreadyActive ? existingNode.metadata?.name || existingNode.label : displayName,
          invited_name: rawName || existingNode.metadata?.invited_name || undefined,
          email: invitedEmail,
          status: isAlreadyActive ? 'active' : 'invited',
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
   * Removes a member from a space, updating all configuration data:
   * graph nodes, graph edges, object assignments, manifest timestamp,
   * delta operation log, and synchronizing with remote storage.
   */
  async removeMember(
    spaceId: string,
    actorUserId: string,
    targetUserNodeId: string
  ): Promise<{ success: boolean; removedEmail?: string; error?: string }> {
    const space = await this.loadSpace(spaceId, actorUserId);

    // 1. Locate the target user node in graphStore
    const node = space.graphStore.getNodes().find(
      (n) => n.node_id === targetUserNodeId || n.ref_id === targetUserNodeId
    );

    if (!node) {
      return { success: false, error: 'User not found in space graph' };
    }

    // 2. Protect primary space creator from removal
    if (
      space.manifest.created_by &&
      (node.ref_id === space.manifest.created_by ||
        node.node_id === `node_${space.manifest.created_by}` ||
        node.node_id === space.manifest.created_by)
    ) {
      return { success: false, error: 'Cannot remove the primary space creator' };
    }

    const removedEmail = node.metadata?.email || (node.label.includes('@') ? node.label : undefined);
    const removedName = node.metadata?.invited_name || node.metadata?.name || node.label;
    const removedRole = node.metadata?.role || 'editor';

    // 3. Unassign any objects referencing this user
    const userIdentifiers = new Set(
      [
        node.node_id,
        node.ref_id,
        node.metadata?.email,
        node.metadata?.name,
        node.metadata?.invited_name,
        node.label,
      ].filter(Boolean) as string[]
    );

    for (const obj of space.objectStore.getAll()) {
      if (obj.assigned_to && userIdentifiers.has(obj.assigned_to)) {
        await space.objectStore.update(obj.object_id, {
          assigned_to: undefined,
        });
      }
    }

    // 4. Remove node and all associated edges from graphStore
    await space.graphStore.removeNode(node.node_id);

    // Clean up any other duplicate user nodes sharing this email address
    if (removedEmail && removedEmail !== 'user@ladboard.local') {
      const remainingDuplicates = space.graphStore
        .getNodes()
        .filter(
          (n) =>
            n.type === 'user' &&
            n.node_id !== node.node_id &&
            (n.metadata?.email || (n.label.includes('@') ? n.label : '')).trim().toLowerCase() ===
              removedEmail.toLowerCase()
        );
      for (const dup of remainingDuplicates) {
        await space.graphStore.removeNode(dup.node_id);
      }
    }

    // 5. Update space manifest timestamp and save
    space.manifest.updated_at = new Date().toISOString();
    await this.localStorage.writeFile(this.getManifestPath(spaceId), space.manifest);

    // 6. Commit delta operation to changeAggregator
    await space.changeAggregator.commitImmediate({
      targetId: node.node_id,
      type: 'membership.remove',
      actor: actorUserId,
      spaceId,
      patch: {
        node_id: node.node_id,
        ref_id: node.ref_id,
        name: removedName,
        email: removedEmail,
        role: removedRole,
      } as any,
    });

    // 7. Synchronize updated graph & manifest to remote storage if connected
    if (this.remoteStorage) {
      try {
        console.log(`[LAD:SpaceManager] Syncing member removal to Google Drive for space ${spaceId}...`);
        await this.remoteStorage.writeFile(this.getManifestPath(spaceId), space.manifest);
        await this.remoteStorage.writeFile(`LAD/${spaceId}/graph/nodes.json`, space.graphStore.getNodes());
        await this.remoteStorage.writeFile(`LAD/${spaceId}/graph/edges.json`, space.graphStore.getEdges());
        console.log(`[LAD:SpaceManager] ✅ Synced member removal to Google Drive`);
      } catch (err) {
        console.warn(`[LAD:SpaceManager] Could not sync member removal to remote storage:`, err);
      }
    }

    return { success: true, removedEmail };
  }

  /**
   * Scans and merges any duplicate user nodes sharing the same email address in the space graph.
   * Ensures exactly one canonical active user node per email, migrating all edges and object assignments.
   */
  async deduplicateUserNodes(spaceId: string): Promise<{ mergedCount: number }> {
    const space = this.loadedSpaces.get(spaceId);
    if (!space) return { mergedCount: 0 };

    const nodes = space.graphStore.getNodes();
    const userNodes = nodes.filter((n) => n.type === 'user');

    // Group by normalized email
    const byEmail = new Map<string, LADGraphNode[]>();
    for (const u of userNodes) {
      const email = (u.metadata?.email || (u.label.includes('@') ? u.label : '')).trim().toLowerCase();
      if (!email || email === 'user@ladboard.local') continue;

      if (!byEmail.has(email)) byEmail.set(email, []);
      byEmail.get(email)!.push(u);
    }

    let mergedCount = 0;
    for (const [email, duplicates] of byEmail.entries()) {
      if (duplicates.length <= 1) continue;

      // Pick the canonical node:
      // Prefer active over invited; prefer real user_id over usr_invited_; prefer newest updated_at
      duplicates.sort((a, b) => {
        const aActive = a.metadata?.status === 'active' ? 1 : 0;
        const bActive = b.metadata?.status === 'active' ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;

        const aInvited = (a.ref_id || '').startsWith('usr_invited_') ? 0 : 1;
        const bInvited = (b.ref_id || '').startsWith('usr_invited_') ? 0 : 1;
        if (aInvited !== bInvited) return bInvited - aInvited;

        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      const canonical = duplicates[0];
      const redundant = duplicates.slice(1);

      // Collect invited_name from redundant nodes if canonical does not have one
      const invitedName =
        canonical.metadata?.invited_name ||
        redundant.find((r) => r.metadata?.invited_name)?.metadata?.invited_name ||
        redundant.find((r) => r.metadata?.name && r.metadata?.status === 'invited')?.metadata?.name ||
        redundant.find((r) => r.label && !r.label.includes('@'))?.label;

      const roles = [canonical.metadata?.role, ...redundant.map((r) => r.metadata?.role)].filter(Boolean);
      const bestRole = roles.includes('owner') ? 'owner' : roles.includes('editor') ? 'editor' : 'viewer';
      const isActive = canonical.metadata?.status === 'active' || redundant.some((r) => r.metadata?.status === 'active');

      // Update canonical node
      await space.graphStore.updateNode(canonical.node_id, {
        metadata: {
          ...canonical.metadata,
          email,
          role: bestRole,
          status: isActive ? 'active' : canonical.metadata?.status || 'invited',
          ...(invitedName && invitedName !== canonical.label ? { invited_name: invitedName } : {}),
        },
      });

      // For each redundant node, migrate edges and object assignments
      for (const red of redundant) {
        // Re-point edges
        const edges = space.graphStore.getEdges();
        for (const edge of edges) {
          let needsUpdate = false;
          let newSource = edge.source;
          let newTarget = edge.target;
          let newType = edge.type;

          if (edge.source === red.node_id) {
            newSource = canonical.node_id;
            needsUpdate = true;
          }
          if (edge.target === red.node_id) {
            newTarget = canonical.node_id;
            needsUpdate = true;
            if (isActive && edge.type === 'proposed_membership') {
              newType = 'member_of';
            }
          }

          if (needsUpdate) {
            // Check if an identical edge already exists
            const existingEdge = space.graphStore
              .getEdges()
              .find((e) => e.edge_id !== edge.edge_id && e.source === newSource && e.target === newTarget);
            if (existingEdge) {
              await space.graphStore.removeEdge(edge.edge_id);
            } else {
              await space.graphStore.updateEdge(edge.edge_id, {
                source: newSource,
                target: newTarget,
                type: newType,
                metadata: {
                  ...edge.metadata,
                  status: isActive ? 'active' : edge.metadata?.status,
                },
              });
            }
          }
        }

        // Migrate object assignments
        for (const obj of space.objectStore.getAll()) {
          if (obj.assigned_to === red.node_id || obj.assigned_to === red.ref_id) {
            await space.objectStore.update(obj.object_id, {
              assigned_to: canonical.ref_id || canonical.node_id,
            });
          }
        }

        // Delete redundant node from graphStore
        await space.graphStore.removeNode(red.node_id);
        mergedCount++;
      }
    }

    if (mergedCount > 0) {
      console.log(`[LAD:SpaceManager] ✅ Successfully deduplicated ${mergedCount} duplicate user nodes in space ${spaceId}`);
      await space.graphStore.save();
    }

    return { mergedCount };
  }

  /**
   * Reconciles an existing user or invitation node with an accepting user's real identity
   */
  async reconcileUserNode(
    spaceId: string,
    currentUserId: string,
    currentUserName: string,
    currentUserEmail?: string,
    role: 'owner' | 'editor' | 'viewer' = 'editor'
  ): Promise<LADGraphNode> {
    const space = await this.loadSpace(spaceId, currentUserId, 1500, undefined, currentUserName, currentUserEmail);
    const normalizedEmail = currentUserEmail?.trim().toLowerCase();

    // 1. Search for existing node by email or ID
    const nodes = space.graphStore.getNodes();
    const existingNode = nodes.find((n) => {
      if (n.type !== 'user') return false;
      if (n.ref_id === currentUserId || n.node_id === `node_${currentUserId}` || n.node_id === currentUserId) return true;
      if (normalizedEmail) {
        const nodeEmail = (n.metadata?.email || (n.label.includes('@') ? n.label : '')).trim().toLowerCase();
        return nodeEmail === normalizedEmail;
      }
      return false;
    });

    let activeNode: LADGraphNode;
    if (existingNode) {
      const prevInvitedName =
        existingNode.metadata?.invited_name ||
        (existingNode.label !== currentUserName && !existingNode.label.includes('@') ? existingNode.label : undefined);

      activeNode =
        (await space.graphStore.updateNode(existingNode.node_id, {
          label: currentUserName,
          ref_id: currentUserId,
          metadata: {
            ...existingNode.metadata,
            name: currentUserName,
            email: currentUserEmail || existingNode.metadata?.email,
            status: 'active',
            role: existingNode.metadata?.role || role,
            accepted_at: new Date().toISOString(),
            user_id: currentUserId,
            ...(prevInvitedName ? { invited_name: prevInvitedName } : {}),
          },
        })) || existingNode;

      // Update edges pointing to this node
      const edges = space.graphStore.getEdges().filter((e) => e.target === existingNode.node_id);
      for (const edge of edges) {
        await space.graphStore.updateEdge(edge.edge_id, {
          type: 'member_of',
          metadata: {
            ...edge.metadata,
            status: 'active',
            role: activeNode.metadata?.role || role,
          },
        });
      }
    } else {
      activeNode = await space.graphStore.ensureNodeForEntity(currentUserId, 'user', currentUserName, {
        name: currentUserName,
        email: currentUserEmail,
        status: 'active',
        role,
        accepted_at: new Date().toISOString(),
        user_id: currentUserId,
      });
    }

    // Clean up any remaining duplicate nodes for this email
    await this.deduplicateUserNodes(spaceId);

    // Sync updated graph and manifest to remote storage if connected
    if (this.remoteStorage) {
      try {
        await this.remoteStorage.writeFile(this.getManifestPath(spaceId), space.manifest);
        await this.remoteStorage.writeFile(`LAD/${spaceId}/graph/nodes.json`, space.graphStore.getNodes());
        await this.remoteStorage.writeFile(`LAD/${spaceId}/graph/edges.json`, space.graphStore.getEdges());
      } catch (err) {
        console.warn('[LAD:SpaceManager] Sync after reconcileUserNode failed:', err);
      }
    }

    return activeNode;
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
    patch: Partial<Pick<LADSpaceManifest, 'space_name' | 'icon' | 'color' | 'description' | 'categories' | 'settings'>>,
    actor?: string
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

    // Commit a space.manifest.update operation to the version control system
    if (loaded) {
      await loaded.changeAggregator.commitImmediate({
        targetId: spaceId,
        type: 'space.manifest.update',
        actor: actor || manifest.created_by,
        spaceId,
        patch,
      });
    } else if (this.remoteStorage) {
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
