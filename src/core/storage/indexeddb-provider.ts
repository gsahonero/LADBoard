/**
 * IndexedDB Storage Provider for browser offline-first persistence
 */

import { IStorageFile, IStorageProvider } from './provider.interface';

export class IndexedDBStorageProvider implements IStorageProvider {
  public readonly providerId = 'local_indexeddb';
  public readonly name = 'Local Offline (IndexedDB)';
  private dbName = 'LADBoard_Local_Storage';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      // Fallback for environments without indexedDB
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('files')) {
          const store = db.createObjectStore('files', { keyPath: 'path' });
          store.createIndex('parentPath', 'parentPath', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB database: ${this.dbName}`));
      };
    });
  }

  private normalize(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  }

  private getParentPath(path: string): string {
    const parts = this.normalize(path).split('/');
    if (parts.length <= 1) return '';
    return parts.slice(0, -1).join('/');
  }

  async readFile<T = any>(path: string): Promise<T | null> {
    if (!this.db) await this.initialize();
    if (!this.db) return null;

    const normalizedPath = this.normalize(path);
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction('files', 'readonly');
        const store = tx.objectStore('files');
        const req = store.get(normalizedPath);

        req.onsuccess = () => {
          if (!req.result) {
            resolve(null);
            return;
          }
          try {
            resolve(JSON.parse(req.result.content) as T);
          } catch {
            resolve(req.result.content as unknown as T);
          }
        };

        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async writeFile(path: string, content: any): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) return;

    const normalizedPath = this.normalize(path);
    const parentPath = this.getParentPath(normalizedPath);
    const str = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        const entry = {
          path: normalizedPath,
          parentPath,
          content: str,
          updatedAt: new Date().toISOString(),
          sizeBytes: str.length,
        };

        const req = store.put(entry);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) return;

    const normalizedPath = this.normalize(path);
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        const req = store.delete(normalizedPath);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async fileExists(path: string): Promise<boolean> {
    const data = await this.readFile(path);
    return data !== null;
  }

  async listFiles(directoryPath: string): Promise<IStorageFile[]> {
    if (!this.db) await this.initialize();
    if (!this.db) return [];

    const normalizedDir = this.normalize(directoryPath);

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction('files', 'readonly');
        const store = tx.objectStore('files');
        const req = store.getAll();

        req.onsuccess = () => {
          const allEntries: Array<{ path: string; content: string; updatedAt: string; sizeBytes: number }> = req.result || [];
          const prefix = normalizedDir ? `${normalizedDir}/` : '';
          const results: IStorageFile[] = [];
          const seenSubDirs = new Set<string>();

          for (const entry of allEntries) {
            if (prefix === '' || entry.path.startsWith(prefix)) {
              const relative = prefix ? entry.path.slice(prefix.length) : entry.path;
              const parts = relative.split('/');
              if (parts.length === 1) {
                results.push({
                  path: entry.path,
                  name: parts[0],
                  sizeBytes: entry.sizeBytes,
                  updatedAt: entry.updatedAt,
                  isFolder: false,
                });
              } else if (parts.length > 1 && !seenSubDirs.has(parts[0])) {
                seenSubDirs.add(parts[0]);
                results.push({
                  path: prefix ? `${prefix}${parts[0]}` : parts[0],
                  name: parts[0],
                  isFolder: true,
                });
              }
            }
          }
          resolve(results);
        };

        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async ensureDirectory(_directoryPath: string): Promise<void> {
    // Virtual directories in key-value store
  }

  async deleteDirectory(directoryPath: string): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) return;

    const normDir = this.normalize(directoryPath);
    const prefix = `${normDir}/`;

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        const req = store.getAll();

        req.onsuccess = () => {
          const entries: Array<{ path: string }> = req.result || [];
          for (const entry of entries) {
            if (entry.path === normDir || entry.path.startsWith(prefix)) {
              store.delete(entry.path);
            }
          }
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }
}
