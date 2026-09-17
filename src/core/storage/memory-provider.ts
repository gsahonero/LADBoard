/**
 * In-Memory Storage Provider for unit tests and deterministic headless execution
 */

import { IStorageFile, IStorageProvider } from './provider.interface';

export class MemoryStorageProvider implements IStorageProvider {
  public readonly providerId = 'memory';
  public readonly name = 'In-Memory Test Storage';
  private files: Map<string, { content: string; updatedAt: string }> = new Map();
  private directories: Set<string> = new Set();

  async initialize(): Promise<void> {
    this.directories.add('/');
  }

  private normalize(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  }

  async readFile<T = any>(path: string): Promise<T | null> {
    const key = this.normalize(path);
    const entry = this.files.get(key);
    if (!entry) return null;
    try {
      return JSON.parse(entry.content) as T;
    } catch {
      return entry.content as unknown as T;
    }
  }

  async writeFile(path: string, content: any): Promise<void> {
    const key = this.normalize(path);
    const str = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    this.files.set(key, {
      content: str,
      updatedAt: new Date().toISOString(),
    });

    // Register parent directories
    const parts = key.split('/');
    for (let i = 1; i < parts.length; i++) {
      this.directories.add(parts.slice(0, i).join('/'));
    }
  }

  async deleteFile(path: string): Promise<void> {
    const key = this.normalize(path);
    this.files.delete(key);
    // Delete any children if it was a folder
    for (const k of Array.from(this.files.keys())) {
      if (k.startsWith(`${key}/`)) {
        this.files.delete(k);
      }
    }
  }

  async fileExists(path: string): Promise<boolean> {
    const key = this.normalize(path);
    return this.files.has(key);
  }

  async listFiles(directoryPath: string): Promise<IStorageFile[]> {
    const dirKey = this.normalize(directoryPath);
    const results: IStorageFile[] = [];
    const prefix = dirKey ? `${dirKey}/` : '';

    const seenSubDirs = new Set<string>();

    for (const [filePath, entry] of this.files.entries()) {
      if (prefix === '' || filePath.startsWith(prefix)) {
        const relative = prefix ? filePath.slice(prefix.length) : filePath;
        const parts = relative.split('/');
        if (parts.length === 1) {
          // Direct file child
          results.push({
            path: filePath,
            name: parts[0],
            sizeBytes: entry.content.length,
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

    return results;
  }

  async ensureDirectory(directoryPath: string): Promise<void> {
    this.directories.add(this.normalize(directoryPath));
  }

  // Helper for test cleanup
  clear(): void {
    this.files.clear();
    this.directories.clear();
  }
}
