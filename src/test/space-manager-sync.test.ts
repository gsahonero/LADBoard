import { describe, it, expect } from 'vitest';
import { SpaceManager } from '../core/space/space-manager';
import { MemoryStorageProvider } from '../core/storage/memory-provider';
import { ConflictResolver } from '../core/sync/conflict-resolver';
import { LADOperation } from '../core/standard/types';

describe('Space Manager, Offline Queue & Conflict Resolver', () => {
  it('creates and loads a new Space with standard layout', async () => {
    const localStorage = new MemoryStorageProvider();
    const manager = new SpaceManager(localStorage);

    const manifest = await manager.createSpace({
      spaceName: 'Family Board',
      description: 'Family shared memory',
      createdByUserId: 'usr_alice_01',
    });

    expect(manifest.space_id).toMatch(/^spc_/);
    expect(manifest.space_name).toBe('Family Board');
    expect(manifest.lad_standard).toBe('1.0');

    const loaded = await manager.loadSpace(manifest.space_id, 'usr_alice_01');
    expect(loaded.manifest.space_id).toBe(manifest.space_id);
    expect(loaded.objectStore.getAll()).toEqual([]);
    expect(loaded.graphStore.getNodes().length).toBeGreaterThanOrEqual(1); // includes current user node
  });

  it('creates an invitation record in graph and operation log', async () => {
    const localStorage = new MemoryStorageProvider();
    const manager = new SpaceManager(localStorage);

    const manifest = await manager.createSpace({
      spaceName: 'Research Group',
      createdByUserId: 'usr_alice_01',
    });

    const invitation = await manager.createInvitation(
      manifest.space_id,
      'usr_alice_01',
      'bob@university.edu',
      'editor',
      'Bob Dylan'
    );

    expect(invitation.invitation_id).toMatch(/^inv_/);
    expect(invitation.invited_name).toBe('Bob Dylan');
    expect(invitation.invited_email).toBe('bob@university.edu');
    expect(invitation.status).toBe('invited');

    const loaded = await manager.loadSpace(manifest.space_id, 'usr_alice_01');
    const nodes = loaded.graphStore.getNodes();
    const invitedNode = nodes.find((n) => n.label === 'Bob Dylan');
    expect(invitedNode).toBeDefined();
    expect(invitedNode?.metadata?.name).toBe('Bob Dylan');
    expect(invitedNode?.metadata?.email).toBe('bob@university.edu');

    const ops = loaded.operationLog.getOperations();
    expect(ops.some((o) => o.type === 'invitation.create')).toBe(true);
  });

  it('detects concurrent conflicting operations on the same object scalar fields', () => {
    const opLocal: LADOperation = {
      operation_id: 'op_local_1',
      space_id: 'spc_01',
      actor: 'usr_alice',
      timestamp: '2026-09-16T12:00:00Z',
      lamport_clock: 5,
      type: 'object.update',
      target: 'obj_bank_01',
      patch: { balance: 2000, note: 'Alice update' },
    };

    const opRemote: LADOperation = {
      operation_id: 'op_remote_1',
      space_id: 'spc_01',
      actor: 'usr_bob',
      timestamp: '2026-09-16T12:01:00Z',
      lamport_clock: 6,
      type: 'object.update',
      target: 'obj_bank_01',
      patch: { balance: 2500, status: 'checked' },
    };

    const conflict = ConflictResolver.detectConflict(opLocal, opRemote);
    expect(conflict).not.toBeNull();
    expect(conflict?.conflictingKeys).toContain('balance');
  });

  it('keeps space name clean and decoupled from random space IDs', async () => {
    const localStorage = new MemoryStorageProvider();
    const manager = new SpaceManager(localStorage);

    // Initial load of a fresh space with an auto-generated random ID
    const randomSpaceId = 'spc_fr77abcd';
    const loaded = await manager.loadSpace(randomSpaceId, 'usr_alice', 5000, 'Work & Projects');

    // Space ID is technical identifier, space_name is human label
    expect(loaded.manifest.space_id).toBe('spc_fr77abcd');
    expect(loaded.manifest.space_name).toBe('Work & Projects');
    expect(loaded.manifest.space_name).not.toContain('fr77');

    // Update / rename space
    const updated = await manager.updateSpaceManifest(randomSpaceId, {
      space_name: 'Studio Lab',
    });
    expect(updated.space_name).toBe('Studio Lab');
    expect(updated.space_id).toBe('spc_fr77abcd');
  });

  it('supports full space identity customization (icon, base color, description)', async () => {
    const localStorage = new MemoryStorageProvider();
    const manager = new SpaceManager(localStorage);

    const manifest = await manager.createSpace({
      spaceName: 'Research Lab',
      icon: '🔬',
      color: 'purple',
      description: 'Genomics & AI papers',
      createdByUserId: 'usr_researcher_01',
    });

    expect(manifest.space_name).toBe('Research Lab');
    expect(manifest.icon).toBe('🔬');
    expect(manifest.color).toBe('purple');
    expect(manifest.description).toBe('Genomics & AI papers');

    // Update space identity
    const customized = await manager.updateSpaceManifest(manifest.space_id, {
      space_name: 'Quantum Biology Lab',
      icon: '⚡',
      color: 'cyan',
      description: 'Quantum simulation and structural biology',
    });

    expect(customized.space_name).toBe('Quantum Biology Lab');
    expect(customized.icon).toBe('⚡');
    expect(customized.color).toBe('cyan');
    expect(customized.description).toBe('Quantum simulation and structural biology');
  });
});
