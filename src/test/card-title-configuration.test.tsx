import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CaptureParser } from '../core/objects/capture-parser';
import { SchemaRegistry } from '../core/schemas/schema-registry';
import { LADCardTypeDefinition } from '../core/schemas/card-types';
import { CardTypeEditorModal } from '../ui/components/CardTypeEditorModal';
import { SmartCaptureBar } from '../ui/components/SmartCaptureBar';
import { I18nProvider } from '../core/i18n/i18n-context';
import { LADContext } from '../ui/context/LADContext';

describe('Configurable Card Type Title Behavior', () => {
  let registry: SchemaRegistry;

  beforeEach(() => {
    registry = new SchemaRegistry();
  });

  describe('CaptureParser with Configured Title Behaviors', () => {
    it('sets a fixed title when card type has mode "fixed"', () => {
      const fixedCardType: LADCardTypeDefinition = {
        id: 'finances.fixed_saldo',
        category: 'finances',
        name: 'Saldo de Cuenta',
        fields: [
          { key: 'bank', label: 'Bank', type: 'text' },
          { key: 'balance', label: 'Balance', type: 'currency' },
        ],
        titleConfig: {
          mode: 'fixed',
          fixedTitle: 'Saldo',
        },
        nlp: {
          keywords: ['saldo', 'linea', 'crédito', 'itau', 'itaú'],
        },
      };
      registry.addCustomCardType(fixedCardType);

      const input = 'Línea de crédito de itaú en $72695';
      const result = CaptureParser.parse(input, new Date('2026-09-17T12:00:00Z'), registry);

      expect(result.cardTypeId).toBe('finances.fixed_saldo');
      expect(result.title).toBe('Saldo');
    });

    it('sets title from typed text when card type has mode "input_text"', () => {
      const inputTextCardType: LADCardTypeDefinition = {
        id: 'finances.input_note',
        category: 'finances',
        name: 'Financial Note',
        fields: [
          { key: 'amount', label: 'Amount', type: 'currency' },
        ],
        titleConfig: {
          mode: 'input_text',
        },
        nlp: {
          keywords: ['movimiento', 'transacción'],
        },
      };
      registry.addCustomCardType(inputTextCardType);

      const input = 'Movimiento bancario pendiente de verificación';
      const result = CaptureParser.parse(input, new Date('2026-09-17T12:00:00Z'), registry);

      expect(result.cardTypeId).toBe('finances.input_note');
      expect(result.title).toBe('Movimiento bancario pendiente de verificación');
    });

    it('interpolates fields into title when card type has mode "template"', () => {
      const templateCardType: LADCardTypeDefinition = {
        id: 'finances.custom_template',
        category: 'finances',
        name: 'Bank Snapshot',
        fields: [
          { key: 'bank', label: 'Bank', type: 'text' },
          { key: 'account_type', label: 'Account Type', type: 'select', options: ['checking', 'savings'] },
        ],
        titleConfig: {
          mode: 'template',
          template: '{bank} ({account_type}) Summary',
        },
        nlp: {
          keywords: ['resumen', 'snapshot'],
        },
      };
      registry.addCustomCardType(templateCardType);

      const generatedTitle = CaptureParser.generateTitle(
        'resumen de cuenta',
        [],
        templateCardType,
        { bank: 'Santander', account_type: 'checking' }
      );

      expect(generatedTitle).toBe('Santander (checking) Summary');
    });

    it('falls back cleanly if template tokens are missing or blank', () => {
      const templateCardType: LADCardTypeDefinition = {
        id: 'health.visit',
        category: 'health',
        name: 'Doctor Visit',
        fields: [
          { key: 'doctor', label: 'Doctor', type: 'text' },
        ],
        titleConfig: {
          mode: 'template',
          template: '{doctor}',
        },
      };

      const titleWithEmptyFields = CaptureParser.generateTitle('test', [], templateCardType, {});
      expect(titleWithEmptyFields).toBe('Doctor Visit');
    });
  });

  describe('CardTypeEditorModal UI Configuration', () => {
    it('renders title behavior options and saves a card type with fixed title configuration', async () => {
      const onSaved = vi.fn();
      const onClose = vi.fn();
      const updateSpaceIdentity = vi.fn().mockResolvedValue(undefined);

      const mockContext: any = {
        activeManifest: { space_id: 'test-space', settings: {} },
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

      // Verify title behavior section is present
      expect(screen.getByTestId('card-title-behavior-section')).toBeInTheDocument();
      expect(screen.getByTestId('title-mode-input-text')).toBeInTheDocument();
      expect(screen.getByTestId('title-mode-fixed')).toBeInTheDocument();
      expect(screen.getByTestId('title-mode-template')).toBeInTheDocument();

      // Enter card type name
      const nameInput = screen.getByTestId('card-type-name-input');
      fireEvent.change(nameInput, { target: { value: 'Credit Line Status' } });

      // Select "Fixed Title" mode
      const fixedModeBtn = screen.getByTestId('title-mode-fixed');
      fireEvent.click(fixedModeBtn);

      // Verify fixed title input appears
      const fixedTitleInput = screen.getByTestId('card-type-fixed-title-input');
      expect(fixedTitleInput).toBeInTheDocument();
      fireEvent.change(fixedTitleInput, { target: { value: 'Saldo' } });

      // Save card type
      const saveBtn = screen.getByTestId('save-card-type-button');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalled();
        const savedDefinition: LADCardTypeDefinition = onSaved.mock.calls[0][0];
        expect(savedDefinition.name).toBe('Credit Line Status');
        expect(savedDefinition.titleConfig).toEqual({
          mode: 'fixed',
          fixedTitle: 'Saldo',
        });
      });
    });

    it('allows configuring a template title with token pills', async () => {
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
              defaultCategory="health"
              onSaved={onSaved}
            />
          </LADContext.Provider>
        </I18nProvider>
      );

      const nameInput = screen.getByTestId('card-type-name-input');
      fireEvent.change(nameInput, { target: { value: 'Dental Check' } });

      // Select "Field Template" mode
      const templateModeBtn = screen.getByTestId('title-mode-template');
      fireEvent.click(templateModeBtn);

      const templateInput = screen.getByTestId('card-type-template-input');
      expect(templateInput).toBeInTheDocument();
      fireEvent.change(templateInput, { target: { value: 'Consultation with {title}' } });

      // Save
      const saveBtn = screen.getByTestId('save-card-type-button');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalled();
        const savedDefinition: LADCardTypeDefinition = onSaved.mock.calls[0][0];
        expect(savedDefinition.titleConfig).toEqual({
          mode: 'template',
          template: 'Consultation with {title}',
        });
      });
    });
  });

  describe('SmartCaptureBar Integration with Title Config', () => {
    it('automatically applies fixed title behavior from card type when typing', async () => {
      const singletonRegistry = SchemaRegistry.getInstance();
      singletonRegistry.addCustomCardType({
        id: 'finances.fixed_card',
        category: 'finances',
        name: 'Fixed Credit Status',
        fields: [
          { key: 'bank', label: 'Bank', type: 'text' },
          { key: 'balance', label: 'Balance', type: 'currency' },
        ],
        titleConfig: {
          mode: 'fixed',
          fixedTitle: 'Saldo',
        },
        nlp: {
          keywords: ['fixedline', 'itaucredito'],
        },
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
        target: { value: 'fixedline itaucredito balance is $500' },
      });

      await waitFor(() => {
        expect(screen.getByText('Inferred Structure')).toBeInTheDocument();
      });

      // Expand finer details
      const fineTuneBtn = screen.getByText('Fine-tune details');
      fireEvent.click(fineTuneBtn);

      // The title input in finer details drawer should be 'Saldo'
      const titleInput = screen.getByTestId('finer-details-title-input') as HTMLInputElement;
      expect(titleInput.value).toBe('Saldo');
    });
  });
});
