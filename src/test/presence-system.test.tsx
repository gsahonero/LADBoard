import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { PresenceManager } from '../core/presence/presence-manager';
import { PresenceAvatars } from '../ui/components/PresenceAvatars';
import { JoinSpaceModal } from '../ui/components/JoinSpaceModal';
import { LADContext } from '../ui/context/LADContext';
import { I18nProvider } from '../core/i18n/i18n-context';

const mockValidateSpaceAccess = vi.fn();

vi.mock('../core/sharing/google-sharing-service', () => ({
  validateSpaceAccessAndInvitation: (...args: any[]) => mockValidateSpaceAccess(...args),
  getShareableJoinUrl: (id: string) => `https://ladboard.app/join?space=${id}`,
}));

describe('Serverless Real-Time Presence Engine & Privacy Transparency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    PresenceManager.getInstance().stop();
  });

  it('initializes PresenceManager as a singleton and starts presence for space', () => {
    const manager = PresenceManager.getInstance();
    expect(manager).toBeDefined();

    manager.start('space_test_1', { userId: 'usr_alice', displayName: 'Alice' }, true);
    const presencesWithSelf = manager.getPresences(true);
    expect(presencesWithSelf.length).toBe(1);
    expect(presencesWithSelf[0].displayName).toBe('Alice');
    expect(presencesWithSelf[0].userId).toBe('usr_alice');
  });

  it('clears presences and stops broadcasting when presence is disabled (privacy enforcement)', () => {
    const manager = PresenceManager.getInstance();
    manager.start('space_test_1', { userId: 'usr_alice', displayName: 'Alice' }, false);

    const presences = manager.getPresences(true);
    expect(presences.length).toBe(0);
  });

  it('renders PresenceAvatars with active collaborator information and tooltips', () => {
    const mockPresences = [
      {
        userId: 'usr_bob',
        tabId: 'tab_bob_1',
        displayName: 'Bob Builder',
        email: 'bob@example.com',
        color: '#10b981',
        lastActive: Date.now(),
        status: 'active' as const,
        activeCardId: 'obj_123456',
      },
    ];

    render(<PresenceAvatars presences={mockPresences} />);

    expect(screen.getByTestId('presence-avatars-container')).toBeInTheDocument();
    expect(screen.getByText('1 online')).toBeInTheDocument();
    expect(screen.getByText('BB')).toBeInTheDocument(); // Bob Builder initials
  });

  it('renders nothing from PresenceAvatars when there are no peers online', () => {
    const { container } = render(<PresenceAvatars presences={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders live presence active transparency banner in JoinSpaceModal when presence_enabled is true', async () => {
    mockValidateSpaceAccess.mockResolvedValueOnce({
      isValid: true,
      role: 'editor',
      inviterName: 'Owner Jane',
      manifest: {
        space_id: 'spc_collab_active',
        space_name: 'Active Collaborative Space',
        settings: {
          collaboration: {
            presence_enabled: true,
          },
        },
      },
    });

    const mockContextValue: any = {
      pendingJoinSpaceId: 'spc_collab_active',
      joinSpace: vi.fn(),
      dismissPendingJoinSpace: vi.fn(),
      authService: {
        getState: () => ({ isAuthenticated: true, user: { provider: 'google', email: 'collab@test.com' } }),
        subscribe: () => () => {},
      },
      storageManager: {
        getRemoteProvider: () => null,
        getLocalProvider: () => null,
      },
      connectGoogleDrive: vi.fn(),
    };

    render(
      <I18nProvider>
        <LADContext.Provider value={mockContextValue}>
          <JoinSpaceModal />
        </LADContext.Provider>
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('presence-banner-active')).toBeInTheDocument();
      expect(screen.getByText(/Live Peer Presence Active/i)).toBeInTheDocument();
    });
  });

  it('renders stealth/disabled privacy transparency banner in JoinSpaceModal when presence_enabled is false', async () => {
    mockValidateSpaceAccess.mockResolvedValueOnce({
      isValid: true,
      role: 'editor',
      inviterName: 'Owner Jane',
      manifest: {
        space_id: 'spc_collab_private',
        space_name: 'Stealth Space',
        settings: {
          collaboration: {
            presence_enabled: false,
          },
        },
      },
    });

    const mockContextValue: any = {
      pendingJoinSpaceId: 'spc_collab_private',
      joinSpace: vi.fn(),
      dismissPendingJoinSpace: vi.fn(),
      authService: {
        getState: () => ({ isAuthenticated: true, user: { provider: 'google', email: 'collab@test.com' } }),
        subscribe: () => () => {},
      },
      storageManager: {
        getRemoteProvider: () => null,
        getLocalProvider: () => null,
      },
      connectGoogleDrive: vi.fn(),
    };

    render(
      <I18nProvider>
        <LADContext.Provider value={mockContextValue}>
          <JoinSpaceModal />
        </LADContext.Provider>
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('presence-banner-disabled')).toBeInTheDocument();
      expect(screen.getByText(/Private Stealth Mode/i)).toBeInTheDocument();
    });
  });
});
