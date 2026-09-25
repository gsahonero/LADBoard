import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SpaceManager } from '../core/space/space-manager';
import { MemoryStorageProvider } from '../core/storage/memory-provider';
import { ConflictResolver } from '../core/sync/conflict-resolver';
import { ConflictSolverModal } from '../ui/components/ConflictSolverModal';
import { SyncBadge } from '../ui/components/SyncBadge';
import { I18nProvider } from '../core/i18n/i18n-context';
import * as LADContextModule from '../ui/context/LADContext';
import { LADOperation, LADObject } from '../core/standard/types';
import { ConflictRecord, SyncState } from '../core/sync/types';

describe('Conflict Solver Dialogue & Resolution Engine', () => {
  it('detects concurrent conflicting operations on scalar fields with target metadata', () => {
    const opLocal: LADOperation = {
      operation_id: 'op_local_1',
      space_id: 'spc_test',
      type: 'object.update',
      target: 'obj_card_1',
      actor: 'usr_alice',
      timestamp: '2026-09-18T10:00:00Z',
      lamport_clock: 1,
      patch: { title: 'Local Checking Account', balance: 5000 },
    };

    const opRemote: LADOperation = {
      operation_id: 'op_remote_1',
      space_id: 'spc_test',
      type: 'object.update',
      target: 'obj_card_1',
      actor: 'usr_bob',
      timestamp: '2026-09-18T10:01:00Z',
      lamport_clock: 2,
      patch: { title: 'Remote Joint Checking', balance: 7500 },
    };

    const conflict = ConflictResolver.detectConflict(opLocal, opRemote, {
      title: 'Original Bank Card',
      domain: 'finances',
    });

    expect(conflict).not.toBeNull();
    expect(conflict?.targetId).toBe('obj_card_1');
    expect(conflict?.targetTitle).toBe('Original Bank Card');
    expect(conflict?.targetDomain).toBe('finances');
    expect(conflict?.conflictingKeys).toContain('title');
    expect(conflict?.conflictingKeys).toContain('balance');
    expect(conflict?.resolved).toBe(false);
  });

  it('resolves conflict with keep_local strategy in SyncCoordinator', async () => {
    const localStorage = new MemoryStorageProvider();
    const remoteStorage = new MemoryStorageProvider();
    const spaceManager = new SpaceManager(localStorage, remoteStorage);

    const space = await spaceManager.createSpace({
      spaceName: 'Collab Workspace',
      createdByUserId: 'usr_alice',
    });
    const loaded = await spaceManager.loadSpace(space.space_id, 'usr_alice');

    // Create initial object
    const initialObj = loaded.objectStore.createObject({
      title: 'Initial Budget Card',
      domain: 'finances',
      actorUserId: 'usr_alice',
      attributes: { balance: 1000 },
    });
    await loaded.objectStore.save(initialObj);

    // Create active conflict record
    const conflict: ConflictRecord = {
      conflictId: 'cnf_test_1',
      targetId: initialObj.object_id,
      targetTitle: 'Initial Budget Card',
      targetDomain: 'finances',
      localOperation: {
        operation_id: 'op_local_keep',
        space_id: space.space_id,
        type: 'object.update',
        target: initialObj.object_id,
        actor: 'usr_alice',
        timestamp: new Date().toISOString(),
        lamport_clock: 10,
        patch: { title: 'Alice Local Budget', balance: 2500 },
      },
      remoteOperation: {
        operation_id: 'op_remote_keep',
        space_id: space.space_id,
        type: 'object.update',
        target: initialObj.object_id,
        actor: 'usr_bob',
        timestamp: new Date().toISOString(),
        lamport_clock: 11,
        patch: { title: 'Bob Cloud Budget', balance: 3500 },
      },
      conflictingKeys: ['title', 'balance'],
      resolved: false,
      createdAt: new Date().toISOString(),
    };

    const syncCoord = loaded.syncCoordinator;
    (syncCoord as any).state.activeConflicts = [conflict];
    (syncCoord as any).state.status = 'conflict_detected';

    expect(syncCoord.getState().status).toBe('conflict_detected');
    expect(syncCoord.getState().activeConflicts.length).toBe(1);

    // Resolve with keep_local
    await syncCoord.resolveConflict('cnf_test_1', 'keep_local');

    expect(syncCoord.getState().activeConflicts.length).toBe(0);
    expect(syncCoord.getState().status).toBe('synced');
  });

  it('resolves conflict with accept_remote strategy in SyncCoordinator', async () => {
    const localStorage = new MemoryStorageProvider();
    const remoteStorage = new MemoryStorageProvider();
    const spaceManager = new SpaceManager(localStorage, remoteStorage);

    const space = await spaceManager.createSpace({
      spaceName: 'Collab Workspace',
      createdByUserId: 'usr_alice',
    });
    const loaded = await spaceManager.loadSpace(space.space_id, 'usr_alice');

    // Create initial object
    const initialObj = loaded.objectStore.createObject({
      title: 'Initial Title',
      domain: 'tasks',
      actorUserId: 'usr_alice',
    });
    await loaded.objectStore.save(initialObj);

    // Setup conflict
    const conflict: ConflictRecord = {
      conflictId: 'cnf_test_2',
      targetId: initialObj.object_id,
      localOperation: {
        operation_id: 'op_local_task',
        space_id: space.space_id,
        type: 'object.update',
        target: initialObj.object_id,
        actor: 'usr_alice',
        timestamp: new Date().toISOString(),
        lamport_clock: 5,
        patch: { title: 'Alice Local Task' },
      },
      remoteOperation: {
        operation_id: 'op_remote_task',
        space_id: space.space_id,
        type: 'object.update',
        target: initialObj.object_id,
        actor: 'usr_bob',
        timestamp: new Date().toISOString(),
        lamport_clock: 6,
        patch: { title: 'Bob Cloud Approved Task' },
      },
      conflictingKeys: ['title'],
      resolved: false,
      createdAt: new Date().toISOString(),
    };

    const syncCoord = loaded.syncCoordinator;
    (syncCoord as any).state.activeConflicts = [conflict];
    (syncCoord as any).state.status = 'conflict_detected';

    // Resolve with accept_remote
    await syncCoord.resolveConflict('cnf_test_2', 'accept_remote');

    expect(syncCoord.getState().activeConflicts.length).toBe(0);
    expect(syncCoord.getState().status).toBe('synced');

    const updated = loaded.objectStore.get(initialObj.object_id);
    expect(updated?.title).toBe('Bob Cloud Approved Task');
  });

  it('resolves conflict with custom merge strategy in SyncCoordinator', async () => {
    const localStorage = new MemoryStorageProvider();
    const remoteStorage = new MemoryStorageProvider();
    const spaceManager = new SpaceManager(localStorage, remoteStorage);

    const space = await spaceManager.createSpace({
      spaceName: 'Collab Workspace',
      createdByUserId: 'usr_alice',
    });
    const loaded = await spaceManager.loadSpace(space.space_id, 'usr_alice');

    const initialObj = loaded.objectStore.createObject({
      title: 'Initial Grocery',
      domain: 'shopping',
      priority: 'low',
      actorUserId: 'usr_alice',
    });
    await loaded.objectStore.save(initialObj);

    const conflict: ConflictRecord = {
      conflictId: 'cnf_test_3',
      targetId: initialObj.object_id,
      localOperation: {
        operation_id: 'op_local_shop',
        space_id: space.space_id,
        type: 'object.update',
        target: initialObj.object_id,
        actor: 'usr_alice',
        timestamp: new Date().toISOString(),
        lamport_clock: 1,
        patch: { title: 'Albertsons Groceries', priority: 'medium' },
      },
      remoteOperation: {
        operation_id: 'op_remote_shop',
        space_id: space.space_id,
        type: 'object.update',
        target: initialObj.object_id,
        actor: 'usr_bob',
        timestamp: new Date().toISOString(),
        lamport_clock: 2,
        patch: { title: 'Costco Groceries', priority: 'urgent' },
      },
      conflictingKeys: ['title', 'priority'],
      resolved: false,
      createdAt: new Date().toISOString(),
    };

    const syncCoord = loaded.syncCoordinator;
    (syncCoord as any).state.activeConflicts = [conflict];
    (syncCoord as any).state.status = 'conflict_detected';

    // Merge: pick title from local ('Albertsons Groceries') and priority from remote ('urgent')
    const mergedPatch = {
      title: 'Albertsons Groceries',
      priority: 'urgent',
    };
    await syncCoord.resolveConflict('cnf_test_3', 'merge', mergedPatch);

    expect(syncCoord.getState().activeConflicts.length).toBe(0);
    expect(syncCoord.getState().status).toBe('synced');

    const updated = loaded.objectStore.get(initialObj.object_id);
    expect(updated?.title).toBe('Albertsons Groceries');
    expect(updated?.priority).toBe('urgent');
  });

  it('renders ConflictSolverModal with side-by-side versions and handles keep_local', async () => {
    const mockResolveConflict = vi.fn().mockResolvedValue(undefined);
    const mockCloseConflictModal = vi.fn();

    const mockConflict: ConflictRecord = {
      conflictId: 'cnf_ui_1',
      targetId: 'obj_medical_1',
      targetTitle: 'Dentist Checkup',
      targetDomain: 'health',
      localOperation: {
        operation_id: 'op_loc_1',
        space_id: 'spc_1',
        type: 'object.update',
        target: 'obj_medical_1',
        actor: 'usr_local_me',
        timestamp: '2026-09-18T12:00:00Z',
        lamport_clock: 1,
        patch: { title: 'Dr. John Dentist Visit', priority: 'urgent' },
      },
      remoteOperation: {
        operation_id: 'op_rem_1',
        space_id: 'spc_1',
        type: 'object.update',
        target: 'obj_medical_1',
        actor: 'usr_collab_bob',
        timestamp: '2026-09-18T12:05:00Z',
        lamport_clock: 2,
        patch: { title: 'Dr. Jane Dentist Checkup', priority: 'medium' },
      },
      conflictingKeys: ['title', 'priority'],
      resolved: false,
      createdAt: '2026-09-18T12:05:00Z',
    };

    const mockObjects: LADObject[] = [
      {
        object_id: 'obj_medical_1',
        space_id: 'spc_1',
        title: 'Dentist Checkup',
        domain: 'health',
        tags: ['medical'],
        attributes: {},
        priority: 'urgent',
        status: 'active',
        version: 1,
        created_by: 'usr_local_me',
        created_at: '2026-09-18T10:00:00Z',
        updated_at: '2026-09-18T12:00:00Z',
      },
    ];

    vi.spyOn(LADContextModule, 'useLAD').mockReturnValue({
      syncState: {
        status: 'conflict_detected',
        isOnline: true,
        pendingOpsCount: 1,
        lastSyncedAt: null,
        activeConflicts: [mockConflict],
        errorMessage: null,
      },
      isConflictModalOpen: true,
      resolveConflict: mockResolveConflict,
      closeConflictModal: mockCloseConflictModal,
      objects: mockObjects,
      nodes: [
        {
          node_id: 'node_usr_collab_bob',
          ref_id: 'usr_collab_bob',
          label: 'Bob Collab',
          type: 'user',
          created_at: '2026-09-18T00:00:00Z',
          updated_at: '2026-09-18T00:00:00Z',
          metadata: { name: 'Bob Collab', email: 'bob@gmail.com' },
        },
      ],
      userRegistry: {
        user_id: 'usr_local_me',
        identities: [{ display_name: 'Alice Local', email: 'alice@gmail.com' }],
      } as any,
    } as any);

    render(
      <I18nProvider>
        <ConflictSolverModal />
      </I18nProvider>
    );

    // Verify modal elements
    expect(screen.getByTestId('conflict-solver-modal')).toBeDefined();
    expect(screen.getByText(/Concurrent changes were detected for "Dentist Checkup"/i)).toBeDefined();

    // Verify local & remote details
    expect(screen.getByText('Alice Local')).toBeDefined();
    expect(screen.getByText('Bob Collab')).toBeDefined();
    expect(screen.getByText('Dr. John Dentist Visit')).toBeDefined();
    expect(screen.getByText('Dr. Jane Dentist Checkup')).toBeDefined();

    // Click "Keep My Version"
    const keepLocalBtn = screen.getByTestId('btn-keep-local');
    await act(async () => {
      fireEvent.click(keepLocalBtn);
    });

    expect(mockResolveConflict).toHaveBeenCalledWith('cnf_ui_1', 'keep_local');
  });

  it('renders custom field-by-field merge UI and applies merged resolution', async () => {
    const mockResolveConflict = vi.fn().mockResolvedValue(undefined);
    const mockCloseConflictModal = vi.fn();

    const mockConflict: ConflictRecord = {
      conflictId: 'cnf_ui_2',
      targetId: 'obj_task_1',
      targetTitle: 'Project Proposal',
      targetDomain: 'projects',
      localOperation: {
        operation_id: 'op_loc_2',
        space_id: 'spc_1',
        type: 'object.update',
        target: 'obj_task_1',
        actor: 'usr_local_me',
        timestamp: '2026-09-18T12:00:00Z',
        lamport_clock: 1,
        patch: { title: 'Project Proposal v2', priority: 'urgent' },
      },
      remoteOperation: {
        operation_id: 'op_rem_2',
        space_id: 'spc_1',
        type: 'object.update',
        target: 'obj_task_1',
        actor: 'usr_collab_bob',
        timestamp: '2026-09-18T12:05:00Z',
        lamport_clock: 2,
        patch: { title: 'Project Proposal Final', priority: 'low' },
      },
      conflictingKeys: ['title', 'priority'],
      resolved: false,
      createdAt: '2026-09-18T12:05:00Z',
    };

    vi.spyOn(LADContextModule, 'useLAD').mockReturnValue({
      syncState: {
        status: 'conflict_detected',
        isOnline: true,
        pendingOpsCount: 1,
        lastSyncedAt: null,
        activeConflicts: [mockConflict],
        errorMessage: null,
      },
      isConflictModalOpen: true,
      resolveConflict: mockResolveConflict,
      closeConflictModal: mockCloseConflictModal,
      objects: [],
      nodes: [],
      userRegistry: {
        user_id: 'usr_local_me',
        identities: [{ display_name: 'Me', email: 'me@test.com' }],
      } as any,
    } as any);

    render(
      <I18nProvider>
        <ConflictSolverModal />
      </I18nProvider>
    );

    // Toggle custom merge mode
    const toggleMergeBtn = screen.getByTestId('btn-toggle-merge-mode');
    await act(async () => {
      fireEvent.click(toggleMergeBtn);
    });

    // Apply merge button should appear
    const applyMergeBtn = screen.getByTestId('btn-apply-merge');
    expect(applyMergeBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(applyMergeBtn);
    });

    // By default picks are initialized to local values
    expect(mockResolveConflict).toHaveBeenCalledWith(
      'cnf_ui_2',
      'merge',
      expect.objectContaining({
        title: 'Project Proposal v2',
        priority: 'urgent',
      })
    );
  });

  it('opens ConflictSolverModal when clicking conflict SyncBadge or hover pane button', () => {
    const mockOpenConflictModal = vi.fn();

    const mockSyncState: SyncState = {
      status: 'conflict_detected',
      isOnline: true,
      pendingOpsCount: 1,
      lastSyncedAt: null,
      activeConflicts: [
        {
          conflictId: 'cnf_1',
          targetId: 'obj_1',
          localOperation: {} as any,
          remoteOperation: {} as any,
          conflictingKeys: ['title'],
          resolved: false,
          createdAt: new Date().toISOString(),
        },
      ],
      errorMessage: null,
    };

    vi.spyOn(LADContextModule, 'useOptionalLAD').mockReturnValue({
      syncState: mockSyncState,
      openConflictModal: mockOpenConflictModal,
    } as any);

    render(
      <I18nProvider>
        <SyncBadge syncState={mockSyncState} />
      </I18nProvider>
    );

    // Badge text should display Conflict detected
    const badgeButton = screen.getByRole('button', { name: /conflict detected/i });
    expect(badgeButton).toBeDefined();

    // Clicking the badge should open Conflict modal
    fireEvent.click(badgeButton);
    expect(mockOpenConflictModal).toHaveBeenCalled();
  });

  it('pushes local updates to remote without false conflicts against antecedent operations', async () => {
    const localStorage = new MemoryStorageProvider();
    const remoteStorage = new MemoryStorageProvider();
    const spaceManager = new SpaceManager(localStorage, remoteStorage);

    // 1. Space and card created by owner/creator
    const space = await spaceManager.createSpace({
      spaceName: 'Collab Space',
      createdByUserId: 'usr_creator_owner',
    });
    const loaded = await spaceManager.loadSpace(space.space_id, 'usr_creator_owner');

    const card = loaded.objectStore.createObject({
      title: 'Original Bank Card',
      domain: 'finances',
      actorUserId: 'usr_creator_owner',
      attributes: { balance: 1000 },
    });
    await loaded.objectStore.save(card);
    await loaded.changeAggregator.commitImmediate({
      targetId: card.object_id,
      type: 'object.create',
      actor: 'usr_creator_owner',
      spaceId: space.space_id,
      patch: card as any,
    });

    // Initial sync pushes card and creation op to remote
    await loaded.syncCoordinator.triggerSync();
    expect(loaded.syncCoordinator.getState().status).toBe('synced');
    expect(loaded.syncCoordinator.getState().activeConflicts.length).toBe(0);

    // 2. Local user (different actor, e.g. editor or on another device) updates the card
    const updatedCard = {
      ...card,
      title: 'Updated Bank Card Title',
      attributes: { ...card.attributes, balance: 2500 },
      updated_at: new Date().toISOString(),
    };
    await loaded.objectStore.save(updatedCard);
    await loaded.changeAggregator.commitImmediate({
      targetId: card.object_id,
      type: 'object.update',
      actor: 'usr_local_editor',
      spaceId: space.space_id,
      patch: { title: 'Updated Bank Card Title', balance: 2500 },
    });

    // 3. Trigger sync from local copy to remote
    // Must NOT raise a false conflict against the antecedent creation op
    await loaded.syncCoordinator.triggerSync();

    expect(loaded.syncCoordinator.getState().status).toBe('synced');
    expect(loaded.syncCoordinator.getState().activeConflicts.length).toBe(0);

    // Verify remote received the update
    const remoteObj = await remoteStorage.readFile<LADObject>(
      `LAD/${space.space_id}/objects/${card.object_id}.json`
    );
    expect(remoteObj?.title).toBe('Updated Bank Card Title');
  });

  it('detects genuine concurrent conflicts when unseen remote operations collide with pending updates', async () => {
    const localStorageA = new MemoryStorageProvider();
    const localStorageB = new MemoryStorageProvider();
    const remoteStorage = new MemoryStorageProvider();

    const spaceManagerA = new SpaceManager(localStorageA, remoteStorage);
    const spaceManagerB = new SpaceManager(localStorageB, remoteStorage);

    // 1. Initial shared space setup
    const space = await spaceManagerA.createSpace({
      spaceName: 'Team Project',
      createdByUserId: 'usr_alice',
    });
    const loadedA = await spaceManagerA.loadSpace(space.space_id, 'usr_alice');

    const card = loadedA.objectStore.createObject({
      title: 'Base Task',
      domain: 'tasks',
      actorUserId: 'usr_alice',
      attributes: { priority: 'low' },
    });
    await loadedA.objectStore.save(card);
    await loadedA.changeAggregator.commitImmediate({
      targetId: card.object_id,
      type: 'object.create',
      actor: 'usr_alice',
      spaceId: space.space_id,
      patch: card as any,
    });
    await loadedA.syncCoordinator.triggerSync();

    // 2. User B joins / replicates space
    const loadedB = await spaceManagerB.loadSpace(space.space_id, 'usr_bob');
    await loadedB.syncCoordinator.triggerSync();
    expect(loadedB.objectStore.get(card.object_id)?.title).toBe('Base Task');

    // 3. User A modifies task remotely while B is offline
    await loadedA.changeAggregator.commitImmediate({
      targetId: card.object_id,
      type: 'object.update',
      actor: 'usr_alice',
      spaceId: space.space_id,
      patch: { title: 'Alice Concurrent Title' },
    });
    await loadedA.syncCoordinator.triggerSync();

    // 4. User B concurrently modifies the same task locally
    await loadedB.changeAggregator.commitImmediate({
      targetId: card.object_id,
      type: 'object.update',
      actor: 'usr_bob',
      spaceId: space.space_id,
      patch: { title: 'Bob Offline Title' },
    });

    // 5. User B triggers sync — genuine conflict must be detected!
    await loadedB.syncCoordinator.triggerSync();

    expect(loadedB.syncCoordinator.getState().status).toBe('conflict_detected');
    expect(loadedB.syncCoordinator.getState().activeConflicts.length).toBe(1);
    const activeConflict = loadedB.syncCoordinator.getState().activeConflicts[0];
    expect(activeConflict.targetId).toBe(card.object_id);
    expect(activeConflict.conflictingKeys).toContain('title');

    // 6. User B resolves with keep_local
    await loadedB.syncCoordinator.resolveConflict(activeConflict.conflictId, 'keep_local');
    expect(loadedB.syncCoordinator.getState().status).toBe('synced');
    expect(loadedB.syncCoordinator.getState().activeConflicts.length).toBe(0);

    // 7. Subsequent sync remains cleanly synced
    await loadedB.syncCoordinator.triggerSync();
    expect(loadedB.syncCoordinator.getState().status).toBe('synced');
    expect(loadedB.syncCoordinator.getState().activeConflicts.length).toBe(0);
  });
});

