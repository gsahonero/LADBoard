import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SchemaRegistry } from '../core/schemas/schema-registry';
import { DEFAULT_CARD_TYPES } from '../core/schemas/default-card-types';
import { LADCardTypeDefinition } from '../core/schemas/card-types';
import { CardTypeEditorModal } from '../ui/components/CardTypeEditorModal';
import { ObjectCard } from '../ui/components/ObjectCard';
import { LADObject } from '../core/standard/types';
import { I18nProvider } from '../core/i18n/i18n-context';
import { LADContext } from '../ui/context/LADContext';

describe('Board Card Visualization Configuration', () => {

  describe('Default Card Type Visualization Schemas', () => {
    it('finances.account_balance has visualization configured to hide checkbox and show hero balance', () => {
      const financeType = DEFAULT_CARD_TYPES.find((t) => t.id === 'finances.account_balance');
      expect(financeType).toBeDefined();
      expect(financeType?.visualization).toEqual({
        showCheckbox: false,
        showDescription: true,
        primaryFieldKey: 'balance',
        badgeFieldKey: 'account_type',
        visibleFieldKeys: ['bank', 'account_type', 'balance', 'comments'],
      });
    });

    it('shopping.groceries_buying has visualization configured to show checkbox and description', () => {
      const groceryType = DEFAULT_CARD_TYPES.find((t) => t.id === 'shopping.groceries_buying');
      expect(groceryType).toBeDefined();
      expect(groceryType?.visualization?.showCheckbox).toBe(true);
      expect(groceryType?.visualization?.showDescription).toBe(true);
    });

    it('health.medical_appointment has visualization configured with specialty badge and no checkbox', () => {
      const healthType = DEFAULT_CARD_TYPES.find((t) => t.id === 'health.medical_appointment');
      expect(healthType).toBeDefined();
      expect(healthType?.visualization?.showCheckbox).toBe(false);
      expect(healthType?.visualization?.badgeFieldKey).toBe('specialty');
    });
  });

  describe('CardTypeEditorModal Visualization Settings', () => {
    it('renders visualization section with toggles and selectors and saves configured visualization', async () => {
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
              defaultCategory="general"
              onSaved={onSaved}
            />
          </LADContext.Provider>
        </I18nProvider>
      );

      // Verify visualization section exists
      expect(screen.getByTestId('card-visualization-section')).toBeInTheDocument();

      // Enter card type name
      const nameInput = screen.getByTestId('card-type-name-input');
      fireEvent.change(nameInput, { target: { value: 'Investment Metric' } });

      // Checkbox is true by default for general category
      const checkboxToggle = screen.getByTestId('visualization-show-checkbox-toggle') as HTMLInputElement;
      expect(checkboxToggle.checked).toBe(true);
      fireEvent.click(checkboxToggle);
      expect(checkboxToggle.checked).toBe(false);

      // Uncheck "Show Notes / Description"
      const descToggle = screen.getByTestId('visualization-show-description-toggle') as HTMLInputElement;
      expect(descToggle.checked).toBe(true);
      fireEvent.click(descToggle);
      expect(descToggle.checked).toBe(false);

      // Add a field 'portfolio_value'
      const addFieldBtn = screen.getByTestId('add-field-button');
      fireEvent.click(addFieldBtn);

      const fieldLabelInputs = screen.getAllByPlaceholderText(/e\.g\. Field Name/i);
      const lastLabelInput = fieldLabelInputs[fieldLabelInputs.length - 1];
      fireEvent.change(lastLabelInput, { target: { value: 'Portfolio Value' } });

      // Set primary hero highlight field
      const primarySelect = screen.getByTestId('visualization-primary-field-select');
      fireEvent.change(primarySelect, { target: { value: 'portfolio_value' } });

      // Save
      const saveBtn = screen.getByTestId('save-card-type-button');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalled();
        const saved: LADCardTypeDefinition = onSaved.mock.calls[0][0];
        expect(saved.visualization).toBeDefined();
        expect(saved.visualization?.showCheckbox).toBe(false);
        expect(saved.visualization?.showDescription).toBe(false);
        expect(saved.visualization?.primaryFieldKey).toBe('portfolio_value');
      });
    });

    it('loads existing visualization config when editing an existing card type', () => {
      const existingCardType: LADCardTypeDefinition = {
        id: 'finances.existing_metric',
        category: 'finances',
        name: 'Existing Metric Tracker',
        fields: [
          { key: 'balance', label: 'Balance', type: 'currency' },
          { key: 'bank_name', label: 'Bank Name', type: 'text' },
        ],
        visualization: {
          showCheckbox: false,
          showDescription: false,
          primaryFieldKey: 'balance',
          badgeFieldKey: 'bank_name',
          visibleFieldKeys: ['balance'],
        },
      };

      const mockContext: any = {
        activeManifest: { space_id: 'test-space', settings: {} },
        updateSpaceIdentity: vi.fn().mockResolvedValue(undefined),
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={mockContext}>
            <CardTypeEditorModal
              isOpen={true}
              onClose={vi.fn()}
              cardType={existingCardType}
              onSaved={vi.fn()}
            />
          </LADContext.Provider>
        </I18nProvider>
      );

      const checkboxToggle = screen.getByTestId('visualization-show-checkbox-toggle') as HTMLInputElement;
      expect(checkboxToggle.checked).toBe(false);

      const descToggle = screen.getByTestId('visualization-show-description-toggle') as HTMLInputElement;
      expect(descToggle.checked).toBe(false);

      const primarySelect = screen.getByTestId('visualization-primary-field-select') as HTMLSelectElement;
      expect(primarySelect.value).toBe('balance');

      const badgeSelect = screen.getByTestId('visualization-badge-field-select') as HTMLSelectElement;
      expect(badgeSelect.value).toBe('bank_name');
    });
  });

  describe('ObjectCard Board Rendering according to Visualization Config', () => {
    const mockContext: any = {
      updateObject: vi.fn().mockResolvedValue(undefined),
      archiveObject: vi.fn().mockResolvedValue(undefined),
      deleteObject: vi.fn().mockResolvedValue(undefined),
      restoreObject: vi.fn().mockResolvedValue(undefined),
    };

    it('suppresses checkbox and displays hero balance for finances card with balance', () => {
      const financeCard: LADObject = {
        object_id: 'fin-001',
        space_id: 'test-space',
        title: 'Itaú Checking Account',
        description: 'Captured raw balance note',
        domain: 'finances',
        status: 'active',
        priority: 'medium',
        tags: ['finances'],
        attributes: {
          card_type: 'finances.account_balance',
          balance: 75000,
          bank: 'Itaú',
          currency: 'CLP',
          account_type: 'checking',
        },
        created_by: 'usr_test',
        created_at: '2026-09-17T12:00:00Z',
        updated_at: '2026-09-17T12:00:00Z',
        version: 1,
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={mockContext}>
            <ObjectCard obj={financeCard} />
          </LADContext.Provider>
        </I18nProvider>
      );

      // Title should be visible
      expect(screen.getByText('Itaú Checking Account')).toBeInTheDocument();

      // No checkbox should exist
      expect(screen.queryByTestId('card-checkbox-fin-001')).not.toBeInTheDocument();

      // Hero balance should be displayed
      expect(screen.getByTestId('card-balance-display-fin-001')).toBeInTheDocument();
      expect(screen.getByTestId('quick-edit-trigger-balance')).toBeInTheDocument();

      // Description should be displayed when showDescription is true
      expect(screen.getByTestId('card-description')).toBeInTheDocument();
      expect(screen.getByText('Captured raw balance note')).toBeInTheDocument();
    });

    it('suppresses raw description when visualization config has showDescription: false', () => {
      const customNoDescType: LADCardTypeDefinition = {
        id: 'finances.no_desc_account',
        category: 'finances',
        name: 'Private Balance',
        fields: [{ key: 'balance', label: 'Balance', type: 'currency' }],
        visualization: {
          showCheckbox: false,
          showDescription: false,
          primaryFieldKey: 'balance',
        },
      };
      SchemaRegistry.getInstance().addCustomCardType(customNoDescType);

      const privateCard: LADObject = {
        object_id: 'fin-priv-01',
        space_id: 'test-space',
        title: 'Secret Vault',
        description: 'Sensitive account notes that should be hidden on card',
        domain: 'finances',
        status: 'active',
        priority: 'medium',
        tags: ['finances'],
        attributes: {
          card_type: 'finances.no_desc_account',
          balance: 1000000,
        },
        created_by: 'usr_test',
        created_at: '2026-09-17T12:00:00Z',
        updated_at: '2026-09-17T12:00:00Z',
        version: 1,
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={mockContext}>
            <ObjectCard obj={privateCard} />
          </LADContext.Provider>
        </I18nProvider>
      );

      // Raw description should be suppressed because showDescription is false
      expect(screen.queryByTestId('card-description')).not.toBeInTheDocument();
    });

    it('shows checkbox and description for actionable fallback task card', () => {
      const taskCard: LADObject = {
        object_id: 'task-001',
        space_id: 'test-space',
        title: 'Prepare Presentation Slides',
        description: 'Include Q3 roadmap and performance metrics',
        domain: 'work',
        status: 'active',
        priority: 'medium',
        tags: ['work'],
        attributes: {},
        created_by: 'usr_test',
        created_at: '2026-09-17T12:00:00Z',
        updated_at: '2026-09-17T12:00:00Z',
        version: 1,
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={mockContext}>
            <ObjectCard obj={taskCard} />
          </LADContext.Provider>
        </I18nProvider>
      );

      // Checkbox should be visible
      expect(screen.getByTestId('card-checkbox-task-001')).toBeInTheDocument();

      // Description should be visible
      expect(screen.getByTestId('card-description')).toBeInTheDocument();
      expect(screen.getByText('Include Q3 roadmap and performance metrics')).toBeInTheDocument();
    });

    it('custom card type with showCheckbox: false hides checkbox and renders hero metric', () => {
      // Register custom card type
      const customMetricType: LADCardTypeDefinition = {
        id: 'custom.metric_monitor',
        category: 'work',
        name: 'Metric Monitor',
        fields: [
          { key: 'metric_val', label: 'Metric Value', type: 'number', quickEdit: true },
        ],
        visualization: {
          showCheckbox: false,
          showDescription: true,
          primaryFieldKey: 'metric_val',
        },
      };
      SchemaRegistry.getInstance().addCustomCardType(customMetricType);

      const metricCard: LADObject = {
        object_id: 'metric-001',
        space_id: 'test-space',
        title: 'Server Load Average',
        description: 'Updated automatically via agent',
        domain: 'work',
        status: 'active',
        priority: 'medium',
        tags: ['work'],
        attributes: {
          card_type: 'custom.metric_monitor',
          metric_val: 42,
        },
        created_by: 'usr_test',
        created_at: '2026-09-17T12:00:00Z',
        updated_at: '2026-09-17T12:00:00Z',
        version: 1,
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={mockContext}>
            <ObjectCard obj={metricCard} />
          </LADContext.Provider>
        </I18nProvider>
      );

      // Checkbox must not be rendered
      expect(screen.queryByTestId('card-checkbox-metric-001')).not.toBeInTheDocument();

      // Description is configured to show, so it should be visible
      expect(screen.getByTestId('card-description')).toBeInTheDocument();

      // Primary hero metric field is rendered
      expect(screen.getByTestId('card-primary-display-metric-001')).toBeInTheDocument();
    });

    it('fallback finance card without card_type attribute suppresses checkbox when it has balance', () => {
      const fallbackFinanceCard: LADObject = {
        object_id: 'fin-fallback-01',
        space_id: 'test-space',
        title: 'Emergency Fund',
        description: 'Savings account buffer',
        domain: 'finances',
        status: 'active',
        priority: 'medium',
        tags: ['finances'],
        attributes: {
          balance: 500000,
        },
        created_by: 'usr_test',
        created_at: '2026-09-17T12:00:00Z',
        updated_at: '2026-09-17T12:00:00Z',
        version: 1,
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={mockContext}>
            <ObjectCard obj={fallbackFinanceCard} />
          </LADContext.Provider>
        </I18nProvider>
      );

      // Checkbox must NOT be rendered on finance balance cards
      expect(screen.queryByTestId('card-checkbox-fin-fallback-01')).not.toBeInTheDocument();
      // Hero balance display must be rendered
      expect(screen.getByTestId('card-balance-display-fin-fallback-01')).toBeInTheDocument();
    });
  });
});
