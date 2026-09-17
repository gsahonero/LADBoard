import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SmartCaptureBar } from '../ui/components/SmartCaptureBar';
import { ObjectCard } from '../ui/components/ObjectCard';
import { OnItsWayModal } from '../ui/components/OnItsWayModal';
import { LivingBoardView } from '../ui/views/LivingBoardView';
import { CardTypeEditorModal } from '../ui/components/CardTypeEditorModal';
import { CardEditModal } from '../ui/components/CardEditModal';
import { SchemaRegistry } from '../core/schemas/schema-registry';
import { I18nProvider } from '../core/i18n/i18n-context';
import { LADContext } from '../ui/context/LADContext';
import { LADObject } from '../core/standard/types';
import { CaptureParser } from '../core/objects/capture-parser';

describe('Card & Capture UI Automated Test Suite', () => {
  it('displays real-time live token badges in SmartCaptureBar as user types Bank query', async () => {
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
      target: { value: 'Bank A checking account new balance is $19' },
    });

    await waitFor(() => {
      expect(screen.getByText(/Inferred Structure/i)).toBeInTheDocument();
      expect(screen.getByText('Account Balance')).toBeInTheDocument();
      expect(screen.getByText('Bank: Bank A')).toBeInTheDocument();
      expect(screen.getByText('$19')).toBeInTheDocument();
    });

    // Submitting form triggers confirmation modal since finer details were not manually changed
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByTestId('card-inference-confirm-modal')).toBeInTheDocument();
      expect(screen.getByText(/Confirm Inferred Card/i)).toBeInTheDocument();
      expect(screen.getByText(/Bank A checking account new balance is \$19/i)).toBeInTheDocument();
    });

    // Confirming on modal saves the inferred card
    const confirmBtn = screen.getByTestId('confirm-inference-button');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(createObjectFromCapture).toHaveBeenCalled();
      const callArgs = createObjectFromCapture.mock.calls[0][0];
      expect(callArgs.domain).toBe('finances');
      expect(callArgs.cardTypeId).toBe('finances.account_balance');
      expect(callArgs.suggestedAttributes.bank).toBe('Bank A');
      expect(callArgs.suggestedAttributes.balance).toBe(19);
    });
  });

  it('renders interactive groceries checklist and allows toggling items on the card', async () => {
    const updateObject = vi.fn().mockResolvedValue({} as any);
    const deleteObject = vi.fn().mockResolvedValue({} as any);

    const mockContext: any = {
      updateObject,
      deleteObject,
    };

    const groceryCard: LADObject = {
      object_id: 'obj_grocery_01',
      space_id: 'spc_test',
      title: 'Weekly Supermarket Groceries',
      domain: 'shopping',
      tags: ['shopping'],
      attributes: {
        card_type: 'shopping.groceries_buying',
        checklist: [
          { id: 'item_1', text: 'Whole Milk', completed: false },
          { id: 'item_2', text: 'Sourdough Bread', completed: false },
          { id: 'item_3', text: 'Free Range Eggs', completed: false },
        ],
        estimated_budget: 40,
      },
      priority: 'medium',
      status: 'active',
      created_by: 'usr_1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    };

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext}>
          <ObjectCard obj={groceryCard} />
        </LADContext.Provider>
      </I18nProvider>
    );

    expect(screen.getByText('Weekly Supermarket Groceries')).toBeInTheDocument();
    expect(screen.getByText('0 / 3 done')).toBeInTheDocument();
    expect(screen.getByText('Whole Milk')).toBeInTheDocument();
    expect(screen.getByText('Budget: $40')).toBeInTheDocument();

    // Toggle first checklist item
    const firstItem = screen.getByTestId('checklist-item-0');
    fireEvent.click(firstItem);

    await waitFor(() => {
      expect(updateObject).toHaveBeenCalled();
      const patch = updateObject.mock.calls[0][1];
      expect(patch.attributes.checklist[0].completed).toBe(true);
    });
  });

  it('handles OnItsWayModal resolution and transitions card to archived when marked complete', async () => {
    const updateObject = vi.fn().mockResolvedValue({} as any);

    const mockContext: any = {
      updateObject,
    };

    const appointmentCard: LADObject = {
      object_id: 'obj_med_01',
      space_id: 'spc_test',
      title: 'Dentistry Appointment (Carlos)',
      domain: 'health',
      tags: ['health'],
      attributes: {
        card_type: 'health.medical_appointment',
        specialty: 'Dentistry',
        patient: 'Carlos',
        outcome: 'Cavity filled and cleaned',
        needs_followup: true,
        followup: {
          date: '2026-10-01',
          reason: 'Checkup for cavity filling',
          status: 'pending',
        },
      },
      priority: 'medium',
      status: 'active',
      created_by: 'usr_1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    };

    const handleClose = vi.fn();

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext}>
          <OnItsWayModal
            isOpen={true}
            onClose={handleClose}
            obj={appointmentCard}
          />
        </LADContext.Provider>
      </I18nProvider>
    );

    expect(screen.getByTestId('on-its-way-modal')).toBeInTheDocument();
    expect(screen.getByText('Dentistry Appointment (Carlos)')).toBeInTheDocument();

    // Click "Handled / Completed"
    const completeButton = screen.getByTestId('action-complete');
    fireEvent.click(completeButton);

    // Confirm resolution
    const confirmButton = screen.getByTestId('confirm-resolution-button');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(updateObject).toHaveBeenCalled();
      const patch = updateObject.mock.calls[0][1];
      expect(patch.status).toBe('archived');
      expect(patch.attributes.followup.status).toBe('resolved');
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('renders searchable Archive section in LivingBoardView and supports 1-click restore to board', async () => {
    const updateObject = vi.fn().mockResolvedValue({} as any);
    const deleteObject = vi.fn().mockResolvedValue({} as any);

    const activeCard: LADObject = {
      object_id: 'obj_active',
      space_id: 'spc_test',
      title: 'Active Task On Board',
      domain: 'projects',
      tags: [],
      attributes: {},
      priority: 'medium',
      status: 'active',
      created_by: 'usr_1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    };

    const archivedCard: LADObject = {
      object_id: 'obj_archived',
      space_id: 'spc_test',
      title: 'Historical Bank Account Snapshot',
      domain: 'finances',
      tags: ['finances'],
      attributes: {
        card_type: 'finances.account_balance',
        bank: 'Bank A',
        balance: 19,
      },
      priority: 'medium',
      status: 'archived',
      created_by: 'usr_1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    };

    const mockContext: any = {
      objects: [activeCard, archivedCard],
      activeAlerts: [],
      proposals: [],
      updateObject,
      deleteObject,
      createObjectFromCapture: vi.fn(),
    };

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext}>
          <LivingBoardView />
        </LADContext.Provider>
      </I18nProvider>
    );

    // Active card is visible initially, archived card is not
    expect(screen.getByText('Active Task On Board')).toBeInTheDocument();
    expect(screen.queryByText('Historical Bank Account Snapshot')).not.toBeInTheDocument();

    // Toggle to Archive view
    const archiveToggle = screen.getByTestId('archive-toggle-button');
    fireEvent.click(archiveToggle);

    // Archived card is now visible, active card is hidden
    await waitFor(() => {
      expect(screen.getByText('Historical Bank Account Snapshot')).toBeInTheDocument();
      expect(screen.queryByText('Active Task On Board')).not.toBeInTheDocument();
      expect(screen.getByText(/Passive and completed cards are non-destructively preserved here/i)).toBeInTheDocument();
    });

    // Search inside archive
    const searchInput = screen.getByTestId('archive-search-input');
    fireEvent.change(searchInput, { target: { value: 'Historical' } });
    expect(screen.getByText('Historical Bank Account Snapshot')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Nonexistent query' } });
    expect(screen.getByText('No archived items found.')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: '' } });

    // Restore card to active board
    const restoreButton = screen.getByTestId('restore-to-board-button');
    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(updateObject).toHaveBeenCalledWith(
        'obj_archived',
        expect.objectContaining({ status: 'active' }),
        true
      );
    });
  });

  it('allows creating and modifying custom card types via CardTypeEditorModal', async () => {
    const updateSpaceIdentity = vi.fn().mockResolvedValue(true);
    const onSaved = vi.fn();
    const onClose = vi.fn();

    const mockContext: any = {
      activeManifest: {
        space_id: 'space_test_1',
        space_name: 'Test Space',
        settings: {},
      },
      updateSpaceIdentity,
    };

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext}>
          <CardTypeEditorModal
            isOpen={true}
            onClose={onClose}
            defaultCategory="health"
            onSaved={onSaved}
          />
        </LADContext.Provider>
      </I18nProvider>
    );

    expect(screen.getByText('Create New Card Type')).toBeInTheDocument();

    // Fill in Card Type Name
    const nameInput = screen.getByTestId('card-type-name-input');
    fireEvent.change(nameInput, { target: { value: 'Pet Vaccination' } });

    // Add another field
    const addFieldBtn = screen.getByTestId('add-field-button');
    fireEvent.click(addFieldBtn);

    // Save Card Type
    const saveBtn = screen.getByTestId('save-card-type-button');
    fireEvent.click(saveBtn);

    let savedDefinition: any;
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
      savedDefinition = onSaved.mock.calls[0][0];
      expect(savedDefinition.name).toBe('Pet Vaccination');
      expect(savedDefinition.category).toBe('health');
      expect(savedDefinition.fields.length).toBe(3); // 2 default fields + 1 added
      expect(updateSpaceIdentity).toHaveBeenCalledWith(
        'space_test_1',
        expect.objectContaining({
          settings: expect.objectContaining({
            custom_card_types: expect.any(Array),
          }),
        })
      );
      expect(onClose).toHaveBeenCalled();
    });

    // Check that SchemaRegistry now contains the new card type
    const registered = SchemaRegistry.getInstance().getCardType(savedDefinition.id);
    expect(registered).toBeDefined();
    expect(registered?.name).toBe('Pet Vaccination');
  });

  it('triggers confirmation modal when finer details are untouched and returns to finer details view when declined', async () => {
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
      target: { value: 'Doctor says continue meds, blood test in 2 weeks, dad schedules follow-up' },
    });

    await waitFor(() => {
      expect(screen.getByText(/Inferred Structure/i)).toBeInTheDocument();
    });

    // Submitting with untouched finer details triggers confirmation modal
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByTestId('card-inference-confirm-modal')).toBeInTheDocument();
      expect(
        screen.getByText(/Doctor says continue meds, blood test in 2 weeks, dad schedules follow-up/i)
      ).toBeInTheDocument();
    });

    // Declining on modal returns to finer details view
    const declineBtn = screen.getByTestId('decline-inference-button');
    fireEvent.click(declineBtn);

    // Modal is now closed and finer details drawer is open
    await waitFor(() => {
      expect(screen.queryByTestId('card-inference-confirm-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('finer-details-drawer')).toBeInTheDocument();
      expect(screen.getByTestId('finer-details-title-input')).toBeInTheDocument();
    });

    // User modifies card title in finer details
    const titleInput = screen.getByTestId('finer-details-title-input');
    fireEvent.change(titleInput, { target: { value: 'Custom Health Plan (Dad)' } });

    // Submitting now directly saves without re-prompting confirmation modal
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(createObjectFromCapture).toHaveBeenCalled();
      const callArgs = createObjectFromCapture.mock.calls[0][0];
      expect(callArgs.title).toBe('Custom Health Plan (Dad)');
      expect(callArgs.suggestedAttributes.raw_thought).toBe(
        'Doctor says continue meds, blood test in 2 weeks, dad schedules follow-up'
      );
    });
  });

  it('saves directly without confirmation modal when user modifies finer details before submitting', async () => {
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
      target: { value: 'Bank A checking account new balance is $19' },
    });

    await waitFor(() => {
      expect(screen.getByText(/Fine-tune details/i)).toBeInTheDocument();
    });

    // Open finer details drawer
    fireEvent.click(screen.getByText(/Fine-tune details/i));
    expect(screen.getByTestId('finer-details-drawer')).toBeInTheDocument();

    // Modify title in finer details
    const titleInput = screen.getByTestId('finer-details-title-input');
    fireEvent.change(titleInput, { target: { value: 'Emergency Checking Balance' } });

    // Submit form
    fireEvent.submit(input.closest('form')!);

    // Should save directly without modal
    await waitFor(() => {
      expect(screen.queryByTestId('card-inference-confirm-modal')).not.toBeInTheDocument();
      expect(createObjectFromCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Emergency Checking Balance',
          domain: 'finances',
        })
      );
    });
  });

  it('supports dropdown options with spaces in CardTypeEditorModal and extracts them in CaptureParser', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    const updateSpaceIdentity = vi.fn().mockResolvedValue(undefined);

    const mockContext: any = {
      activeManifest: {
        space_id: 'space_test_spaces',
        space_name: 'Test Space',
      },
      updateSpaceIdentity,
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

    // Set card type name
    const nameInput = screen.getByTestId('card-type-name-input');
    fireEvent.change(nameInput, { target: { value: 'Investment Accounts' } });

    // Set keywords for NLP detection
    const keywordsInput = screen.getByPlaceholderText(/e\.g\. vaccine, pet, vet, booster/i);
    fireEvent.change(keywordsInput, { target: { value: 'investment, fidelity, portfolio' } });

    // Change field 2 (comments) data type to 'select'
    const selects = screen.getAllByRole('combobox');
    const fieldTypeSelect = selects[selects.length - 1]; // Last data type select
    fireEvent.change(fieldTypeSelect, { target: { value: 'select' } });

    // The options input should now be visible
    const optionsInput = screen.getByPlaceholderText(/Checking Account, Savings Account/i);
    expect(optionsInput).toBeInTheDocument();

    // Type options with multiple spaces
    fireEvent.change(optionsInput, {
      target: { value: 'High Yield Savings, Traditional IRA, Premium Checking' },
    });

    // Verify option pill badges are rendered with spaces intact
    expect(screen.getByText('High Yield Savings')).toBeInTheDocument();
    expect(screen.getByText('Traditional IRA')).toBeInTheDocument();
    expect(screen.getByText('Premium Checking')).toBeInTheDocument();

    // Remove "Traditional IRA" using the badge remove button
    const removeBtn = screen.getByTitle('Remove "Traditional IRA"');
    fireEvent.click(removeBtn);
    expect(screen.queryByText('Traditional IRA')).not.toBeInTheDocument();

    // Save Card Type
    const saveBtn = screen.getByTestId('save-card-type-button');
    fireEvent.click(saveBtn);

    let savedDef: any;
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
      savedDef = onSaved.mock.calls[0][0];
      const selectField = savedDef.fields.find((f: any) => f.type === 'select');
      expect(selectField).toBeDefined();
      expect(selectField.options).toEqual(['High Yield Savings', 'Premium Checking']);
      expect(selectField.options[0]).toBe('High Yield Savings'); // Spaces preserved!
    });

    // Test that CaptureParser extracts the multi-word option with spaces from raw text
    const parsed = CaptureParser.parse(
      'Investment portfolio at Fidelity High Yield Savings deposit $5400',
      new Date('2026-09-17')
    );
    expect(parsed.cardTypeId).toBe(savedDef.id);
    expect(parsed.fieldValues?.comments).toBe('High Yield Savings');
  });

  it('allows fully editing card fields according to its type and category on the space board via CardEditModal', async () => {
    const updateObject = vi.fn().mockResolvedValue({} as any);

    const mockContext: any = {
      updateObject,
      deleteObject: vi.fn(),
    };

    const initialCard: LADObject = {
      object_id: 'obj_edit_demo',
      space_id: 'spc_demo',
      title: 'Chase Checking',
      domain: 'finances',
      priority: 'medium',
      due_date: '2026-10-05',
      assigned_to: 'Alice',
      tags: ['banking'],
      attributes: {
        card_type: 'finances.account_balance',
        bank: 'Chase',
        account_type: 'checking',
        balance: 250,
      },
      status: 'active',
      created_by: 'usr_1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    };

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext}>
          <ObjectCard obj={initialCard} />
        </LADContext.Provider>
      </I18nProvider>
    );

    // Initial card rendering
    expect(screen.getByText('Chase Checking')).toBeInTheDocument();
    expect(screen.getByText('Account Balance')).toBeInTheDocument();
    expect(screen.getByText('Chase')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();

    // Click Edit button
    const editBtn = screen.getByTestId('edit-card-button');
    fireEvent.click(editBtn);

    // CardEditModal should now be open
    expect(screen.getByTestId('card-edit-modal')).toBeInTheDocument();
    expect(screen.getByText('Edit Card Details')).toBeInTheDocument();

    // Verify current fields populated according to schema
    const titleInput = screen.getByTestId('edit-title-input');
    expect(titleInput).toHaveValue('Chase Checking');

    // Update title
    fireEvent.change(titleInput, { target: { value: 'Chase Primary Checking' } });

    // Update balance
    const balanceInput = screen.getByTestId('field-currency-balance');
    fireEvent.change(balanceInput, { target: { value: '1450.75' } });

    // Update account type dropdown (select field with spaces / options)
    const accountTypeSelect = screen.getByTestId('field-select-account_type');
    fireEvent.change(accountTypeSelect, { target: { value: 'savings' } });

    // Click Save Changes
    const saveBtn = screen.getByTestId('save-card-edit-button');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateObject).toHaveBeenCalledWith(
        'obj_edit_demo',
        expect.objectContaining({
          title: 'Chase Primary Checking',
          domain: 'finances',
          attributes: expect.objectContaining({
            card_type: 'finances.account_balance',
            bank: 'Chase',
            balance: 1450.75,
            account_type: 'savings',
          }),
        }),
        true
      );
    });
  });

  it('allows switching card category and card type during edition, dynamically adapting schema fields', async () => {
    const updateObject = vi.fn().mockResolvedValue({} as any);

    const mockContext: any = {
      updateObject,
      deleteObject: vi.fn(),
    };

    const generalCard: LADObject = {
      object_id: 'obj_switch_demo',
      space_id: 'spc_demo',
      title: 'Doctor Follow-Up Note',
      domain: 'general',
      priority: 'medium',
      attributes: {},
      status: 'active',
      tags: [],
      created_by: 'usr_1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    };

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext}>
          <ObjectCard obj={generalCard} />
        </LADContext.Provider>
      </I18nProvider>
    );

    // Click Edit button
    fireEvent.click(screen.getByTestId('edit-card-button'));

    // Switch Category to Health
    const healthCatBtn = screen.getByTestId('edit-cat-health');
    fireEvent.click(healthCatBtn);

    // Health card type button should appear and be selected
    const medApptBtn = screen.getByTestId('edit-cardtype-health.medical_appointment');
    expect(medApptBtn).toBeInTheDocument();

    // The dynamic fields for medical appointment should now be rendered
    const specialtySelect = screen.getByTestId('field-select-specialty');
    expect(specialtySelect).toBeInTheDocument();

    // Select specialty with spaces ("General Medicine" or "Dentistry")
    fireEvent.change(specialtySelect, { target: { value: 'Dentistry' } });

    // Set Patient field
    const patientInput = screen.getByTestId('field-person-patient');
    fireEvent.change(patientInput, { target: { value: 'Carlos' } });

    // Save Changes
    fireEvent.click(screen.getByTestId('save-card-edit-button'));

    await waitFor(() => {
      expect(updateObject).toHaveBeenCalledWith(
        'obj_switch_demo',
        expect.objectContaining({
          domain: 'health',
          attributes: expect.objectContaining({
            card_type: 'health.medical_appointment',
            specialty: 'Dentistry',
            patient: 'Carlos',
          }),
        }),
        true
      );
    });
  });

  it('disables save button and displays progress indicator when saving card type in CardTypeEditorModal', async () => {
    let resolveSavePromise: (val: any) => void;
    const updateSpaceIdentity = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolveSavePromise = resolve;
      });
    });
    const onSaved = vi.fn();
    const onClose = vi.fn();

    const mockContext: any = {
      activeManifest: {
        space_id: 'space_async_save',
        space_name: 'Async Space',
        settings: {},
      },
      updateSpaceIdentity,
    };

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext}>
          <CardTypeEditorModal
            isOpen={true}
            onClose={onClose}
            defaultCategory="general"
            onSaved={onSaved}
          />
        </LADContext.Provider>
      </I18nProvider>
    );

    const nameInput = screen.getByTestId('card-type-name-input');
    fireEvent.change(nameInput, { target: { value: 'Interactive Card Type' } });

    const saveBtn = screen.getByTestId('save-card-type-button');
    expect(saveBtn).not.toBeDisabled();
    expect(screen.queryByTestId('save-card-type-spinner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('save-card-type-progress')).not.toBeInTheDocument();

    // Click Save Card Type
    fireEvent.click(saveBtn);

    // Save button must immediately become disabled and show progress indicator
    expect(saveBtn).toBeDisabled();
    expect(saveBtn).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('save-card-type-spinner')).toBeInTheDocument();
    expect(screen.getByTestId('save-card-type-progress')).toBeInTheDocument();
    expect(screen.getByText('Saving Card Type...')).toBeInTheDocument();
    expect(screen.getByText('Syncing schema with space...')).toBeInTheDocument();

    // Subsequent clicks should be ignored while saving
    fireEvent.click(saveBtn);
    expect(updateSpaceIdentity).toHaveBeenCalledTimes(1);

    // Resolve the async save operation
    resolveSavePromise!(true);

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('disables save button and displays progress indicator when saving card edits in CardEditModal', async () => {
    let resolveUpdatePromise: (val: any) => void;
    const updateObject = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolveUpdatePromise = resolve;
      });
    });
    const onClose = vi.fn();

    const testCard: LADObject = {
      object_id: 'obj_progress_test',
      space_id: 'spc_test',
      title: 'Original Title',
      domain: 'general',
      tags: [],
      priority: 'medium',
      status: 'active',
      created_by: 'usr_1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    };

    const mockContext: any = {
      updateObject,
    };

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext}>
          <CardEditModal
            isOpen={true}
            onClose={onClose}
            obj={testCard}
          />
        </LADContext.Provider>
      </I18nProvider>
    );

    const saveBtn = screen.getByTestId('save-card-edit-button');
    expect(saveBtn).not.toBeDisabled();
    expect(screen.queryByTestId('save-card-edit-spinner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('save-card-edit-progress')).not.toBeInTheDocument();

    // Click Save Changes
    fireEvent.click(saveBtn);

    // Must be disabled and show progress indicator
    expect(saveBtn).toBeDisabled();
    expect(saveBtn).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('save-card-edit-spinner')).toBeInTheDocument();
    expect(screen.getByTestId('save-card-edit-progress')).toBeInTheDocument();
    expect(screen.getByText('Saving Changes...')).toBeInTheDocument();

    // Resolve update
    resolveUpdatePromise!(true);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
