import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '../core/i18n/i18n-context';
import { LADContext, LADProvider, useLAD } from '../ui/context/LADContext';
import { CardTypeEditorModal } from '../ui/components/CardTypeEditorModal';
import { CardEditModal } from '../ui/components/CardEditModal';
import { ObjectCard } from '../ui/components/ObjectCard';
import { SmartCaptureBar } from '../ui/components/SmartCaptureBar';
import { SpaceSettingsView } from '../ui/views/SpaceSettingsView';
import { SchemaRegistry } from '../core/schemas/schema-registry';
import {
  LADCardTypeDefinition,
  isNotesStorageDisabled,
} from '../core/schemas/card-types';
import { LADObject, LADSpaceManifest } from '../core/standard/types';

describe('Card Type Notes & Raw Description Configuration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Schema Definition & Helper Validation', () => {
    it('returns false by default or when notes are explicitly allowed', () => {
      expect(isNotesStorageDisabled(undefined)).toBe(false);
      expect(isNotesStorageDisabled(null)).toBe(false);

      const standardType: LADCardTypeDefinition = {
        id: 'test.standard',
        category: 'general',
        name: 'Standard Card',
        fields: [{ key: 'title', label: 'Title', type: 'text' }],
      };
      expect(isNotesStorageDisabled(standardType)).toBe(false);

      const explicitAllowed: LADCardTypeDefinition = {
        ...standardType,
        storeNotes: true,
        noNotesStored: false,
      };
      expect(isNotesStorageDisabled(explicitAllowed)).toBe(false);
    });

    it('returns true when storeNotes is false, noNotesStored is true, or storeRawDescription is false', () => {
      const typeStoreNotesFalse: LADCardTypeDefinition = {
        id: 'test.no_notes_1',
        category: 'general',
        name: 'No Notes 1',
        fields: [],
        storeNotes: false,
      };
      expect(isNotesStorageDisabled(typeStoreNotesFalse)).toBe(true);

      const typeNoNotesStoredTrue: LADCardTypeDefinition = {
        id: 'test.no_notes_2',
        category: 'general',
        name: 'No Notes 2',
        fields: [],
        noNotesStored: true,
      };
      expect(isNotesStorageDisabled(typeNoNotesStoredTrue)).toBe(true);

      const typeRawDescFalse: any = {
        id: 'test.no_notes_3',
        category: 'general',
        name: 'No Notes 3',
        fields: [],
        storeRawDescription: false,
      };
      expect(isNotesStorageDisabled(typeRawDescFalse)).toBe(true);
    });
  });

  describe('2. CardTypeEditorModal Configuration UI', () => {
    it('renders the Do Not Store Notes toggle unchecked by default for new card types and allows enabling it', async () => {
      const onSaved = vi.fn();
      const onClose = vi.fn();

      const mockContext: any = {
        activeManifest: { space_id: 'test-space', settings: {} },
        updateSpaceIdentity: vi.fn().mockResolvedValue(undefined),
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={mockContext}>
            <CardTypeEditorModal
              isOpen={true}
              onClose={onClose}
              defaultCategory="finances"
              onSaved={onSaved}
            />
          </LADContext.Provider>
        </I18nProvider>
      );

      const toggle = screen.getByTestId('card-type-no-notes-toggle') as HTMLInputElement;
      expect(toggle).toBeInTheDocument();
      expect(toggle.checked).toBe(false);

      // Name the card type
      const nameInput = screen.getByTestId('card-type-name-input');
      fireEvent.change(nameInput, { target: { value: 'Strict Balance' } });

      // Check the toggle to disable notes storage
      fireEvent.click(toggle);
      expect(toggle.checked).toBe(true);

      // Save
      const saveBtn = screen.getByTestId('save-card-type-button');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalled();
        const savedDefinition: LADCardTypeDefinition = onSaved.mock.calls[0][0];
        expect(savedDefinition.name).toBe('Strict Balance');
        expect(savedDefinition.storeNotes).toBe(false);
        expect(savedDefinition.noNotesStored).toBe(true);
      });
    });

    it('pre-populates the toggle as checked when editing a card type with no notes stored', () => {
      const existingType: LADCardTypeDefinition = {
        id: 'custom.finances.strict_balance',
        category: 'finances',
        name: 'Strict Balance',
        fields: [{ key: 'balance', label: 'Balance', type: 'currency' }],
        storeNotes: false,
        noNotesStored: true,
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={{} as any}>
            <CardTypeEditorModal
              isOpen={true}
              onClose={vi.fn()}
              cardType={existingType}
            />
          </LADContext.Provider>
        </I18nProvider>
      );

      const toggle = screen.getByTestId('card-type-no-notes-toggle') as HTMLInputElement;
      expect(toggle).toBeInTheDocument();
      expect(toggle.checked).toBe(true);
    });
  });

  describe('3. CardEditModal Display & Save Behavior', () => {
    it('shows the Notes / Raw Description textarea when card type permits notes', () => {
      const registry = SchemaRegistry.getInstance();
      registry.addCustomCardType({
        id: 'custom.with_notes',
        category: 'general',
        name: 'Card With Notes',
        fields: [{ key: 'title', label: 'Title', type: 'text' }],
        storeNotes: true,
      });

      const card: LADObject = {
        object_id: 'obj_notes_1',
        space_id: 'spc_1',
        title: 'Meeting with Team',
        description: 'Discuss Q3 deliverables',
        domain: 'general',
        status: 'active',
        priority: 'medium',
        tags: [],
        version: 1,
        attributes: { card_type: 'custom.with_notes' },
        created_by: 'usr_1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockCtx: any = {
        activeManifest: { space_id: 'spc_1', categories: ['general'] },
        updateObject: vi.fn(),
        deleteObject: vi.fn(),
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={mockCtx}>
            <CardEditModal isOpen={true} onClose={vi.fn()} obj={card} />
          </LADContext.Provider>
        </I18nProvider>
      );

      expect(screen.getByTestId('card-edit-notes-section')).toBeInTheDocument();
      expect(screen.getByTestId('card-edit-description-input')).toBeInTheDocument();
    });

    it('hides the Notes / Raw Description textarea and empties description on save when card type disables notes', async () => {
      const registry = SchemaRegistry.getInstance();
      registry.addCustomCardType({
        id: 'custom.without_notes',
        category: 'finances',
        name: 'Confidential Finance',
        fields: [{ key: 'account', label: 'Account', type: 'text' }],
        storeNotes: false,
        noNotesStored: true,
      });

      const card: LADObject = {
        object_id: 'obj_notes_2',
        space_id: 'spc_1',
        title: 'Account 1234',
        description: 'Old confidential text that should not persist',
        domain: 'finances',
        status: 'active',
        priority: 'medium',
        tags: [],
        version: 1,
        attributes: { card_type: 'custom.without_notes', raw_thought: 'secret raw thought' },
        created_by: 'usr_1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updateObject = vi.fn().mockResolvedValue(undefined);
      const mockCtx: any = {
        activeManifest: { space_id: 'spc_1', categories: ['finances'] },
        updateObject,
        deleteObject: vi.fn(),
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={mockCtx}>
            <CardEditModal isOpen={true} onClose={vi.fn()} obj={card} />
          </LADContext.Provider>
        </I18nProvider>
      );

      // Section should be hidden
      expect(screen.queryByTestId('card-edit-notes-section')).toBeNull();
      expect(screen.queryByTestId('card-edit-description-input')).toBeNull();

      // Click save
      const saveBtn = screen.getByTestId('save-card-edit-button');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(updateObject).toHaveBeenCalled();
        const patch = updateObject.mock.calls[0][1];
        expect(patch.description).toBe('');
        expect(patch.attributes.raw_thought).toBeUndefined();
      });
    });
  });

  describe('4. ObjectCard Rendering with Notes Setting', () => {
    it('does not render description when card type has notes storage disabled', () => {
      const registry = SchemaRegistry.getInstance();
      registry.addCustomCardType({
        id: 'custom.silent_notes',
        category: 'general',
        name: 'Silent Notes Card',
        fields: [{ key: 'category', label: 'Category', type: 'text' }],
        storeNotes: false,
      });

      const card: LADObject = {
        object_id: 'obj_silent',
        space_id: 'spc_1',
        title: 'Project Delta',
        description: 'Confidential details here',
        domain: 'general',
        status: 'active',
        priority: 'medium',
        tags: [],
        version: 1,
        attributes: { card_type: 'custom.silent_notes' },
        created_by: 'usr_1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockCtx: any = {
        updateObject: vi.fn(),
        deleteObject: vi.fn(),
        nodes: [],
        userRegistry: { user_id: 'usr_1', identities: [] },
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={mockCtx}>
            <ObjectCard obj={card} />
          </LADContext.Provider>
        </I18nProvider>
      );

      expect(screen.queryByTestId('card-description')).toBeNull();
      expect(screen.queryByText('Confidential details here')).toBeNull();
    });

    it('renders description when card type allows notes storage', () => {
      const registry = SchemaRegistry.getInstance();
      registry.addCustomCardType({
        id: 'custom.open_notes',
        category: 'general',
        name: 'Open Notes Card',
        fields: [{ key: 'topic', label: 'Topic', type: 'text' }],
        storeNotes: true,
      });

      const card: LADObject = {
        object_id: 'obj_open',
        space_id: 'spc_1',
        title: 'Research Plan',
        description: 'Explore new literature and compile sources',
        domain: 'general',
        status: 'active',
        priority: 'medium',
        tags: [],
        version: 1,
        attributes: { card_type: 'custom.open_notes' },
        created_by: 'usr_1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockCtx: any = {
        updateObject: vi.fn(),
        deleteObject: vi.fn(),
        nodes: [],
        userRegistry: { user_id: 'usr_1', identities: [] },
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={mockCtx}>
            <ObjectCard obj={card} />
          </LADContext.Provider>
        </I18nProvider>
      );

      expect(screen.getByTestId('card-description')).toBeInTheDocument();
      expect(screen.getByText('Explore new literature and compile sources')).toBeInTheDocument();
    });
  });

  describe('5. SmartCaptureBar Capture with Notes Disabled', () => {
    it('omits raw_thought from suggestedAttributes when card type has notes disabled', async () => {
      const registry = SchemaRegistry.getInstance();
      registry.addCustomCardType({
        id: 'custom.anonymous_feedback',
        category: 'general',
        name: 'Anonymous Feedback',
        fields: [{ key: 'rating', label: 'Rating', type: 'text' }],
        nlp: {
          keywords: ['feedback', 'rating'],
        },
        storeNotes: false,
        noNotesStored: true,
      });

      const createObjectFromCapture = vi.fn().mockResolvedValue({} as any);

      const mockContext: any = {
        createObjectFromCapture,
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={mockContext}>
            <SmartCaptureBar />
          </LADContext.Provider>
        </I18nProvider>
      );

      const input = screen.getByPlaceholderText(/Type anything/i);
      fireEvent.change(input, {
        target: { value: 'Feedback rating 5 stars' },
      });

      await waitFor(() => {
        expect(screen.getByText(/Inferred Structure/i)).toBeInTheDocument();
      });

      // Submitting triggers inference confirmation modal
      fireEvent.submit(input.closest('form')!);

      await waitFor(() => {
        expect(screen.getByTestId('confirm-inference-button')).toBeInTheDocument();
      });

      // Confirm inference to save
      fireEvent.click(screen.getByTestId('confirm-inference-button'));

      await waitFor(() => {
        expect(createObjectFromCapture).toHaveBeenCalled();
        const callArgs = createObjectFromCapture.mock.calls[0][0];
        expect(callArgs.cardTypeId).toBe('custom.anonymous_feedback');
        // raw_thought should not be stored
        expect(callArgs.suggestedAttributes.raw_thought).toBeUndefined();
      });
    });
  });

  describe('6. SpaceSettingsView Card Type Badge', () => {
    it('shows No Notes badge for card types configured without notes storage', () => {
      const registry = SchemaRegistry.getInstance();
      registry.addCustomCardType({
        id: 'custom.no_notes_badge_test',
        category: 'finances',
        name: 'No Notes Test Type',
        fields: [{ key: 'amount', label: 'Amount', type: 'currency' }],
        storeNotes: false,
        noNotesStored: true,
      });

      const mockManifest: LADSpaceManifest = {
        lad_standard: '1.0',
        schema_version: '1.0.0',
        space_id: 'spc_settings_test',
        space_name: 'Test Space',
        created_by: 'usr_1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        categories: ['finances'],
      };

      const mockContext: any = {
        activeManifest: mockManifest,
        activeSpaceId: 'spc_settings_test',
        updateSpaceIdentity: vi.fn(),
        deleteSpace: vi.fn(),
        refreshSpaceState: vi.fn(),
        exportSpaceJson: vi.fn(),
        importSpaceJson: vi.fn(),
        objects: [],
        authService: {
          getState: () => ({ isAuthenticated: true, user: { email: 'me@gmail.com', provider: 'google' } }),
        },
        repairSpaceDriveFiles: vi.fn(),
        currentUserId: 'usr_1',
        userRegistry: { spaces: [{ space_id: 'spc_settings_test', role: 'owner' }] },
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={mockContext}>
            <SpaceSettingsView />
          </LADContext.Provider>
        </I18nProvider>
      );

      const badge = screen.getByTestId('card-type-no-notes-badge-custom.no_notes_badge_test');
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toBe('No Notes');
    });
  });

  describe('7. LADProvider createObjectFromCapture Integration', () => {
    it('creates object with empty description and clean attributes when card type disables notes', async () => {
      const registry = SchemaRegistry.getInstance();
      registry.addCustomCardType({
        id: 'custom.strict_no_notes',
        category: 'general',
        name: 'Strict No Notes Type',
        fields: [{ key: 'title', label: 'Title', type: 'text' }],
        storeNotes: false,
        noNotesStored: true,
      });

      let contextRef: any = null;

      const TestHarness = () => {
        const ctx = useLAD();
        contextRef = ctx;
        return <div data-testid="ready">{ctx.activeSpaceId || 'loading'}</div>;
      };

      render(
        <I18nProvider initialLocale="en">
          <LADProvider>
            <TestHarness />
          </LADProvider>
        </I18nProvider>
      );

      await waitFor(() => {
        expect(contextRef?.activeSpaceId).toBeTruthy();
      });

      // 1. Create card with notes disabled
      const objWithoutNotes = await contextRef.createObjectFromCapture({
        rawText: 'Secret note that must not be stored',
        title: 'Secret Item',
        domain: 'general',
        cardTypeId: 'custom.strict_no_notes',
        priority: 'medium',
        tags: [],
        extractedActions: [],
        extractedEntities: [],
        suggestedAttributes: { raw_thought: 'Secret note that must not be stored' },
        fieldValues: {},
      });

      expect(objWithoutNotes.title).toBe('Secret Item');
      expect(objWithoutNotes.description).toBe('');
      expect(objWithoutNotes.attributes.raw_thought).toBeUndefined();

      // 2. Create card with normal card type
      const objWithNotes = await contextRef.createObjectFromCapture({
        rawText: 'Normal note that should be kept',
        title: 'Normal Item',
        domain: 'general',
        cardTypeId: 'general.note',
        priority: 'medium',
        tags: [],
        extractedActions: [],
        extractedEntities: [],
        suggestedAttributes: { raw_thought: 'Normal note that should be kept' },
        fieldValues: {},
      });

      expect(objWithNotes.title).toBe('Normal Item');
      expect(objWithNotes.description).toBe('Normal note that should be kept');
    });
  });
});

