import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SyncFallbackBanner } from '../ui/components/SyncFallbackBanner';
import { SyncBadge } from '../ui/components/SyncBadge';
import { I18nProvider } from '../core/i18n/i18n-context';
import { LADContext } from '../ui/context/LADContext';
import { SyncState } from '../core/sync/types';

describe('SyncFallbackBanner & Offline Fallback Alerting', () => {
  const syncedState: SyncState = {
    status: 'synced',
    isOnline: true,
    pendingOpsCount: 0,
    lastSyncedAt: new Date().toISOString(),
    activeConflicts: [],
    errorMessage: null,
  };

  const fallbackState: SyncState = {
    status: 'needs_attention',
    isOnline: false,
    pendingOpsCount: 2,
    lastSyncedAt: null,
    activeConflicts: [],
    errorMessage: 'GDrive sync failed (network connection error). Preserved locally.',
  };

  it('does not render banner when sync is normal and healthy', () => {
    const mockContext: any = {
      syncState: syncedState,
      triggerSync: vi.fn(),
    };

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext}>
          <SyncFallbackBanner />
        </LADContext.Provider>
      </I18nProvider>
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Google Drive Sync Failed')).not.toBeInTheDocument();
  });

  it('renders prominent alert banner when GDrive sync fails and offline fallback is active', () => {
    const mockContext: any = {
      syncState: fallbackState,
      triggerSync: vi.fn(),
    };

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext}>
          <SyncFallbackBanner />
        </LADContext.Provider>
      </I18nProvider>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Google Drive Sync Failed')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Automatic sync to Google Drive failed. Offline fallback is active: your changes are safely preserved on this device and will sync when connection is restored.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('IndexedDB Active (Saved locally)')).toBeInTheDocument();
    expect(screen.getByText('Retry Sync')).toBeInTheDocument();
  });

  it('allows user to dismiss the banner', async () => {
    const mockContext: any = {
      syncState: fallbackState,
      triggerSync: vi.fn(),
    };

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext}>
          <SyncFallbackBanner />
        </LADContext.Provider>
      </I18nProvider>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();

    const dismissButton = screen.getByLabelText('Dismiss');
    fireEvent.click(dismissButton);

    await waitFor(
      () => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      },
      { timeout: 1500 }
    );
  });

  it('triggers triggerSync when clicking Retry Sync', async () => {
    const triggerSyncMock = vi.fn().mockResolvedValue(undefined);
    const mockContext: any = {
      syncState: fallbackState,
      triggerSync: triggerSyncMock,
    };

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext}>
          <SyncFallbackBanner />
        </LADContext.Provider>
      </I18nProvider>
    );

    const retryBtn = screen.getByText('Retry Sync');
    await act(async () => {
      fireEvent.click(retryBtn);
    });

    expect(triggerSyncMock).toHaveBeenCalledTimes(1);
  });

  it('SyncBadge renders warning label for offline fallback attention state', () => {
    render(
      <I18nProvider initialLocale="en">
        <SyncBadge syncState={fallbackState} />
      </I18nProvider>
    );

    expect(screen.getByText('Saved on device (Cloud sync failed)')).toBeInTheDocument();
  });
});
