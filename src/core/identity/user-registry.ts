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
  private storage: IStorageProvider;

  constructor(storage: IStorageProvider) {
    this.storage = storage;
  }

  generateUserId(): string {
    const rand = Math.random().toString(36).substring(2, 10);
    return `usr_${rand}`;
  }

  generateSpaceId(): string {
    const rand = Math.random().toString(36).substring(2, 10);
    return `spc_${rand}`;
  }

  async loadOrCreateRegistry(email?: string, provider: 'google' | 'local' = 'local'): Promise<LADUserRegistry> {
    const existing = await this.storage.readFile<LADUserRegistry>(this.registryPath);
    if (existing) {
      try {
        validateUserRegistry(existing);
        // Ensure default client ID is present if not set
        if (!existing.preferences.gdrive_client_id && DEFAULT_GDRIVE_CLIENT_ID) {
          existing.preferences.gdrive_client_id = DEFAULT_GDRIVE_CLIENT_ID;
        }
        this.registry = existing;
        return existing;
      } catch (err) {
        console.warn('Existing user.json failed validation, creating fresh registry:', err);
      }
    }

    // Initialize fresh user.json
    const userId = this.generateUserId();
    const defaultSpaceId = this.generateSpaceId();

    const freshRegistry: LADUserRegistry = {
      lad_standard: LAD_STANDARD_VERSION,
      schema_version: '1.0.0',
      user_id: userId,
      identities: [
        {
          provider,
          email: email || 'user@ladboard.local',
          subject_id: `sub_${userId}`,
          display_name: email ? email.split('@')[0] : 'LAD User',
        },
      ],
      spaces: [
        {
          space_id: defaultSpaceId,
          space_name: 'Personal',
          icon: '👤',
          color: 'blue',
          description: 'Personal life, health, finances & daily flow',
          categories: ['health', 'finances', 'documents', 'shopping', 'home'],
          storage_provider: 'local_indexeddb',
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
    await this.storage.writeFile(this.registryPath, registry);
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

