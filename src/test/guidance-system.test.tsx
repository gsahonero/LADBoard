import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GuidanceRegistry } from '../core/guidance/guidance-registry';
import { AccessibleTooltip } from '../ui/components/AccessibleTooltip';
import { GuidanceDrawer } from '../ui/components/GuidanceDrawer';
import { I18nProvider } from '../core/i18n/i18n-context';

describe('Modular Guidance System & Registry', () => {
  it('initializes with default core concepts, capture, and shortcuts', () => {
    const registry = GuidanceRegistry.getInstance();
    const topics = registry.getAllTopics();
    expect(topics.length).toBeGreaterThanOrEqual(4);

    expect(topics.map((t) => t.id)).toContain('living-memory');
    expect(topics.map((t) => t.id)).toContain('active-engine');
    expect(topics.map((t) => t.id)).toContain('fast-capture');

    const shortcuts = registry.getAllShortcuts();
    expect(shortcuts.length).toBeGreaterThanOrEqual(4);
    expect(shortcuts.map((s) => s.id)).toContain('open-capture');
  });

  it('filters topics by category and query', () => {
    const registry = GuidanceRegistry.getInstance();
    const captureTopics = registry.getTopicsByCategory('capture');
    expect(captureTopics.every((t) => t.category === 'capture')).toBe(true);

    const searchResults = registry.searchTopics('balance');
    expect(searchResults.some((t) => t.id === 'living-memory')).toBe(true);
  });

  it('allows dynamic registration of custom modular topics', () => {
    const registry = GuidanceRegistry.getInstance();
    registry.registerTopic({
      id: 'plugin-custom-topic',
      category: 'collaboration',
      title: 'Custom Plugin Guide',
      summary: 'Dynamic help registered by an external module',
      icon: 'Puzzle',
      keywords: ['plugin', 'modular'],
      sections: [{ title: 'Overview', body: 'Registered dynamically at runtime.' }],
    });

    const topic = registry.getTopic('plugin-custom-topic');
    expect(topic).toBeDefined();
    expect(topic?.title).toBe('Custom Plugin Guide');
  });
});

describe('AccessibleTooltip Component', () => {
  it('renders trigger element and displays tooltip on hover and focus', async () => {
    render(
      <AccessibleTooltip content="Helpful explanation" delayMs={0}>
        <button type="button">Target Button</button>
      </AccessibleTooltip>
    );

    const btn = screen.getByRole('button', { name: 'Target Button' });
    expect(btn).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // Hover reveals tooltip
    fireEvent.mouseEnter(btn);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Helpful explanation');

    // aria-describedby links button to tooltip
    expect(btn.getAttribute('aria-describedby')).toBe(tooltip.getAttribute('id'));

    // Mouse leave hides tooltip
    fireEvent.mouseLeave(btn);
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });
});

describe('GuidanceDrawer Component', () => {
  it('renders drawer, filters topics via search, and expands accordion items', () => {
    const onClose = vi.fn();
    const onOpenWelcomeTour = vi.fn();

    render(
      <I18nProvider initialLocale="en">
        <GuidanceDrawer
          isOpen={true}
          onClose={onClose}
          onOpenWelcomeTour={onOpenWelcomeTour}
        />
      </I18nProvider>
    );

    // Title is present
    expect(screen.getByText('LAD Guide & Help')).toBeInTheDocument();

    // Default topics listed
    expect(screen.getByText('Living Memory & Continuous States')).toBeInTheDocument();

    // Search filtering
    const searchInput = screen.getByTestId('guidance-search-input');
    fireEvent.change(searchInput, { target: { value: 'Quick Starters' } });
    expect(screen.getByText('Fast Capture & Quick Starters')).toBeInTheDocument();
    expect(screen.queryByText('Living Memory & Continuous States')).not.toBeInTheDocument();

    // Switch to shortcuts category tab
    fireEvent.change(searchInput, { target: { value: '' } });
    const shortcutsTab = screen.getByTestId('category-filter-shortcuts');
    fireEvent.click(shortcutsTab);

    expect(screen.getByTestId('guidance-shortcuts-section')).toBeInTheDocument();
    expect(screen.getByText('Open Quick Capture modal from anywhere')).toBeInTheDocument();

    // Click close button
    const closeBtn = screen.getByTestId('close-guidance-drawer-btn');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
