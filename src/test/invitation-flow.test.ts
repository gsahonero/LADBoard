import { describe, it, expect } from 'vitest';
import { SpaceManager } from '../core/space/space-manager';
import { MemoryStorageProvider } from '../core/storage/memory-provider';
import {
  validateSpaceAccessAndInvitation,
  getShareableJoinUrl,
} from '../core/sharing/google-sharing-service';

describe('Space Invitation & Strict Identity Verification Flow', () => {
  it('generates canonical shareable join URLs matching GitHub Pages paths', () => {
    const url = getShareableJoinUrl('spc_test123');
    expect(url).toContain('?join=spc_test123');
  });

  it('verifies valid invitation when authenticated user email matches invited email', async () => {
    const storage = new MemoryStorageProvider();
    const manager = new SpaceManager(storage);

    // 1. User A creates space
    const manifest = await manager.createSpace({
      spaceName: 'Medical Records & Care',
      createdByUserId: 'usr_alice_01',
    });

    // 2. User A invites User B (bob@gmail.com)
    await manager.createInvitation(
      manifest.space_id,
      'usr_alice_01',
      'bob@gmail.com',
      'editor',
      'Bob Dylan'
    );

    // 3. User B verifies invitation with their authenticated email
    const verification = await validateSpaceAccessAndInvitation(
      storage,
      manifest.space_id,
      'bob@gmail.com'
    );

    expect(verification.isValid).toBe(true);
    expect(verification.manifest?.space_name).toBe('Medical Records & Care');
    expect(verification.role).toBe('editor');
    expect(verification.invitedName).toBe('Bob Dylan');
    expect(verification.invitedEmail).toBe('bob@gmail.com');
  });

  it('strictly denies access with IDENTITY_MISMATCH when signed in with wrong Google account', async () => {
    const storage = new MemoryStorageProvider();
    const manager = new SpaceManager(storage);

    // 1. User A creates space
    const manifest = await manager.createSpace({
      spaceName: 'Confidential Finance Space',
      createdByUserId: 'usr_alice_01',
    });

    // 2. User A invites User B (bob@gmail.com)
    await manager.createInvitation(
      manifest.space_id,
      'usr_alice_01',
      'bob@gmail.com',
      'viewer',
      'Bob Dylan'
    );

    // 3. User C (charlie@gmail.com) tries to access the link
    const verification = await validateSpaceAccessAndInvitation(
      storage,
      manifest.space_id,
      'charlie@gmail.com'
    );

    expect(verification.isValid).toBe(false);
    expect(verification.error).toBe('IDENTITY_MISMATCH');
    expect(verification.invitedEmail).toBe('bob@gmail.com');
  });

  it('returns MANIFEST_NOT_FOUND when space ID does not exist in storage', async () => {
    const storage = new MemoryStorageProvider();
    const verification = await validateSpaceAccessAndInvitation(
      storage,
      'spc_nonexistent',
      'bob@gmail.com'
    );

    expect(verification.isValid).toBe(false);
    expect(verification.error).toBe('MANIFEST_NOT_FOUND');
  });

  it('grants owner access to space creator', async () => {
    const storage = new MemoryStorageProvider();
    const manager = new SpaceManager(storage);

    const manifest = await manager.createSpace({
      spaceName: 'Owner Space',
      createdByUserId: 'usr_owner_01',
    });

    await manager.loadSpace(
      manifest.space_id,
      'usr_owner_01',
      5000,
      'Owner Space',
      'Space Owner',
      'owner@gmail.com'
    );

    const verification = await validateSpaceAccessAndInvitation(
      storage,
      manifest.space_id,
      'owner@gmail.com'
    );

    expect(verification.isValid).toBe(true);
    expect(verification.role).toBe('owner');
  });
});
