import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SchemaRegistry } from '../core/schemas/schema-registry';
import { LADCardTypeDefinition } from '../core/schemas/card-types';
import { LADObject } from '../core/standard/types';
import { I18nProvider } from '../core/i18n/i18n-context';
import { LADContext } from '../ui/context/LADContext';
import { NavigationGuardProvider } from '../ui/context/NavigationGuardContext';
import { ObjectCard } from '../ui/components/ObjectCard';
import { CardTypeEditorModal } from '../ui/components/CardTypeEditorModal';
import { LivingBoardView } from '../ui/views/LivingBoardView';
import { WelcomeTourModal } from '../ui/components/WelcomeTourModal';
import { Header } from '../ui/components/Header';
import welcomeTourData from '../core/tour/welcome-tour.json';

describe('Card Metadata, Space Copy Customization, Sorting Cue & Welcome Tour', () => {
  let registry: SchemaRegistry;

  beforeEach(() => {
    registry = SchemaRegistry.getInstance();
    registry.loadCustomCardTypes([]);
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Mock Context Helper
  const renderWithContext = (
    ui: React.ReactNode,
    customContext: Partial<any> = {}
  ) => {
    const defaultCtx = {
      objects: [],
      activeManifest: {
        space_id: 'spc_test_space',
        name: 'Test Space',
        type: 'collaborative',
        storage_path: 'local/test',
        created_at: '2026-09-01T00:00:00Z',
        settings: {},
      },
      syncState: {
        status: 'synced',
        pendingCount: 0,
        lastSyncedAt: new Date().toISOString(),
      },
      spaces: [],
      switchSpace: vi.fn(),
      triggerSync: vi.fn(),
      userRegistry: {
        identities: [
          {
            identity_id: 'usr_local_me',
            display_name: 'Alice Wonder',
            email: 'alice@example.com',
            device_id: 'dev_local',
            roles: ['owner'],
          },
        ],
      },
      nodes: [
        {
          node_id: 'usr_collab_bob',
          label: 'Bob Smith',
          type: 'user',
          created_at: '2026-09-01T00:00:00Z',
          updated_at: '2026-09-01T00:00:00Z',
        },
      ],
      activeAlerts: [],
      proposals: [],
      updateSpaceIdentity: vi.fn().mockResolvedValue(undefined),
      approveProposal: vi.fn(),
      rejectProposal: vi.fn(),
      updateObject: vi.fn(),
      deleteObject: vi.fn(),
      ...customContext,
    };

    return render(
      <I18nProvider>
        <NavigationGuardProvider>
          <LADContext.Provider value={defaultCtx as any}>
            {ui}
          </LADContext.Provider>
        </NavigationGuardProvider>
      </I18nProvider>
    );
  };

  describe('1. Card Creator Attribution', () => {
    it('displays "Created by You" when the card was created by the local user', () => {
      const card: LADObject = {
        object_id: 'obj_creator_local',
        space_id: 'spc_test_space',
        title: 'Blood Pressure 120/80',
        domain: 'health',
        status: 'active',
        priority: 'medium',
        tags: [],
        version: 1,
        attributes: { systolic: 120, diastolic: 80 },
        created_by: 'usr_local_me',
        created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 3600 * 1000).toISOString(),
      };

      renderWithContext(<ObjectCard obj={card} />);

      const creatorEl = screen.getByTestId('card-creator-obj_creator_local');
      expect(creatorEl).toBeDefined();
      expect(creatorEl.textContent).toContain('You');
    });

    it('displays collaborator name when the card was created by another user in userRegistry or nodes', () => {
      const card: LADObject = {
        object_id: 'obj_creator_collab',
        space_id: 'spc_test_space',
        title: 'Dinner Bill $45',
        domain: 'finances',
        status: 'active',
        priority: 'medium',
        tags: [],
        version: 1,
        attributes: { amount: 45 },
        created_by: 'usr_collab_bob',
        created_at: new Date(Date.now() - 7200 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 7200 * 1000).toISOString(),
      };

      renderWithContext(<ObjectCard obj={card} />);

      const creatorEl = screen.getByTestId('card-creator-obj_creator_collab');
      expect(creatorEl).toBeDefined();
      expect(creatorEl.textContent).toContain('Bob Smith');
    });

    it('displays formatted fallback actor string if user is not in directory', () => {
      const card: LADObject = {
        object_id: 'obj_creator_external',
        space_id: 'spc_test_space',
        title: 'Submit Paper Draft',
        domain: 'projects',
        status: 'active',
        priority: 'medium',
        tags: [],
        version: 1,
        attributes: {},
        created_by: 'charlie@partner.org',
        created_at: new Date(Date.now() - 50000).toISOString(),
        updated_at: new Date(Date.now() - 50000).toISOString(),
      };

      renderWithContext(<ObjectCard obj={card} />);

      const creatorEl = screen.getByTestId('card-creator-obj_creator_external');
      expect(creatorEl).toBeDefined();
      expect(creatorEl.textContent).toContain('charlie@partner.org');
    });
  });

  describe('2. Card Creation Date & Freshness Badge', () => {
    it('displays creation date text and shows "New" badge for items created within 24h', () => {
      const now = Date.now();
      const card: LADObject = {
        object_id: 'obj_recent_item',
        space_id: 'spc_test_space',
        title: 'Amoxicillin 500mg',
        domain: 'health',
        status: 'active',
        priority: 'medium',
        tags: [],
        version: 1,
        attributes: { dosage: '500mg' },
        created_by: 'usr_local_me',
        created_at: new Date(now - 10 * 60 * 1000).toISOString(), // 10 minutes ago
        updated_at: new Date(now - 10 * 60 * 1000).toISOString(),
      };

      renderWithContext(<ObjectCard obj={card} />);

      const createdAtEl = screen.getByTestId('card-created-at-obj_recent_item');
      expect(createdAtEl).toBeDefined();

      const freshnessBadge = screen.getByTestId('card-freshness-badge-obj_recent_item');
      expect(freshnessBadge).toBeDefined();
      expect(freshnessBadge.textContent).toContain('New');
    });

    it('does NOT display "New" badge for items created more than 24 hours ago', () => {
      const card: LADObject = {
        object_id: 'obj_older_item',
        space_id: 'spc_test_space',
        title: 'Oat Milk',
        domain: 'shopping',
        status: 'active',
        priority: 'medium',
        tags: [],
        version: 1,
        attributes: {},
        created_by: 'usr_local_me',
        created_at: new Date(Date.now() - 3 * 86400 * 1000).toISOString(), // 3 days ago
        updated_at: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
      };

      renderWithContext(<ObjectCard obj={card} />);

      const createdAtEl = screen.getByTestId('card-created-at-obj_older_item');
      expect(createdAtEl).toBeDefined();

      const freshnessBadge = screen.queryByTestId('card-freshness-badge-obj_older_item');
      expect(freshnessBadge).toBeNull();
    });
  });

  describe('3. Space Copy Customization of Default Cards', () => {
    it('allows SchemaRegistry to customize space copy of default card types and reset cleanly', () => {
      const defaultId = 'finances.account_balance';
      const defaultDef = registry.getCardType(defaultId);
      expect(defaultDef).toBeDefined();
      expect(defaultDef?.isDefault).toBe(true);

      // Customize space copy
      const customizedCopy: LADCardTypeDefinition = {
        ...defaultDef!,
        name: 'Our Family Balance',
        titleConfig: {
          mode: 'fixed',
          fixedTitle: 'Family Funds',
        },
      };

      registry.customizeDefaultCardType(defaultId, customizedCopy);
      expect(registry.isDefaultCustomized(defaultId)).toBe(true);

      const resolved = registry.getCardType(defaultId);
      expect(resolved?.name).toBe('Our Family Balance');
      expect(resolved?.titleConfig?.fixedTitle).toBe('Family Funds');
      expect(resolved?.isSpaceCustomized).toBe(true);

      // Export includes the customized copy
      const exported = registry.exportCustomCardTypes();
      expect(exported.some((ct) => ct.id === defaultId && ct.isSpaceCustomized)).toBe(true);

      // Reset to system default
      registry.resetDefaultCardType(defaultId);
      expect(registry.isDefaultCustomized(defaultId)).toBe(false);

      const resetResolved = registry.getCardType(defaultId);
      expect(resetResolved?.name).toBe(defaultDef?.name);
      expect(Boolean(resetResolved?.isSpaceCustomized)).toBe(false);
    });

    it('renders CardTypeEditorModal without locks when editing a default card type, and allows saving space copy', async () => {
      const defaultType = registry.getCardType('finances.account_balance')!;
      const updateSpaceIdentityMock = vi.fn().mockResolvedValue(undefined);
      const onSavedMock = vi.fn();
      const onCloseMock = vi.fn();

      renderWithContext(
        <CardTypeEditorModal
          isOpen={true}
          onClose={onCloseMock}
          cardType={defaultType}
          onSaved={onSavedMock}
        />
      , { updateSpaceIdentity: updateSpaceIdentityMock });

      // Header indicates space copy customization
      expect(screen.getByText(/Customize Space Copy: Account Balance/i)).toBeDefined();

      // Inputs should NOT be disabled
      const nameInput = screen.getByTestId('card-type-name-input') as HTMLInputElement;
      expect(nameInput.disabled).toBe(false);

      // Change name and fixed title mode
      fireEvent.change(nameInput, { target: { value: 'Custom Account Balance' } });

      const titleModeFixed = screen.getByTestId('title-mode-fixed');
      fireEvent.click(titleModeFixed);

      const fixedTitleInput = screen.getByTestId('card-type-fixed-title-input');
      fireEvent.change(fixedTitleInput, { target: { value: 'Spent Cash' } });

      // Save button is enabled
      const saveBtn = screen.getByTestId('save-card-type-button');
      expect(saveBtn.textContent).toContain('Save Space Copy');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(onSavedMock).toHaveBeenCalled();
        expect(updateSpaceIdentityMock).toHaveBeenCalled();
      });

      const savedArg = onSavedMock.mock.calls[0][0] as LADCardTypeDefinition;
      expect(savedArg.id).toBe('finances.account_balance');
      expect(savedArg.name).toBe('Custom Account Balance');
      expect(savedArg.isSpaceCustomized).toBe(true);
      expect(savedArg.titleConfig?.mode).toBe('fixed');
      expect(savedArg.titleConfig?.fixedTitle).toBe('Spent Cash');
    });

    it('shows "Reset to System Default" button when default card is already customized', () => {
      const defaultType = registry.getCardType('finances.account_balance')!;
      const customizedDefault: LADCardTypeDefinition = {
        ...defaultType,
        isSpaceCustomized: true,
        name: 'Customized Account Balance',
      };
      registry.customizeDefaultCardType('finances.account_balance', customizedDefault);

      renderWithContext(
        <CardTypeEditorModal
          isOpen={true}
          onClose={vi.fn()}
          cardType={customizedDefault}
        />
      );

      const resetBtn = screen.getByTestId('reset-to-default-btn');
      expect(resetBtn).toBeDefined();
      expect(resetBtn.textContent).toContain('Reset to System Default');
    });
  });

  describe('4. Visual Sorting Cue on Living Board', () => {
    it('renders the visual sorting cue pill ("Recent to old ↓") and stack sort cues', () => {
      const objects: LADObject[] = [
        {
          object_id: 'obj_1',
          space_id: 'spc_test_space',
          title: 'Older Card',
          domain: 'finances',
          status: 'active',
          priority: 'medium',
          tags: [],
          version: 1,
          attributes: {},
          created_by: 'usr_1',
          created_at: '2026-09-17T09:00:00Z',
          updated_at: '2026-09-17T09:00:00Z',
        },
        {
          object_id: 'obj_2',
          space_id: 'spc_test_space',
          title: 'Newer Card',
          domain: 'finances',
          status: 'active',
          priority: 'medium',
          tags: [],
          version: 1,
          attributes: {},
          created_by: 'usr_1',
          created_at: '2026-09-17T11:00:00Z',
          updated_at: '2026-09-17T11:00:00Z',
        },
      ];

      renderWithContext(<LivingBoardView />, { objects });

      // Visual sorting cue pill in board header
      const sortingCue = screen.getByTestId('sorting-order-visual-cue');
      expect(sortingCue).toBeDefined();
      expect(sortingCue.textContent).toMatch(/Recent to old/i);

      // Stack header sort cue
      const stackCue = screen.getByTestId('stack-sort-cue-finances');
      expect(stackCue).toBeDefined();
      expect(stackCue.textContent).toMatch(/Newest/i);
    });
  });

  describe('5. Modular JSON-Driven Welcome Tour', () => {
    it('validates that welcome-tour.json defines valid steps with titles, descriptions, and targets', () => {
      expect(Array.isArray(welcomeTourData.steps)).toBe(true);
      expect(welcomeTourData.steps.length).toBeGreaterThanOrEqual(4);

      welcomeTourData.steps.forEach((step) => {
        expect(step.id).toBeDefined();
        expect(step.title).toBeDefined();
        expect(step.description).toBeDefined();
        expect(step.module).toBeDefined();
      });
    });

    it('renders the WelcomeTourModal, steps through, and persists completion in localStorage', async () => {
      const onCloseMock = vi.fn();

      renderWithContext(
        <WelcomeTourModal isOpen={true} onClose={onCloseMock} />
      );

      // First step displayed
      expect(screen.getByTestId('welcome-tour-step-title')).toHaveTextContent(welcomeTourData.steps[0].title);
      expect(screen.getByTestId('welcome-tour-step-counter')).toHaveTextContent('Step 1 of 5');

      // Click Next
      const nextBtn = screen.getByTestId('welcome-tour-next-btn');
      fireEvent.click(nextBtn);

      // Second step displayed
      expect(screen.getByTestId('welcome-tour-step-title')).toHaveTextContent(welcomeTourData.steps[1].title);
      expect(screen.getByTestId('welcome-tour-step-counter')).toHaveTextContent('Step 2 of 5');

      // Click Back
      const backBtn = screen.getByTestId('welcome-tour-prev-btn');
      fireEvent.click(backBtn);
      expect(screen.getByTestId('welcome-tour-step-title')).toHaveTextContent(welcomeTourData.steps[0].title);

      // Click Skip
      const skipBtn = screen.getByTestId('welcome-tour-skip-btn');
      fireEvent.click(skipBtn);

      expect(onCloseMock).toHaveBeenCalled();
      expect(localStorage.getItem('lad_welcome_tour_completed')).toBe('true');
    });

    it('Header has Help & Tour button that triggers onOpenWelcomeTour', () => {
      const onOpenWelcomeTourMock = vi.fn();

      renderWithContext(
        <Header
          onOpenCapture={vi.fn()}
          onOpenSpaceManager={vi.fn()}
          onOpenCreateSpace={vi.fn()}
          onOpenSettings={vi.fn()}
          onGoToHub={vi.fn()}
          onOpenWelcomeTour={onOpenWelcomeTourMock}
        />
      );

      const tourBtn = screen.getByTestId('start-welcome-tour-btn');
      expect(tourBtn).toBeDefined();

      fireEvent.click(tourBtn);
      expect(onOpenWelcomeTourMock).toHaveBeenCalledTimes(1);
    });
  });
});
