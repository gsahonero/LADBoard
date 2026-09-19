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

  private async fetchDrive(url: string, init?: RequestInit): Promise<Response> {
    const method = init?.method || 'GET';
    const headers = await this.getAuthHeader();
    const mergedHeaders: Record<string, string> = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      ...(headers as Record<string, string>),
      ...((init?.headers as Record<string, string>) || {}),
    };

    console.debug(`[LAD:GDrive] ${method} ${url.split('?')[0]}`);

    const res = await fetch(url, {
      cache: 'no-store',
      ...init,
      headers: mergedHeaders,
    });

    if (!res.ok) {
      let errorMsg = `HTTP ${res.status} ${res.statusText}`;
      try {
        const errJson = await res.json();
        if (errJson?.error?.message) {
          errorMsg = errJson.error.message;
        }
      } catch {
        // Ignore json parse error
      }

      console.error(`[LAD:GDrive] ❌ ${method} ${url} -> status ${res.status}: ${errorMsg}`);

      if (res.status === 401) {
        throw new Error(`[Google Drive 401] Authentication expired. Please reconnect Google Drive: ${errorMsg}`);
      }
      if (res.status === 403) {
        throw new Error(`[Google Drive 403] Insufficient permissions or API not enabled: ${errorMsg}`);
      }
      throw new Error(`[Google Drive ${res.status}] ${errorMsg}`);
    }

    return res;
  }

  private normalize(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  }

  private relativeToLAD(path: string): string {
    const norm = this.normalize(path);
    if (!norm || norm === 'LAD' || norm === 'lad') return '';
    if (norm.startsWith('LAD/') || norm.startsWith('lad/')) {
      return norm.substring(4);
    }
    return norm;
  }

  /**
   * Ensures the LAD root folder exists in Drive (at the root of Drive)
   */
  async ensureRootFolder(createIfMissing: boolean = true): Promise<string | null> {
    if (this.rootFolderId && this.rootFolderId !== 'undefined') return this.rootFolderId;

    console.log('[LAD:GDrive] Searching for root folder "LAD"...');

    // Search for top-level LAD root folder
    const q = encodeURIComponent("name = 'LAD' and 'root' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const res = await this.fetchDrive(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`);
    const data = await res.json();

    if (data.files && data.files.length > 0 && data.files[0].id) {
      this.rootFolderId = data.files[0].id;
      console.log('[LAD:GDrive] Found root folder "LAD":', this.rootFolderId);
      return this.rootFolderId!;
    }

    // Fallback: search for any un-trashed LAD folder
    const qFallback = encodeURIComponent("name = 'LAD' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const resFallback = await this.fetchDrive(`https://www.googleapis.com/drive/v3/files?q=${qFallback}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`);
    const dataFallback = await resFallback.json();

    if (dataFallback.files && dataFallback.files.length > 0 && dataFallback.files[0].id) {
      this.rootFolderId = dataFallback.files[0].id;
      console.log('[LAD:GDrive] Found un-trashed "LAD" folder:', this.rootFolderId);
      return this.rootFolderId!;
    }

    if (!createIfMissing) {
      return null;
    }

    console.log('[LAD:GDrive] Root folder "LAD" not found. Creating new folder...');
    // Create LAD root folder at top-level of My Drive
    const createRes = await this.fetchDrive('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'LAD',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    const createData = await createRes.json();
    if (!createData?.id) {
      throw new Error('Google Drive failed to create root folder "LAD" (missing folder ID in response)');
    }
    this.rootFolderId = createData.id;
    console.log('[LAD:GDrive] ✅ Successfully created root folder "LAD":', this.rootFolderId);
    return this.rootFolderId!;
  }

  /**
   * Resolves or creates a nested folder path in Google Drive
   * Handles space-sharing resolution across different Google Drive accounts
   */
  async resolveFolderPath(folderPath: string, createIfMissing: boolean = true): Promise<string | null> {
    const relative = this.relativeToLAD(folderPath);
    if (!relative) return this.ensureRootFolder(createIfMissing);

    if (this.folderCache.has(relative)) {
      const cached = this.folderCache.get(relative);
      if (cached && cached !== 'undefined') return cached;
    }

    const parts = relative.split('/');
    let currentParentId = await this.ensureRootFolder(createIfMissing);
    if (!currentParentId && createIfMissing) {
      throw new Error('Invalid Google Drive root folder ID when resolving folder path');
    }

    let accumulatedPath = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
      if (this.folderCache.has(accumulatedPath)) {
        const cached = this.folderCache.get(accumulatedPath);
        if (cached && cached !== 'undefined') {
          currentParentId = cached;
          continue;
        }
      }

      if (i === 0 && part.startsWith('spc_')) {
        let candidateFiles: any[] = [];

        // 1. Query own Drive folders
        try {
          const qOwn = encodeURIComponent(`name = '${part}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
          const resOwn = await this.fetchDrive(`https://www.googleapis.com/drive/v3/files?q=${qOwn}&fields=files(id,name,shared,ownedByMe,parents)&supportsAllDrives=true&includeItemsFromAllDrives=true`);
          const dataOwn = await resOwn.json();
          if (dataOwn.files && dataOwn.files.length > 0) {
            candidateFiles.push(...dataOwn.files);
          }
        } catch (err) {
          console.warn('Could not query own drive for space:', err);
        }

        // 2. Query "Shared with me" folders (crucial for collaborator invitations)
        try {
          const qShared = encodeURIComponent(`sharedWithMe = true and name = '${part}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
          const resShared = await this.fetchDrive(`https://www.googleapis.com/drive/v3/files?q=${qShared}&fields=files(id,name,shared,ownedByMe,parents)&supportsAllDrives=true&includeItemsFromAllDrives=true`);
          const dataShared = await resShared.json();
          if (dataShared.files && dataShared.files.length > 0) {
            for (const file of dataShared.files) {
              if (!candidateFiles.some((c) => c.id === file.id)) {
                candidateFiles.push(file);
              }
            }
          }
        } catch (err) {
          console.warn('Could not query sharedWithMe for space:', err);
        }

        if (candidateFiles.length > 0) {
          let selectedFolderId: string | null = null;

          // Priority 1: Candidate folder that contains manifest.json
          for (const candidate of candidateFiles) {
            const qManifest = encodeURIComponent(`name = 'manifest.json' and '${candidate.id}' in parents and trashed = false`);
            const manifestRes = await this.fetchDrive(`https://www.googleapis.com/drive/v3/files?q=${qManifest}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`);
            const manifestData = await manifestRes.json();
            if (manifestData.files && manifestData.files.length > 0) {
              selectedFolderId = candidate.id;
              break;
            }
          }

          // Priority 2: Candidate that is shared or not ownedByMe
          if (!selectedFolderId) {
            const sharedCandidate = candidateFiles.find((f: any) => f.shared || f.ownedByMe === false);
            if (sharedCandidate) {
              selectedFolderId = sharedCandidate.id;
            }
          }

          // Priority 3: First candidate
          if (!selectedFolderId && candidateFiles[0]?.id) {
            selectedFolderId = candidateFiles[0].id;
          }

          if (selectedFolderId) {
            currentParentId = selectedFolderId;
          }
        } else if (createIfMissing) {
          if (!currentParentId) {
            currentParentId = await this.ensureRootFolder(true);
          }
          // Create new space folder inside currentParentId
          const createRes = await this.fetchDrive('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: part,
              mimeType: 'application/vnd.google-apps.folder',
              parents: currentParentId ? [currentParentId] : undefined,
            }),
          });
          const createData = await createRes.json();
          if (!createData?.id) {
            throw new Error(`Google Drive failed to create folder "${part}"`);
          }
          currentParentId = createData.id;
        } else {
          return null;
        }
      } else {
        if (!currentParentId) {
          if (createIfMissing) {
            currentParentId = await this.ensureRootFolder(true);
          } else {
            return null;
          }
        }
        // Check inside currentParentId for subfolders
        const q = encodeURIComponent(`name = '${part}' and '${currentParentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
        const searchRes = await this.fetchDrive(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`);
        const searchData = await searchRes.json();

        if (searchData.files && searchData.files.length > 0 && searchData.files[0].id) {
          currentParentId = searchData.files[0].id;
        } else if (createIfMissing) {
          // Create subfolder inside currentParentId
          const createRes = await this.fetchDrive('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: part,
              mimeType: 'application/vnd.google-apps.folder',
              parents: [currentParentId],
            }),
          });
          const createData = await createRes.json();
          if (!createData?.id) {
            throw new Error(`Google Drive failed to create folder "${part}"`);
          }
          currentParentId = createData.id;
        } else {
          return null;
        }
      }
      if (currentParentId) {
        this.folderCache.set(accumulatedPath, currentParentId);
      }
    }

    return currentParentId;
  }

  async readFile<T = any>(path: string): Promise<T | null> {
    const normalized = this.normalize(path);
    const parts = normalized.split('/');
    const fileName = parts.pop()!;
    const folderPath = parts.join('/');

    console.log(`[LAD:GDrive] 📖 Reading file "${path}"...`);

    const parentId = await this.resolveFolderPath(folderPath, false);
    if (!parentId || parentId === 'undefined') {
      console.log(`[LAD:GDrive] Parent folder for "${path}" not found.`);
      return null;
    }

    const q = encodeURIComponent(`name = '${fileName}' and '${parentId}' in parents and trashed = false`);
    const searchRes = await this.fetchDrive(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType)&supportsAllDrives=true&includeItemsFromAllDrives=true&_t=${Date.now()}`);
    const searchData = await searchRes.json();

    if (!searchData.files || searchData.files.length === 0) {
      console.log(`[LAD:GDrive] File "${path}" not found in parent ${parentId}.`);
      return null;
    }

    const fileId = searchData.files[0].id;
    this.fileCache.set(normalized, fileId);

    const downloadRes = await this.fetchDrive(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true&_t=${Date.now()}`);
    const text = await downloadRes.text();
    console.log(`[LAD:GDrive] ✅ Read file "${path}" successfully (${text.length} chars)`);
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

    console.log(`[LAD:GDrive] ✍️ Writing file "${path}"...`);

    const parentId = await this.resolveFolderPath(folderPath, true);
    if (!parentId || parentId === 'undefined') {
      throw new Error(`Invalid parent ID for folder "${folderPath}"`);
    }

    const bodyStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

    // Check if file already exists
    let fileId = this.fileCache.get(normalized);
    if (!fileId) {
      const q = encodeURIComponent(`name = '${fileName}' and '${parentId}' in parents and trashed = false`);
      const searchRes = await this.fetchDrive(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`);
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        fileId = searchData.files[0].id;
        this.fileCache.set(normalized, fileId!);
      }
    }

    if (fileId) {
      // Update file content
      await this.fetchDrive(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&supportsAllDrives=true`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: bodyStr,
      });
      console.log(`[LAD:GDrive] ✅ Updated existing file "${path}" (fileId: ${fileId})`);
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

      const createRes = await this.fetchDrive('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });
      const created = await createRes.json();
      if (created.id) {
        this.fileCache.set(normalized, created.id);
        console.log(`[LAD:GDrive] ✅ Created new file "${path}" (fileId: ${created.id})`);
      }
    }
  }

  async deleteFile(path: string): Promise<void> {
    const normalized = this.normalize(path);
    const parts = normalized.split('/');
    const fileName = parts.pop()!;
    const folderPath = parts.join('/');

    console.log(`[LAD:GDrive] 🗑️ Deleting file "${path}"...`);

    const parentId = await this.resolveFolderPath(folderPath, false);
    if (!parentId || parentId === 'undefined') return;

    const q = encodeURIComponent(`name = '${fileName}' and '${parentId}' in parents and trashed = false`);
    const searchRes = await this.fetchDrive(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`);
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
      const fileId = searchData.files[0].id;
      await this.fetchDrive(`https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
        method: 'DELETE',
      });
      this.fileCache.delete(normalized);
      this.folderCache.delete(normalized);
      console.log(`[LAD:GDrive] ✅ Deleted file "${path}" (fileId: ${fileId})`);
    }
  }

  async fileExists(path: string): Promise<boolean> {
    const data = await this.readFile(path);
    return data !== null;
  }

  async listFiles(directoryPath: string): Promise<IStorageFile[]> {
    const parentId = await this.resolveFolderPath(directoryPath, false);
    if (!parentId || parentId === 'undefined') return [];

    console.log(`[LAD:GDrive] 📂 Listing files in "${directoryPath}" (parentId: ${parentId})...`);

    const q = encodeURIComponent(`'${parentId}' in parents and trashed = false`);
    const res = await this.fetchDrive(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,modifiedTime)&supportsAllDrives=true&includeItemsFromAllDrives=true&_t=${Date.now()}`);
    const data = await res.json();

    if (!data.files) return [];

    const normDir = this.normalize(directoryPath);
    const prefix = normDir ? `${normDir}/` : '';

    console.log(`[LAD:GDrive] Found ${data.files.length} files in "${directoryPath}"`);

    return data.files.map((f: any) => ({
      path: `${prefix}${f.name}`,
      name: f.name,
      sizeBytes: f.size ? parseInt(f.size, 10) : undefined,
      updatedAt: f.modifiedTime,
      isFolder: f.mimeType === 'application/vnd.google-apps.folder',
    }));
  }

  async ensureDirectory(directoryPath: string): Promise<void> {
    await this.resolveFolderPath(directoryPath, true);
  }

  /**
   * Deletes a folder and all its contents in Google Drive
   */
  async deleteDirectory(directoryPath: string): Promise<void> {
    const norm = this.normalize(directoryPath);
    console.log(`[LAD:GDrive] 🗑️ Deleting directory "${directoryPath}"...`);

    const folderId = await this.resolveFolderPath(directoryPath, false);
    if (!folderId || folderId === 'undefined') {
      console.log(`[LAD:GDrive] Folder "${directoryPath}" not found for deletion.`);
      return;
    }

    try {
      await this.fetchDrive(`https://www.googleapis.com/drive/v3/files/${folderId}?supportsAllDrives=true`, {
        method: 'DELETE',
      });
      console.log(`[LAD:GDrive] ✅ Deleted folder "${directoryPath}" (folderId: ${folderId})`);
    } catch (err) {
      console.warn(`[LAD:GDrive] Warning deleting folder "${directoryPath}":`, err);
    }

    // Invalidate caches
    for (const k of Array.from(this.folderCache.keys())) {
      if (k === norm || k.startsWith(`${norm}/`)) {
        this.folderCache.delete(k);
      }
    }
    for (const k of Array.from(this.fileCache.keys())) {
      if (k.startsWith(`${norm}/`)) {
        this.fileCache.delete(k);
      }
    }
  }

  /**
   * Deletes the entire LAD root folder in Google Drive (Account Erase)
   */
  async deleteRootFolder(): Promise<void> {
    console.log('[LAD:GDrive] ⚠️ Permanent account erasure: Deleting root "LAD" folder from Google Drive...');
    const rootId = await this.ensureRootFolder(false);
    if (rootId) {
      try {
        await this.fetchDrive(`https://www.googleapis.com/drive/v3/files/${rootId}?supportsAllDrives=true`, {
          method: 'DELETE',
        });
        console.log('[LAD:GDrive] ✅ Successfully deleted root "LAD" folder from Google Drive');
      } catch (err) {
        console.warn('[LAD:GDrive] Failed to delete root "LAD" folder:', err);
      }
    }
    this.rootFolderId = null;
    this.folderCache.clear();
    this.fileCache.clear();
  }

  async clearAll(): Promise<void> {
    await this.deleteRootFolder();
  }
}
