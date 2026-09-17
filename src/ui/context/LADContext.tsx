/**
 * LAD Master Context connecting all core subsystems to the React UI layer
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { LADUserRegistry, LADSpaceManifest, LADSpaceSettings, LADObject, LADGraphNode, LADGraphEdge, LADOperation, LADActiveAlert } from '../../core/standard/types';
import { AuthService } from '../../core/identity/auth-service';
import { UserRegistryManager } from '../../core/identity/user-registry';
import { StorageManager } from '../../core/storage/storage-manager';
import { SpaceManager, LoadedSpace } from '../../core/space/space-manager';
import { SyncState } from '../../core/sync/types';
import { ProposedAgentAction } from '../../core/agents/types';
import { TelemetryBus } from '../../core/telemetry/telemetry-bus';
import { InferredStructure } from '../../core/objects/types';
import { PaletteManager } from '../../core/theme/palette-manager';
import { DEFAULT_GDRIVE_CLIENT_ID } from '../../core/standard/constants';

export interface LADContextType {
  // Identity & Auth
  authService: AuthService;
  userRegistry: LADUserRegistry | null;
  currentUserId: string;

  // Space Management
  spaces: LADUserRegistry['spaces'];
  activeSpaceId: string | null;
  activeManifest: LADSpaceManifest | null;
  switchSpace: (spaceId: string) => Promise<void>;
  createSpace: (
    name: string,
    description?: string,
    icon?: string,
    color?: string,
    categories?: string[]
  ) => Promise<void>;
  updateSpaceIdentity: (
    spaceId: string,
    patch: {
      space_name?: string;
      icon?: string;
      color?: string;
      description?: string;
      categories?: string[];
      settings?: LADSpaceSettings;
    }
  ) => Promise<void>;
  updateSpaceSettings: (spaceId: string, settings: Partial<LADSpaceSettings>) => Promise<void>;
  renameSpace: (spaceId: string, newName: string, description?: string) => Promise<void>;
  inviteMember: (email: string, role?: 'owner' | 'editor' | 'viewer', name?: string) => Promise<void>;

  // Objects & State
  objects: LADObject[];
  createObjectFromCapture: (structure: InferredStructure) => Promise<LADObject>;
  updateObject: (objectId: string, patch: Partial<LADObject>, immediate?: boolean) => Promise<void>;
  deleteObject: (objectId: string) => Promise<void>;

  // Graph & Policies
  nodes: LADGraphNode[];
  edges: LADGraphEdge[];
  addGraphNode: (label: string, type: LADGraphNode['type'], refId?: string) => Promise<void>;
  addGraphEdge: (source: string, target: string, type: string, policies?: any) => Promise<void>;
  updateGraphEdge: (edgeId: string, policies: any) => Promise<void>;

  // Active Layer & Attention
  activeAlerts: LADActiveAlert[];
  dismissAlert: (alertId: string) => void;
  snoozeAlert: (alertId: string) => void;
  proposals: ProposedAgentAction[];
  approveProposal: (proposalId: string) => Promise<void>;
  rejectProposal: (proposalId: string) => void;

  // Sync State
  syncState: SyncState;
  triggerSync: () => Promise<void>;

  // Version History
  operations: LADOperation[];

  // Settings
  updatePreferences: (prefs: Partial<LADUserRegistry['preferences']>) => Promise<void>;
  updateProfile: (displayName: string, email?: string) => Promise<void>;
  connectGoogleDrive: (clientId: string) => Promise<void>;

  isLoading: boolean;
}

const LADContext = createContext<LADContextType | undefined>(undefined);

export const LADProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authService] = useState(() => new AuthService());
  const [storageManager] = useState(() => new StorageManager());
  const [userRegistryManager, setUserRegistryManager] = useState<UserRegistryManager | null>(null);
  const [spaceManager, setSpaceManager] = useState<SpaceManager | null>(null);

  const [userRegistry, setUserRegistry] = useState<LADUserRegistry | null>(null);
  const [activeSpace, setActiveSpace] = useState<LoadedSpace | null>(null);

  const [objects, setObjects] = useState<LADObject[]>([]);
  const [nodes, setNodes] = useState<LADGraphNode[]>([]);
  const [edges, setEdges] = useState<LADGraphEdge[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<LADActiveAlert[]>([]);
  const [proposals, setProposals] = useState<ProposedAgentAction[]>([]);
  const [operations, setOperations] = useState<LADOperation[]>([]);
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'synced',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingOpsCount: 0,
    lastSyncedAt: null,
    activeConflicts: [],
    errorMessage: null,
  });

  const [isLoading, setIsLoading] = useState(true);

  // Initialize storage, user registry and default space
  useEffect(() => {
    let mounted = true;

    async function init() {
      setIsLoading(true);
      await storageManager.initialize();

      const auth = authService.getState();
      if (auth.isAuthenticated && auth.user?.accessToken && auth.user?.provider === 'google') {
        storageManager.setGDriveProvider({
          clientId: DEFAULT_GDRIVE_CLIENT_ID,
          accessToken: auth.user.accessToken,
        });
      }

      const regManager = new UserRegistryManager(storageManager.getLocalProvider());
      const spManager = new SpaceManager(
        storageManager.getLocalProvider(),
        storageManager.getRemoteProvider()
      );

      const registry = await regManager.loadOrCreateRegistry(auth.user?.email, auth.user?.provider || 'local');

      if (!mounted) return;
      setUserRegistryManager(regManager);
      setSpaceManager(spManager);
      setUserRegistry(registry);

      if (registry.preferences?.palette_theme) {
        PaletteManager.applyPalette(registry.preferences.palette_theme as any);
      }

      // Load initial active space
      const initialSpaceRef = registry.spaces[0];
      const initialSpaceId = initialSpaceRef?.space_id || 'spc_default';
      const initialSpaceName = initialSpaceRef?.space_name || 'Personal';
      const loaded = await spManager.loadSpace(
        initialSpaceId,
        registry.user_id,
        registry.preferences.change_commit_threshold_ms,
        initialSpaceName,
        registry.identities[0]?.display_name,
        registry.identities[0]?.email
      );

      if (storageManager.getRemoteProvider()) {
        loaded.syncCoordinator.setRemoteStorage(storageManager.getRemoteProvider());
      }

      if (!mounted) return;
      setActiveSpace(loaded);
      setObjects(loaded.objectStore.getAll());
      setNodes(loaded.graphStore.getNodes());
      setEdges(loaded.graphStore.getEdges());
      setOperations(loaded.operationLog.getOperations());
      setIsLoading(false);

      TelemetryBus.getInstance().record('application_event', 'app_initialized', {
        userId: registry.user_id,
        spaceId: initialSpaceId,
      });
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Listeners for active space reactivity
  useEffect(() => {
    if (!activeSpace) return;

    const unsubAlerts = activeSpace.activeEngine.subscribe((alerts) => {
      setActiveAlerts([...alerts]);
    });

    const unsubProposals = activeSpace.agentRuntime.subscribeProposals((props) => {
      setProposals([...props]);
    });

    const unsubSync = activeSpace.syncCoordinator.subscribe((state: SyncState) => {
      setSyncState({ ...state });
    });

    activeSpace.syncCoordinator.startPeriodicSync(15000);

    return () => {
      unsubAlerts();
      unsubProposals();
      unsubSync();
      activeSpace.syncCoordinator.stopPeriodicSync();
    };
  }, [activeSpace]);

  const refreshSpaceState = useCallback(() => {
    if (!activeSpace) return;
    setObjects(activeSpace.objectStore.getAll());
    setNodes(activeSpace.graphStore.getNodes());
    setEdges(activeSpace.graphStore.getEdges());
    setOperations(activeSpace.operationLog.getOperations());
  }, [activeSpace]);

  const switchSpace = useCallback(
    async (spaceId: string) => {
      if (!spaceManager || !userRegistry) return;
      const spaceRef = userRegistry.spaces.find((s) => s.space_id === spaceId);
      const spaceName = spaceRef?.space_name || 'Personal';
      const loaded = await spaceManager.loadSpace(
        spaceId,
        userRegistry.user_id,
        userRegistry.preferences.change_commit_threshold_ms,
        spaceName,
        userRegistry.identities[0]?.display_name,
        userRegistry.identities[0]?.email
      );
      setActiveSpace(loaded);
      setObjects(loaded.objectStore.getAll());
      setNodes(loaded.graphStore.getNodes());
      setEdges(loaded.graphStore.getEdges());
      setOperations(loaded.operationLog.getOperations());

      TelemetryBus.getInstance().record('user_interaction', 'space_switched', { spaceId });
    },
    [spaceManager, userRegistry]
  );

  const createSpace = useCallback(
    async (
      name: string,
      description?: string,
      icon?: string,
      color?: string,
      categories?: string[]
    ) => {
      if (!spaceManager || !userRegistry || !userRegistryManager) return;
      const manifest = await spaceManager.createSpace({
        spaceName: name,
        description,
        icon,
        color,
        categories,
        createdByUserId: userRegistry.user_id,
      });

      const newRef = {
        space_id: manifest.space_id,
        space_name: manifest.space_name,
        icon: manifest.icon,
        color: manifest.color,
        description: manifest.description,
        categories: manifest.categories,
        storage_provider: 'local_indexeddb' as const,
        storage_reference: manifest.space_id,
        role: 'owner' as const,
        status: 'active' as const,
        last_synced_at: new Date().toISOString(),
      };

      await userRegistryManager.addSpace(newRef);
      setUserRegistry({ ...userRegistryManager.getRegistry()! });
      await switchSpace(manifest.space_id);
    },
    [spaceManager, userRegistry, userRegistryManager, switchSpace]
  );

  const updateSpaceIdentity = useCallback(
    async (
      spaceId: string,
      patch: {
        space_name?: string;
        icon?: string;
        color?: string;
        description?: string;
        categories?: string[];
        settings?: LADSpaceSettings;
      }
    ) => {
      if (!spaceManager || !userRegistryManager) return;
      await userRegistryManager.updateSpaceIdentity(spaceId, patch);
      const updatedManifest = await spaceManager.updateSpaceManifest(spaceId, patch);
      setUserRegistry({ ...userRegistryManager.getRegistry()! });

      if (activeSpace && activeSpace.manifest.space_id === spaceId) {
        setActiveSpace({
          ...activeSpace,
          manifest: updatedManifest,
        });
      }
    },
    [spaceManager, userRegistryManager, activeSpace]
  );

  const updateSpaceSettings = useCallback(
    async (spaceId: string, settings: Partial<LADSpaceSettings>) => {
      await updateSpaceIdentity(spaceId, {
        settings: {
          ...(activeSpace?.manifest.settings || {}),
          ...settings,
        },
      });
    },
    [updateSpaceIdentity, activeSpace]
  );

  const renameSpace = useCallback(
    async (spaceId: string, newName: string, description?: string) => {
      await updateSpaceIdentity(spaceId, {
        space_name: newName,
        ...(description !== undefined ? { description } : {}),
      });
    },
    [updateSpaceIdentity]
  );

  const inviteMember = useCallback(
    async (email: string, role: 'owner' | 'editor' | 'viewer' = 'editor', name?: string) => {
      if (!spaceManager || !activeSpace || !userRegistry) return;
      await spaceManager.createInvitation(
        activeSpace.manifest.space_id,
        userRegistry.user_id,
        email,
        role,
        name
      );
      refreshSpaceState();
    },
    [spaceManager, activeSpace, userRegistry, refreshSpaceState]
  );

  const createObjectFromCapture = useCallback(
    async (structure: InferredStructure): Promise<LADObject> => {
      if (!activeSpace || !userRegistry) throw new Error('No active space');

      const obj = activeSpace.objectStore.createObject({
        title: structure.title,
        description: structure.rawText,
        domain: structure.domain,
        tags: structure.tags,
        priority: structure.priority,
        dueDate: structure.dueDate,
        assignedTo: structure.assignedTo,
        attributes: structure.suggestedAttributes,
        actorUserId: userRegistry.user_id,
      });

      await activeSpace.objectStore.save(obj);

      // Create graph node for object
      await activeSpace.graphStore.ensureNodeForEntity(obj.object_id, 'object', obj.title, {
        domain: obj.domain,
        priority: obj.priority,
      });

      // Commit immediate operation
      await activeSpace.changeAggregator.commitImmediate({
        targetId: obj.object_id,
        type: 'object.create',
        actor: userRegistry.user_id,
        spaceId: activeSpace.manifest.space_id,
        patch: obj as any,
      });

      refreshSpaceState();
      return obj;
    },
    [activeSpace, userRegistry, refreshSpaceState]
  );

  const updateObject = useCallback(
    async (objectId: string, patch: Partial<LADObject>, immediate: boolean = false) => {
      if (!activeSpace || !userRegistry) return;
      const existing = activeSpace.objectStore.get(objectId);
      if (!existing) return;

      const updated = { ...existing, ...patch, updated_at: new Date().toISOString() };
      await activeSpace.objectStore.save(updated);

      if (immediate) {
        await activeSpace.changeAggregator.commitImmediate({
          targetId: objectId,
          type: 'object.update',
          actor: userRegistry.user_id,
          spaceId: activeSpace.manifest.space_id,
          patch,
        });
      } else {
        // Register transient change with 5-second aggregation window
        activeSpace.changeAggregator.registerTransientChange({
          targetId: objectId,
          type: 'object.update',
          actor: userRegistry.user_id,
          spaceId: activeSpace.manifest.space_id,
          originalState: existing,
          currentState: updated,
          patch,
        });
      }

      refreshSpaceState();
    },
    [activeSpace, userRegistry, refreshSpaceState]
  );

  const deleteObject = useCallback(
    async (objectId: string) => {
      if (!activeSpace || !userRegistry) return;
      await activeSpace.objectStore.delete(objectId);
      await activeSpace.graphStore.removeNode(`node_${objectId}`);

      await activeSpace.changeAggregator.commitImmediate({
        targetId: objectId,
        type: 'object.delete',
        actor: userRegistry.user_id,
        spaceId: activeSpace.manifest.space_id,
        patch: { object_id: objectId },
      });

      refreshSpaceState();
    },
    [activeSpace, userRegistry, refreshSpaceState]
  );

  const addGraphNode = useCallback(
    async (label: string, type: LADGraphNode['type'], refId?: string) => {
      if (!activeSpace) return;
      const rand = Math.random().toString(36).substring(2, 8);
      const nodeId = refId ? `node_${refId}` : `node_custom_${rand}`;

      await activeSpace.graphStore.addNode({
        node_id: nodeId,
        type,
        label,
        ref_id: refId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      refreshSpaceState();
    },
    [activeSpace, refreshSpaceState]
  );

  const addGraphEdge = useCallback(
    async (source: string, target: string, type: string, policies?: any) => {
      if (!activeSpace) return;
      const edgeId = `edge_${Math.random().toString(36).substring(2, 8)}`;

      await activeSpace.graphStore.addEdge({
        edge_id: edgeId,
        source,
        target,
        type,
        policies: policies || {
          notification: {
            modification: true,
          },
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      refreshSpaceState();
    },
    [activeSpace, refreshSpaceState]
  );

  const updateGraphEdge = useCallback(
    async (edgeId: string, policies: any) => {
      if (!activeSpace) return;
      await activeSpace.graphStore.updateEdge(edgeId, { policies });
      refreshSpaceState();
    },
    [activeSpace, refreshSpaceState]
  );

  const dismissAlert = useCallback(
    (alertId: string) => {
      if (!activeSpace) return;
      activeSpace.activeEngine.dismissAlert(alertId);
      setActiveAlerts(activeSpace.activeEngine.getActiveAlerts());
    },
    [activeSpace]
  );

  const snoozeAlert = useCallback(
    (alertId: string) => {
      if (!activeSpace) return;
      activeSpace.activeEngine.snoozeAlert(alertId);
      setActiveAlerts(activeSpace.activeEngine.getActiveAlerts());
    },
    [activeSpace]
  );

  const approveProposal = useCallback(
    async (proposalId: string) => {
      if (!activeSpace || !userRegistry) return;
      await activeSpace.agentRuntime.approveProposal(proposalId, userRegistry.user_id);
      refreshSpaceState();
    },
    [activeSpace, userRegistry, refreshSpaceState]
  );

  const rejectProposal = useCallback(
    (proposalId: string) => {
      if (!activeSpace || !userRegistry) return;
      activeSpace.agentRuntime.rejectProposal(proposalId, userRegistry.user_id);
      refreshSpaceState();
    },
    [activeSpace, userRegistry, refreshSpaceState]
  );

  const updatePreferences = useCallback(
    async (prefs: Partial<LADUserRegistry['preferences']>) => {
      if (!userRegistryManager) return;
      if (prefs.palette_theme) {
        PaletteManager.applyPalette(prefs.palette_theme as any);
      }
      await userRegistryManager.updatePreferences(prefs);
      setUserRegistry({ ...userRegistryManager.getRegistry()! });
      if (prefs.change_commit_threshold_ms && activeSpace) {
        activeSpace.changeAggregator.setThreshold(prefs.change_commit_threshold_ms);
      }
    },
    [userRegistryManager, activeSpace]
  );

  const updateProfile = useCallback(
    async (displayName: string, email?: string) => {
      if (!userRegistryManager) return;
      await userRegistryManager.updateIdentity(displayName, email);
      const reg = userRegistryManager.getRegistry()!;
      setUserRegistry({ ...reg });
      if (activeSpace) {
        await activeSpace.graphStore.ensureNodeForEntity(reg.user_id, 'user', displayName, {
          name: displayName,
          email: email || reg.identities[0]?.email,
          role: 'owner',
        });
        refreshSpaceState();
      }
    },
    [userRegistryManager, activeSpace, refreshSpaceState]
  );

  const connectGoogleDrive = useCallback(
    async (clientId?: string) => {
      const targetClientId =
        clientId?.trim() ||
        userRegistry?.preferences.gdrive_client_id ||
        DEFAULT_GDRIVE_CLIENT_ID;

      try {
        const user = await authService.signInWithGoogle(targetClientId);
        if (user.accessToken) {
          storageManager.setGDriveProvider({
            clientId: targetClientId,
            accessToken: user.accessToken,
          });
          if (spaceManager) {
            spaceManager.setRemoteStorage(storageManager.getRemoteProvider());
          }
          if (activeSpace) {
            activeSpace.syncCoordinator.setRemoteStorage(storageManager.getRemoteProvider());
          }
          await updatePreferences({ gdrive_client_id: targetClientId });
          if (user.email && userRegistryManager) {
            await userRegistryManager.updateIdentity(user.name, user.email);
            setUserRegistry({ ...userRegistryManager.getRegistry()! });
          }
          if (activeSpace) {
            await activeSpace.syncCoordinator.triggerSync();
          }
          refreshSpaceState();
        }
      } catch (err: any) {
        console.error('Google OAuth connection error:', err);
      }
    },
    [
      authService,
      storageManager,
      spaceManager,
      activeSpace,
      userRegistry,
      userRegistryManager,
      updatePreferences,
      refreshSpaceState,
    ]
  );

  const triggerSync = useCallback(async () => {
    const auth = authService.getState();
    const hasRemote = Boolean(storageManager.getRemoteProvider());

    if (
      !auth.isAuthenticated ||
      !auth.user?.accessToken ||
      auth.user?.provider !== 'google' ||
      !hasRemote
    ) {
      // Trigger Google OAuth pop-out dialog
      await connectGoogleDrive();
      return;
    }

    if (activeSpace) {
      await activeSpace.syncCoordinator.triggerSync();
      refreshSpaceState();
    }
  }, [authService, storageManager, connectGoogleDrive, activeSpace, refreshSpaceState]);

  return (
    <LADContext.Provider
      value={{
        authService,
        userRegistry,
        currentUserId: userRegistry?.user_id || 'usr_guest',
        spaces: userRegistry?.spaces || [],
        activeSpaceId: activeSpace?.manifest.space_id || null,
        activeManifest: activeSpace?.manifest || null,
        switchSpace,
        createSpace,
        updateSpaceIdentity,
        updateSpaceSettings,
        renameSpace,
        inviteMember,
        objects,
        createObjectFromCapture,
        updateObject,
        deleteObject,
        nodes,
        edges,
        addGraphNode,
        addGraphEdge,
        updateGraphEdge,
        activeAlerts,
        dismissAlert,
        snoozeAlert,
        proposals,
        approveProposal,
        rejectProposal,
        syncState,
        triggerSync,
        operations,
        updatePreferences,
        updateProfile,
        connectGoogleDrive,
        isLoading,
      }}
    >
      {children}
    </LADContext.Provider>
  );
};

export function useLAD(): LADContextType {
  const context = useContext(LADContext);
  if (!context) {
    throw new Error('useLAD must be used within a LADProvider');
  }
  return context;
}
