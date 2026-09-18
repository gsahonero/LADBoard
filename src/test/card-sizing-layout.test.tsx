import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LivingBoardView } from '../ui/views/LivingBoardView';
import { TopicDashboardView } from '../ui/views/TopicDashboardView';
import { ObjectCard } from '../ui/components/ObjectCard';
import { I18nProvider } from '../core/i18n/i18n-context';
import { LADContext } from '../ui/context/LADContext';
import { LADObject } from '../core/standard/types';

describe('Card Sizing & Layout (No Wasted Space)', () => {
  const sampleObjects: LADObject[] = [
    {
      object_id: 'obj-1',
      space_id: 'space-1',
      domain: 'finances',
      title: 'Línea de crédito Itaú',
      status: 'active',
      priority: 'medium',
      created_by: 'usr-1',
      attributes: {
        raw_thought: 'Línea de crédito Itaú $72695',
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
      object_id: 'obj-2',
      space_id: 'space-1',
      domain: 'shopping',
      title: 'Supermarket Groceries',
      status: 'active',
      priority: 'medium',
      created_by: 'usr-1',
      attributes: {
        raw_thought: 'Buy 9 grocery items for the week',
        card_type: 'shopping.groceries_buying',
        checklist: [
          { id: '1', text: 'Milk', completed: false },
          { id: '2', text: 'Eggs', completed: false },
          { id: '3', text: 'Bread', completed: false },
          { id: '4', text: 'Butter', completed: false },
          { id: '5', text: 'Cheese', completed: false },
          { id: '6', text: 'Coffee', completed: false },
          { id: '7', text: 'Apples', completed: false },
          { id: '8', text: 'Bananas', completed: false },
          { id: '9', text: 'Rice', completed: false },
        ],
      },
      tags: ['shopping'],
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

  it('renders LivingBoardView grid with items-start to prevent card vertical stretching', () => {
    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext}>
          <LivingBoardView />
        </LADContext.Provider>
      </I18nProvider>
    );

    const grid = screen.getByTestId('living-board-grid');
    expect(grid).toBeInTheDocument();
    expect(grid.className).toContain('items-start');
    expect(grid.className).toContain('grid');
  });

  it('renders TopicDashboardView items grid with items-start', () => {
    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext}>
          <TopicDashboardView
            topicId="finances"
            onBackToHub={vi.fn()}
            onOpenCapture={vi.fn()}
          />
        </LADContext.Provider>
      </I18nProvider>
    );

    const grid = screen.getByTestId('topic-dashboard-grid');
    expect(grid).toBeInTheDocument();
    expect(grid.className).toContain('items-start');
    expect(grid.className).toContain('grid');
  });

  it('renders ObjectCard with h-fit so it naturally hugs content height', () => {
    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext}>
          <ObjectCard obj={sampleObjects[0]} />
        </LADContext.Provider>
      </I18nProvider>
    );

    const card = screen.getByTestId(`card-${sampleObjects[0].object_id}`);
    expect(card).toBeInTheDocument();
    expect(card.className).toContain('h-fit');
  });

  it('allows short cards and long checklist cards to co-exist without stretching short cards', () => {
    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext}>
          <div className="grid grid-cols-2 gap-4 items-start" data-testid="test-grid">
            <ObjectCard obj={sampleObjects[0]} />
            <ObjectCard obj={sampleObjects[1]} />
          </div>
        </LADContext.Provider>
      </I18nProvider>
    );

    const shortCard = screen.getByTestId(`card-${sampleObjects[0].object_id}`);
    const longCard = screen.getByTestId(`card-${sampleObjects[1].object_id}`);

    expect(shortCard.className).toContain('h-fit');
    expect(longCard.className).toContain('h-fit');
    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('Itaú')).toBeInTheDocument();
  });

  it('organizes category filter buttons with flex-wrap and no horizontal scroll bar in LivingBoardView', () => {
    render(
      <I18nProvider initialLocale="en">
        <LADContext.Provider value={mockContext}>
          <LivingBoardView />
        </LADContext.Provider>
      </I18nProvider>
    );

    const filterBar = screen.getByTestId('categories-filter-bar');
    expect(filterBar).toBeInTheDocument();
    expect(filterBar.className).toContain('flex-wrap');
    expect(filterBar.className).not.toContain('overflow-x-auto');
    expect(filterBar.className).not.toContain('overflow-x-scroll');

    const filterButtons = screen.getByTestId('category-filter-buttons');
    expect(filterButtons).toBeInTheDocument();
    expect(filterButtons.className).toContain('flex-wrap');
    expect(filterButtons.className).not.toContain('overflow-x-auto');
    expect(filterButtons.className).not.toContain('overflow-x-scroll');

    const timelineBar = screen.getByTestId('timeline-ribbon-bar');
    expect(timelineBar).toBeInTheDocument();
    expect(timelineBar.className).toContain('flex-wrap');
    expect(timelineBar.className).not.toContain('overflow-x-auto');
  });
});
