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

describe('Card Field Quick Editor Configuration & Inline Card Editing', () => {
  let registry: SchemaRegistry;

  beforeEach(() => {
    registry = SchemaRegistry.getInstance();
    registry.loadCustomCardTypes([]);
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithContext = (
    ui: React.ReactNode,
    customContext: Partial<any> = {}
  ) => {
    const defaultCtx = {
      objects: [],
      activeManifest: {
        space_id: 'spc_quick_edit_test',
        space_name: 'Quick Edit Test Space',
        storage_provider: 'local_indexeddb',
        created_at: '2026-09-01T00:00:00Z',
        settings: {},
      },
      syncState: {
        status: 'synced',
        pendingOpsCount: 0,
        lastSyncedAt: new Date().toISOString(),
      },
      spaces: [],
      switchSpace: vi.fn(),
      triggerSync: vi.fn(),
      userRegistry: {
        user_id: 'usr_local_me',
        identities: [
          {
            subject_id: 'usr_local_me',
            display_name: 'Gabriel Test',
            email: 'gabriel@example.com',
          },
        ],
      },
      nodes: [],
      activeAlerts: [],
      proposals: [],
      updateSpaceIdentity: vi.fn().mockResolvedValue(undefined),
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

  it('allows defining quickEdit on card fields in CardTypeEditorModal and persists it', async () => {
    const onSavedMock = vi.fn();
    const onCloseMock = vi.fn();

    renderWithContext(
      <CardTypeEditorModal
        isOpen={true}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />
    );

    // Set card type name
    const nameInput = screen.getByTestId('card-type-name-input');
    fireEvent.change(nameInput, { target: { value: 'Investment Account' } });

    // Verify quick edit checkbox is present for field 0 (Title) and field 1 (Comments)
    const field0QuickEdit = screen.getByTestId('field-quick-edit-checkbox-0');
    expect(field0QuickEdit).toBeDefined();

    // Add a new currency field for Balance
    const addFieldBtn = screen.getByTestId('add-field-button');
    fireEvent.click(addFieldBtn);

    // Label the new field
    const field2LabelInput = screen.getByDisplayValue('Field 3');
    fireEvent.change(field2LabelInput, { target: { value: 'Balance' } });

    // Enable quick editor on field 2
    const field2QuickEdit = screen.getByTestId('field-quick-edit-checkbox-2');
    fireEvent.click(field2QuickEdit);
    expect(field2QuickEdit).toBeChecked();

    // Click Save
    const saveBtn = screen.getByTestId('save-card-type-button');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSavedMock).toHaveBeenCalledTimes(1);
    });

    const savedDef: LADCardTypeDefinition = onSavedMock.mock.calls[0][0];
    expect(savedDef.name).toBe('Investment Account');
    const balanceField = savedDef.fields.find((f) => f.label === 'Balance');
    expect(balanceField).toBeDefined();
    expect(balanceField?.quickEdit).toBe(true);
  });

  it('renders quick editor on finances.account_balance and updates balance without full card modal', async () => {
    const mockUpdateObject = vi.fn().mockResolvedValue(undefined);

    const accountCard: LADObject = {
      object_id: 'obj_bank_card_1',
      space_id: 'spc_quick_edit_test',
      title: 'Chase Checking',
      domain: 'finances',
      tags: ['bank'],
      attributes: {
        card_type: 'finances.account_balance',
        bank: 'Chase',
        account_type: 'checking',
        balance: 1500,
      },
      priority: 'medium',
      status: 'active',
      created_by: 'usr_local_me',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    };

    renderWithContext(<ObjectCard obj={accountCard} />, {
      updateObject: mockUpdateObject,
    });

    // Verify initial balance is rendered
    expect(screen.getByText('$1,500.00')).toBeDefined();

    // Quick edit trigger should be visible for balance
    const quickEditTrigger = screen.getByTestId('quick-edit-trigger-balance');
    expect(quickEditTrigger).toBeDefined();

    // Click trigger to open inline quick editor
    fireEvent.click(quickEditTrigger);

    // Inline input should be visible with current balance
    const input = screen.getByTestId('quick-editor-input-balance') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.value).toBe('1500');

    // Change balance to 3750 and click Save
    fireEvent.change(input, { target: { value: '3750' } });
    const saveBtn = screen.getByTestId('quick-editor-save-balance');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateObject).toHaveBeenCalledWith(
        'obj_bank_card_1',
        {
          attributes: expect.objectContaining({
            card_type: 'finances.account_balance',
            bank: 'Chase',
            account_type: 'checking',
            balance: 3750,
          }),
        },
        true
      );
    });

    // Inline editor closes after save
    expect(screen.queryByTestId('quick-editor-input-balance')).toBeNull();
  });

  it('allows canceling inline quick edit without committing changes', async () => {
    const mockUpdateObject = vi.fn().mockResolvedValue(undefined);

    const accountCard: LADObject = {
      object_id: 'obj_bank_card_2',
      space_id: 'spc_quick_edit_test',
      title: 'Santander Savings',
      domain: 'finances',
      tags: ['bank'],
      attributes: {
        card_type: 'finances.account_balance',
        bank: 'Santander',
        balance: 5000,
      },
      priority: 'low',
      status: 'active',
      created_by: 'usr_local_me',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    };

    renderWithContext(<ObjectCard obj={accountCard} />, {
      updateObject: mockUpdateObject,
    });

    // Open quick editor
    const quickEditTrigger = screen.getByTestId('quick-edit-trigger-balance');
    fireEvent.click(quickEditTrigger);

    const input = screen.getByTestId('quick-editor-input-balance');
    fireEvent.change(input, { target: { value: '9999' } });

    // Click Cancel
    const cancelBtn = screen.getByTestId('quick-editor-cancel-balance');
    fireEvent.click(cancelBtn);

    // Verify input closes and updateObject was NOT called
    expect(screen.queryByTestId('quick-editor-input-balance')).toBeNull();
    expect(mockUpdateObject).not.toHaveBeenCalled();
    expect(screen.getByText('$5,000.00')).toBeDefined();
  });

  it('renders quick editor for custom card types with quickEdit: true on specific fields', async () => {
    const mockUpdateObject = vi.fn().mockResolvedValue(undefined);

    // Register a custom card type where only "hours_spent" is quick editable
    const projectCardType: LADCardTypeDefinition = {
      id: 'custom.projects.client_tracker',
      category: 'projects',
      name: 'Client Project Tracker',
      fields: [
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'client_name', label: 'Client Name', type: 'text', quickEdit: false },
        { key: 'hours_spent', label: 'Hours Spent', type: 'number', quickEdit: true },
        { key: 'status_tier', label: 'Tier', type: 'select', options: ['Bronze', 'Silver', 'Gold'], quickEdit: true },
      ],
      nlp: { keywords: ['client', 'project'] },
    };

    registry.addCustomCardType(projectCardType);

    const projectCard: LADObject = {
      object_id: 'obj_proj_1',
      space_id: 'spc_quick_edit_test',
      title: 'Acme Redesign',
      domain: 'projects',
      tags: ['client'],
      attributes: {
        card_type: 'custom.projects.client_tracker',
        client_name: 'Acme Corp',
        hours_spent: 12,
        status_tier: 'Silver',
      },
      priority: 'high',
      status: 'active',
      created_by: 'usr_local_me',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    };

    renderWithContext(<ObjectCard obj={projectCard} />, {
      updateObject: mockUpdateObject,
    });

    // Hours Spent (quickEdit: true) should have a trigger
    const hoursTrigger = screen.getByTestId('quick-edit-trigger-hours_spent');
    expect(hoursTrigger).toBeDefined();

    // Status Tier (quickEdit: true) should have a trigger
    const tierTrigger = screen.getByTestId('quick-edit-trigger-status_tier');
    expect(tierTrigger).toBeDefined();

    // Client Name (quickEdit: false) should NOT have a trigger
    expect(screen.queryByTestId('quick-edit-trigger-client_name')).toBeNull();

    // 1. Quick edit hours_spent
    fireEvent.click(hoursTrigger);
    const hoursInput = screen.getByTestId('quick-editor-input-hours_spent');
    fireEvent.change(hoursInput, { target: { value: '25' } });
    const hoursSave = screen.getByTestId('quick-editor-save-hours_spent');
    fireEvent.click(hoursSave);

    await waitFor(() => {
      expect(mockUpdateObject).toHaveBeenCalledWith(
        'obj_proj_1',
        {
          attributes: expect.objectContaining({
            hours_spent: 25,
          }),
        },
        true
      );
    });

    // 2. Quick edit status_tier (select dropdown)
    fireEvent.click(tierTrigger);
    const select = screen.getByTestId('quick-editor-input-status_tier');
    fireEvent.change(select, { target: { value: 'Gold' } });
    const tierSave = screen.getByTestId('quick-editor-save-status_tier');
    fireEvent.click(tierSave);

    await waitFor(() => {
      expect(mockUpdateObject).toHaveBeenCalledWith(
        'obj_proj_1',
        {
          attributes: expect.objectContaining({
            status_tier: 'Gold',
          }),
        },
        true
      );
    });
  });
});
