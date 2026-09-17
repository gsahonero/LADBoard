/**
 * Google Drive REST API v3 Storage Provider for LAD Standard
 */

import { IStorageFile, IStorageProvider } from './provider.interface';

export interface GDriveAuthConfig {
  clientId?: string;
  accessToken?: string;
  rootFolderId?: string;
  onAuthRequired?: () => Promise<string>;
}

export class GDriveStorageProvider implements IStorageProvider {
  public readonly providerId = 'google_drive';
  public readonly name = 'Google Drive';

  public readonly clientId: string;
  private accessToken: string | null = null;
  private rootFolderId: string | null = null;
  private folderCache: Map<string, string> = new Map(); // path -> drive_file_id
  private fileCache: Map<string, string> = new Map(); // path -> drive_file_id
  private onAuthRequired?: () => Promise<string>;

  constructor(config?: GDriveAuthConfig) {
    this.clientId = config?.clientId || '';
    this.accessToken = config?.accessToken || null;
    this.rootFolderId = config?.rootFolderId || null;
    this.onAuthRequired = config?.onAuthRequired;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  setRootFolderId(folderId: string) {
    this.rootFolderId = folderId;
    this.folderCache.clear();
    this.fileCache.clear();
  }

  getRootFolderId(): string | null {
    return this.rootFolderId;
  }

  async initialize(): Promise<void> {
    if (!this.accessToken && this.onAuthRequired) {
      this.accessToken = await this.onAuthRequired();
    }
  }

  private async getAuthHeader(): Promise<HeadersInit> {
    if (!this.accessToken && this.onAuthRequired) {
      this.accessToken = await this.onAuthRequired();
    }
    if (!this.accessToken) {
      throw new Error('Google Drive access token not set');
    }
    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  private normalize(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  }

  /**
   * Ensures the LAD root folder exists in Drive
   */
  async ensureRootFolder(): Promise<string> {
    if (this.rootFolderId) return this.rootFolderId;

    const headers = await this.getAuthHeader();
    // Search for LAD root folder
    const q = encodeURIComponent("name = 'LAD' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, { headers });
    const data = await res.json();

    if (data.files && data.files.length > 0) {
      this.rootFolderId = data.files[0].id;
      return this.rootFolderId!;
    }

    // Create LAD root folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'LAD',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    const createData = await createRes.json();
    this.rootFolderId = createData.id;
    return this.rootFolderId!;
  }

  /**
   * Resolves or creates a nested folder path in Google Drive
   */
  async resolveFolderPath(folderPath: string): Promise<string> {
    const normalized = this.normalize(folderPath);
    if (!normalized) return this.ensureRootFolder();

    if (this.folderCache.has(normalized)) {
      return this.folderCache.get(normalized)!;
    }

    const parts = normalized.split('/');
    let currentParentId = await this.ensureRootFolder();

    let accumulatedPath = '';
    for (const part of parts) {
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
      if (this.folderCache.has(accumulatedPath)) {
        currentParentId = this.folderCache.get(accumulatedPath)!;
        continue;
      }

      const headers = await this.getAuthHeader();
      const q = encodeURIComponent(`name = '${part}' and '${currentParentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, { headers });
      const searchData = await searchRes.json();

      if (searchData.files && searchData.files.length > 0) {
        currentParentId = searchData.files[0].id;
      } else {
        const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: part,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [currentParentId],
          }),
        });
        const createData = await createRes.json();
        currentParentId = createData.id;
      }
      this.folderCache.set(accumulatedPath, currentParentId);
    }

    return currentParentId;
  }

  async readFile<T = any>(path: string): Promise<T | null> {
    const normalized = this.normalize(path);
    const parts = normalized.split('/');
    const fileName = parts.pop()!;
    const folderPath = parts.join('/');

    const parentId = await this.resolveFolderPath(folderPath);
    const headers = await this.getAuthHeader();

    const q = encodeURIComponent(`name = '${fileName}' and '${parentId}' in parents and trashed = false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType)`, { headers });
    const searchData = await searchRes.json();

    if (!searchData.files || searchData.files.length === 0) {
      return null;
    }

    const fileId = searchData.files[0].id;
    this.fileCache.set(normalized, fileId);

    const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers });
    if (!downloadRes.ok) return null;

    const text = await downloadRes.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  async writeFile(path: string, content: any): Promise<void> {
    const normalized = this.normalize(path);
    const parts = normalized.split('/');
    const fileName = parts.pop()!;
    const folderPath = parts.join('/');

    const parentId = await this.resolveFolderPath(folderPath);
    const headers = await this.getAuthHeader();
    const bodyStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

    // Check if file already exists
    let fileId = this.fileCache.get(normalized);
    if (!fileId) {
      const q = encodeURIComponent(`name = '${fileName}' and '${parentId}' in parents and trashed = false`);
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, { headers });
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        fileId = searchData.files[0].id;
        this.fileCache.set(normalized, fileId!);
      }
    }

    if (fileId) {
      // Update file content
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: bodyStr,
      });
    } else {
      // Multipart upload for new file with metadata
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: [parentId],
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        bodyStr +
        closeDelim;

      const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });
      const created = await createRes.json();
      if (created.id) {
        this.fileCache.set(normalized, created.id);
      }
    }
  }

  async deleteFile(path: string): Promise<void> {
    const normalized = this.normalize(path);
    const parts = normalized.split('/');
    const fileName = parts.pop()!;
    const folderPath = parts.join('/');

    const parentId = await this.resolveFolderPath(folderPath);
    const headers = await this.getAuthHeader();

    const q = encodeURIComponent(`name = '${fileName}' and '${parentId}' in parents and trashed = false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, { headers });
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
      const fileId = searchData.files[0].id;
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers,
      });
      this.fileCache.delete(normalized);
      this.folderCache.delete(normalized);
    }
  }

  async fileExists(path: string): Promise<boolean> {
    const data = await this.readFile(path);
    return data !== null;
  }

  async listFiles(directoryPath: string): Promise<IStorageFile[]> {
    const parentId = await this.resolveFolderPath(directoryPath);
    const headers = await this.getAuthHeader();

    const q = encodeURIComponent(`'${parentId}' in parents and trashed = false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,modifiedTime)`, { headers });
    const data = await res.json();

    if (!data.files) return [];

    const normDir = this.normalize(directoryPath);
    const prefix = normDir ? `${normDir}/` : '';

    return data.files.map((f: any) => ({
      path: `${prefix}${f.name}`,
      name: f.name,
      sizeBytes: f.size ? parseInt(f.size, 10) : undefined,
      updatedAt: f.modifiedTime,
      isFolder: f.mimeType === 'application/vnd.google-apps.folder',
    }));
  }

  async ensureDirectory(directoryPath: string): Promise<void> {
    await this.resolveFolderPath(directoryPath);
  }
}
