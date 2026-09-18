/**
 * User Registry Manager for LAD Standard user.json
 */

import { LADUserRegistry, LADUserSpaceRef } from '../standard/types';
import {
  LAD_STANDARD_VERSION,
  DEFAULT_COMMIT_THRESHOLD_MS,
  DEFAULT_ACTIVE_EVAL_INTERVAL_MS,
  DEFAULT_GDRIVE_CLIENT_ID,
} from '../standard/constants';
import { validateUserRegistry } from '../standard/validators';
import { IStorageProvider } from '../storage/provider.interface';

export class UserRegistryManager {
  private registryPath = 'LAD/USER/user.json';
  private registry: LADUserRegistry | null = null;
  private localStorage: IStorageProvider;
  private remoteStorage: IStorageProvider | null = null;

  constructor(localStorage: IStorageProvider, remoteStorage?: IStorageProvider | null) {
    this.localStorage = localStorage;
    this.remoteStorage = remoteStorage || null;
  }

  setRemoteStorage(remote: IStorageProvider | null) {
    this.remoteStorage = remote;
    console.log('[LAD:UserRegistry] Remote storage provider updated:', remote?.name || 'none');
  }

  generateUserId(): string {
    const rand = Math.random().toString(36).substring(2, 10);
    return `usr_${rand}`;
  }

  generateSpaceId(): string {
    const rand = Math.random().toString(36).substring(2, 10);
    return `spc_${rand}`;
  }

  async syncWithRemote(): Promise<LADUserRegistry | null> {
    if (!this.remoteStorage) return this.registry;
    console.log('[LAD:UserRegistry] Synchronizing user.json with remote storage...');

    try {
      if (!this.registry) {
        this.registry = await this.localStorage.readFile<LADUserRegistry>(this.registryPath);
      }

      const remoteReg = await this.remoteStorage.readFile<LADUserRegistry>(this.registryPath);
      if (remoteReg) {
        validateUserRegistry(remoteReg);
        console.log('[LAD:UserRegistry] Found remote user.json with', remoteReg.spaces.length, 'spaces');

        if (this.registry) {
          // If local registry was a fresh local device registry with a different user_id,
          // adopt remote user_id and identity so user permissions, roles, and ownership match across devices
          if (remoteReg.user_id && this.registry.user_id !== remoteReg.user_id) {
            console.log(`[LAD:UserRegistry] Adopting remote user_id ${remoteReg.user_id} (was local ${this.registry.user_id})`);
            this.registry.user_id = remoteReg.user_id;
            if (remoteReg.identities && remoteReg.identities.length > 0) {
              this.registry.identities = remoteReg.identities;
            }
          }

          // Merge spaces: strictly additive, never remove spaces where user is editor or owner
          const spaceMap = new Map<string, LADUserSpaceRef>();

          // 1. Seed with remote spaces
          for (const s of remoteReg.spaces) {
            spaceMap.set(s.space_id, { ...s });
          }

          // 2. Merge local spaces into spaceMap
          for (const s of this.registry.spaces) {
            const existing = spaceMap.get(s.space_id);
            if (!existing) {
              if (remoteReg.spaces.length === 0) {
                spaceMap.set(s.space_id, { ...s });
              } else {
                // If local space has actual cards or was explicitly created by the user, keep it
                const isLocalPlaceholder = s.space_name.toLowerCase() === 'personal' && s.storage_provider === 'local_indexeddb';
                let hasLocalCards = false;
                try {
                  const localFiles = await this.localStorage.listFiles(`LAD/${s.space_id}/objects`);
                  hasLocalCards = localFiles.some((f) => f.name.endsWith('.json'));
                } catch {
                  // ignore
                }
                if (hasLocalCards || !isLocalPlaceholder) {
                  spaceMap.set(s.space_id, { ...s });
                } else {
                  console.log(`[LAD:UserRegistry] Pruned dummy empty local space ${s.space_id} in favor of remote spaces`);
                }
              }
            } else {
              // Space exists in both. Preserve the most permissive/active role.
              const resolvedRole =
                existing.role === 'owner' || s.role === 'owner'
                  ? 'owner'
                  : existing.role === 'editor' || s.role === 'editor'
                  ? 'editor'
                  : 'viewer';

              spaceMap.set(s.space_id, {
                ...existing,
                ...s,
                role: resolvedRole,
                status: existing.status === 'active' || s.status === 'active' ? 'active' : s.status,
                last_synced_at: new Date().toISOString(),
              });
            }
          }

          this.registry.spaces = Array.from(spaceMap.values());
          await this.saveRegistry(this.registry);
        } else {
          this.registry = remoteReg;
          await this.localStorage.writeFile(this.registryPath, remoteReg);
        }
        return this.registry;
      } else if (this.registry) {
        // Remote doesn't have it yet, push local
        console.log('[LAD:UserRegistry] Remote user.json missing. Uploading local registry to remote...');
        await this.remoteStorage.writeFile(this.registryPath, this.registry);
        console.log('[LAD:UserRegistry] ✅ Uploaded user.json to remote storage');
      }
    } catch (err) {
      console.warn('[LAD:UserRegistry] Remote user.json sync encountered an issue:', err);
    }

    return this.registry;
  }

  async loadOrCreateRegistry(
    email?: string,
    provider: 'google' | 'local' = 'local',
    options?: { skipDefaultSpace?: boolean }
  ): Promise<LADUserRegistry> {
    console.log('[LAD:UserRegistry] Loading user registry (email:', email, 'provider:', provider, ')...');

    let existing = await this.localStorage.readFile<LADUserRegistry>(this.registryPath);

    // If local is missing or empty, attempt reading from remote storage
    if (!existing && this.remoteStorage) {
      console.log('[LAD:UserRegistry] Local user.json not found. Checking remote storage...');
      try {
        const remoteReg = await this.remoteStorage.readFile<LADUserRegistry>(this.registryPath);
        if (remoteReg) {
          validateUserRegistry(remoteReg);
          console.log('[LAD:UserRegistry] Found user.json on remote storage!');
          existing = remoteReg;
          await this.localStorage.writeFile(this.registryPath, existing);
        }
      } catch (err) {
        console.warn('[LAD:UserRegistry] Failed to fetch remote user.json:', err);
      }
    }

    if (existing) {
      try {
        validateUserRegistry(existing);
        // Ensure default client ID is present if not set
        if (!existing.preferences.gdrive_client_id && DEFAULT_GDRIVE_CLIENT_ID) {
          existing.preferences.gdrive_client_id = DEFAULT_GDRIVE_CLIENT_ID;
        }
        // Sanitize legacy placeholder email if present
        if (existing.identities[0]?.email === 'user@ladboard.local') {
          existing.identities[0].email = email || undefined;
          await this.localStorage.writeFile(this.registryPath, existing);
        }
        this.registry = existing;

        // If remote storage is active, ensure remote has latest user.json
        if (this.remoteStorage) {
          this.syncWithRemote().catch((e) => console.warn('[LAD:UserRegistry] Background sync error:', e));
        }

        console.log('[LAD:UserRegistry] ✅ Loaded existing registry for user:', existing.user_id, 'spaces:', existing.spaces.length);
        return existing;
      } catch (err) {
        console.warn('[LAD:UserRegistry] Existing user.json failed validation, creating fresh registry:', err);
      }
    }

    // Initialize fresh user.json
    console.log('[LAD:UserRegistry] Initializing fresh user.json (skipDefaultSpace:', options?.skipDefaultSpace, ')...');
    const userId = this.generateUserId();
    const defaultSpaceId = this.generateSpaceId();

    const freshRegistry: LADUserRegistry = {
      lad_standard: LAD_STANDARD_VERSION,
      schema_version: '1.0.0',
      user_id: userId,
      identities: [
        {
          provider,
          email: email || undefined,
          subject_id: `sub_${userId}`,
          display_name: email ? email.split('@')[0] : 'LAD User',
        },
      ],
      spaces: options?.skipDefaultSpace
        ? []
        : [
            {
              space_id: defaultSpaceId,
              space_name: 'Personal',
              icon: '👤',
              color: 'blue',
              description: 'Personal life, health, finances & daily flow',
              categories: ['health', 'finances', 'documents', 'shopping', 'home'],
              storage_provider: provider === 'google' && this.remoteStorage ? 'google_drive' : 'local_indexeddb',
              storage_reference: defaultSpaceId,
              role: 'owner',
              status: 'active',
              last_synced_at: new Date().toISOString(),
            },
          ],
      preferences: {
        locale: 'en',
        theme: 'system',
        change_commit_threshold_ms: DEFAULT_COMMIT_THRESHOLD_MS,
        active_evaluation_interval_ms: DEFAULT_ACTIVE_EVAL_INTERVAL_MS,
        gdrive_client_id: DEFAULT_GDRIVE_CLIENT_ID,
      },
      device_metadata: {
        device_id: `dev_${Math.random().toString(36).substring(2, 8)}`,
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'web',
      },
      version: 1,
      updated_at: new Date().toISOString(),
    };

    this.registry = freshRegistry;
    await this.saveRegistry(freshRegistry);
    console.log('[LAD:UserRegistry] ✅ Fresh user.json created with user_id:', userId);
    return freshRegistry;
  }

  getRegistry(): LADUserRegistry | null {
    return this.registry;
  }

  async saveRegistry(registry: LADUserRegistry): Promise<void> {
    validateUserRegistry(registry);
    registry.updated_at = new Date().toISOString();
    registry.version = (registry.version || 0) + 1;
    this.registry = registry;

    // Save to local storage
    await this.localStorage.writeFile(this.registryPath, registry);

    // Save to remote storage if connected
    if (this.remoteStorage) {
      try {
        console.log('[LAD:UserRegistry] Persisting user.json to remote storage...');
        await this.remoteStorage.writeFile(this.registryPath, registry);
        console.log('[LAD:UserRegistry] ✅ Persisted user.json to remote storage');
      } catch (err) {
        console.warn('[LAD:UserRegistry] Could not persist user.json to remote storage:', err);
      }
    }
  }

  async addSpace(spaceRef: LADUserSpaceRef): Promise<void> {
    if (!this.registry) await this.loadOrCreateRegistry();
    const existingIndex = this.registry!.spaces.findIndex((s) => s.space_id === spaceRef.space_id);
    if (existingIndex >= 0) {
      this.registry!.spaces[existingIndex] = {
        ...this.registry!.spaces[existingIndex],
        ...spaceRef,
      };
    } else {
      this.registry!.spaces.push(spaceRef);
    }
    await this.saveRegistry(this.registry!);
  }

  async updateSpaceStatus(spaceId: string, status: 'active' | 'unavailable' | 'pending'): Promise<void> {
    if (!this.registry) return;
    const space = this.registry.spaces.find((s) => s.space_id === spaceId);
    if (space) {
      space.status = status;
      await this.saveRegistry(this.registry);
    }
  }

  async updateSpaceName(spaceId: string, spaceName: string): Promise<void> {
    return this.updateSpaceIdentity(spaceId, { space_name: spaceName });
  }

  async updateSpaceIdentity(
    spaceId: string,
    patch: Partial<Pick<LADUserSpaceRef, 'space_name' | 'icon' | 'color' | 'description' | 'categories'>>
  ): Promise<void> {
    if (!this.registry) await this.loadOrCreateRegistry();
    const space = this.registry!.spaces.find((s) => s.space_id === spaceId);
    if (space) {
      if (patch.space_name !== undefined) space.space_name = patch.space_name;
      if (patch.icon !== undefined) space.icon = patch.icon;
      if (patch.color !== undefined) space.color = patch.color;
      if (patch.description !== undefined) space.description = patch.description;
      if (patch.categories !== undefined) space.categories = patch.categories;
      await this.saveRegistry(this.registry!);
    }
  }

  async removeSpace(spaceId: string): Promise<void> {
    if (!this.registry) return;
    this.registry.spaces = this.registry.spaces.filter((s) => s.space_id !== spaceId);
    await this.saveRegistry(this.registry);
  }

  async updatePreferences(preferences: Partial<LADUserRegistry['preferences']>): Promise<void> {
    if (!this.registry) await this.loadOrCreateRegistry();
    this.registry!.preferences = { ...this.registry!.preferences, ...preferences };
    await this.saveRegistry(this.registry!);
  }

  async updateIdentity(displayName: string, email?: string): Promise<void> {
    if (!this.registry) await this.loadOrCreateRegistry();
    if (this.registry!.identities.length > 0) {
      this.registry!.identities[0].display_name = displayName;
      if (email) {
        this.registry!.identities[0].email = email;
      }
    }
    await this.saveRegistry(this.registry!);
  }
}

