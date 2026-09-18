import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LivingBoardView } from '../ui/views/LivingBoardView';
import { I18nProvider } from '../core/i18n/i18n-context';
import { LADContext } from '../ui/context/LADContext';
import { LADObject } from '../core/standard/types';

describe('Stack-Like Card Navigation & Dual Mode Layout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sampleObjects: LADObject[] = [
    {
      object_id: 'obj-1',
      space_id: 'space-1',
      domain: 'finances',
      title: 'Línea de crédito Itaú 1',
      status: 'active',
      priority: 'medium',
      created_by: 'usr-1',
      attributes: {
        card_type: 'finances.account_balance',
        bank: 'Itaú',
        balance: 46434,
      },
      tags: ['finances'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    },
    {
      object_id: 'obj-2',
      space_id: 'space-1',
      domain: 'finances',
      title: 'Línea de crédito Itaú 2',
      status: 'active',
      priority: 'medium',
      created_by: 'usr-1',
      attributes: {
        card_type: 'finances.account_balance',
        bank: 'Itaú',
        balance: 72695,
      },
      tags: ['finances'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    },
    {
      object_id: 'obj-3',
      space_id: 'space-1',
      domain: 'shopping',
      title: 'Compra para album mundial',
      status: 'active',
      priority: 'high',
      created_by: 'usr-1',
      attributes: {
        card_type: 'shopping.groceries_buying',
        checklist: [
          { id: '1', text: 'FWC 7, 8', completed: false },
          { id: '2', text: 'RSA 16', completed: false },
          { id: '3', text: 'KOR 19', completed: false },
        ],
      },
      tags: ['shopping'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    },
    {
      object_id: 'obj-4',
      space_id: 'space-1',
      domain: 'finances',
      title: 'Saldo Itaú',
      status: 'active',
      priority: 'low',
      created_by: 'usr-1',
      attributes: {
        card_type: 'finances.account_balance',
        bank: 'Itaú',
        balance: 72695,
      },
      tags: ['finances'],
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

  it('renders Category Stacks view by default with cards grouped into vertical category stacks', () => {
    renderComponent();

    // The view mode switcher should show Stacks active
    const stacksToggle = screen.getByTestId('view-mode-stacks');
    expect(stacksToggle).toBeInTheDocument();
    expect(stacksToggle.className).toContain('bg-white');

    // Finances stack contains 3 cards
    const financesStack = screen.getByTestId('category-stack-finances');
    expect(financesStack).toBeInTheDocument();
    expect(screen.getByTestId('stack-cards-finances')).toBeInTheDocument();
    expect(screen.getByText('Línea de crédito Itaú 1')).toBeInTheDocument();
    expect(screen.getByText('Línea de crédito Itaú 2')).toBeInTheDocument();
    expect(screen.getByText('Saldo Itaú')).toBeInTheDocument();

    // Shopping stack contains 1 card
    const shoppingStack = screen.getByTestId('category-stack-shopping');
    expect(shoppingStack).toBeInTheDocument();
    expect(screen.getByText('Compra para album mundial')).toBeInTheDocument();
  });

  it('renders empty drop-zone placeholders for categories with 0 cards in Stacks view', () => {
    renderComponent();

    // Health has 0 cards -> renders empty drop-zone placeholder
    const healthDropzone = screen.getByTestId('empty-dropzone-health');
    expect(healthDropzone).toBeInTheDocument();
    expect(healthDropzone.textContent).toContain('No active cards');
    expect(healthDropzone.textContent).toContain('Add card');

    // Home has 0 cards -> renders empty dropzone
    expect(screen.getByTestId('empty-dropzone-home')).toBeInTheDocument();
  });

  it('toggles to Masonry flow view without category column partitions', () => {
    renderComponent();

    const masonryToggle = screen.getByTestId('view-mode-masonry');
    fireEvent.click(masonryToggle);

    // Should persist to localStorage
    expect(localStorage.getItem('lad_board_view_mode')).toBe('masonry');

    // Grid container now has columns-1 / columns-3 class for multi-column masonry
    const grid = screen.getByTestId('living-board-grid');
    expect(grid.className).toContain('columns-1');
    expect(grid.className).toContain('lg:columns-3');

    // All 4 cards still present
    expect(screen.getByText('Línea de crédito Itaú 1')).toBeInTheDocument();
    expect(screen.getByText('Línea de crédito Itaú 2')).toBeInTheDocument();
    expect(screen.getByText('Compra para album mundial')).toBeInTheDocument();
    expect(screen.getByText('Saldo Itaú')).toBeInTheDocument();
  });

  it('toggles back to Stacks view seamlessly', () => {
    renderComponent();

    // Switch to Masonry then back to Stacks
    fireEvent.click(screen.getByTestId('view-mode-masonry'));
    expect(localStorage.getItem('lad_board_view_mode')).toBe('masonry');

    fireEvent.click(screen.getByTestId('view-mode-stacks'));
    expect(localStorage.getItem('lad_board_view_mode')).toBe('stacks');

    expect(screen.getByTestId('category-stack-finances')).toBeInTheDocument();
    expect(screen.getByTestId('category-stack-shopping')).toBeInTheDocument();
  });

  it('allows focusing on a specific category stack via Focus button', () => {
    renderComponent();

    const financesStack = screen.getByTestId('category-stack-finances');
    const focusBtn = financesStack.querySelector('button[title="Filter to Money"]');
    expect(focusBtn).toBeInTheDocument();

    fireEvent.click(focusBtn!);

    // Only finances stack is visible
    expect(screen.getByTestId('category-stack-finances')).toBeInTheDocument();
    expect(screen.queryByTestId('category-stack-shopping')).not.toBeInTheDocument();
  });

  it('filters stacks to only matching cards when user searches', () => {
    renderComponent();

    const searchInput = screen.getByTestId('space-board-search-input');
    fireEvent.change(searchInput, { target: { value: 'album' } });

    // Only shopping stack matches 'album'
    expect(screen.getByTestId('category-stack-shopping')).toBeInTheDocument();
    expect(screen.queryByTestId('category-stack-finances')).not.toBeInTheDocument();
    expect(screen.queryByTestId('empty-dropzone-health')).not.toBeInTheDocument();
  });
});
