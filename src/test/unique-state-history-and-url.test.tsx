import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '../core/i18n/i18n-context';
import { LADContext } from '../ui/context/LADContext';
import { ObjectCard, renderTextWithShortUrls } from '../ui/components/ObjectCard';
import { LADObject } from '../core/standard/types';
import { SchemaRegistry } from '../core/schemas/schema-registry';

describe('Unique State Cards, History Tracking, URL Shortening & Display Name Attribution', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Details URL Shortening', () => {
    it('renders plain text as is when no URL is present', () => {
      const { container } = render(<div>{renderTextWithShortUrls('Regular notes without link')}</div>);
      expect(container.textContent).toBe('Regular notes without link');
      expect(container.querySelector('a')).toBeNull();
    });

    it('shortens long URLs in text to [URL] and sets href to the registered URL', () => {
      const { container } = render(
        <div>
          {renderTextWithShortUrls(
            'Check statement at https://banking.itau.cl/portal/statements/2026/09/invoice-9812481248.pdf for details'
          )}
        </div>
      );

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link?.textContent).toContain('URL');
      expect(link?.getAttribute('href')).toBe(
        'https://banking.itau.cl/portal/statements/2026/09/invoice-9812481248.pdf'
      );
      expect(link?.getAttribute('title')).toBe(
        'https://banking.itau.cl/portal/statements/2026/09/invoice-9812481248.pdf'
      );
      expect(container.textContent).toContain('Check statement at');
      expect(container.textContent).toContain('for details');
      // Full long URL should not appear as raw text
      expect(container.textContent).not.toContain('https://banking.itau.cl/portal/statements/2026/09/invoice-9812481248.pdf');
    });

    it('renders shortened URL in ObjectCard description', () => {
      const card: LADObject = {
        object_id: 'obj_url_test',
        space_id: 'spc_1',
        title: 'Project Wiki',
        description: 'Read the docs at https://wiki.example.com/company/internal/guidelines/onboarding',
        domain: 'projects',
        status: 'active',
        priority: 'medium',
        tags: [],
        version: 1,
        attributes: {},
        created_by: 'usr_me',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockCtx: any = {
        updateObject: vi.fn(),
        deleteObject: vi.fn(),
        nodes: [],
        userRegistry: {
          user_id: 'usr_me',
          identities: [{ display_name: 'Gabriel', email: 'gabriel@test.com' }],
        },
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={mockCtx}>
            <ObjectCard obj={card} />
          </LADContext.Provider>
        </I18nProvider>
      );

      const link = screen.getByTestId('shortened-url-link');
      expect(link).toBeInTheDocument();
      expect(link.textContent).toContain('URL');
      expect(link.getAttribute('href')).toBe('https://wiki.example.com/company/internal/guidelines/onboarding');
    });
  });

  describe('2. Created by Display Name Attribution', () => {
    it('uses the user display name as {Name} instead of raw user ID plpbj8493', () => {
      const card: LADObject = {
        object_id: 'obj_creator_test',
        space_id: 'spc_1',
        title: 'Grocery Run',
        domain: 'shopping',
        status: 'active',
        priority: 'medium',
        tags: [],
        version: 1,
        attributes: {},
        created_by: 'usr_plpbj8493',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockCtx: any = {
        updateObject: vi.fn(),
        deleteObject: vi.fn(),
        nodes: [],
        userRegistry: {
          user_id: 'usr_plpbj8493',
          identities: [{ display_name: 'Gabriel Sahonero', email: 'gabriel@domain.com' }],
        },
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={mockCtx}>
            <ObjectCard obj={card} />
          </LADContext.Provider>
        </I18nProvider>
      );

      const creatorEl = screen.getByTestId('card-creator-obj_creator_test');
      expect(creatorEl).toBeInTheDocument();
      // Should show the display name
      expect(creatorEl.textContent).toContain('Gabriel Sahonero');
      // Should NOT show the raw internal ID
      expect(creatorEl.textContent).not.toContain('plpbj8493');
      // Should NOT contain literal un-interpolated template
      expect(creatorEl.textContent).not.toContain('{name}');
    });

    it('resolves collaborator display name when created by collaborator node', () => {
      const card: LADObject = {
        object_id: 'obj_collab_test',
        space_id: 'spc_1',
        title: 'Sprint Planning',
        domain: 'projects',
        status: 'active',
        priority: 'medium',
        tags: [],
        version: 1,
        attributes: {},
        created_by: 'usr_collab_456',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockCtx: any = {
        updateObject: vi.fn(),
        deleteObject: vi.fn(),
        nodes: [
          {
            node_id: 'usr_collab_456',
            label: 'Maria Garcia',
            type: 'user',
            metadata: { display_name: 'Maria Garcia' },
          },
        ],
        userRegistry: {
          user_id: 'usr_local',
          identities: [{ display_name: 'Gabriel', email: 'gabriel@domain.com' }],
        },
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={mockCtx}>
            <ObjectCard obj={card} />
          </LADContext.Provider>
        </I18nProvider>
      );

      const creatorEl = screen.getByTestId('card-creator-obj_collab_test');
      expect(creatorEl).toBeInTheDocument();
      expect(creatorEl.textContent).toContain('Maria Garcia');
    });
  });

  describe('3. Unique State Cards & History Tracking', () => {
    it('finances.account_balance is marked as isUniqueState with bank as uniqueKeyField', () => {
      const registry = SchemaRegistry.getInstance();
      const accountBalanceDef = registry.getCardType('finances.account_balance');
      expect(accountBalanceDef).toBeDefined();
      expect(accountBalanceDef?.isUniqueState).toBe(true);
      expect(accountBalanceDef?.uniqueKeyFields).toContain('bank');
    });

    it('renders history button and displays history timeline when toggled on ObjectCard', () => {
      const cardWithHistory: LADObject = {
        object_id: 'obj_bank_itau',
        space_id: 'spc_1',
        title: 'Saldo Itaú',
        domain: 'finances',
        status: 'active',
        priority: 'medium',
        tags: ['finances'],
        version: 2,
        attributes: {
          card_type: 'finances.account_balance',
          bank: 'Itaú',
          balance: 72695,
        },
        history: [
          {
            timestamp: '2026-09-10T12:00:00Z',
            actor: 'Gabriel',
            summary: 'Initial creation',
            snapshot: { title: 'Saldo Itaú', balance: 46434 },
          },
          {
            timestamp: '2026-09-24T20:00:00Z',
            actor: 'Gabriel',
            summary: 'Balance updated from $46,434 to $72,695',
            changes: { balance: { from: 46434, to: 72695 } },
            snapshot: { title: 'Saldo Itaú', balance: 72695 },
          },
        ],
        created_by: 'usr_me',
        created_at: '2026-09-10T12:00:00Z',
        updated_at: '2026-09-24T20:00:00Z',
      };

      const mockCtx: any = {
        updateObject: vi.fn(),
        deleteObject: vi.fn(),
        nodes: [],
        userRegistry: {
          user_id: 'usr_me',
          identities: [{ display_name: 'Gabriel' }],
        },
      };

      render(
        <I18nProvider initialLocale="en">
          <LADContext.Provider value={mockCtx}>
            <ObjectCard obj={cardWithHistory} />
          </LADContext.Provider>
        </I18nProvider>
      );

      // History toggle button should be visible with entry count
      const historyToggle = screen.getByTestId('card-history-toggle-obj_bank_itau');
      expect(historyToggle).toBeInTheDocument();
      expect(historyToggle.textContent).toContain('2');

      // Timeline not open initially
      expect(screen.queryByTestId('card-history-timeline-obj_bank_itau')).toBeNull();

      // Click to toggle history
      fireEvent.click(historyToggle);

      // Timeline should now be visible
      const timeline = screen.getByTestId('card-history-timeline-obj_bank_itau');
      expect(timeline).toBeInTheDocument();
      expect(timeline.textContent).toContain('Card History');
      expect(timeline.textContent).toContain('Balance updated from $46,434 to $72,695');
      expect(timeline.textContent).toContain('Initial creation');
    });
  });
});
