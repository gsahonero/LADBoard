/**
 * Operations and Versioning Types for LAD Standard
 */

import { LADOperation } from '../standard/types';

export interface PendingChange<T = any> {
  targetId: string;
  type: 'object.update' | 'graph.node.update' | 'graph.edge.update' | string;
  actor: string;
  spaceId: string;
  originalState: T;
  currentState: T;
  patch: Record<string, any>;
  firstModifiedAt: number;
  lastModifiedAt: number;
  timerId?: any;
}

export interface OperationBatch {
  batchId: string;
  spaceId: string;
  operations: LADOperation[];
  createdAt: string;
}
