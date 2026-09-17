import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { SpaceSettingsView } from '../ui/views/SpaceSettingsView';
import { GlobalSettingsView } from '../ui/views/GlobalSettingsView';
import { SettingsView } from '../ui/views/SettingsView';
import { I18nProvider } from '../core/i18n/i18n-context';
import { LADContext } from '../ui/context/LADContext';
import { NavigationGuardProvider, useNavigationGuard } from '../ui/context/NavigationGuardContext';
import { UnsavedChangesModal } from '../ui/components/UnsavedChangesModal';
import { LADSpaceManifest, LADUserRegistry } from '../core/standard/types';

describe('Unsaved Changes Navigation Guard for Settings (Global & Space)', () => {
  const mockManifest: LADSpaceManifest = {
    lad_standard: '0.1.0',
    schema_version: '0.1.0',
    space_id: 'spc_guard_test',
    space_name: 'Work Space',
    created_by: 'usr_owner',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    icon: 'folder',
    color: 'blue',
    description: 'Work Space description',
    categories: ['work', 'projects'],
    settings: {
      auto_archive_days: 7,
      calendar: { enabled: false, mode: 'dedicated', sync_due_dates: true, auto_sync: true },
      invitations: { default_method: 'gmail', default_role: 'editor' },
    },
  };

  const mockUserRegistry: LADUserRegistry = {
    lad_standard: '1.0',
    schema_version: '1.0.0',
    user_id: 'usr_owner',
    identities: [
      {
        provider: 'google',
        email: 'alice@example.com',
        subject_id: 'sub_123',
        display_name: 'Alice Cooper',
        avatar_url: '',
      },
    ],
    spaces: [
      {
        space_id: 'spc_guard_test',
        space_name: 'Work Space',
        storage_provider: 'local_indexeddb',
        storage_reference: 'spc_guard_test',
        role: 'owner',
        status: 'active',
      },
    ],
    preferences: {
      locale: 'en',
      theme: 'system',
      palette_theme: 'calm_focus',
      change_commit_threshold_ms: 5000,
      active_evaluation_interval_ms: 30000,
    },
    device_metadata: {
      device_id: 'dev_1',
      platform: 'web',
    },
    version: 1,
    updated_at: new Date().toISOString(),
  };

  const createMockContext = (overrides = {}) => ({
    activeManifest: mockManifest,
    updateSpaceIdentity: vi.fn().mockResolvedValue(undefined),
    objects: [],
    authService: {
      getState: () => ({ isAuthenticated: true, user: { email: 'alice@example.com', provider: 'google' } }),
    },
    repairSpaceDriveFiles: vi.fn(),
    deleteSpace: vi.fn(),
    currentUserId: 'usr_owner',
    userRegistry: mockUserRegistry,
    updateProfile: vi.fn().mockResolvedValue(undefined),
    updatePreferences: vi.fn().mockResolvedValue(undefined),
    connectGoogleDrive: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    spaces: [mockManifest],
    switchSpace: vi.fn(),
    ...overrides,
  });

  // Helper test harness component with external navigation buttons
  const TestHarness: React.FC<{
    children: React.ReactNode;
    onNavigateSpy?: () => void;
  }> = ({ children, onNavigateSpy }) => {
    const { confirmNavigation } = useNavigationGuard();

    return (
      <div>
        <button
          data-testid="nav-to-board-btn"
          onClick={() => confirmNavigation(() => onNavigateSpy?.())}
        >
          Go To Living Board
        </button>
        <button
          data-testid="nav-to-hub-btn"
          onClick={() => confirmNavigation(() => onNavigateSpy?.())}
        >
          Go To Hub
        </button>
        {children}
        <UnsavedChangesModal />
      </div>
    );
  };

  it('allows immediate navigation when Space Settings has no unsaved changes', () => {
    const mockContext = createMockContext();
    const onNavigateSpy = vi.fn();

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext as any}>
          <NavigationGuardProvider>
            <TestHarness onNavigateSpy={onNavigateSpy}>
              <SpaceSettingsView />
            </TestHarness>
          </NavigationGuardProvider>
        </LADContext.Provider>
      </I18nProvider>
    );

    // Click navigation button
    const navBtn = screen.getByTestId('nav-to-board-btn');
    fireEvent.click(navBtn);

    // Should proceed immediately
    expect(onNavigateSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('unsaved-changes-modal')).not.toBeInTheDocument();
  });

  it('intercepts navigation and shows modal when Space Settings has unsaved changes', async () => {
    const mockContext = createMockContext();
    const onNavigateSpy = vi.fn();

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext as any}>
          <NavigationGuardProvider>
            <TestHarness onNavigateSpy={onNavigateSpy}>
              <SpaceSettingsView />
            </TestHarness>
          </NavigationGuardProvider>
        </LADContext.Provider>
      </I18nProvider>
    );

    // Modify space name
    const nameInput = screen.getByDisplayValue('Work Space');
    fireEvent.change(nameInput, { target: { value: 'Modified Work Space' } });

    // Attempt to navigate
    const navBtn = screen.getByTestId('nav-to-board-btn');
    fireEvent.click(navBtn);

    // Navigation must be intercepted!
    expect(onNavigateSpy).not.toHaveBeenCalled();

    // Modal must be visible
    const modal = screen.getByTestId('unsaved-changes-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getAllByText(/Work Space Settings/i).length).toBeGreaterThanOrEqual(1);
    expect(within(modal).getByTestId('unsaved-modal-keep-editing')).toBeInTheDocument();
    expect(within(modal).getByTestId('unsaved-modal-discard')).toBeInTheDocument();
    expect(within(modal).getByTestId('unsaved-modal-save')).toBeInTheDocument();
  });

  it('cancels navigation and keeps changes intact when user clicks "Keep Editing"', async () => {
    const mockContext = createMockContext();
    const onNavigateSpy = vi.fn();

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext as any}>
          <NavigationGuardProvider>
            <TestHarness onNavigateSpy={onNavigateSpy}>
              <SpaceSettingsView />
            </TestHarness>
          </NavigationGuardProvider>
        </LADContext.Provider>
      </I18nProvider>
    );

    // Modify space name
    const nameInput = screen.getByDisplayValue('Work Space') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Modified Work Space' } });

    // Try to navigate
    fireEvent.click(screen.getByTestId('nav-to-hub-btn'));
    expect(screen.getByTestId('unsaved-changes-modal')).toBeInTheDocument();

    // Click "Keep Editing"
    fireEvent.click(screen.getByTestId('unsaved-modal-keep-editing'));

    // Modal closed, navigation did not run, input still has modified value
    expect(screen.queryByTestId('unsaved-changes-modal')).not.toBeInTheDocument();
    expect(onNavigateSpy).not.toHaveBeenCalled();
    expect(nameInput.value).toBe('Modified Work Space');
  });

  it('discards modifications, resets fields, and proceeds with navigation on "Discard & Leave"', async () => {
    const mockContext = createMockContext();
    const onNavigateSpy = vi.fn();

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext as any}>
          <NavigationGuardProvider>
            <TestHarness onNavigateSpy={onNavigateSpy}>
              <SpaceSettingsView />
            </TestHarness>
          </NavigationGuardProvider>
        </LADContext.Provider>
      </I18nProvider>
    );

    // Modify space name
    const nameInput = screen.getByDisplayValue('Work Space') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Modified Work Space' } });

    // Try to navigate
    fireEvent.click(screen.getByTestId('nav-to-board-btn'));
    expect(screen.getByTestId('unsaved-changes-modal')).toBeInTheDocument();

    // Click "Discard & Leave"
    fireEvent.click(screen.getByTestId('unsaved-modal-discard'));

    // Modal closes, target navigation runs, and input resets back to original manifest
    expect(screen.queryByTestId('unsaved-changes-modal')).not.toBeInTheDocument();
    expect(onNavigateSpy).toHaveBeenCalledTimes(1);
    expect(nameInput.value).toBe('Work Space');
  });

  it('saves changes to storage and proceeds with navigation on "Save & Continue"', async () => {
    const mockContext = createMockContext();
    const onNavigateSpy = vi.fn();

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext as any}>
          <NavigationGuardProvider>
            <TestHarness onNavigateSpy={onNavigateSpy}>
              <SpaceSettingsView />
            </TestHarness>
          </NavigationGuardProvider>
        </LADContext.Provider>
      </I18nProvider>
    );

    // Modify description
    const descInput = screen.getByPlaceholderText('What is this space used for?') as HTMLInputElement;
    fireEvent.change(descInput, { target: { value: 'New Saved Description' } });

    // Try to navigate
    fireEvent.click(screen.getByTestId('nav-to-board-btn'));
    expect(screen.getByTestId('unsaved-changes-modal')).toBeInTheDocument();

    // Click "Save & Continue"
    await act(async () => {
      fireEvent.click(screen.getByTestId('unsaved-modal-save'));
    });

    // Expect updateSpaceIdentity was called with new description
    expect(mockContext.updateSpaceIdentity).toHaveBeenCalledWith(
      'spc_guard_test',
      expect.objectContaining({
        description: 'New Saved Description',
      })
    );

    // Navigation succeeds and modal closes
    expect(onNavigateSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('unsaved-changes-modal')).not.toBeInTheDocument();
  });

  it('protects Global Settings with unsaved changes navigation guard', async () => {
    const mockContext = createMockContext();
    const onNavigateSpy = vi.fn();

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext as any}>
          <NavigationGuardProvider>
            <TestHarness onNavigateSpy={onNavigateSpy}>
              <GlobalSettingsView />
            </TestHarness>
          </NavigationGuardProvider>
        </LADContext.Provider>
      </I18nProvider>
    );

    // Change display name
    const nameInput = screen.getByDisplayValue('Alice Cooper') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Alice Wonder' } });

    // Attempt to navigate
    fireEvent.click(screen.getByTestId('nav-to-board-btn'));

    // Intercepted by Global Settings guard
    expect(onNavigateSpy).not.toHaveBeenCalled();
    const modal = screen.getByTestId('unsaved-changes-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getAllByText(/Global Settings/i).length).toBeGreaterThanOrEqual(1);

    // Click "Save & Continue"
    await act(async () => {
      fireEvent.click(screen.getByTestId('unsaved-modal-save'));
    });

    // Profile and preferences updated
    expect(mockContext.updateProfile).toHaveBeenCalledWith('Alice Wonder');
    expect(mockContext.updatePreferences).toHaveBeenCalled();
    expect(onNavigateSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('unsaved-changes-modal')).not.toBeInTheDocument();
  });

  it('intercepts tab switching between Space Settings and Global Settings when dirty', async () => {
    const mockContext = createMockContext();

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext as any}>
          <NavigationGuardProvider>
            <div>
              <SettingsView initialTab="space" />
              <UnsavedChangesModal />
            </div>
          </NavigationGuardProvider>
        </LADContext.Provider>
      </I18nProvider>
    );

    // Modify space name
    const nameInput = screen.getByDisplayValue('Work Space');
    fireEvent.change(nameInput, { target: { value: 'Modified Name' } });

    // Click "Global Settings" button inside SpaceSettingsView
    const globalTabBtn = screen.getByRole('button', { name: /Global Settings/i });
    fireEvent.click(globalTabBtn);

    // Modal pops up blocking tab switch
    const modal = screen.getByTestId('unsaved-changes-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getAllByText(/Work Space Settings/i).length).toBeGreaterThanOrEqual(1);

    // Discard & Leave switches to Global Settings
    fireEvent.click(screen.getByTestId('unsaved-modal-discard'));

    await waitFor(() => {
      expect(screen.getByText('System & Account Configuration')).toBeInTheDocument();
    });
  });
});