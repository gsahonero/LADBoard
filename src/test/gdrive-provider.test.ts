import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GDriveStorageProvider } from '../core/storage/gdrive-provider';

describe('Google Drive REST API v3 Storage Provider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly creates folders and writes files via Google Drive REST API', async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: any) => {
      // 1. Root folder search
      if (url.includes('drive/v3/files?q=name') && !init?.method) {
        return {
          ok: true,
          json: async () => ({ files: [{ id: 'mock_root_lad_id', name: 'LAD' }] }),
        };
      }

      // 2. Subfolder / file search
      if (url.includes('drive/v3/files?q=') && !init?.method) {
        return {
          ok: true,
          json: async () => ({ files: [] }), // not found -> will create
        };
      }

      // 3. Create folder
      if (url.endsWith('drive/v3/files') && init?.method === 'POST') {
        const body = JSON.parse(init.body);
        return {
          ok: true,
          json: async () => ({ id: `mock_id_${body.name}`, name: body.name }),
        };
      }

      // 4. Multipart upload
      if (url.includes('uploadType=multipart')) {
        return {
          ok: true,
          json: async () => ({ id: 'mock_file_id_123', name: 'manifest.json' }),
        };
      }

      // 5. Download media
      if (url.includes('alt=media')) {
        return {
          ok: true,
          text: async () => JSON.stringify({ lad_standard: '1.0', space_id: 'spc_01' }),
        };
      }

      return { ok: true, json: async () => ({}) };
    });

    global.fetch = mockFetch;

    const provider = new GDriveStorageProvider({
      accessToken: 'mock_oauth_token_12345',
    });

    await provider.writeFile('LAD/spc_01/manifest.json', {
      lad_standard: '1.0',
      space_id: 'spc_01',
    });

    expect(mockFetch).toHaveBeenCalled();

    // Read back file
    const data = await provider.readFile('LAD/spc_01/manifest.json');
    expect(data).toEqual({ lad_standard: '1.0', space_id: 'spc_01' });
  });

  it('resolves space folder directly inside LAD root without redundant LAD/LAD nesting', async () => {
    const createdFolders: { name: string; parents?: string[] }[] = [];

    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: any) => {
      const decodedUrl = decodeURIComponent(url);
      if (decodedUrl.includes('drive/v3/files?q=') && !init?.method) {
        if (decodedUrl.includes("name = 'LAD'")) {
          return {
            ok: true,
            json: async () => ({ files: [{ id: 'mock_lad_root_folder_id', name: 'LAD' }] }),
          };
        }
        return {
          ok: true,
          json: async () => ({ files: [] }),
        };
      }

      if (init?.method === 'POST') {
        const body = JSON.parse(init.body);
        createdFolders.push(body);
        return {
          ok: true,
          json: async () => ({ id: `mock_folder_${body.name}`, name: body.name }),
        };
      }

      return { ok: true, json: async () => ({}) };
    });

    global.fetch = mockFetch;

    const provider = new GDriveStorageProvider({
      accessToken: 'mock_token_123',
    });

    const folderId = await provider.resolveFolderPath('LAD/spc_test_nested');
    expect(folderId).toBe('mock_folder_spc_test_nested');

    // Ensure it created 'spc_test_nested' with parent 'mock_lad_root_folder_id' and NEVER created a subfolder named 'LAD'
    expect(createdFolders.some((f) => f.name === 'LAD')).toBe(false);
    expect(createdFolders.some((f) => f.name === 'spc_test_nested' && f.parents?.includes('mock_lad_root_folder_id'))).toBe(true);
  });
});
