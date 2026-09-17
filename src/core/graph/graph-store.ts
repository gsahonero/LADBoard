/**
 * Graph Store managing Nodes, Edges, and Graph Persistence for LAD Spaces
 */

import { LADGraphNode, LADGraphEdge, LADNodeType } from '../standard/types';
import { validateGraphNode, validateGraphEdge } from '../standard/validators';
import { IStorageProvider } from '../storage/provider.interface';

export class GraphStore {
  private spaceId: string;
  private storage: IStorageProvider;
  private nodes: Map<string, LADGraphNode> = new Map();
  private edges: Map<string, LADGraphEdge> = new Map();

  constructor(spaceId: string, storage: IStorageProvider) {
    this.spaceId = spaceId;
    this.storage = storage;
  }

  private getNodesPath(): string {
    return `LAD/${this.spaceId}/graph/nodes.json`;
  }

  private getEdgesPath(): string {
    return `LAD/${this.spaceId}/graph/edges.json`;
  }

  async load(): Promise<void> {
    const rawNodes = await this.storage.readFile<LADGraphNode[]>(this.getNodesPath());
    const rawEdges = await this.storage.readFile<LADGraphEdge[]>(this.getEdgesPath());

    this.nodes.clear();
    this.edges.clear();

    if (rawNodes && Array.isArray(rawNodes)) {
      for (const node of rawNodes) {
        try {
          validateGraphNode(node);
          this.nodes.set(node.node_id, node);
        } catch {
          // Skip corrupt node
        }
      }
    }

    if (rawEdges && Array.isArray(rawEdges)) {
      for (const edge of rawEdges) {
        try {
          validateGraphEdge(edge);
          this.edges.set(edge.edge_id, edge);
        } catch {
          // Skip corrupt edge
        }
      }
    }
  }

  async save(): Promise<void> {
    const nodesArray = Array.from(this.nodes.values());
    const edgesArray = Array.from(this.edges.values());

    await this.storage.writeFile(this.getNodesPath(), nodesArray);
    await this.storage.writeFile(this.getEdgesPath(), edgesArray);
  }

  getNodes(): LADGraphNode[] {
    return Array.from(this.nodes.values());
  }

  getEdges(): LADGraphEdge[] {
    return Array.from(this.edges.values());
  }

  getNode(nodeId: string): LADGraphNode | undefined {
    return this.nodes.get(nodeId);
  }

  getEdge(edgeId: string): LADGraphEdge | undefined {
    return this.edges.get(edgeId);
  }

  async addNode(node: LADGraphNode): Promise<void> {
    validateGraphNode(node);
    this.nodes.set(node.node_id, node);
    await this.save();
  }

  async updateNode(nodeId: string, updates: Partial<LADGraphNode>): Promise<LADGraphNode | null> {
    const existing = this.nodes.get(nodeId);
    if (!existing) return null;

    const updated: LADGraphNode = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    validateGraphNode(updated);
    this.nodes.set(nodeId, updated);
    await this.save();
    return updated;
  }

  async removeNode(nodeId: string): Promise<boolean> {
    const removed = this.nodes.delete(nodeId);
    if (removed) {
      // Remove all associated edges
      for (const [edgeId, edge] of this.edges.entries()) {
        if (edge.source === nodeId || edge.target === nodeId) {
          this.edges.delete(edgeId);
        }
      }
      await this.save();
    }
    return removed;
  }

  async addEdge(edge: LADGraphEdge): Promise<void> {
    validateGraphEdge(edge);
    this.edges.set(edge.edge_id, edge);
    await this.save();
  }

  async updateEdge(edgeId: string, updates: Partial<LADGraphEdge>): Promise<LADGraphEdge | null> {
    const existing = this.edges.get(edgeId);
    if (!existing) return null;

    const updated: LADGraphEdge = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    validateGraphEdge(updated);
    this.edges.set(edgeId, updated);
    await this.save();
    return updated;
  }

  async removeEdge(edgeId: string): Promise<boolean> {
    const removed = this.edges.delete(edgeId);
    if (removed) {
      await this.save();
    }
    return removed;
  }

  /**
   * Helper to ensure a node exists for an object or user
   */
  async ensureNodeForEntity(
    entityId: string,
    type: LADNodeType,
    label: string,
    metadata?: Record<string, any>
  ): Promise<LADGraphNode> {
    const existing = Array.from(this.nodes.values()).find((n) => n.ref_id === entityId);
    if (existing) return existing;

    const nodeId = `node_${entityId}`;
    const newNode: LADGraphNode = {
      node_id: nodeId,
      type,
      label,
      ref_id: entityId,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.addNode(newNode);
    return newNode;
  }
}
