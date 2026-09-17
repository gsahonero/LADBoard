import { describe, it, expect } from 'vitest';
import { SpaceManager } from '../core/space/space-manager';
import { MemoryStorageProvider } from '../core/storage/memory-provider';
import { SchemaRegistry } from '../core/schemas/schema-registry';
import { LADCardTypeDefinition } from '../core/schemas/card-types';
import { LADObject } from '../core/standard/types';
import { OperationLog } from '../core/operations/operation-log';

describe('Cards Dual-Storage (Local IndexedDB & Cloud Google Drive) Verification', () => {
  it('stores newly created cards, graph nodes, and relationship edges in both local and cloud storage', async () => {
    const localStorage = new MemoryStorageProvider();
    const cloudStorage = new MemoryStorageProvider();
    const spaceManager = new SpaceManager(localStorage, cloudStorage);

    const manifest = await spaceManager.createSpace({
      spaceName: 'Health & Finances',
      createdByUserId: 'usr_owner_01',
    });
    const spaceId = manifest.space_id;

    const loaded = await spaceManager.loadSpace(spaceId, 'usr_owner_01');

    // 1. Create a card with attributes and links
    const cardObj: LADObject = loaded.objectStore.createObject({
      title: 'Doctor Follow-Up & Blood Work',
      description: 'Doctor says continue meds, blood test in 2 weeks',
      domain: 'health',
      priority: 'high',
      dueDate: '2026-10-01',
      assignedTo: 'Dad',
      attributes: {
        raw_thought: 'Doctor says continue meds, blood test in 2 weeks, dad schedules follow-up',
        category: 'health',
        medication_status: 'continue',
        test_type: 'blood test',
        patient: 'Dad',
      },
      actorUserId: 'usr_owner_01',
    });

    await loaded.objectStore.save(cardObj);

    // Graph node & edge
    const objNode = await loaded.graphStore.ensureNodeForEntity(cardObj.object_id, 'object', cardObj.title, {
      domain: cardObj.domain,
      priority: cardObj.priority,
    });
    const personNode = await loaded.graphStore.ensureNodeForEntity('person_dad', 'user', 'Dad');
    await loaded.graphStore.addEdge({
      edge_id: `edge_${cardObj.object_id}_${personNode.node_id}`,
      source: objNode.node_id,
      target: personNode.node_id,
      type: 'assigned_to',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Commit operation to change aggregator (enqueues to offline queue and operation log)
    await loaded.changeAggregator.commitImmediate({
      targetId: cardObj.object_id,
      type: 'object.create',
      actor: 'usr_owner_01',
      spaceId,
      patch: cardObj as any,
    });

    // Verify written to LOCAL storage immediately
    const localCard = await localStorage.readFile<LADObject>(`LAD/${spaceId}/objects/${cardObj.object_id}.json`);
    expect(localCard).toBeDefined();
    expect(localCard?.title).toBe('Doctor Follow-Up & Blood Work');
    expect(localCard?.attributes?.patient).toBe('Dad');

    const localNodes = await localStorage.readFile<any[]>(`LAD/${spaceId}/graph/nodes.json`);
    expect(localNodes?.some((n) => n.label === 'Doctor Follow-Up & Blood Work')).toBe(true);
    expect(localNodes?.some((n) => n.label === 'Dad')).toBe(true);

    const localEdges = await localStorage.readFile<any[]>(`LAD/${spaceId}/graph/edges.json`);
    expect(localEdges?.some((e) => e.type === 'assigned_to')).toBe(true);

    // 2. Trigger sync to cloud storage (Google Drive)
    await loaded.syncCoordinator.triggerSync();

    // Verify written to CLOUD storage
    const cloudCard = await cloudStorage.readFile<LADObject>(`LAD/${spaceId}/objects/${cardObj.object_id}.json`);
    expect(cloudCard).toBeDefined();
    expect(cloudCard?.title).toBe('Doctor Follow-Up & Blood Work');
    expect(cloudCard?.attributes?.medication_status).toBe('continue');
    expect(cloudCard?.attributes?.patient).toBe('Dad');

    const cloudNodes = await cloudStorage.readFile<any[]>(`LAD/${spaceId}/graph/nodes.json`);
    expect(cloudNodes?.some((n) => n.label === 'Doctor Follow-Up & Blood Work')).toBe(true);
    expect(cloudNodes?.some((n) => n.label === 'Dad')).toBe(true);

    const cloudEdges = await cloudStorage.readFile<any[]>(`LAD/${spaceId}/graph/edges.json`);
    expect(cloudEdges?.some((e) => e.type === 'assigned_to')).toBe(true);

    // Verify operations log exists in cloud storage
    const cloudOpLog = new OperationLog(spaceId, cloudStorage);
    await cloudOpLog.loadAll();
    const cloudOps = cloudOpLog.getOperations();
    expect(cloudOps.some((o) => o.target === cardObj.object_id && o.type === 'object.create')).toBe(true);
  });

  it('stores card modifications and field updates in both local and cloud storage', async () => {
    const localStorage = new MemoryStorageProvider();
    const cloudStorage = new MemoryStorageProvider();
    const spaceManager = new SpaceManager(localStorage, cloudStorage);

    const manifest = await spaceManager.createSpace({
      spaceName: 'Finance Board',
      createdByUserId: 'usr_owner_01',
    });
    const spaceId = manifest.space_id;
    const loaded = await spaceManager.loadSpace(spaceId, 'usr_owner_01');

    // Create initial card
    const card = loaded.objectStore.createObject({
      title: 'Bank A Checking',
      domain: 'money',
      attributes: { account_type: 'checking', balance: 19 },
      actorUserId: 'usr_owner_01',
    });
    await loaded.objectStore.save(card);
    await loaded.changeAggregator.commitImmediate({
      targetId: card.object_id,
      type: 'object.create',
      actor: 'usr_owner_01',
      spaceId,
      patch: card as any,
    });
    await loaded.syncCoordinator.triggerSync();

    // Now update balance to $150
    const updatedCard = {
      ...card,
      attributes: { ...card.attributes, balance: 150 },
      updated_at: new Date().toISOString(),
    };
    await loaded.objectStore.save(updatedCard);
    await loaded.changeAggregator.commitImmediate({
      targetId: card.object_id,
      type: 'object.update',
      actor: 'usr_owner_01',
      spaceId,
      patch: { attributes: { account_type: 'checking', balance: 150 } },
    });

    // Trigger sync
    await loaded.syncCoordinator.triggerSync();

    // Verify updated in LOCAL storage
    const localSaved = await localStorage.readFile<LADObject>(`LAD/${spaceId}/objects/${card.object_id}.json`);
    expect(localSaved?.attributes?.balance).toBe(150);

    // Verify updated in CLOUD storage
    const cloudSaved = await cloudStorage.readFile<LADObject>(`LAD/${spaceId}/objects/${card.object_id}.json`);
    expect(cloudSaved?.attributes?.balance).toBe(150);
  });

  it('preserves archived cards non-destructively in both local and cloud storage', async () => {
    const localStorage = new MemoryStorageProvider();
    const cloudStorage = new MemoryStorageProvider();
    const spaceManager = new SpaceManager(localStorage, cloudStorage);

    const manifest = await spaceManager.createSpace({
      spaceName: 'Archive Test Space',
      createdByUserId: 'usr_owner_01',
    });
    const spaceId = manifest.space_id;
    const loaded = await spaceManager.loadSpace(spaceId, 'usr_owner_01');

    const card = loaded.objectStore.createObject({
      title: 'Old Prescription Meds',
      domain: 'health',
      actorUserId: 'usr_owner_01',
    });
    await loaded.objectStore.save(card);
    await loaded.changeAggregator.commitImmediate({
      targetId: card.object_id,
      type: 'object.create',
      actor: 'usr_owner_01',
      spaceId,
      patch: card as any,
    });
    await loaded.syncCoordinator.triggerSync();

    // Archive card
    const archivedCard: LADObject = {
      ...card,
      status: 'archived',
      updated_at: new Date().toISOString(),
    };
    await loaded.objectStore.save(archivedCard);
    await loaded.changeAggregator.commitImmediate({
      targetId: card.object_id,
      type: 'object.update',
      actor: 'usr_owner_01',
      spaceId,
      patch: { status: 'archived' },
    });
    await loaded.syncCoordinator.triggerSync();

    // Verify card STILL exists and has status: 'archived' in local storage
    const localCard = await localStorage.readFile<LADObject>(`LAD/${spaceId}/objects/${card.object_id}.json`);
    expect(localCard).not.toBeNull();
    expect(localCard?.status).toBe('archived');
    expect(localCard?.title).toBe('Old Prescription Meds');

    // Verify card STILL exists and has status: 'archived' in cloud storage
    const cloudCard = await cloudStorage.readFile<LADObject>(`LAD/${spaceId}/objects/${card.object_id}.json`);
    expect(cloudCard).not.toBeNull();
    expect(cloudCard?.status).toBe('archived');
    expect(cloudCard?.title).toBe('Old Prescription Meds');
  });

  it('deletes card from both local and cloud storage upon card deletion', async () => {
    const localStorage = new MemoryStorageProvider();
    const cloudStorage = new MemoryStorageProvider();
    const spaceManager = new SpaceManager(localStorage, cloudStorage);

    const manifest = await spaceManager.createSpace({
      spaceName: 'Delete Test Space',
      createdByUserId: 'usr_owner_01',
    });
    const spaceId = manifest.space_id;
    const loaded = await spaceManager.loadSpace(spaceId, 'usr_owner_01');

    const card = loaded.objectStore.createObject({
      title: 'Temporary Scratch Note',
      domain: 'general',
      actorUserId: 'usr_owner_01',
    });
    await loaded.objectStore.save(card);
    await loaded.changeAggregator.commitImmediate({
      targetId: card.object_id,
      type: 'object.create',
      actor: 'usr_owner_01',
      spaceId,
      patch: card as any,
    });
    await loaded.syncCoordinator.triggerSync();

    // Verify existed in both
    expect(await localStorage.readFile(`LAD/${spaceId}/objects/${card.object_id}.json`)).toBeDefined();
    expect(await cloudStorage.readFile(`LAD/${spaceId}/objects/${card.object_id}.json`)).toBeDefined();

    // Delete card
    await loaded.objectStore.delete(card.object_id);
    await loaded.graphStore.removeNode(`node_${card.object_id}`);
    await loaded.changeAggregator.commitImmediate({
      targetId: card.object_id,
      type: 'object.delete',
      actor: 'usr_owner_01',
      spaceId,
      patch: {},
    });
    await loaded.syncCoordinator.triggerSync();

    // Verify deleted from BOTH local and cloud
    expect(await localStorage.readFile(`LAD/${spaceId}/objects/${card.object_id}.json`)).toBeNull();
    expect(await cloudStorage.readFile(`LAD/${spaceId}/objects/${card.object_id}.json`)).toBeNull();
  });

  it('stores custom card schemas in space manifest in both local and cloud storage, and propagates across clients', async () => {
    const localStorageA = new MemoryStorageProvider();
    const cloudStorage = new MemoryStorageProvider();
    const spaceManagerA = new SpaceManager(localStorageA, cloudStorage);

    const manifest = await spaceManagerA.createSpace({
      spaceName: 'Custom Schemas Space',
      createdByUserId: 'usr_alice',
    });
    const spaceId = manifest.space_id;
    const loadedA = await spaceManagerA.loadSpace(spaceId, 'usr_alice');

    // Define custom card type definition
    const petCardType: LADCardTypeDefinition = {
      id: 'custom_pet_record',
      name: 'Pet Health Record',
      description: 'Tracks vaccinations and vet appointments for pets',
      category: 'health',
      icon: 'Heart',
      nlp: {
        keywords: ['vet', 'vaccine', 'dog', 'cat', 'pet'],
      },
      fields: [
        {
          key: 'pet_name',
          label: 'Pet Name',
          type: 'text',
          required: true,
          placeholder: 'e.g. Milo',
        },
        {
          key: 'vaccine_name',
          label: 'Vaccine / Treatment',
          type: 'text',
          required: false,
        },
        {
          key: 'vet_clinic',
          label: 'Vet Clinic',
          type: 'text',
          required: false,
        },
      ],
      lifecycle: {
        autoArchiveDays: 365,
      },
    };

    SchemaRegistry.getInstance().addCustomCardType(petCardType);
    const exportedCustom = SchemaRegistry.getInstance().exportCustomCardTypes();

    // Update space manifest settings
    await spaceManagerA.updateSpaceManifest(
      spaceId,
      {
        settings: {
          custom_card_types: exportedCustom,
        },
      },
      'usr_alice'
    );
    await loadedA.syncCoordinator.triggerSync();

    // Verify stored in LOCAL storage manifest
    const localManifest = await localStorageA.readFile<any>(`LAD/${spaceId}/manifest.json`);
    expect(localManifest?.settings?.custom_card_types).toBeDefined();
    expect(localManifest.settings.custom_card_types.some((c: any) => c.id === 'custom_pet_record')).toBe(true);

    // Verify stored in CLOUD storage manifest
    const cloudManifest = await cloudStorage.readFile<any>(`LAD/${spaceId}/manifest.json`);
    expect(cloudManifest?.settings?.custom_card_types).toBeDefined();
    expect(cloudManifest.settings.custom_card_types.some((c: any) => c.id === 'custom_pet_record')).toBe(true);

    // Client B (fresh local storage) joins space from cloud storage
    const localStorageB = new MemoryStorageProvider();
    const spaceManagerB = new SpaceManager(localStorageB, cloudStorage);
    const loadedB = await spaceManagerB.loadSpace(spaceId, 'usr_bob');

    // Bob pulls delta sync or initial replication
    await loadedB.syncCoordinator.triggerSync();

    // Bob's local manifest now has the custom card schema
    const bobLocalManifest = await localStorageB.readFile<any>(`LAD/${spaceId}/manifest.json`);
    expect(bobLocalManifest?.settings?.custom_card_types).toBeDefined();
    expect(bobLocalManifest.settings.custom_card_types.some((c: any) => c.id === 'custom_pet_record')).toBe(true);

    // Registry can resolve the custom card type
    const registered = SchemaRegistry.getInstance().getCardType('custom_pet_record');
    expect(registered).toBeDefined();
    expect(registered?.name).toBe('Pet Health Record');
    expect(registered?.fields.length).toBe(3);
  });
});
