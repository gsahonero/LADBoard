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
});
