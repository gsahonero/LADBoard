import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncBadge } from '../ui/components/SyncBadge';
import { I18nProvider } from '../core/i18n/i18n-context';
import { SyncState } from '../core/sync/types';

describe('SyncBadge Hover Status Pane', () => {
  const baseSyncState: SyncState = {
    status: 'synced',
    isOnline: true,
    pendingOpsCount: 0,
    lastSyncedAt: new Date(1700000000000).toISOString(),
    activeConflicts: [],
    errorMessage: null,
  };

  it('renders badge in synced state', () => {
    render(
      <I18nProvider initialLocale="en">
        <SyncBadge syncState={baseSyncState} />
      </I18nProvider>
    );

    expect(screen.getByText('Saved & Synced')).toBeInTheDocument();
    // Hover pane is not open initially
    expect(screen.queryByText('Storage & Sync Status')).not.toBeInTheDocument();
  });

  it('opens hover pane on mouse enter displaying GDrive and offline storage status', () => {
    render(
      <I18nProvider initialLocale="en">
        <SyncBadge syncState={baseSyncState} />
      </I18nProvider>
    );

    const badgeContainer = screen.getByText('Saved & Synced').closest('div');
    expect(badgeContainer).toBeTruthy();

    fireEvent.mouseEnter(badgeContainer!);

    // Hover pane items are now visible
    expect(screen.getByText('Storage & Sync Status')).toBeInTheDocument();
    expect(screen.getByText('Google Drive')).toBeInTheDocument();
    expect(screen.getByText('Offline Device Storage')).toBeInTheDocument();
    expect(screen.getByText('IndexedDB Active (Saved locally)')).toBeInTheDocument();
    expect(screen.getByText('All changes saved to device')).toBeInTheDocument();
    expect(screen.getByText('Sync Now')).toBeInTheDocument();
  });

  it('displays pending operations in offline storage when present', () => {
    const pendingSyncState: SyncState = {
      ...baseSyncState,
      status: 'pending_changes',
      pendingOpsCount: 3,
    };

    render(
      <I18nProvider initialLocale="en">
        <SyncBadge syncState={pendingSyncState} />
      </I18nProvider>
    );

    const badgeContainer = screen.getByText('3 pending sync').closest('div');
    fireEvent.mouseEnter(badgeContainer!);

    expect(screen.getByText('Storage & Sync Status')).toBeInTheDocument();
    expect(screen.getByText('3 pending local operations')).toBeInTheDocument();
  });

  it('triggers onSyncClick when clicking Sync Now inside the hover pane', () => {
    const onSyncClick = vi.fn();

    render(
      <I18nProvider initialLocale="en">
        <SyncBadge syncState={baseSyncState} onSyncClick={onSyncClick} />
      </I18nProvider>
    );

    const badgeContainer = screen.getByText('Saved & Synced').closest('div');
    fireEvent.mouseEnter(badgeContainer!);

    const syncNowBtn = screen.getByText('Sync Now');
    fireEvent.click(syncNowBtn);

    expect(onSyncClick).toHaveBeenCalledTimes(1);
  });

  it('closes the hover pane on mouse leave after debounce', async () => {
    render(
      <I18nProvider initialLocale="en">
        <SyncBadge syncState={baseSyncState} />
      </I18nProvider>
    );

    const badgeContainer = screen.getByText('Saved & Synced').closest('div');
    fireEvent.mouseEnter(badgeContainer!);
    expect(screen.getByText('Storage & Sync Status')).toBeInTheDocument();

    fireEvent.mouseLeave(badgeContainer!);

    // Still visible immediately due to debounce
    expect(screen.getByText('Storage & Sync Status')).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.queryByText('Storage & Sync Status')).not.toBeInTheDocument();
      },
      { timeout: 1500 }
    );
  });
});
