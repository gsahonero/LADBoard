import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingView } from '../ui/views/OnboardingView';
import { I18nProvider } from '../core/i18n/i18n-context';
import { LADContext } from '../ui/context/LADContext';
import { SyncCoordinator } from '../core/sync/sync-coordinator';
import { ChangeAggregator } from '../core/operations/change-aggregator';
import { MemoryStorageProvider } from '../core/storage/memory-provider';
import { OfflineQueue } from '../core/sync/offline-queue';
import { OperationLog } from '../core/operations/operation-log';
import { ObjectStore } from '../core/objects/object-store';
import { UserRegistryManager } from '../core/identity/user-registry';
import { LADObject, LADUserRegistry } from '../core/standard/types';

describe('Cross-Device Restore & Robust Multi-Device Sync', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('OnboardingView: "Already used LAD Board?" Flow', () => {
    it('renders the "Already used LAD Board?" divider and "Restore from Google Drive" button on Step 1', () => {
      const mockContext: any = {
        userRegistry: null,
        updateProfile: vi.fn(),
        createSpace: vi.fn(),
        updateSpaceIdentity: vi.fn(),
        spaces: [],
        restoreFromGoogleDrive: vi.fn(),
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={mockContext}>
            <OnboardingView onComplete={vi.fn()} />
          </LADContext.Provider>
        </I18nProvider>
      );

      expect(screen.getByText('Already used LAD Board?')).toBeInTheDocument();
      expect(screen.getByTestId('restore-from-gdrive-btn')).toBeInTheDocument();
      expect(screen.getByText('Restore from Google Drive')).toBeInTheDocument();
    });

    it('triggers restoreFromGoogleDrive and completes onboarding on success', async () => {
      const onCompleteMock = vi.fn();
      const restoreMock = vi.fn().mockResolvedValue({ success: true, spacesCount: 2 });

      const mockContext: any = {
        userRegistry: null,
        updateProfile: vi.fn(),
        createSpace: vi.fn(),
        updateSpaceIdentity: vi.fn(),
        spaces: [],
        restoreFromGoogleDrive: restoreMock,
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={mockContext}>
            <OnboardingView onComplete={onCompleteMock} />
          </LADContext.Provider>
        </I18nProvider>
      );

      const restoreBtn = screen.getByTestId('restore-from-gdrive-btn');
      fireEvent.click(restoreBtn);

      await waitFor(() => {
        expect(restoreMock).toHaveBeenCalledTimes(1);
        expect(onCompleteMock).toHaveBeenCalledTimes(1);
      });
    });

    it('displays error message if restoreFromGoogleDrive fails', async () => {
      const onCompleteMock = vi.fn();
      const restoreMock = vi.fn().mockResolvedValue({ success: false, spacesCount: 0, error: 'Google Drive authorization denied' });

      const mockContext: any = {
        userRegistry: null,
        updateProfile: vi.fn(),
        createSpace: vi.fn(),
        updateSpaceIdentity: vi.fn(),
        spaces: [],
        restoreFromGoogleDrive: restoreMock,
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={mockContext}>
            <OnboardingView onComplete={onCompleteMock} />
          </LADContext.Provider>
        </I18nProvider>
      );

      const restoreBtn = screen.getByTestId('restore-from-gdrive-btn');
      fireEvent.click(restoreBtn);

      await waitFor(() => {
        expect(restoreMock).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Google Drive authorization denied')).toBeInTheDocument();
        expect(onCompleteMock).not.toHaveBeenCalled();
      });
    });
  });

  describe('Debounce Buffer Trap: flushAll() integration in SyncCoordinator', () => {
    it('flushes pending ChangeAggregator transient changes immediately upon triggerSync()', async () => {
      const spaceId = 'spc_mobile_01';
      const localStorageProvider = new MemoryStorageProvider();
      const remoteStorageProvider = new MemoryStorageProvider();

      const offlineQueue = new OfflineQueue(spaceId, localStorageProvider);
      await offlineQueue.load();

      const operationLog = new OperationLog(spaceId, localStorageProvider);
      await operationLog.loadAll();

      const objectStore = new ObjectStore(spaceId, localStorageProvider);
      await objectStore.loadAll();

      // Create initial object
      const initialObj: LADObject = {
        object_id: 'obj_card_01',
        space_id: spaceId,
        title: 'Initial Note',
        domain: 'personal',
        tags: [],
        attributes: {},
        priority: 'medium',
        status: 'active',
        created_by: 'usr_device1',
        created_at: '2026-09-18T10:00:00.000Z',
        updated_at: '2026-09-18T10:00:00.000Z',
        version: 1,
      };
      await objectStore.save(initialObj);

      // ChangeAggregator with 5000ms debounce threshold
      const changeAggregator = new ChangeAggregator(5000, async (op) => {
        await operationLog.append(op);
        await offlineQueue.enqueue(op);
      });

      const coordinator = new SyncCoordinator({
        spaceId,
        localStorage: localStorageProvider,
        remoteStorage: remoteStorageProvider,
        offlineQueue,
        operationLog,
        objectStore,
        changeAggregator,
      });

      // User modifies the object on device (transient change registered in 5-second buffer)
      const updatedObj: LADObject = {
        ...initialObj,
        title: 'Updated Note on Mobile Device',
        updated_at: '2026-09-18T10:01:00.000Z',
      };
      await objectStore.save(updatedObj);

      changeAggregator.registerTransientChange({
        targetId: 'obj_card_01',
        type: 'object.update',
        actor: 'usr_device2',
        spaceId,
        originalState: initialObj,
        currentState: updatedObj,
        patch: { title: 'Updated Note on Mobile Device' },
      });

      // Before triggerSync, offline queue is empty because debounce timer has not expired
      expect(offlineQueue.size()).toBe(0);

      // User presses "Sync Now" or sync triggers
      await coordinator.triggerSync();

      // Offline queue should have processed the flushed operation and pushed to remote
      expect(offlineQueue.size()).toBe(0); // Pushed and cleared from offline queue

      // Verify the object file was actually written to remote storage!
      const remoteObj = await remoteStorageProvider.readFile<LADObject>(`LAD/${spaceId}/objects/obj_card_01.json`);
      expect(remoteObj).toBeDefined();
      expect(remoteObj?.title).toBe('Updated Note on Mobile Device');
    });
  });

  describe('Direct Object & Graph State Reconciliation', () => {
    it('pulls newer card objects directly from remote storage even when operation logs collided or lagged', async () => {
      const spaceId = 'spc_family_01';
      const dev1LocalStorage = new MemoryStorageProvider();
      const sharedRemoteStorage = new MemoryStorageProvider();

      // Device 1 initial state: old card
      const dev1ObjStore = new ObjectStore(spaceId, dev1LocalStorage);
      await dev1ObjStore.save({
        object_id: 'obj_dentist_appt',
        space_id: spaceId,
        title: 'Dentist at 9am',
        domain: 'family',
        tags: [],
        attributes: {},
        priority: 'medium',
        status: 'active',
        created_by: 'usr_owner',
        created_at: '2026-09-18T08:00:00.000Z',
        updated_at: '2026-09-18T08:00:00.000Z',
        version: 1,
      });

      // Device 2 updated the card in the cloud directly (e.g. rescheduled to 2pm) with newer timestamp
      const dev2CloudObj: LADObject = {
        object_id: 'obj_dentist_appt',
        space_id: spaceId,
        title: 'Dentist rescheduled to 2pm',
        domain: 'family',
        tags: [],
        attributes: {},
        priority: 'high',
        status: 'active',
        created_by: 'usr_device2',
        created_at: '2026-09-18T08:00:00.000Z',
        updated_at: new Date(Date.now() + 60000).toISOString(), // explicitly newer than local!
        version: 2,
      };
      await sharedRemoteStorage.writeFile(`LAD/${spaceId}/objects/obj_dentist_appt.json`, dev2CloudObj);

      // Device 2 also created a brand new card on remote in "Family"
      const dev2NewCard: LADObject = {
        object_id: 'obj_groceries',
        space_id: spaceId,
        title: 'Buy Milk & Apples',
        domain: 'family',
        tags: [],
        attributes: {},
        priority: 'medium',
        status: 'active',
        created_by: 'usr_device2',
        created_at: '2026-09-18T10:35:00.000Z',
        updated_at: '2026-09-18T10:35:00.000Z',
        version: 1,
      };
      await sharedRemoteStorage.writeFile(`LAD/${spaceId}/objects/obj_groceries.json`, dev2NewCard);

      // Device 1 coordinator triggerSync pulls the direct object reconciliations
      const dev1Queue = new OfflineQueue(spaceId, dev1LocalStorage);
      await dev1Queue.load();
      const dev1OpLog = new OperationLog(spaceId, dev1LocalStorage);
      await dev1OpLog.loadAll();

      const onAppliedMock = vi.fn();
      const dev1Coordinator = new SyncCoordinator({
        spaceId,
        localStorage: dev1LocalStorage,
        remoteStorage: sharedRemoteStorage,
        offlineQueue: dev1Queue,
        operationLog: dev1OpLog,
        objectStore: dev1ObjStore,
        onRemoteOperationsApplied: onAppliedMock,
      });

      await dev1Coordinator.triggerSync();

      // Device 1 object store now reflects the updated card from Device 2!
      const dentistCard = dev1ObjStore.get('obj_dentist_appt');
      expect(dentistCard?.title).toBe('Dentist rescheduled to 2pm');

      // Device 1 object store also has the newly created card from Device 2!
      const groceriesCard = dev1ObjStore.get('obj_groceries');
      expect(groceriesCard?.title).toBe('Buy Milk & Apples');
      expect(onAppliedMock).toHaveBeenCalled();
    });
  });

  describe('Multi-Device UserRegistry Alignment', () => {
    it('adopts remote user_id and prunes empty dummy placeholder space on fresh device', async () => {
      const dev2LocalStorage = new MemoryStorageProvider();
      const sharedRemoteStorage = new MemoryStorageProvider();

      // Remote user.json has user_id "usr_alice_primary" with Personal and Family spaces
      const remoteRegistry: LADUserRegistry = {
        lad_standard: '1.0',
        schema_version: '1.0.0',
        user_id: 'usr_alice_primary',
        identities: [
          {
            subject_id: 'sub_alice_123',
            provider: 'google',
            email: 'alice@gmail.com',
            display_name: 'Alice Henderson',
          },
        ],
        spaces: [
          {
            space_id: 'spc_alice_personal',
            space_name: 'Personal',
            storage_provider: 'google_drive',
            storage_reference: 'spc_alice_personal',
            role: 'owner',
            status: 'active',
          },
          {
            space_id: 'spc_alice_family',
            space_name: 'Family',
            storage_provider: 'google_drive',
            storage_reference: 'spc_alice_family',
            role: 'owner',
            status: 'active',
          },
        ],
        preferences: {
          locale: 'en',
          theme: 'system',
          change_commit_threshold_ms: 5000,
          active_evaluation_interval_ms: 30000,
        },
        device_metadata: {
          device_id: 'dev_primary',
          platform: 'desktop',
        },
        version: 1,
        updated_at: '2026-09-18T10:00:00.000Z',
      };
      await sharedRemoteStorage.writeFile('LAD/USER/user.json', remoteRegistry);

      // Device 2 freshly initialized OFFLINE before connecting Google Drive
      const dev2RegistryManager = new UserRegistryManager(dev2LocalStorage);
      const dev2Local = await dev2RegistryManager.loadOrCreateRegistry('alice@gmail.com', 'local');
      expect(dev2Local.user_id).not.toBe('usr_alice_primary'); // fresh temporary local id
      expect(dev2Local.spaces.length).toBe(1); // temporary local placeholder space

      // User later connects Google Drive on Device 2
      dev2RegistryManager.setRemoteStorage(sharedRemoteStorage);
      const synced = await dev2RegistryManager.syncWithRemote();

      // Device 2 must adopt remote user_id so ownership and operations align!
      expect(synced?.user_id).toBe('usr_alice_primary');

      // Device 2 must prune the dummy local placeholder space and contain the real remote spaces
      expect(synced?.spaces.map((s) => s.space_id)).toEqual(['spc_alice_personal', 'spc_alice_family']);
    });
  });
});
