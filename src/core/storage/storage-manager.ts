/**
 * Storage Manager orchestrating local offline storage and remote storage sync
 */

import { IStorageProvider } from './provider.interface';
import { IndexedDBStorageProvider } from './indexeddb-provider';
import { MemoryStorageProvider } from './memory-provider';
import { GDriveStorageProvider } from './gdrive-provider';

export class StorageManager {
  private localProvider: IStorageProvider;
  private remoteProvider: IStorageProvider | null = null;

  constructor(local?: IStorageProvider, remote?: IStorageProvider) {
    this.localProvider = local || (typeof indexedDB !== 'undefined' ? new IndexedDBStorageProvider() : new MemoryStorageProvider());
    this.remoteProvider = remote || null;
  }

  async initialize(): Promise<void> {
    await this.localProvider.initialize();
    if (this.remoteProvider) {
      await this.remoteProvider.initialize();
    }
  }

  getLocalProvider(): IStorageProvider {
    return this.localProvider;
  }

  getRemoteProvider(): IStorageProvider | null {
    return this.remoteProvider;
  }

  setRemoteProvider(provider: IStorageProvider | null) {
    this.remoteProvider = provider;
  }

  setGDriveProvider(config: { clientId?: string; accessToken?: string; rootFolderId?: string }) {
    this.remoteProvider = new GDriveStorageProvider(config);
  }

  /**
   * Reads from local storage first (instant offline read)
   */
  async read<T = any>(path: string): Promise<T | null> {
    return this.localProvider.readFile<T>(path);
  }

  /**
   * Writes to local storage immediately, and queues for remote sync
   */
  async write(path: string, content: any): Promise<void> {
    await this.localProvider.writeFile(path, content);
  }

  async delete(path: string): Promise<void> {
    await this.localProvider.deleteFile(path);
  }

  async deleteDirectory(directoryPath: string): Promise<void> {
    await this.localProvider.deleteDirectory(directoryPath);
    if (this.remoteProvider) {
      await this.remoteProvider.deleteDirectory(directoryPath);
    }
  }

  /**
   * Permanently erases all local IndexedDB and remote Google Drive LAD data
   */
  async eraseAllData(): Promise<void> {
    console.log('[LAD:StorageManager] ⚠️ Erasing all local and remote data...');
    if (this.remoteProvider && 'deleteRootFolder' in this.remoteProvider) {
      try {
        await (this.remoteProvider as any).deleteRootFolder();
      } catch (e) {
        console.warn('Error deleting remote root folder:', e);
      }
    }
    if (this.localProvider.clearAll) {
      await this.localProvider.clearAll();
    }
    if (typeof localStorage !== 'undefined') {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('lad_') || key === 'i18nextLng')) {
          keysToRemove.push(key);
        }
      }
      for (const k of keysToRemove) localStorage.removeItem(k);
    }
  }

  async list(directoryPath: string) {
    return this.localProvider.listFiles(directoryPath);
  }
}
