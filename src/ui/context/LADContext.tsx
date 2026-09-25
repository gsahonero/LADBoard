/**
 * LAD Master Context connecting all core subsystems to the React UI layer
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { LADUserRegistry, LADUserSpaceRef, LADSpaceManifest, LADSpaceSettings, LADObject, LADGraphNode, LADGraphEdge, LADOperation, LADActiveAlert, LADObjectHistoryEntry } from '../../core/standard/types';
import { AuthService } from '../../core/identity/auth-service';
import { AuthUser } from '../../core/identity/types';
import { UserRegistryManager } from '../../core/identity/user-registry';
import { StorageManager } from '../../core/storage/storage-manager';
import { SpaceManager, LoadedSpace } from '../../core/space/space-manager';
import { SyncState } from '../../core/sync/types';
import { ProposedAgentAction } from '../../core/agents/types';
import { TelemetryBus } from '../../core/telemetry/telemetry-bus';
import { InferredStructure } from '../../core/objects/types';
import { PaletteManager } from '../../core/theme/palette-manager';
import { DEFAULT_GDRIVE_CLIENT_ID } from '../../core/standard/constants';
import {
  shareSpaceDriveFolder,
  revokeSpaceDrivePermission,
  sendGmailInvitation,
  getShareableJoinUrl,
} from '../../core/sharing/google-sharing-service';
import { SchemaRegistry } from '../../core/schemas/schema-registry';

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
  inviteMember: (
    email: string,
    role?: 'owner' | 'editor' | 'viewer',
    name?: string
  ) => Promise<{ success: boolean; gmailSent: boolean; driveShared: boolean; warning?: string }>;
  removeMember: (
    nodeId: string,
    email?: string
  ) => Promise<{ success: boolean; driveRevoked: boolean; warning?: string }>;
  repairSpaceDriveFiles: (spaceId?: string) => Promise<{
    success: boolean;
    manifestUploaded: boolean;
    nodesUploaded: number;
    edgesUploaded: number;
    objectsUploaded: number;
    opsUploaded: number;
    error?: string;
  }>;
  
  // Space Joining & Invitations
  pendingJoinSpaceId: string | null;
  joinSpace: (spaceId: string) => Promise<boolean>;
  dismissPendingJoinSpace: () => void;
  deleteSpace: (spaceId: string) => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
  storageManager: StorageManager;

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

  // Sync & Conflict Resolution
  syncState: SyncState;
  triggerSync: () => Promise<void>;
  resolveConflict: (
    conflictId: string,
    choice: 'keep_local' | 'accept_remote' | 'merge',
    mergedPatch?: Record<string, any>
  ) => Promise<void>;
  isConflictModalOpen: boolean;
  openConflictModal: () => void;
  closeConflictModal: () => void;

  // Version History
  operations: LADOperation[];

  // Settings
  updatePreferences: (prefs: Partial<LADUserRegistry['preferences']>) => Promise<void>;
  updateProfile: (displayName: string, email?: string) => Promise<void>;
  connectGoogleDrive: (clientId?: string) => Promise<AuthUser | null>;
  restoreFromGoogleDrive: (clientId?: string) => Promise<{ success: boolean; spacesCount: number; error?: string }>;

  isLoading: boolean;
}

export const LADContext = createContext<LADContextType | undefined>(undefined);

export const LADProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authService] = useState(() => new AuthService());
  const [storageManager] = useState(() => new StorageManager());
  const [userRegistryManager, setUserRegistryManager] = useState<UserRegistryManager | null>(null);
  const [spaceManager, setSpaceManager] = useState<SpaceManager | null>(null);

  const [userRegistry, setUserRegistry] = useState<LADUserRegistry | null>(null);
  const [activeSpace, setActiveSpace] = useState<LoadedSpace | null>(null);
  const [pendingJoinSpaceId, setPendingJoinSpaceId] = useState<string | null>(null);

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

  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  // Automatically emerge Conflict Solver dialogue when a conflict appears
  useEffect(() => {
    if (syncState.activeConflicts.length > 0) {
      setIsConflictModalOpen(true);
    }
  }, [syncState.activeConflicts.length]);

  const [isLoading, setIsLoading] = useState(true);

  // Initialize storage, user registry and default space
  useEffect(() => {
    let mounted = true;

    async function init() {
      setIsLoading(true);
      await storageManager.initialize();

      const auth = authService.getState();
      const isExpired = authService.isTokenExpired();
      if (auth.isAuthenticated && auth.user?.accessToken && !isExpired && auth.user?.provider === 'google') {
        storageManager.setGDriveProvider({
          clientId: DEFAULT_GDRIVE_CLIENT_ID,
          accessToken: auth.user.accessToken,
        });
      }

      const regManager = new UserRegistryManager(
        storageManager.getLocalProvider(),
        storageManager.getRemoteProvider()
      );
      const spManager = new SpaceManager(
        storageManager.getLocalProvider(),
        storageManager.getRemoteProvider()
      );

      let joinSpaceId: string | null = null;
      let spaceParam: string | null = null;
      if (typeof window !== 'undefined') {
        try {
          const params = new URLSearchParams(window.location.search);
          joinSpaceId = params.get('join');
          spaceParam = params.get('space');
        } catch {
          // Ignore
        }
      }

      const isJoinInvite = Boolean(joinSpaceId && joinSpaceId.startsWith('spc_'));
      const registry = await regManager.loadOrCreateRegistry(
        auth.user?.email,
        auth.user?.provider || 'local',
        { skipDefaultSpace: isJoinInvite }
      );

      if (!mounted) return;
      setUserRegistryManager(regManager);
      setSpaceManager(spManager);
      setUserRegistry(registry);

      if (registry.preferences?.palette_theme) {
        PaletteManager.applyPalette(registry.preferences.palette_theme as any);
      }

      // Check if URL has ?join=spc_... or ?space=spc_... or localStorage lad_active_space_id
      let savedSpaceId: string | null = null;
      if (typeof window !== 'undefined') {
        try {
          savedSpaceId = localStorage.getItem('lad_active_space_id');
        } catch {
          // Ignore
        }
      }

      let initialSpaceRef = (savedSpaceId && registry.spaces.find((s) => s.space_id === savedSpaceId)) || registry.spaces[0];
      let initialSpaceId = initialSpaceRef?.space_id || 'spc_default';
      let initialSpaceName = initialSpaceRef?.space_name || 'Personal';

      if (spaceParam && spaceParam.startsWith('spc_')) {
        const existingRef = registry.spaces.find((s) => s.space_id === spaceParam);
        if (existingRef) {
          initialSpaceRef = existingRef;
          initialSpaceId = existingRef.space_id;
          initialSpaceName = existingRef.space_name;
        }
      }

      if (joinSpaceId && joinSpaceId.startsWith('spc_')) {
        const existingRef = registry.spaces.find((s) => s.space_id === joinSpaceId);
        if (existingRef) {
          initialSpaceRef = existingRef;
          initialSpaceId = existingRef.space_id;
          initialSpaceName = existingRef.space_name;
        } else {
          // Open Join Space flow to verify identity before adding to registry
          setPendingJoinSpaceId(joinSpaceId);
        }
      }

      // Clean query params immediately so the URL address bar doesn't keep ?join= or ?space= across refreshes
      if (typeof window !== 'undefined' && (joinSpaceId || spaceParam)) {
        try {
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch {
          // Ignore
        }
      }

      if (isJoinInvite && !registry.spaces.find((s) => s.space_id === joinSpaceId)) {
        // Pending join invitation and user hasn't joined yet: do not initialize a phantom space
        setIsLoading(false);
        return;
      }

      const effectiveEmail =
        (auth.isAuthenticated && auth.user?.email) ||
        (registry.identities[0]?.email !== 'user@ladboard.local' ? registry.identities[0]?.email : undefined);

      const loaded = await spManager.loadSpace(
        initialSpaceId,
        registry.user_id,
        registry.preferences.change_commit_threshold_ms,
        initialSpaceName,
        registry.identities[0]?.display_name || auth.user?.name,
        effectiveEmail
      );

      if (storageManager.getRemoteProvider()) {
        loaded.syncCoordinator.setRemoteStorage(storageManager.getRemoteProvider());
      }

      if (loaded.manifest.settings?.custom_card_types) {
        SchemaRegistry.getInstance().importCustomCardTypes(loaded.manifest.settings.custom_card_types);
      }

      if (!mounted) return;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('lad_active_space_id', initialSpaceId);
        } catch {
          // Ignore
        }
      }
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

      if (state.status === 'needs_attention' && state.errorMessage) {
        activeSpace.activeEngine.addCustomAlert({
          alert_id: 'alert_sync_fallback',
          space_id: activeSpace.manifest.space_id,
          type: 'sync_fallback',
          target_id: 'gdrive_sync',
          title: 'Google Drive Sync Failed',
          message: 'Automatic cloud sync failed. Offline fallback active: your changes are safely preserved on this device.',
          domain: 'system',
          status: 'active',
          created_at: new Date().toISOString(),
        });
      } else if (state.status === 'synced') {
        activeSpace.activeEngine.dismissAlert('alert_sync_fallback');
        if (activeSpace.manifest.settings?.custom_card_types) {
          SchemaRegistry.getInstance().importCustomCardTypes(activeSpace.manifest.settings.custom_card_types);
        }
        // Refresh space state on successful sync (manifest, objects, graph)
        setObjects(activeSpace.objectStore.getAll());
        setNodes(activeSpace.graphStore.getNodes());
        setEdges(activeSpace.graphStore.getEdges());
        setOperations(activeSpace.operationLog.getOperations());
        setActiveSpace((prev) => (prev ? { ...prev, manifest: { ...activeSpace.manifest } } : null));
      }
    });

    if (storageManager.getRemoteProvider()) {
      const interval = userRegistry?.preferences?.active_evaluation_interval_ms || 30000;
      activeSpace.syncCoordinator.startPeriodicSync(interval);
    }

    return () => {
      unsubAlerts();
      unsubProposals();
      unsubSync();
      activeSpace.syncCoordinator.stopPeriodicSync();
    };
  }, [activeSpace?.manifest.space_id, userRegistry?.preferences?.active_evaluation_interval_ms, storageManager]);

  const refreshSpaceState = useCallback(() => {
    if (!activeSpace) return;
    setObjects(activeSpace.objectStore.getAll());
    setNodes(activeSpace.graphStore.getNodes());
    setEdges(activeSpace.graphStore.getEdges());
    setOperations(activeSpace.operationLog.getOperations());
    if (activeSpace.manifest) {
      setActiveSpace((prev) => (prev ? { ...prev, manifest: { ...activeSpace.manifest } } : null));
    }
  }, [activeSpace]);

  const openConflictModal = useCallback(() => setIsConflictModalOpen(true), []);
  const closeConflictModal = useCallback(() => setIsConflictModalOpen(false), []);

  const resolveConflict = useCallback(
    async (
      conflictId: string,
      choice: 'keep_local' | 'accept_remote' | 'merge',
      mergedPatch?: Record<string, any>
    ): Promise<void> => {
      if (!activeSpace) return;
      await activeSpace.syncCoordinator.resolveConflict(conflictId, choice, mergedPatch);
      refreshSpaceState();
      if (activeSpace.syncCoordinator.getState().activeConflicts.length === 0) {
        setIsConflictModalOpen(false);
      }
    },
    [activeSpace, refreshSpaceState]
  );

  const switchSpace = useCallback(
    async (spaceId: string) => {
      if (!spaceManager) return;

      const currentRegistry = userRegistryManager?.getRegistry() || userRegistry;
      if (!currentRegistry) return;

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('lad_active_space_id', spaceId);
        } catch {
          // Ignore
        }
      }

      // Flush any debounced pending edits on current space before switching and stop its sync
      if (activeSpace) {
        try {
          await activeSpace.changeAggregator.flushAll();
          activeSpace.syncCoordinator.stopPeriodicSync();
        } catch (e) {
          // ignore
        }
      }

      const spaceRef = currentRegistry.spaces.find((s) => s.space_id === spaceId);
      const spaceName = spaceRef?.space_name || 'Personal';
      const loaded = await spaceManager.loadSpace(
        spaceId,
        currentRegistry.user_id,
        currentRegistry.preferences.change_commit_threshold_ms,
        spaceName,
        currentRegistry.identities[0]?.display_name,
        currentRegistry.identities[0]?.email
      );

      // Ensure remote storage is wired to the switched space
      if (storageManager.getRemoteProvider()) {
        loaded.syncCoordinator.setRemoteStorage(storageManager.getRemoteProvider());
      }

      if (loaded.manifest.settings?.custom_card_types) {
        SchemaRegistry.getInstance().importCustomCardTypes(loaded.manifest.settings.custom_card_types);
      }

      setActiveSpace(loaded);
      setObjects(loaded.objectStore.getAll());
      setNodes(loaded.graphStore.getNodes());
      setEdges(loaded.graphStore.getEdges());
      setOperations(loaded.operationLog.getOperations());

      // Trigger a silent background sync for the switched space to pull remote changes
      if (storageManager.getRemoteProvider()) {
        loaded.syncCoordinator.triggerSync({ silent: true }).then(() => {
          if (loaded.manifest.space_id === spaceId) {
            setObjects(loaded.objectStore.getAll());
            setNodes(loaded.graphStore.getNodes());
            setEdges(loaded.graphStore.getEdges());
          }
        }).catch((err) => {
          console.debug('[LAD:Context] Space switch sync:', err);
        });
      }

      TelemetryBus.getInstance().record('user_interaction', 'space_switched', { spaceId });
    },
    [spaceManager, userRegistryManager, userRegistry, activeSpace, storageManager]
  );

  const createSpace = useCallback(
    async (
      name: string,
      description?: string,
      icon?: string,
      color?: string,
      categories?: string[]
    ) => {
      if (!spaceManager || !userRegistryManager) return;
      const currentRegistry = userRegistryManager.getRegistry() || userRegistry;
      if (!currentRegistry) return;

      const manifest = await spaceManager.createSpace({
        spaceName: name,
        description,
        icon,
        color,
        categories,
        createdByUserId: currentRegistry.user_id,
      });

      const auth = authService.getState();
      const hasRemote = Boolean(storageManager.getRemoteProvider());
      const isGoogle = auth.isAuthenticated && auth.user?.provider === 'google' && hasRemote;

      const newRef: LADUserSpaceRef = {
        space_id: manifest.space_id,
        space_name: manifest.space_name,
        icon: manifest.icon,
        color: manifest.color,
        description: manifest.description,
        categories: manifest.categories,
        storage_provider: (isGoogle ? 'google_drive' : 'local_indexeddb'),
        storage_reference: manifest.space_id,
        role: 'owner',
        status: 'active',
        last_synced_at: new Date().toISOString(),
      };

      await userRegistryManager.addSpace(newRef);
      const updatedReg = userRegistryManager.getRegistry()!;
      setUserRegistry({ ...updatedReg });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('lad_active_space_id', manifest.space_id);
        } catch {
          // Ignore
        }
      }
      await switchSpace(manifest.space_id);

      // If GDrive has been set up, sync to GDrive by default; if it fails, fall back to local sync
      if (isGoogle) {
        try {
          console.log(`[LAD:Context] Defaulting to GDrive sync for new space "${manifest.space_id}"...`);
          await spaceManager.repairAndUploadSpaceToRemote(manifest.space_id, currentRegistry.user_id);
        } catch (err) {
          console.warn('[LAD:Context] Initial GDrive upload failed, falling back to local sync:', err);
          await userRegistryManager.addSpace({
            ...newRef,
            storage_provider: 'local_indexeddb',
          });
          setUserRegistry({ ...userRegistryManager.getRegistry()! });
        }
      }
    },
    [spaceManager, userRegistryManager, userRegistry, switchSpace, authService, storageManager]
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
      if (patch.settings?.custom_card_types) {
        SchemaRegistry.getInstance().importCustomCardTypes(patch.settings.custom_card_types);
      }
      await userRegistryManager.updateSpaceIdentity(spaceId, patch);
      const actor = userRegistryManager.getRegistry()?.user_id;
      const updatedManifest = await spaceManager.updateSpaceManifest(spaceId, patch, actor);
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
    async (
      email: string,
      role: 'owner' | 'editor' | 'viewer' = 'editor',
      name?: string
    ): Promise<{ success: boolean; gmailSent: boolean; driveShared: boolean; warning?: string }> => {
      if (!spaceManager || !activeSpace || !userRegistry) {
        return { success: false, gmailSent: false, driveShared: false, warning: 'Space not initialized' };
      }

      // 1. Create invitation record in graph and operation log
      await spaceManager.createInvitation(
        activeSpace.manifest.space_id,
        userRegistry.user_id,
        email,
        role,
        name
      );

      // Pre-upload complete space snapshot to Google Drive if remote storage is active
      if (storageManager.getRemoteProvider()) {
        try {
          console.log('[LAD:Invitation] Pushing complete space snapshot to Google Drive before sharing...');
          await spaceManager.repairAndUploadSpaceToRemote(
            activeSpace.manifest.space_id,
            userRegistry.user_id
          );
        } catch (e: any) {
          console.warn('[LAD:Invitation] Warning during pre-share space upload:', e);
        }
      }

      let driveShared = false;
      let gmailSent = false;
      let warning: string | undefined;

      // 2. Dispatch Drive permissions & Gmail notification if Google Auth is active
      const auth = authService.getState();
      const accessToken = auth.user?.accessToken;
      const isExpired = authService.isTokenExpired();

      if (auth.isAuthenticated && accessToken && !isExpired && auth.user?.provider === 'google') {
        const remoteProvider = storageManager.getRemoteProvider();
        let folderId: string | undefined;

        if (remoteProvider && 'resolveFolderPath' in remoteProvider) {
          try {
            folderId = await (remoteProvider as any).resolveFolderPath(`LAD/${activeSpace.manifest.space_id}`);
          } catch (e: any) {
            console.warn('Could not resolve GDrive folder ID for space:', e);
          }
        }

        if (folderId) {
          try {
            const shareRes = await shareSpaceDriveFolder(
              accessToken,
              folderId,
              email,
              role === 'viewer' ? 'viewer' : 'editor'
            );
            if (shareRes.success) driveShared = true;
          } catch (e: any) {
            console.warn('Drive folder sharing failed:', e);
          }
        }

        const joinUrl = getShareableJoinUrl(activeSpace.manifest.space_id);
        const inviterName = userRegistry.identities[0]?.display_name || auth.user.name || 'LAD Board User';
        const inviterEmail = userRegistry.identities[0]?.email || auth.user.email || '';

        try {
          const emailRes = await sendGmailInvitation(accessToken, {
            toEmail: email,
            invitedName: name,
            spaceName: activeSpace.manifest.space_name,
            spaceId: activeSpace.manifest.space_id,
            inviterName,
            inviterEmail,
            role: role === 'viewer' ? 'viewer' : 'editor',
            joinUrl,
          });

          if (emailRes.success) {
            gmailSent = true;
          } else {
            warning = emailRes.error;
            console.warn('Gmail invitation dispatch failed:', emailRes.error);
          }
        } catch (e: any) {
          warning = e.message;
          console.warn('Gmail API call failed:', e);
        }
      } else if (auth.user?.provider === 'google' && isExpired) {
        warning = 'Google session expired. Please reconnect in Settings to dispatch invitation emails via Gmail.';
      }

      refreshSpaceState();
      return { success: true, gmailSent, driveShared, warning };
    },
    [spaceManager, activeSpace, userRegistry, authService, storageManager, refreshSpaceState]
  );

  const removeMember = useCallback(
    async (
      nodeId: string,
      email?: string
    ): Promise<{ success: boolean; driveRevoked: boolean; warning?: string }> => {
      if (!spaceManager || !activeSpace || !userRegistry) {
        return { success: false, driveRevoked: false, warning: 'Space not initialized' };
      }

      // 1. Remove member from Space graph, edges, objects, and remote files
      const res = await spaceManager.removeMember(
        activeSpace.manifest.space_id,
        userRegistry.user_id,
        nodeId
      );

      if (!res.success) {
        return { success: false, driveRevoked: false, warning: res.error || 'Failed to remove user' };
      }

      let driveRevoked = false;
      let warning: string | undefined;

      // 2. Revoke Google Drive folder permissions if Google Auth is active
      const targetEmail = email || res.removedEmail;
      const auth = authService.getState();
      const accessToken = auth.user?.accessToken;
      const isExpired = authService.isTokenExpired();

      if (auth.isAuthenticated && accessToken && !isExpired && auth.user?.provider === 'google' && targetEmail) {
        const remoteProvider = storageManager.getRemoteProvider();
        let folderId: string | undefined;

        if (remoteProvider && 'resolveFolderPath' in remoteProvider) {
          try {
            folderId = await (remoteProvider as any).resolveFolderPath(`LAD/${activeSpace.manifest.space_id}`);
          } catch (e: any) {
            console.warn('[LAD:Context] Could not resolve GDrive folder ID for revocation:', e);
          }
        }

        if (folderId) {
          try {
            const revokeRes = await revokeSpaceDrivePermission(accessToken, folderId, targetEmail);
            if (revokeRes.success) {
              driveRevoked = true;
            } else if (revokeRes.error) {
              warning = revokeRes.error;
            }
          } catch (e: any) {
            console.warn('[LAD:Context] Revoke Google Drive folder permission failed:', e);
            warning = e.message;
          }
        }
      }

      // Refresh in-memory state and trigger sync
      refreshSpaceState();
      activeSpace.syncCoordinator.triggerSync({ silent: false }).catch((err) => {
        console.warn('[LAD:Context] Sync after removeMember failed:', err);
      });

      return { success: true, driveRevoked, warning };
    },
    [spaceManager, activeSpace, userRegistry, authService, storageManager, refreshSpaceState]
  );

  const joinSpace = useCallback(
    async (spaceId: string): Promise<boolean> => {
      if (!spaceManager || !userRegistry || !userRegistryManager) return false;
      try {
        const auth = authService.getState();
        const userEmail = auth.user?.email || userRegistry.identities[0]?.email;
        const userName = auth.user?.name || userRegistry.identities[0]?.display_name || 'Collaborator';

        // Load space replica into memory & local storage
        const loaded = await spaceManager.loadSpace(
          spaceId,
          userRegistry.user_id,
          userRegistry.preferences.change_commit_threshold_ms,
          undefined,
          userName,
          userEmail
        );

        if (storageManager.getRemoteProvider()) {
          loaded.syncCoordinator.setRemoteStorage(storageManager.getRemoteProvider());
        }

        // Commit membership.accept operation
        await loaded.changeAggregator.commitImmediate({
          targetId: `usr_${userRegistry.user_id}`,
          type: 'membership.accept',
          actor: userRegistry.user_id,
          spaceId,
          patch: {
            userId: userRegistry.user_id,
            email: userEmail,
            name: userName,
            acceptedAt: new Date().toISOString(),
          },
        });

        // Reconcile user node in graph (upgrades invitation node in-place, preserves invited_name, converts proposed_membership to member_of, and deduplicates)
        await spaceManager.reconcileUserNode(
          spaceId,
          userRegistry.user_id,
          userName,
          userEmail,
          'editor'
        );

        // Add / update user registry space with role editor
        const existingRef = userRegistry.spaces.find((s) => s.space_id === spaceId);
        const isGoogle = auth.isAuthenticated && auth.user?.provider === 'google';
        await userRegistryManager.addSpace({
          space_id: spaceId,
          space_name: loaded.manifest.space_name,
          icon: loaded.manifest.icon,
          color: loaded.manifest.color,
          description: loaded.manifest.description,
          categories: loaded.manifest.categories,
          storage_provider: isGoogle ? 'google_drive' : existingRef?.storage_provider || 'local_indexeddb',
          storage_reference: spaceId,
          role: 'editor',
          status: 'active',
          last_synced_at: new Date().toISOString(),
        });

        // Update user registry identity display name if still default and Google profile name is available
        if (auth.user?.name && userRegistry.identities[0]?.display_name === 'LAD User') {
          await userRegistryManager.updateIdentity(auth.user.name, auth.user.email);
        }

        // Clean up unrequested/empty Personal space if joining an invited space
        const emptyPersonal = userRegistry.spaces.find(
          (s) => s.space_name === 'Personal' && s.role === 'owner' && s.space_id !== spaceId
        );
        if (emptyPersonal) {
          try {
            const pSpace = await spaceManager.loadSpace(emptyPersonal.space_id, userRegistry.user_id);
            if (pSpace.objectStore.getAll().length === 0 && pSpace.graphStore.getNodes().filter((n) => n.type === 'object').length === 0) {
              await userRegistryManager.removeSpace(emptyPersonal.space_id);
              await spaceManager.deleteSpace(emptyPersonal.space_id, userRegistry.user_id);
            }
          } catch (e) {
            console.warn('[LAD:Context] Failed to cleanup empty default space:', e);
          }
        }

        setUserRegistry({ ...userRegistryManager.getRegistry()! });

        // Mark as onboarded so the user is never prompted to create their first space after joining
        if (typeof window !== 'undefined') {
          localStorage.setItem('lad_onboarded', 'true');
        }

        setActiveSpace(loaded);
        setObjects(loaded.objectStore.getAll());
        setNodes(loaded.graphStore.getNodes());
        setEdges(loaded.graphStore.getEdges());
        setOperations(loaded.operationLog.getOperations());
        setPendingJoinSpaceId(null);

        if (typeof window !== 'undefined') {
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }

        if (loaded.syncCoordinator && storageManager.getRemoteProvider()) {
          loaded.syncCoordinator.triggerSync({ silent: true }).catch((err) => {
            console.warn('[LAD:Context] Sync after joinSpace failed:', err);
          });
        }

        TelemetryBus.getInstance().record('user_interaction', 'space_joined', { spaceId });
        return true;
      } catch (err) {
        console.error('Failed to join space:', err);
        return false;
      }
    },
    [spaceManager, userRegistry, userRegistryManager, authService, storageManager]
  );

  const dismissPendingJoinSpace = useCallback(async () => {
    setPendingJoinSpaceId(null);
    if (typeof window !== 'undefined') {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
    if (userRegistry && userRegistry.spaces.length === 0 && spaceManager && userRegistryManager) {
      await createSpace('Personal', 'Personal life, health, finances & daily flow');
    }
  }, [userRegistry, spaceManager, userRegistryManager, createSpace]);

  const deleteSpace = useCallback(
    async (spaceId: string): Promise<boolean> => {
      if (!spaceManager || !userRegistry || !userRegistryManager) return false;
      try {
        console.log(`[LAD:Context] Deleting / leaving space "${spaceId}"...`);
        // Remove space from storage (local + remote if owner)
        await spaceManager.deleteSpace(spaceId, userRegistry.user_id);

        // Remove from registry
        await userRegistryManager.removeSpace(spaceId);
        const updatedReg = userRegistryManager.getRegistry();
        if (updatedReg) {
          setUserRegistry({ ...updatedReg });
        }

        // If active space was deleted, switch to next available or create a default space
        if (activeSpace?.manifest.space_id === spaceId) {
          const remaining = updatedReg?.spaces || [];
          if (remaining.length > 0) {
            await switchSpace(remaining[0].space_id);
          } else {
            // Fresh default Personal space
            await createSpace('Personal', 'Personal life, health, finances & daily flow');
          }
        }
        return true;
      } catch (err) {
        console.error(`[LAD:Context] Failed to delete space ${spaceId}:`, err);
        return false;
      }
    },
    [spaceManager, userRegistry, userRegistryManager, activeSpace, switchSpace, createSpace]
  );

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[LAD:Context] Initiating account deletion and complete data erasure...');
      if (activeSpace) {
        activeSpace.syncCoordinator.stopPeriodicSync();
      }

      // Erase all data: remote Google Drive LAD folder + local IndexedDB + localStorage lad_*
      await storageManager.eraseAllData();

      // Sign out auth service
      await authService.signOut();

      // Reset state
      setUserRegistry(null);
      setActiveSpace(null);
      setObjects([]);
      setNodes([]);
      setEdges([]);
      setOperations([]);

      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      return true;
    } catch (err) {
      console.error('[LAD:Context] Error during account deletion:', err);
      return false;
    }
  }, [activeSpace, storageManager, authService]);

  const createObjectFromCapture = useCallback(
    async (structure: InferredStructure): Promise<LADObject> => {
      if (!activeSpace || !userRegistry) throw new Error('No active space');

      const mergedAttributes: Record<string, any> = {
        ...(structure.suggestedAttributes || {}),
        ...(structure.fieldValues || {}),
      };
      if (structure.cardTypeId) {
        mergedAttributes.card_type = structure.cardTypeId;
      }

      const cardTypeDef = structure.cardTypeId
        ? SchemaRegistry.getInstance().getCardType(structure.cardTypeId)
        : undefined;

      // Unique continuous state entity check (e.g. Account / Credit Card Balance for a bank)
      if (cardTypeDef?.isUniqueState) {
        const existingObjects = activeSpace.objectStore.getAll();
        const existingCard = existingObjects.find((o) => {
          if (o.status === 'archived') return false;
          const oCardType = o.attributes?.card_type || (o.attributes as any)?.cardTypeId;
          if (oCardType !== structure.cardTypeId) return false;

          const keyFields = cardTypeDef.uniqueKeyFields?.length
            ? cardTypeDef.uniqueKeyFields
            : ['bank'];

          for (const key of keyFields) {
            const existingVal = String(o.attributes?.[key] || '').trim().toLowerCase();
            const newVal = String(mergedAttributes[key] || '').trim().toLowerCase();
            if (existingVal && newVal && existingVal === newVal) {
              return true;
            }
          }

          // Fallback to title matching if specific key fields were absent
          if (o.title && structure.title) {
            if (o.title.trim().toLowerCase() === structure.title.trim().toLowerCase()) {
              return true;
            }
          }

          return false;
        });

        if (existingCard) {
          const changes: Record<string, { from?: any; to: any }> = {};
          for (const [k, v] of Object.entries(mergedAttributes)) {
            if (existingCard.attributes?.[k] !== v) {
              changes[k] = { from: existingCard.attributes?.[k], to: v };
            }
          }
          if (structure.title && structure.title !== existingCard.title) {
            changes['title'] = { from: existingCard.title, to: structure.title };
          }

          let summary = 'Updated card state';
          if (changes.balance) {
            const fromNum = Number(changes.balance.from);
            const toNum = Number(changes.balance.to);
            const fromStr = !isNaN(fromNum) ? `$${fromNum.toLocaleString()}` : String(changes.balance.from ?? 'none');
            const toStr = !isNaN(toNum) ? `$${toNum.toLocaleString()}` : String(changes.balance.to ?? 'none');
            summary = `Balance updated from ${fromStr} to ${toStr}`;
          } else if (Object.keys(changes).length > 0) {
            summary = `Updated ${Object.keys(changes).join(', ')}`;
          }

          const localIdentity = userRegistry?.identities?.[0];
          const actorName = localIdentity?.display_name || userRegistry.user_id;

          const historyEntry: LADObjectHistoryEntry = {
            timestamp: new Date().toISOString(),
            actor: actorName,
            summary,
            changes,
            snapshot: {
              title: structure.title || existingCard.title,
              balance: mergedAttributes.balance ?? existingCard.attributes?.balance,
              attributes: { ...existingCard.attributes, ...mergedAttributes },
            },
          };

          const initialHistoryEntry: LADObjectHistoryEntry = {
            timestamp: existingCard.created_at,
            actor: existingCard.created_by,
            summary: 'Initial state created',
            snapshot: {
              title: existingCard.title,
              balance: existingCard.attributes?.balance,
              attributes: { ...existingCard.attributes },
            },
          };

          const updatedHistory = [
            ...(existingCard.history && existingCard.history.length > 0
              ? existingCard.history
              : [initialHistoryEntry]),
            historyEntry,
          ];

          const updatedCard: LADObject = {
            ...existingCard,
            title: structure.title || existingCard.title,
            description: structure.rawText || existingCard.description,
            attributes: {
              ...existingCard.attributes,
              ...mergedAttributes,
            },
            history: updatedHistory,
            last_checked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            version: (existingCard.version || 1) + 1,
          };

          await activeSpace.objectStore.save(updatedCard);
          await activeSpace.changeAggregator.commitImmediate({
            targetId: existingCard.object_id,
            type: 'object.update',
            actor: userRegistry.user_id,
            spaceId: activeSpace.manifest.space_id,
            patch: updatedCard as any,
          });

          refreshSpaceState();
          return updatedCard;
        }
      }

      const initialHistory: LADObjectHistoryEntry[] = [
        {
          timestamp: new Date().toISOString(),
          actor: userRegistry.identities[0]?.display_name || userRegistry.user_id,
          summary: 'Created card',
          snapshot: {
            title: structure.title,
            balance: mergedAttributes.balance,
            attributes: { ...mergedAttributes },
          },
        },
      ];

      const obj = activeSpace.objectStore.createObject({
        title: structure.title,
        description: structure.rawText,
        domain: structure.domain,
        tags: structure.tags,
        priority: structure.priority,
        dueDate: structure.dueDate,
        assignedTo: structure.assignedTo,
        attributes: mergedAttributes,
        actorUserId: userRegistry.user_id,
      });

      obj.history = initialHistory;

      await activeSpace.objectStore.save(obj);

      // Create graph node for object
      const objNode = await activeSpace.graphStore.ensureNodeForEntity(obj.object_id, 'object', obj.title, {
        domain: obj.domain,
        priority: obj.priority,
        card_type: structure.cardTypeId,
      });

      // If assignedTo or patient is specified, link person node
      const personName =
        structure.assignedTo ||
        (mergedAttributes.patient && mergedAttributes.patient !== 'Me' ? mergedAttributes.patient : undefined);
      if (personName) {
        const personNode = await activeSpace.graphStore.ensureNodeForEntity(
          `person_${personName.toLowerCase().replace(/\s+/g, '_')}`,
          'user',
          personName
        );
        try {
          await activeSpace.graphStore.addEdge({
            edge_id: `edge_${obj.object_id}_${personNode.node_id}`,
            source: objNode.node_id,
            target: personNode.node_id,
            type: 'assigned_to',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } catch {
          // Edge might already exist
        }
      }

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

      let history = existing.history ? [...existing.history] : [];
      if (patch.attributes || patch.title || patch.status) {
        const changes: Record<string, { from?: any; to: any }> = {};
        if (patch.attributes) {
          for (const [k, v] of Object.entries(patch.attributes)) {
            if (existing.attributes?.[k] !== v) {
              changes[k] = { from: existing.attributes?.[k], to: v };
            }
          }
        }
        if (patch.title && patch.title !== existing.title) {
          changes['title'] = { from: existing.title, to: patch.title };
        }
        if (patch.status && patch.status !== existing.status) {
          changes['status'] = { from: existing.status, to: patch.status };
        }

        if (Object.keys(changes).length > 0) {
          let summary = `Updated ${Object.keys(changes).join(', ')}`;
          if (changes.balance) {
            const fromNum = Number(changes.balance.from);
            const toNum = Number(changes.balance.to);
            const fromStr = !isNaN(fromNum) ? `$${fromNum.toLocaleString()}` : String(changes.balance.from ?? 'none');
            const toStr = !isNaN(toNum) ? `$${toNum.toLocaleString()}` : String(changes.balance.to ?? 'none');
            summary = `Balance updated from ${fromStr} to ${toStr}`;
          }

          if (history.length === 0) {
            history.push({
              timestamp: existing.created_at,
              actor: existing.created_by,
              summary: 'Initial state created',
              snapshot: {
                title: existing.title,
                balance: existing.attributes?.balance,
                attributes: { ...existing.attributes },
              },
            });
          }

          const localIdentity = userRegistry?.identities?.[0];
          history.push({
            timestamp: new Date().toISOString(),
            actor: localIdentity?.display_name || userRegistry.user_id,
            summary,
            changes,
            snapshot: {
              title: patch.title || existing.title,
              balance: patch.attributes?.balance ?? existing.attributes?.balance,
              attributes: { ...existing.attributes, ...(patch.attributes || {}) },
            },
          });
        }
      }

      const updated = {
        ...existing,
        ...patch,
        history: patch.history || (history.length > 0 ? history : existing.history),
        updated_at: new Date().toISOString(),
      };
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
        const spaceRef = reg.spaces.find((s) => s.space_id === activeSpace.manifest.space_id);
        const isOwner = activeSpace.manifest.created_by === reg.user_id || spaceRef?.role === 'owner';
        const userRole = spaceRef?.role || (isOwner ? 'owner' : 'editor');
        await activeSpace.graphStore.ensureNodeForEntity(reg.user_id, 'user', displayName, {
          name: displayName,
          email: email || reg.identities[0]?.email,
          role: userRole,
        });
        refreshSpaceState();
      }
    },
    [userRegistryManager, activeSpace, refreshSpaceState]
  );

  const connectGoogleDrive = useCallback(
    async (clientId?: string): Promise<AuthUser | null> => {
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
          if (userRegistryManager) {
            userRegistryManager.setRemoteStorage(storageManager.getRemoteProvider());
            const synced = await userRegistryManager.syncWithRemote();
            if (synced) {
              let updated = false;
              for (const s of synced.spaces) {
                if (s.storage_provider === 'local_indexeddb') {
                  s.storage_provider = 'google_drive';
                  updated = true;
                }
              }
              if (updated) {
                await userRegistryManager.saveRegistry(synced);
              }
              setUserRegistry({ ...synced });

              // If active space was an empty initial local space and remote has existing spaces,
              // switch to the primary remote space
              if (synced.spaces.length > 0) {
                const currentActiveId = activeSpace?.manifest.space_id;
                const activeStillExists = synced.spaces.some((s) => s.space_id === currentActiveId);
                const hasLocalCards = (activeSpace?.objectStore.getAll().length || 0) > 0;
                if (!activeStillExists || (!hasLocalCards && synced.spaces[0].space_id !== currentActiveId)) {
                  await switchSpace(synced.spaces[0].space_id);
                }
              }
            }
          }
          if (activeSpace) {
            const currentOwnerId = userRegistry?.user_id || 'usr_owner';
            const spaceRef = userRegistry?.spaces.find((s) => s.space_id === activeSpace.manifest.space_id);
            const isOwner = activeSpace.manifest.created_by === currentOwnerId || spaceRef?.role === 'owner';
            const userRole = spaceRef?.role || (isOwner ? 'owner' : 'editor');
            const resolvedName = user.name || (isOwner ? 'Owner' : 'Collaborator');

            await activeSpace.graphStore.ensureNodeForEntity(
              currentOwnerId,
              'user',
              resolvedName,
              {
                name: resolvedName,
                email: user.email,
                role: userRole,
                status: 'active',
              }
            );
            if (spaceManager) {
              try {
                await spaceManager.repairAndUploadSpaceToRemote(
                  activeSpace.manifest.space_id,
                  currentOwnerId
                );
              } catch (e) {
                console.warn('[LAD:Context] Initial space upload to GDrive failed, staying in local sync:', e);
              }
            }
            try {
              await activeSpace.syncCoordinator.triggerSync();
            } catch (e) {
              console.warn('[LAD:Context] GDrive sync trigger had an issue, fell back to local sync:', e);
            }
          }
          refreshSpaceState();
          return user;
        }
        return null;
      } catch (err: any) {
        if (err?.message?.includes('closed') || err?.message?.includes('cancelled')) {
          console.warn('Google OAuth prompt dismissed by user.');
          throw err;
        } else {
          console.error('Google OAuth connection error:', err);
          throw err;
        }
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
      switchSpace,
    ]
  );

  const restoreFromGoogleDrive = useCallback(
    async (clientId?: string): Promise<{ success: boolean; spacesCount: number; error?: string }> => {
      try {
        const user = await connectGoogleDrive(clientId);
        if (!user) {
          return { success: false, spacesCount: 0, error: 'Sign-in cancelled' };
        }
        if (userRegistryManager) {
          const synced = await userRegistryManager.syncWithRemote();
          if (synced && synced.spaces.length > 0) {
            setUserRegistry({ ...synced });
            await switchSpace(synced.spaces[0].space_id);
            localStorage.setItem('lad_onboarded', 'true');
            return { success: true, spacesCount: synced.spaces.length };
          }
        }
        localStorage.setItem('lad_onboarded', 'true');
        return { success: true, spacesCount: 0 };
      } catch (err: any) {
        console.error('[LAD:Context] Failed to restore from Google Drive:', err);
        return { success: false, spacesCount: 0, error: err?.message || 'Failed to restore from Google Drive' };
      }
    },
    [connectGoogleDrive, userRegistryManager, switchSpace]
  );

  const repairSpaceDriveFiles = useCallback(
    async (
      spaceId?: string
    ): Promise<{
      success: boolean;
      manifestUploaded: boolean;
      nodesUploaded: number;
      edgesUploaded: number;
      objectsUploaded: number;
      opsUploaded: number;
      error?: string;
    }> => {
      if (!spaceManager || !userRegistry) {
        return {
          success: false,
          manifestUploaded: false,
          nodesUploaded: 0,
          edgesUploaded: 0,
          objectsUploaded: 0,
          opsUploaded: 0,
          error: 'Space or storage not ready',
        };
      }

      console.log(`[LAD:Context] Initiating repair & upload (target: ${spaceId || 'ALL spaces'})...`);

      // 1. Synchronize user.json with Google Drive first, preserving all spaces including editor spaces
      if (userRegistryManager) {
        const synced = await userRegistryManager.syncWithRemote();
        if (synced) {
          setUserRegistry({ ...synced });
        }
      }

      const currentRegistry = userRegistryManager?.getRegistry() || userRegistry;

      // 2. If a specific spaceId was requested, repair that space
      if (spaceId) {
        const res = await spaceManager.repairAndUploadSpaceToRemote(spaceId, currentRegistry.user_id);
        refreshSpaceState();
        return res;
      }

      // 3. Global repair: repair all spaces in registry
      console.log(`[LAD:Context] Global repair: processing ${currentRegistry.spaces.length} spaces...`);
      let totalNodes = 0;
      let totalEdges = 0;
      let totalObjects = 0;
      let totalOps = 0;
      let anySuccess = false;
      let lastError: string | undefined;

      const spacesToRepair = currentRegistry.spaces.length > 0
        ? currentRegistry.spaces
        : activeSpace ? [{ space_id: activeSpace.manifest.space_id, space_name: activeSpace.manifest.space_name, role: 'owner' as const }] : [];

      for (const sp of spacesToRepair) {
        try {
          console.log(`[LAD:Context] Repairing space "${sp.space_name}" (${sp.space_id}) [role: ${sp.role}]...`);
          const res = await spaceManager.repairAndUploadSpaceToRemote(sp.space_id, currentRegistry.user_id);
          if (res.success) {
            anySuccess = true;
            totalNodes += res.nodesUploaded;
            totalEdges += res.edgesUploaded;
            totalObjects += res.objectsUploaded;
            totalOps += res.opsUploaded;
          } else if (res.error) {
            console.warn(`[LAD:Context] Warning repairing space ${sp.space_id}:`, res.error);
            lastError = res.error;
          }
        } catch (e: any) {
          console.warn(`[LAD:Context] Exception repairing space ${sp.space_id}:`, e);
          lastError = e?.message;
        }
      }

      refreshSpaceState();
      return {
        success: anySuccess || spacesToRepair.length === 0,
        manifestUploaded: anySuccess,
        nodesUploaded: totalNodes,
        edgesUploaded: totalEdges,
        objectsUploaded: totalObjects,
        opsUploaded: totalOps,
        error: anySuccess ? undefined : lastError,
      };
    },
    [spaceManager, activeSpace, userRegistry, userRegistryManager, refreshSpaceState]
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
      // Immediately flush any debounced edits before triggering sync
      try {
        await activeSpace.changeAggregator.flushAll();
      } catch (err) {
        console.warn('[LAD:Context] Warning flushing changeAggregator before triggerSync:', err);
      }
      await activeSpace.syncCoordinator.triggerSync({ silent: false });
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
        removeMember,
        repairSpaceDriveFiles,
        pendingJoinSpaceId,
        joinSpace,
        dismissPendingJoinSpace,
        deleteSpace,
        deleteAccount,
        storageManager,
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
        resolveConflict,
        isConflictModalOpen,
        openConflictModal,
        closeConflictModal,
        operations,
        updatePreferences,
        updateProfile,
        connectGoogleDrive,
        restoreFromGoogleDrive,
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

export function useOptionalLAD(): LADContextType | undefined {
  return useContext(LADContext);
}

