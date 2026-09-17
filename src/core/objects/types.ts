/**
 * Object & Capture Types for LAD Board
 */

import { LADObjectPriority } from '../standard/types';

export interface InferredStructure {
  rawText: string;
  title: string;
  domain: string;
  priority: LADObjectPriority;
  dueDate?: string;
  assignedTo?: string;
  tags: string[];
  extractedActions: string[];
  extractedEntities: Array<{ name: string; type: string }>;
  suggestedAttributes: Record<string, any>;
}
