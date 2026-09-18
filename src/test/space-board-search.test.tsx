import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LivingBoardView } from '../ui/views/LivingBoardView';
import { I18nProvider } from '../core/i18n/i18n-context';
import { LADContext } from '../ui/context/LADContext';
import { LADObject } from '../core/standard/types';
import { normalizeSearchString } from '../core/utils/fuzzy-search';

describe('Space Board Smart Search Bar', () => {
  const sampleObjects: LADObject[] = [
    {
      object_id: 'obj-1',
      space_id: 'space-1',
      domain: 'finances',
      title: 'Línea de crédito Itaú',
      status: 'active',
      priority: 'high',
      created_by: 'usr-1',
      attributes: {
        card_type: 'bank_balance',
        bank: 'Itaú',
        balance: 72695,
      },
      tags: ['finanzas', 'banco'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    },
    {
      object_id: 'obj-2',
      space_id: 'space-1',
      domain: 'health',
      title: 'Consulta médica traumatología',
      status: 'active',
      priority: 'medium',
      created_by: 'usr-1',
      attributes: {
        card_type: 'doctor_appointment',
        doctor: 'Dr. Smith',
        specialty: 'Traumatología',
      },
      tags: ['salud', 'hospital'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    },
    {
      object_id: 'obj-3',
      space_id: 'space-1',
      domain: 'shopping',
      title: 'Lista de compras semanal',
      status: 'active',
      priority: 'low',
      created_by: 'usr-1',
      attributes: {
        card_type: 'shopping_checklist',
        checklist: [
          { id: '1', text: 'Leche deslactosada', completed: false },
          { id: '2', text: 'Huevos de campo', completed: false },
        ],
      },
      tags: ['mercado'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    },
  ];

  const mockContext: any = {
    objects: sampleObjects,
    activeAlerts: [],
    proposals: [],
    approveProposal: vi.fn(),
    rejectProposal: vi.fn(),
    activeManifest: { space_id: 'space-1', name: 'Personal Space' },
    activeCategoryFilter: 'all',
    setActiveCategoryFilter: vi.fn(),
    currentView: 'board',
    setCurrentView: vi.fn(),
    selectCategory: vi.fn(),
    createObjectFromCapture: vi.fn(),
    updateObject: vi.fn(),
    deleteObject: vi.fn(),
    hasUnsavedChanges: false,
    setHasUnsavedChanges: vi.fn(),
  };

  const renderComponent = () => {
    return render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext}>
          <LivingBoardView />
        </LADContext.Provider>
      </I18nProvider>
    );
  };

  it('normalizes diacritics and accents correctly', () => {
    expect(normalizeSearchString('Itaú')).toBe('itau');
    expect(normalizeSearchString('crédito')).toBe('credito');
    expect(normalizeSearchString('MÉDICA')).toBe('medica');
    expect(normalizeSearchString('traumatología')).toBe('traumatologia');
  });

  it('renders the search bar input on the space board', () => {
    renderComponent();
    const searchInput = screen.getByTestId('space-board-search-input');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder', 'Search cards, banks, tags...');

    // All 3 cards initially visible
    expect(screen.getByText('Línea de crédito Itaú')).toBeInTheDocument();
    expect(screen.getByText('Consulta médica traumatología')).toBeInTheDocument();
    expect(screen.getByText('Lista de compras semanal')).toBeInTheDocument();
  });

  it('filters cards insensitively to upper and lower case', () => {
    renderComponent();
    const searchInput = screen.getByTestId('space-board-search-input');

    // Search in UPPERCASE
    fireEvent.change(searchInput, { target: { value: 'ITAU' } });
    expect(screen.getByText('Línea de crédito Itaú')).toBeInTheDocument();
    expect(screen.queryByText('Consulta médica traumatología')).not.toBeInTheDocument();
    expect(screen.queryByText('Lista de compras semanal')).not.toBeInTheDocument();

    // Search in lowercase
    fireEvent.change(searchInput, { target: { value: 'itau' } });
    expect(screen.getByText('Línea de crédito Itaú')).toBeInTheDocument();
  });

  it('filters cards insensitively to accents / diacritics', () => {
    renderComponent();
    const searchInput = screen.getByTestId('space-board-search-input');

    // Search "credito" without accent should find "Línea de crédito Itaú"
    fireEvent.change(searchInput, { target: { value: 'credito' } });
    expect(screen.getByText('Línea de crédito Itaú')).toBeInTheDocument();
    expect(screen.queryByText('Consulta médica traumatología')).not.toBeInTheDocument();

    // Search "medica" without accent should find "Consulta médica traumatología"
    fireEvent.change(searchInput, { target: { value: 'medica' } });
    expect(screen.getByText('Consulta médica traumatología')).toBeInTheDocument();
    expect(screen.queryByText('Línea de crédito Itaú')).not.toBeInTheDocument();
  });

  it('matches multilingual and domain synonyms (Spanish/English)', () => {
    renderComponent();
    const searchInput = screen.getByTestId('space-board-search-input');

    // "dinero" or "banco" should find the finances card
    fireEvent.change(searchInput, { target: { value: 'dinero' } });
    expect(screen.getByText('Línea de crédito Itaú')).toBeInTheDocument();
    expect(screen.queryByText('Consulta médica traumatología')).not.toBeInTheDocument();

    // "salud" should find the health card
    fireEvent.change(searchInput, { target: { value: 'salud' } });
    expect(screen.getByText('Consulta médica traumatología')).toBeInTheDocument();
    expect(screen.queryByText('Línea de crédito Itaú')).not.toBeInTheDocument();

    // "groceries" or "supermercado" should find the shopping card
    fireEvent.change(searchInput, { target: { value: 'groceries' } });
    expect(screen.getByText('Lista de compras semanal')).toBeInTheDocument();
  });

  it('matches dynamic card attributes such as bank, doctor, and checklist items', () => {
    renderComponent();
    const searchInput = screen.getByTestId('space-board-search-input');

    // Match attribute: doctor 'Dr. Smith'
    fireEvent.change(searchInput, { target: { value: 'Dr. Smith' } });
    expect(screen.getByText('Consulta médica traumatología')).toBeInTheDocument();
    expect(screen.queryByText('Línea de crédito Itaú')).not.toBeInTheDocument();

    // Match attribute: checklist item 'deslactosada'
    fireEvent.change(searchInput, { target: { value: 'deslactosada' } });
    expect(screen.getByText('Lista de compras semanal')).toBeInTheDocument();
    expect(screen.queryByText('Línea de crédito Itaú')).not.toBeInTheDocument();

    // Match attribute: balance '72695'
    fireEvent.change(searchInput, { target: { value: '72695' } });
    expect(screen.getByText('Línea de crédito Itaú')).toBeInTheDocument();
  });

  it('clears search via clear button and restores full card list', () => {
    renderComponent();
    const searchInput = screen.getByTestId('space-board-search-input');

    fireEvent.change(searchInput, { target: { value: 'itau' } });
    expect(screen.getByText('Línea de crédito Itaú')).toBeInTheDocument();
    expect(screen.queryByText('Consulta médica traumatología')).not.toBeInTheDocument();

    // Click clear button
    const clearButton = screen.getByTestId('clear-search-button');
    expect(clearButton).toBeInTheDocument();
    fireEvent.click(clearButton);

    expect(searchInput).toHaveValue('');
    expect(screen.getByText('Línea de crédito Itaú')).toBeInTheDocument();
    expect(screen.getByText('Consulta médica traumatología')).toBeInTheDocument();
    expect(screen.getByText('Lista de compras semanal')).toBeInTheDocument();
  });

  it('shows friendly empty state with query and resets via empty state clear button', () => {
    renderComponent();
    const searchInput = screen.getByTestId('space-board-search-input');

    fireEvent.change(searchInput, { target: { value: 'nonexistentterm123' } });
    expect(screen.getByText('No cards found matching "nonexistentterm123".')).toBeInTheDocument();

    const emptyClearBtn = screen.getByTestId('empty-clear-search-button');
    expect(emptyClearBtn).toBeInTheDocument();
    fireEvent.click(emptyClearBtn);

    expect(searchInput).toHaveValue('');
    expect(screen.getByText('Línea de crédito Itaú')).toBeInTheDocument();
  });
});
