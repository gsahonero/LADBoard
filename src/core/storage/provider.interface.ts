/**
 * Storage Provider Abstraction Contract for LAD Standard
 */

export interface IStorageFile {
  path: string;
  name: string;
  sizeBytes?: number;
  updatedAt?: string;
  isFolder?: boolean;
}

export interface IStorageProvider {
  readonly providerId: 'google_drive' | 'local_indexeddb' | 'memory' | string;
  readonly name: string;

  /**
   * Initializes the storage provider (e.g. opens IndexedDB database or authorizes token).
   */
  initialize(): Promise<void>;

  /**
   * Reads a JSON object or string file from storage.
   */
  readFile<T = any>(path: string): Promise<T | null>;

  /**
   * Writes a JSON object or raw string to storage.
   */
  writeFile(path: string, content: any): Promise<void>;

  /**
   * Deletes a file or directory from storage.
   */
  deleteFile(path: string): Promise<void>;

  /**
   * Checks if a file exists.
   */
  fileExists(path: string): Promise<boolean>;

  /**
   * Lists files within a directory path.
   */
  listFiles(directoryPath: string): Promise<IStorageFile[]>;

  /**
   * Ensures a directory path exists.
   */
  ensureDirectory(directoryPath: string): Promise<void>;

  /**
   * Deletes an entire directory and all files within it.
   */
  deleteDirectory(directoryPath: string): Promise<void>;

  /**
   * Clears all data within this storage provider.
   */
  clearAll?(): Promise<void>;
}
