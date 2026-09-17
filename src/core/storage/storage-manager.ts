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

  async list(directoryPath: string) {
    return this.localProvider.listFiles(directoryPath);
  }
}
