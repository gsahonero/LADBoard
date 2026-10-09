/**
 * Verification Tests:
 * 1. Board People Resolution & Autocomplete in Card Assigned To fields
 * 2. Assignee Notification & Attention System Alerts on Card Assignment
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { getPeopleInBoard } from '../core/people/board-people';
import { PersonAutocompleteInput } from '../ui/components/PersonAutocompleteInput';
import { CardEditModal } from '../ui/components/CardEditModal';
import { AttentionCard } from '../ui/components/AttentionCard';
import { AttentionView } from '../ui/views/AttentionView';
import { AssignmentToastBanner } from '../ui/components/AssignmentToastBanner';
import { LADContext } from '../ui/context/LADContext';
import { I18nProvider } from '../core/i18n/i18n-context';
import { LADGraphNode, LADObject, LADUserRegistry, LADSpaceManifest, LADActiveAlert } from '../core/standard/types';
import { ActiveEngine } from '../core/active/active-engine';
import { SchemaRegistry } from '../core/schemas/schema-registry';

describe('Board People Resolution (getPeopleInBoard)', () => {
  const mockNodes: LADGraphNode[] = [
    {
      node_id: 'node_usr_owner',
      type: 'user',
      label: 'Alice Owner',
      ref_id: 'usr_owner',
      metadata: { name: 'Alice Owner', role: 'owner', email: 'alice@example.com' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      node_id: 'node_usr_collab',
      type: 'user',
      label: 'bob@example.com',
      metadata: { role: 'editor', email: 'bob@example.com', invited_name: 'Bob Collaborator' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      node_id: 'node_person_dad',
      type: 'user',
      label: 'Dad',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      node_id: 'node_obj_1',
      type: 'object',
      label: 'Some Task',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockObjects: LADObject[] = [
    {
      object_id: 'obj_1',
      space_id: 'spc_1',
      title: 'Dr. Appointment',
      domain: 'health',
      tags: [],
      priority: 'high',
      status: 'active',
      created_by: 'usr_owner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      assigned_to: 'Dr. Smith',
      attributes: {},
    },
  ];

  const mockRegistry: LADUserRegistry = {
    lad_standard: '1.0',
    schema_version: '1.0.0',
    user_id: 'usr_me',
    identities: [
      {
        provider: 'local',
        email: 'me@example.com',
        subject_id: 'sub_me',
        display_name: 'Current User',
      },
    ],
    spaces: [],
    preferences: {
      locale: 'en',
      theme: 'light',
      change_commit_threshold_ms: 5000,
      active_evaluation_interval_ms: 10000,
    },
    device_metadata: { device_id: 'dev_1', platform: 'win32' },
    version: 1,
    updated_at: new Date().toISOString(),
  };

  const mockManifest: LADSpaceManifest = {
    lad_standard: '1.0',
    schema_version: '1.0.0',
    space_id: 'spc_1',
    space_name: 'Family Space',
    created_by: 'usr_owner',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('collects and deduplicates space members, graph user nodes, and existing assignees', () => {
    const people = getPeopleInBoard({
      nodes: mockNodes,
      objects: mockObjects,
      userRegistry: mockRegistry,
      activeManifest: mockManifest,
      currentUserEmail: 'me@example.com',
    });

    const names = people.map((p) => p.name);
    // Should include Current User (marked as isCurrentUser)
    expect(names).toContain('Current User');
    const current = people.find((p) => p.isCurrentUser);
    expect(current).toBeDefined();

    // Should include Alice Owner (role: owner)
    expect(names).toContain('Alice Owner');
    const owner = people.find((p) => p.name === 'Alice Owner');
    expect(owner?.role).toBe('owner');
    expect(owner?.email).toBe('alice@example.com');

    // Should include Bob Collaborator (from invited_name / email)
    expect(names).toContain('Bob Collaborator');

    // Should include Dad (from person node)
    expect(names).toContain('Dad');

    // Should include Dr. Smith (from existing card assigned_to)
    expect(names).toContain('Dr. Smith');
  });
});

describe('PersonAutocompleteInput Component', () => {
  const mockNodes: LADGraphNode[] = [
    {
      node_id: 'node_usr_alice',
      type: 'user',
      label: 'Alice Cooper',
      metadata: { name: 'Alice Cooper', role: 'owner', email: 'alice@rock.com' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      node_id: 'node_usr_bob',
      type: 'user',
      label: 'Bob Marley',
      metadata: { name: 'Bob Marley', role: 'editor', email: 'bob@reggae.com' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockLAD: any = {
    nodes: mockNodes,
    objects: [],
    userRegistry: {
      user_id: 'usr_me',
      identities: [{ display_name: 'Charlie Puth', email: 'charlie@music.com', provider: 'local', subject_id: 's' }],
    },
    activeManifest: { space_id: 'spc_1', space_name: 'Music Space' },
    authService: { getState: () => ({ isAuthenticated: false }) },
  };

  it('renders input and shows dropdown when focused', async () => {
    const onChange = vi.fn();
    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockLAD}>
          <PersonAutocompleteInput value="" onChange={onChange} placeholder="Assign someone..." />
        </LADContext.Provider>
      </I18nProvider>
    );

    const input = screen.getByPlaceholderText('Assign someone...');
    expect(input).toBeInTheDocument();

    // Focus input
    fireEvent.focus(input);

    // Dropdown emerges with board members
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Alice Cooper')).toBeInTheDocument();
    expect(screen.getByText('Bob Marley')).toBeInTheDocument();
    expect(screen.getByText('Charlie Puth')).toBeInTheDocument();
  });

  it('filters candidates as user types and selects candidate upon click', async () => {
    let currentValue = '';
    const onChange = vi.fn().mockImplementation((val) => {
      currentValue = val;
    });

    const { rerender } = render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockLAD}>
          <PersonAutocompleteInput value={currentValue} onChange={onChange} />
        </LADContext.Provider>
      </I18nProvider>
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Marley' } });
    expect(onChange).toHaveBeenCalledWith('Marley');

    // Update prop
    rerender(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockLAD}>
          <PersonAutocompleteInput value="Marley" onChange={onChange} />
        </LADContext.Provider>
      </I18nProvider>
    );

    // Only Bob Marley matches
    expect(screen.getByText('Bob Marley')).toBeInTheDocument();
    expect(screen.queryByText('Alice Cooper')).not.toBeInTheDocument();

    // Click on Bob Marley option
    fireEvent.click(screen.getByText('Bob Marley'));
    expect(onChange).toHaveBeenCalledWith('Bob Marley');
  });

  it('supports keyboard navigation (ArrowDown, Enter, Escape)', async () => {
    const onChange = vi.fn();
    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockLAD}>
          <PersonAutocompleteInput value="" onChange={onChange} />
        </LADContext.Provider>
      </I18nProvider>
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Press ArrowDown to highlight first candidate
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    // Press Enter to choose
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalled();

    // Dropdown closes
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('CardEditModal Autocomplete & Assignment Integration', () => {
  const testCard: LADObject = {
    object_id: 'obj_edit_test',
    space_id: 'spc_1',
    title: 'Review Project Proposal',
    domain: 'projects',
    tags: [],
    priority: 'high',
    status: 'active',
    created_by: 'usr_me',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
    assigned_to: 'Alice',
    attributes: {},
  };

  const mockNodes: LADGraphNode[] = [
    {
      node_id: 'node_usr_bob',
      type: 'user',
      label: 'Bob Builder',
      metadata: { name: 'Bob Builder', role: 'editor', email: 'bob@builder.com' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it('uses autocomplete in CardEditModal and updates assigned_to on save', async () => {
    const updateObject = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    const mockLAD: any = {
      nodes: mockNodes,
      objects: [testCard],
      userRegistry: { user_id: 'usr_me', identities: [{ display_name: 'Me' }] },
      activeManifest: { space_id: 'spc_1', space_name: 'Test Space' },
      authService: { getState: () => ({ isAuthenticated: false }) },
      updateObject,
    };

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockLAD}>
          <CardEditModal isOpen={true} onClose={onClose} obj={testCard} />
        </LADContext.Provider>
      </I18nProvider>
    );

    const assignedInput = screen.getByTestId('edit-modal-assigned-to-input');
    expect(assignedInput).toHaveValue('Alice');

    // Change assignee to Bob Builder
    fireEvent.focus(assignedInput);
    fireEvent.change(assignedInput, { target: { value: 'Bob' } });

    // Pick Bob Builder from suggestions
    const option = await screen.findByText('Bob Builder');
    fireEvent.click(option);

    expect(assignedInput).toHaveValue('Bob Builder');

    // Click Save Changes
    const saveBtn = screen.getByTestId('save-card-edit-button');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateObject).toHaveBeenCalledWith(
        'obj_edit_test',
        expect.objectContaining({
          assigned_to: 'Bob Builder',
        }),
        true
      );
      expect(onClose).toHaveBeenCalled();
    });
  });
});

describe('Assignment Attention Alerts & Toast Notifications', () => {
  it('renders card_assignment alert in AttentionCard with assignment visual styling', () => {
    const mockAlert: LADActiveAlert = {
      alert_id: 'alert_assign_123',
      space_id: 'spc_1',
      type: 'card_assignment',
      target_id: 'obj_123',
      title: 'Card Assigned: Fix Navigation Bug',
      message: 'Alice Cooper has been assigned to "Fix Navigation Bug".',
      domain: 'projects',
      status: 'active',
      created_at: new Date().toISOString(),
      metadata: {
        assigned_to: 'Alice Cooper',
      },
    };

    const mockLAD: any = {
      objects: [{ object_id: 'obj_123', title: 'Fix Navigation Bug', domain: 'projects' }],
      updateObject: vi.fn(),
      dismissAlert: vi.fn(),
      snoozeAlert: vi.fn(),
    };

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockLAD}>
          <AttentionCard alert={mockAlert} />
        </LADContext.Provider>
      </I18nProvider>
    );

    expect(screen.getByText('Card Assigned: Fix Navigation Bug')).toBeInTheDocument();
    expect(screen.getByText('Assigned to Alice Cooper')).toBeInTheDocument();
    expect(screen.getByText('Alice Cooper has been assigned to "Fix Navigation Bug".')).toBeInTheDocument();
  });

  it('renders card_assignment alert in AttentionView', () => {
    const mockAlert: LADActiveAlert = {
      alert_id: 'alert_assign_456',
      space_id: 'spc_1',
      type: 'card_assignment',
      target_id: 'obj_456',
      title: 'Card Assigned: Budget Review',
      message: 'Bob has been assigned to "Budget Review".',
      domain: 'finances',
      status: 'active',
      created_at: new Date().toISOString(),
      metadata: { assigned_to: 'Bob' },
    };

    const mockLAD: any = {
      activeAlerts: [mockAlert],
      proposals: [],
      dismissAlert: vi.fn(),
      snoozeAlert: vi.fn(),
      updateObject: vi.fn(),
    };

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockLAD}>
          <AttentionView />
        </LADContext.Provider>
      </I18nProvider>
    );

    expect(screen.getByText('Card Assigned: Budget Review')).toBeInTheDocument();
    expect(screen.getByText('Bob has been assigned to "Budget Review".')).toBeInTheDocument();
  });

  it('renders AssignmentToastBanner when an assignment notification is active', () => {
    const dismissNotification = vi.fn();
    const mockLAD: any = {
      assignmentNotification: {
        cardId: 'obj_1',
        cardTitle: 'Weekly Groceries',
        assigneeName: 'Dad',
        timestamp: Date.now(),
      },
      dismissAssignmentNotification: dismissNotification,
    };

    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockLAD}>
          <AssignmentToastBanner />
        </LADContext.Provider>
      </I18nProvider>
    );

    expect(screen.getByTestId('assignment-toast-container')).toBeInTheDocument();
    expect(screen.getByText('Card Assigned')).toBeInTheDocument();
    expect(screen.getByText('Dad')).toBeInTheDocument();

    // Clicking dismiss button
    const dismissBtn = screen.getByTestId('dismiss-assignment-toast');
    fireEvent.click(dismissBtn);
    expect(dismissNotification).toHaveBeenCalled();
  });

  it('preserves active assignment alerts in ActiveEngine during object evaluation', () => {
    const engine = new ActiveEngine('spc_test');

    const testObject: LADObject = {
      object_id: 'obj_eval',
      space_id: 'spc_test',
      title: 'Active Task',
      domain: 'general',
      tags: [],
      priority: 'medium',
      status: 'active',
      created_by: 'usr_me',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      attributes: {},
    };

    // Add custom assignment alert
    engine.addCustomAlert({
      alert_id: 'alert_assign_obj_eval',
      space_id: 'spc_test',
      type: 'card_assignment',
      target_id: 'obj_eval',
      title: 'Card Assigned: Active Task',
      message: 'Alice was assigned to Active Task.',
      status: 'active',
      created_at: new Date().toISOString(),
      metadata: { assigned_to: 'Alice' },
    });

    expect(engine.getActiveAlerts().length).toBe(1);

    // Evaluate objects
    engine.evaluateObjects([testObject]);

    // Active assignment alert must remain preserved
    const remainingAlerts = engine.getActiveAlerts();
    expect(remainingAlerts.some((a) => a.alert_id === 'alert_assign_obj_eval')).toBe(true);
  });
});
