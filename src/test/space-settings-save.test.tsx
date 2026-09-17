import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SpaceSettingsView } from '../ui/views/SpaceSettingsView';
import { GlobalSettingsView } from '../ui/views/GlobalSettingsView';
import { I18nProvider } from '../core/i18n/i18n-context';
import { LADContext } from '../ui/context/LADContext';
import { LADSpaceManifest, LADUserRegistry } from '../core/standard/types';

describe('SpaceSettingsView Persistent Save & Reminder Bar', () => {
  const mockManifest: LADSpaceManifest = {
    lad_standard: '0.1.0',
    schema_version: '0.1.0',
    space_id: 'spc_test123',
    space_name: 'Work Projects',
    created_by: 'usr_me',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    icon: 'folder',
    color: 'blue',
    description: 'All work related topics',
    categories: ['work', 'finances'],
    settings: {
      calendar: { enabled: false, mode: 'dedicated', sync_due_dates: true, auto_sync: true },
      invitations: { default_method: 'gmail', default_role: 'editor' },
    },
  };

  const createMockContext = (overrides = {}) => ({
    activeManifest: mockManifest,
    updateSpaceIdentity: vi.fn().mockResolvedValue(undefined),
    objects: [],
    authService: {
      getState: () => ({ isAuthenticated: true, user: { email: 'me@gmail.com', provider: 'google' } }),
    },
    repairSpaceDriveFiles: vi.fn(),
    deleteSpace: vi.fn(),
    currentUserId: 'usr_me',
    userRegistry: { spaces: [{ space_id: 'spc_test123', role: 'owner' }] },
    ...overrides,
  });

  it('renders persistent save bar at the top with "All Changes Saved" initially', () => {
    const mockContext = createMockContext();

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext as any}>
          <SpaceSettingsView />
        </LADContext.Provider>
      </I18nProvider>
    );

    // Save buttons should be visible (both in the persistent top bar and bottom bar)
    const saveButtons = screen.getAllByRole('button', { name: /Save Space Settings/i });
    expect(saveButtons.length).toBeGreaterThanOrEqual(1);

    // Initial clean state badge
    expect(screen.getByText('All Changes Saved')).toBeInTheDocument();
  });

  it('detects modifications and displays "Unsaved Changes" reminder immediately', async () => {
    const mockContext = createMockContext();

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext as any}>
          <SpaceSettingsView />
        </LADContext.Provider>
      </I18nProvider>
    );

    // Change space name
    const nameInput = screen.getByDisplayValue('Work Projects');
    fireEvent.change(nameInput, { target: { value: 'Renamed Work Projects' } });

    // The persistent bar now alerts the user about unsaved changes
    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    expect(
      screen.getByText("You have unsaved changes. Remember to save your settings.")
    ).toBeInTheDocument();
  });

  it('saves changes when clicking the persistent Save Space Settings button', async () => {
    const mockContext = createMockContext();

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext as any}>
          <SpaceSettingsView />
        </LADContext.Provider>
      </I18nProvider>
    );

    // Modify description
    const descInput = screen.getByPlaceholderText('What is this space used for?');
    fireEvent.change(descInput, { target: { value: 'Updated description for this space' } });

    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();

    const saveButtons = screen.getAllByRole('button', { name: /Save Space Settings/i });
    const topSaveBtn = saveButtons[0];

    await act(async () => {
      fireEvent.click(topSaveBtn);
    });

    expect(mockContext.updateSpaceIdentity).toHaveBeenCalledWith(
      'spc_test123',
      expect.objectContaining({
        description: 'Updated description for this space',
      })
    );

    // Success notification is shown
    await waitFor(() => {
      expect(screen.getByText('Space settings updated successfully!')).toBeInTheDocument();
    });
  });
});

describe('GlobalSettingsView Floating Save & Reminder Bar', () => {
  const mockUserRegistry: LADUserRegistry = {
    lad_standard: '1.0',
    schema_version: '1.0.0',
    user_id: 'usr_me123',
    identities: [
      {
        provider: 'google',
        subject_id: 'sub_123',
        email: 'me@gmail.com',
        display_name: 'Alex Rivera',
      },
    ],
    spaces: [
      {
        space_id: 'spc_default',
        space_name: 'Personal Space',
        storage_provider: 'local_indexeddb',
        storage_reference: 'LAD/spc_default',
        role: 'owner',
        status: 'active',
        last_synced_at: new Date().toISOString(),
      },
    ],
    preferences: {
      locale: 'en',
      theme: 'system',
      change_commit_threshold_ms: 5000,
      active_evaluation_interval_ms: 30000,
      palette_theme: 'ocean',
    },
    device_metadata: {
      device_id: 'dev_123',
      platform: 'web',
    },
    version: 1,
    updated_at: new Date().toISOString(),
  };

  const createMockGlobalContext = (overrides = {}) => ({
    userRegistry: mockUserRegistry,
    updatePreferences: vi.fn().mockResolvedValue(undefined),
    updateProfile: vi.fn().mockResolvedValue(undefined),
    connectGoogleDrive: vi.fn(),
    authService: {
      getState: () => ({ isAuthenticated: true, user: { email: 'me@gmail.com', provider: 'google' } }),
      signOut: vi.fn(),
    },
    activeManifest: {
      space_id: 'spc_default',
      space_name: 'Personal Space',
    },
    repairSpaceDriveFiles: vi.fn(),
    deleteAccount: vi.fn(),
    ...overrides,
  });

  it('renders floating save bar at the top with "All Changes Saved" initially', () => {
    const mockContext = createMockGlobalContext();

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext as any}>
          <GlobalSettingsView />
        </LADContext.Provider>
      </I18nProvider>
    );

    // Save buttons should be visible (both in top floating bar and bottom)
    const saveButtons = screen.getAllByRole('button', { name: /Save Global Settings/i });
    expect(saveButtons.length).toBeGreaterThanOrEqual(1);

    // Initial clean state badge
    expect(screen.getByText('All Changes Saved')).toBeInTheDocument();
  });

  it('detects modifications and displays "Unsaved Changes" reminder immediately in floating bar', async () => {
    const mockContext = createMockGlobalContext();

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext as any}>
          <GlobalSettingsView />
        </LADContext.Provider>
      </I18nProvider>
    );

    // Change display name
    const nameInput = screen.getByDisplayValue('Alex Rivera');
    fireEvent.change(nameInput, { target: { value: 'Alex Morgan' } });

    // The floating bar immediately alerts about unsaved changes
    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    expect(
      screen.getByText('You have unsaved changes. Remember to save your settings.')
    ).toBeInTheDocument();
  });

  it('saves changes when clicking the floating Save Global Settings button', async () => {
    const mockContext = createMockGlobalContext();

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext as any}>
          <GlobalSettingsView />
        </LADContext.Provider>
      </I18nProvider>
    );

    // Modify display name
    const nameInput = screen.getByDisplayValue('Alex Rivera');
    fireEvent.change(nameInput, { target: { value: 'Alex Updated' } });

    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();

    const saveButtons = screen.getAllByRole('button', { name: /Save Global Settings/i });
    const topFloatingSaveBtn = saveButtons[0];

    await act(async () => {
      fireEvent.click(topFloatingSaveBtn);
    });

    expect(mockContext.updateProfile).toHaveBeenCalledWith('Alex Updated');
    expect(mockContext.updatePreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        change_commit_threshold_ms: 5000,
        active_evaluation_interval_ms: 30000,
      })
    );

    // Success notification is shown
    await waitFor(() => {
      expect(screen.getByText('Settings saved!')).toBeInTheDocument();
    });
  });
});
