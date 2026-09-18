import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpaceManager } from '../core/space/space-manager';
import { MemoryStorageProvider } from '../core/storage/memory-provider';
import { PeopleView } from '../ui/views/PeopleView';
import { I18nProvider } from '../core/i18n/i18n-context';
import * as LADContextModule from '../ui/context/LADContext';
import { LADGraphNode } from '../core/standard/types';

describe('Invitation Reconciliation & Deduplication', () => {
  it('reconciles invitation node in-place when user accepts with different name (X -> Z)', async () => {
    const storage = new MemoryStorageProvider();
    const manager = new SpaceManager(storage);

    // 1. Inviter creates space
    const manifest = await manager.createSpace({
      spaceName: 'Research Collaboration',
      createdByUserId: 'usr_owner_01',
    });
    const spaceId = manifest.space_id;

    // 2. Inviter invites person with Name "X" (Sarah C.) and Email "sarah@example.com"
    await manager.createInvitation(
      spaceId,
      'usr_owner_01',
      'sarah@example.com',
      'editor',
      'Sarah C.'
    );

    const space = await manager.loadSpace(spaceId, 'usr_owner_01');
    const nodesAfterInvite = space.graphStore.getNodes().filter((n) => n.type === 'user');
    const invitedNode = nodesAfterInvite.find(
      (n) => n.metadata?.email === 'sarah@example.com' || n.label === 'Sarah C.'
    );

    expect(invitedNode).toBeDefined();
    expect(invitedNode?.label).toBe('Sarah C.');
    expect(invitedNode?.metadata?.status).toBe('invited');
    expect(invitedNode?.metadata?.invited_name).toBe('Sarah C.');

    // 3. Sarah accepts invitation via Google Auth with verified Name "Z" (Dr. Sarah Connor) and Google ID usr_google_sarah
    const reconciledNode = await manager.reconcileUserNode(
      spaceId,
      'usr_google_sarah',
      'Dr. Sarah Connor',
      'sarah@example.com',
      'editor'
    );

    // 4. Verify exactly ONE node exists for sarah@example.com
    const allUserNodes = space.graphStore.getNodes().filter((n) => n.type === 'user');
    const matchingNodes = allUserNodes.filter(
      (n) =>
        (n.metadata?.email || '').toLowerCase() === 'sarah@example.com' ||
        n.label === 'Dr. Sarah Connor' ||
        n.label === 'Sarah C.'
    );

    expect(matchingNodes.length).toBe(1);
    expect(reconciledNode.label).toBe('Dr. Sarah Connor');
    expect(reconciledNode.metadata?.status).toBe('active');
    expect(reconciledNode.metadata?.name).toBe('Dr. Sarah Connor');
    expect(reconciledNode.metadata?.email).toBe('sarah@example.com');
    expect(reconciledNode.metadata?.invited_name).toBe('Sarah C.');
    expect(reconciledNode.ref_id).toBe('usr_google_sarah');

    // 5. Verify edges transitioned from proposed_membership to active member_of
    const edges = space.graphStore.getEdges();
    const membershipEdge = edges.find(
      (e) => e.target === reconciledNode.node_id || e.source === reconciledNode.node_id
    );
    expect(membershipEdge).toBeDefined();
    expect(membershipEdge?.type).toBe('member_of');
    expect(membershipEdge?.metadata?.status).toBe('active');
  });

  it('self-heals and merges pre-existing duplicate user nodes for the same email', async () => {
    const storage = new MemoryStorageProvider();
    const manager = new SpaceManager(storage);

    const manifest = await manager.createSpace({
      spaceName: 'Legacy Space',
      createdByUserId: 'usr_owner_01',
    });
    const spaceId = manifest.space_id;
    const space = await manager.loadSpace(spaceId, 'usr_owner_01');

    // Simulate legacy situation with 2 separate nodes for same email:
    // Node 1: Invitation node with Name "X"
    const node1: LADGraphNode = {
      node_id: 'node_usr_invited_legacy123',
      ref_id: 'usr_invited_legacy123',
      label: 'Alex Invitee',
      type: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        email: 'alex@company.com',
        role: 'editor',
        status: 'invited',
        invited_name: 'Alex Invitee',
      },
    };
    await space.graphStore.addNode(node1);

    // Node 2: Joined node with Name "Z"
    const node2: LADGraphNode = {
      node_id: 'node_usr_alex_verified',
      ref_id: 'usr_alex_verified',
      label: 'Alexander Great',
      type: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        email: 'alex@company.com',
        role: 'editor',
        status: 'active',
        name: 'Alexander Great',
      },
    };
    await space.graphStore.addNode(node2);

    // Create an object assigned to legacy node 1
    const taskObj = space.objectStore.createObject({
      title: 'Legacy Task for Alex',
      domain: 'tasks',
      assignedTo: node1.node_id,
      actorUserId: 'usr_owner_01',
    });
    await space.objectStore.save(taskObj);

    // Create edge connected to legacy node 1
    await space.graphStore.addEdge({
      edge_id: 'edge_proposed_alex',
      source: 'node_usr_owner_01',
      target: node1.node_id,
      type: 'proposed_membership',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: { status: 'proposed' },
    });

    expect(space.graphStore.getNodes().filter((n) => n.metadata?.email === 'alex@company.com').length).toBe(2);

    // Run self-healing deduplication
    const dedupeResult = await manager.deduplicateUserNodes(spaceId);
    expect(dedupeResult.mergedCount).toBe(1);

    // Verify only ONE node remains
    const nodesRemaining = space.graphStore.getNodes().filter((n) => n.metadata?.email === 'alex@company.com');
    expect(nodesRemaining.length).toBe(1);

    const canonical = nodesRemaining[0];
    expect(canonical.metadata?.status).toBe('active');
    expect(canonical.label).toBe('Alexander Great');
    expect(canonical.metadata?.invited_name).toBe('Alex Invitee');

    // Verify object assignment migrated to canonical node
    const updatedTask = space.objectStore.get(taskObj.object_id);
    expect([canonical.node_id, canonical.ref_id]).toContain(updatedTask?.assigned_to);

    // Verify edge migrated to canonical node and became member_of
    const updatedEdges = space.graphStore.getEdges().filter((e) => e.target === canonical.node_id);
    expect(updatedEdges.length).toBe(1);
    expect(updatedEdges[0].type).toBe('member_of');
    expect(updatedEdges[0].metadata?.status).toBe('active');
  });

  it('PeopleView renders single deduplicated card with verified name and invited-as caption', () => {
    const now = new Date().toISOString();
    const mockNodes: LADGraphNode[] = [
      {
        node_id: 'node_owner',
        ref_id: 'usr_owner_01',
        label: 'Owner Boss',
        type: 'user',
        created_at: now,
        updated_at: now,
        metadata: {
          email: 'owner@company.com',
          role: 'owner',
          status: 'active',
        },
      },
      // Canonical active node for Jane Doe (invited as "Janie")
      {
        node_id: 'node_jane_active',
        ref_id: 'usr_jane_verified',
        label: 'Jane Doe',
        type: 'user',
        created_at: now,
        updated_at: now,
        metadata: {
          email: 'jane@company.com',
          role: 'editor',
          status: 'active',
          name: 'Jane Doe',
          invited_name: 'Janie',
        },
      },
      // Pending invite for Charlie
      {
        node_id: 'node_usr_invited_charlie',
        ref_id: 'usr_invited_charlie',
        label: 'Charlie Brown',
        type: 'user',
        created_at: now,
        updated_at: now,
        metadata: {
          email: 'charlie@peanuts.com',
          role: 'viewer',
          status: 'invited',
          invited_name: 'Charlie Brown',
        },
      },
    ];

    vi.spyOn(LADContextModule, 'useLAD').mockReturnValue({
      nodes: mockNodes,
      inviteMember: vi.fn(),
      removeMember: vi.fn(),
      activeManifest: {
        space_id: 'spc_test',
        space_name: 'Test Space',
        created_by: 'usr_owner_01',
      } as any,
      userRegistry: {
        user_id: 'usr_owner_01',
        identities: [{ display_name: 'Owner Boss', email: 'owner@company.com' }],
      } as any,
      authService: {
        getState: () => ({
          isAuthenticated: true,
          user: { email: 'owner@company.com', name: 'Owner Boss', provider: 'google' },
        }),
      } as any,
    } as any);

    render(
      <I18nProvider>
        <PeopleView />
      </I18nProvider>
    );

    // Jane Doe must appear with her verified name
    expect(screen.getByText('Jane Doe')).toBeDefined();
    // (invited as "Janie") caption must appear
    expect(screen.getByText('(invited as "Janie")')).toBeDefined();

    // Jane Doe is active, so no "Reinvite" button for her card
    // Charlie Brown is invited, so "Reinvite" button should exist for Charlie
    const reinviteButtons = screen.getAllByRole('button', { name: /reinvite/i });
    expect(reinviteButtons.length).toBe(1);

    // There should be exactly 3 members in the list (Owner, Jane Doe, Charlie Brown)
    expect(screen.getByText(/People in this Space \(3\)/i)).toBeDefined();
  });

  it('PeopleView deduplicates transient duplicate nodes in props to a single card', () => {
    const now = new Date().toISOString();
    // Simulate raw props having 2 nodes for the same email (e.g. before sync cleanup)
    const duplicateNodes: LADGraphNode[] = [
      {
        node_id: 'node_owner',
        ref_id: 'usr_owner_01',
        label: 'Owner Boss',
        type: 'user',
        created_at: now,
        updated_at: now,
        metadata: { email: 'owner@company.com', role: 'owner', status: 'active' },
      },
      {
        node_id: 'node_invited_temp',
        ref_id: 'usr_invited_temp',
        label: 'Temporary Name',
        type: 'user',
        created_at: now,
        updated_at: now,
        metadata: { email: 'collab@test.com', role: 'editor', status: 'invited' },
      },
      {
        node_id: 'node_collab_active',
        ref_id: 'usr_collab_verified',
        label: 'Verified Collab Name',
        type: 'user',
        created_at: now,
        updated_at: now,
        metadata: { email: 'collab@test.com', role: 'editor', status: 'active', name: 'Verified Collab Name' },
      },
    ];

    vi.spyOn(LADContextModule, 'useLAD').mockReturnValue({
      nodes: duplicateNodes,
      inviteMember: vi.fn(),
      removeMember: vi.fn(),
      activeManifest: {
        space_id: 'spc_test',
        space_name: 'Test Space',
        created_by: 'usr_owner_01',
      } as any,
      userRegistry: {
        user_id: 'usr_owner_01',
        identities: [{ display_name: 'Owner Boss', email: 'owner@company.com' }],
      } as any,
      authService: {
        getState: () => ({
          isAuthenticated: true,
          user: { email: 'owner@company.com', name: 'Owner Boss', provider: 'google' },
        }),
      } as any,
    } as any);

    render(
      <I18nProvider>
        <PeopleView />
      </I18nProvider>
    );

    // Exactly 2 member cards rendered: Owner + Verified Collab (not 3!)
    expect(screen.getByText(/People in this Space \(2\)/i)).toBeDefined();
    expect(screen.getByText('Verified Collab Name')).toBeDefined();
    expect(screen.queryByText('Temporary Name')).toBeNull();
  });
});
