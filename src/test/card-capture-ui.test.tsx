import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SmartCaptureBar } from '../ui/components/SmartCaptureBar';
import { ObjectCard } from '../ui/components/ObjectCard';
import { OnItsWayModal } from '../ui/components/OnItsWayModal';
import { LivingBoardView } from '../ui/views/LivingBoardView';
import { I18nProvider } from '../core/i18n/i18n-context';
import { LADContext } from '../ui/context/LADContext';
import { LADObject } from '../core/standard/types';

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

    // Submitting form invokes createObjectFromCapture with extracted slots
    fireEvent.submit(input.closest('form')!);

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
});
