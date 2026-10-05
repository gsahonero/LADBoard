import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardEditModal } from '../ui/components/CardEditModal';
import { ObjectCard } from '../ui/components/ObjectCard';
import { LADContext } from '../ui/context/LADContext';
import { I18nProvider } from '../core/i18n/i18n-context';
import { LADObject, LADGraphNode, LADGraphEdge } from '../core/standard/types';

describe('Deep Relational Entity Weaving (Card-to-Card Linking & Graph Pills)', () => {
  const mockCard1: LADObject = {
    object_id: 'card_111',
    space_id: 'spc_weave',
    domain: 'general',
    title: 'Research Quantum Computing',
    status: 'active',
    priority: 'high',
    tags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'usr_alice',
    attributes: {},
    version: 1,
  };

  const mockCard2: LADObject = {
    object_id: 'card_222',
    space_id: 'spc_weave',
    domain: 'projects',
    title: 'Implement Grover Algorithm',
    status: 'active',
    priority: 'medium',
    tags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'usr_alice',
    attributes: {},
    version: 1,
  };

  const mockNodes: LADGraphNode[] = [
    {
      node_id: 'node_card_111',
      type: 'object',
      label: 'Research Quantum Computing',
      ref_id: 'card_111',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      node_id: 'node_card_222',
      type: 'object',
      label: 'Implement Grover Algorithm',
      ref_id: 'card_222',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockEdges: LADGraphEdge[] = [
    {
      edge_id: 'edge_link_1',
      source: 'node_card_111',
      target: 'node_card_222',
      type: 'blocks',
      policies: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders linked items inside CardEditModal and allows unlinking', async () => {
    const removeGraphEdgeMock = vi.fn().mockResolvedValue(undefined);
    const addGraphEdgeMock = vi.fn().mockResolvedValue(undefined);

    const contextVal: any = {
      updateObject: vi.fn(),
      activeManifest: { space_id: 'spc_weave', space_name: 'Test Space' },
      objects: [mockCard1, mockCard2],
      nodes: mockNodes,
      edges: mockEdges,
      addGraphEdge: addGraphEdgeMock,
      removeGraphEdge: removeGraphEdgeMock,
      userRegistry: { user_id: 'usr_alice' },
    };

    render(
      <I18nProvider>
        <LADContext.Provider value={contextVal}>
          <CardEditModal isOpen={true} onClose={() => {}} obj={mockCard1} />
        </LADContext.Provider>
      </I18nProvider>
    );

    // Linked Items section should show card 2 linked with "blocks"
    expect(screen.getByTestId('card-edit-relations-section')).toBeInTheDocument();
    expect(screen.getByTestId('linked-card-card_222')).toBeInTheDocument();
    expect(screen.getByText('blocks')).toBeInTheDocument();
    expect(screen.getByText('Implement Grover Algorithm')).toBeInTheDocument();

    // Click unlink
    const unlinkBtn = screen.getByTestId('unlink-btn-card_222');
    fireEvent.click(unlinkBtn);

    expect(removeGraphEdgeMock).toHaveBeenCalledWith('edge_link_1');
  });

  it('allows linking an unlinked card with custom relationship type', async () => {
    const addGraphEdgeMock = vi.fn().mockResolvedValue(undefined);
    const removeGraphEdgeMock = vi.fn().mockResolvedValue(undefined);

    const contextVal: any = {
      updateObject: vi.fn(),
      activeManifest: { space_id: 'spc_weave', space_name: 'Test Space' },
      objects: [mockCard1, mockCard2],
      nodes: mockNodes,
      edges: [], // No existing edges
      addGraphEdge: addGraphEdgeMock,
      removeGraphEdge: removeGraphEdgeMock,
      userRegistry: { user_id: 'usr_alice' },
    };

    render(
      <I18nProvider>
        <LADContext.Provider value={contextVal}>
          <CardEditModal isOpen={true} onClose={() => {}} obj={mockCard1} />
        </LADContext.Provider>
      </I18nProvider>
    );

    // Target card selector should contain mockCard2
    const targetSelect = screen.getByTestId('select-target-card');
    fireEvent.change(targetSelect, { target: { value: 'card_222' } });

    // Select relationship type 'subtask_of'
    const typeSelect = screen.getByTestId('select-relation-type');
    fireEvent.change(typeSelect, { target: { value: 'subtask_of' } });

    // Click Link button
    const linkBtn = screen.getByTestId('link-card-btn');
    fireEvent.click(linkBtn);

    expect(addGraphEdgeMock).toHaveBeenCalledWith('node_card_111', 'node_card_222', 'subtask_of');
  });

  it('renders bidirectional link pills on ObjectCard', () => {
    const contextVal: any = {
      updateObject: vi.fn(),
      deleteObject: vi.fn(),
      nodes: mockNodes,
      edges: mockEdges, // Card 1 and Card 2 are linked
      objects: [mockCard1, mockCard2],
      userRegistry: { user_id: 'usr_alice' },
      activeManifest: { space_id: 'spc_weave', space_name: 'Test Space' },
    };

    render(
      <I18nProvider>
        <LADContext.Provider value={contextVal}>
          <ObjectCard obj={mockCard1} />
        </LADContext.Provider>
      </I18nProvider>
    );

    const linksContainer = screen.getByTestId('card-links-card_111');
    expect(linksContainer).toBeInTheDocument();
    expect(linksContainer).toHaveTextContent('blocks');
    expect(linksContainer).toHaveTextContent('Implement Grover Algorithm');
  });
});
