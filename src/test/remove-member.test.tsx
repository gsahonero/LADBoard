import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpaceManager } from '../core/space/space-manager';
import { MemoryStorageProvider } from '../core/storage/memory-provider';
import { PeopleView } from '../ui/views/PeopleView';
import { I18nProvider } from '../core/i18n/i18n-context';
import * as LADContextModule from '../ui/context/LADContext';
import { revokeSpaceDrivePermission } from '../core/sharing/google-sharing-service';

describe('Remove User and Configuration Update Flow', () => {
  it('updates all configuration data when removing a member in SpaceManager', async () => {
    const localStorage = new MemoryStorageProvider();
    const remoteStorage = new MemoryStorageProvider();
    const manager = new SpaceManager(localStorage, remoteStorage);

    // 1. Create space by owner
    const space = await manager.createSpace({
      spaceName: 'Collab Workspace',
      icon: 'briefcase',
      color: 'indigo',
      createdByUserId: 'usr_owner_100',
    });

    const loaded = await manager.loadSpace(space.space_id, 'usr_owner_100');

    // 2. Invite a collaborator
    await manager.createInvitation(
      space.space_id,
      'usr_owner_100',
      'collab@gmail.com',
      'editor',
      'Collab User'
    );

    // 3. Create an object assigned to this collaborator
    const collabNode = loaded.graphStore.getNodes().find((n) => n.metadata?.email === 'collab@gmail.com');
    expect(collabNode).toBeDefined();

    const obj = loaded.objectStore.createObject({
      title: 'Assigned Project Task',
      domain: 'projects',
      assignedTo: collabNode!.node_id,
      actorUserId: 'usr_owner_100',
    });
    await loaded.objectStore.save(obj);
    expect(obj.assigned_to).toBe(collabNode!.node_id);

    // 4. Verify graph contains collaborator node and connecting edge
    expect(loaded.graphStore.getNodes().some((n) => n.node_id === collabNode!.node_id)).toBe(true);
    expect(loaded.graphStore.getEdges().some((e) => e.target === collabNode!.node_id)).toBe(true);

    // 5. Remove collaborator using removeMember
    const removeRes = await manager.removeMember(space.space_id, 'usr_owner_100', collabNode!.node_id);
    expect(removeRes.success).toBe(true);
    expect(removeRes.removedEmail).toBe('collab@gmail.com');

    // 6. Verify node and associated edges are completely removed from GraphStore
    expect(loaded.graphStore.getNodes().some((n) => n.node_id === collabNode!.node_id)).toBe(false);
    expect(loaded.graphStore.getEdges().some((e) => e.target === collabNode!.node_id || e.source === collabNode!.node_id)).toBe(false);

    // 7. Verify assigned object had its assignment cleanly cleared
    const updatedObj = loaded.objectStore.get(obj.object_id);
    expect(updatedObj?.assigned_to).toBeUndefined();

    // 8. Verify manifest timestamp was updated and committed
    expect(new Date(loaded.manifest.updated_at).getTime()).toBeGreaterThanOrEqual(new Date(space.created_at).getTime());

    // 9. Verify membership.remove operation was recorded in operationLog
    const ops = loaded.operationLog.getOperations();
    const removeOp = ops.find((o) => o.type === 'membership.remove');
    expect(removeOp).toBeDefined();
    expect(removeOp?.actor).toBe('usr_owner_100');
    expect(removeOp?.target).toBe(collabNode!.node_id);

    // 10. Verify remote storage files were updated
    const remoteNodes = await remoteStorage.readFile<any[]>(`LAD/${space.space_id}/graph/nodes.json`);
    expect(remoteNodes?.some((n) => n.node_id === collabNode!.node_id)).toBe(false);

    // 11. Verify primary space creator CANNOT be removed
    const ownerNode = loaded.graphStore.getNodes().find((n) => n.ref_id === 'usr_owner_100' || n.node_id === 'node_usr_owner_100');
    expect(ownerNode).toBeDefined();
    const ownerRemoveRes = await manager.removeMember(space.space_id, 'usr_owner_100', ownerNode!.node_id);
    expect(ownerRemoveRes.success).toBe(false);
    expect(ownerRemoveRes.error).toContain('Cannot remove the primary space creator');
  });

  it('revokes Google Drive folder permissions for the target email via API', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    // 1. Mock list permissions call
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        permissions: [
          { id: 'perm_owner_123', emailAddress: 'owner@gmail.com', role: 'owner' },
          { id: 'perm_target_456', emailAddress: 'collab@gmail.com', role: 'writer' },
        ],
      }),
    });

    // 2. Mock delete permission call
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    const res = await revokeSpaceDrivePermission('mock_token', 'folder_abc_123', 'collab@gmail.com');
    expect(res.success).toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('/permissions?fields=permissions');
    expect(fetchMock.mock.calls[1][0]).toContain('/permissions/perm_target_456');
    expect(fetchMock.mock.calls[1][1].method).toBe('DELETE');
  });

  it('renders Remove User button and handles removal flow in PeopleView', async () => {
    const mockRemoveMember = vi.fn().mockResolvedValue({ success: true, driveRevoked: true });
    const mockInviteMember = vi.fn().mockResolvedValue({ success: true });

    const mockNodes = [
      {
        node_id: 'node_owner_1',
        ref_id: 'usr_owner_1',
        type: 'user' as const,
        label: 'Owner Alice',
        metadata: { role: 'owner', email: 'owner@gmail.com', name: 'Owner Alice' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        node_id: 'node_collab_2',
        ref_id: 'usr_collab_2',
        type: 'user' as const,
        label: 'Bob Collaborator',
        metadata: { role: 'editor', email: 'bob@gmail.com', name: 'Bob Collaborator' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    vi.spyOn(LADContextModule, 'useLAD').mockReturnValue({
      nodes: mockNodes,
      inviteMember: mockInviteMember,
      removeMember: mockRemoveMember,
      activeManifest: {
        created_by: 'usr_owner_1',
        space_id: 'spc_mock',
        space_name: 'Test Space',
      } as any,
      userRegistry: {
        user_id: 'usr_owner_1',
        identities: [{ display_name: 'Owner Alice', email: 'owner@gmail.com' }],
      } as any,
      authService: {
        getState: () => ({ isAuthenticated: true, user: { email: 'owner@gmail.com', name: 'Owner Alice' } }),
      } as any,
    } as any);

    render(
      <I18nProvider initialLocale="en">
        <PeopleView />
      </I18nProvider>
    );

    // Check members list
    expect(screen.getByText('Bob Collaborator')).toBeInTheDocument();

    // Owner should NOT have a Remove User button
    const ownerCard = screen.getByText('Owner Alice').closest('.rounded-2xl');
    expect(ownerCard?.querySelector('button[title="Remove User"]')).toBeNull();

    // Collaborator SHOULD have a Remove User button
    const removeBtn = screen.getByTitle('Remove User');
    expect(removeBtn).toBeInTheDocument();

    // Clicking Remove User opens inline confirmation
    fireEvent.click(removeBtn);
    expect(screen.getByText('Yes, Remove')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();

    // Clicking Yes, Remove calls mockRemoveMember
    fireEvent.click(screen.getByText('Yes, Remove'));

    await waitFor(() => {
      expect(mockRemoveMember).toHaveBeenCalledWith('node_collab_2', 'bob@gmail.com');
    });

    // Check success feedback message
    expect(await screen.findByText('Bob Collaborator was successfully removed from this Space.')).toBeInTheDocument();
  });
});
