/**
 * LAD Standard 1.0 — Runtime Schema Validators
 */

import { LADSpaceManifest, LADUserRegistry, LADObject, LADOperation, LADGraphNode, LADGraphEdge } from './types';
import { LAD_STANDARD_VERSION } from './constants';

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(`[LAD Standard Validation Error] ${field}: ${message}`);
    this.name = 'ValidationError';
  }
}

export function validateSpaceManifest(manifest: Partial<LADSpaceManifest>): manifest is LADSpaceManifest {
  if (!manifest.lad_standard || manifest.lad_standard !== LAD_STANDARD_VERSION) {
    throw new ValidationError('lad_standard', `Expected standard version "${LAD_STANDARD_VERSION}", got "${manifest.lad_standard}"`);
  }
  if (!manifest.space_id || !manifest.space_id.startsWith('spc_')) {
    throw new ValidationError('space_id', `Invalid space_id "${manifest.space_id}". Must start with "spc_"`);
  }
  if (!manifest.space_name || typeof manifest.space_name !== 'string' || manifest.space_name.trim().length === 0) {
    throw new ValidationError('space_name', 'Space name must be a non-empty string');
  }
  if (!manifest.created_by || !manifest.created_by.startsWith('usr_')) {
    throw new ValidationError('created_by', `Invalid created_by "${manifest.created_by}". Must start with "usr_"`);
  }
  return true;
}

export function validateUserRegistry(registry: Partial<LADUserRegistry>): registry is LADUserRegistry {
  if (!registry.lad_standard || registry.lad_standard !== LAD_STANDARD_VERSION) {
    throw new ValidationError('lad_standard', `Expected standard version "${LAD_STANDARD_VERSION}", got "${registry.lad_standard}"`);
  }
  if (!registry.user_id || !registry.user_id.startsWith('usr_')) {
    throw new ValidationError('user_id', `Invalid user_id "${registry.user_id}". Must start with "usr_"`);
  }
  if (!Array.isArray(registry.spaces)) {
    throw new ValidationError('spaces', 'Spaces must be an array');
  }
  return true;
}

export function validateLADObject(obj: Partial<LADObject>): obj is LADObject {
  if (!obj.object_id || !obj.object_id.startsWith('obj_')) {
    throw new ValidationError('object_id', `Invalid object_id "${obj.object_id}". Must start with "obj_"`);
  }
  if (!obj.space_id || !obj.space_id.startsWith('spc_')) {
    throw new ValidationError('space_id', `Invalid space_id "${obj.space_id}"`);
  }
  if (!obj.title || typeof obj.title !== 'string' || obj.title.trim().length === 0) {
    throw new ValidationError('title', 'Object title must be a non-empty string');
  }
  if (!obj.domain || typeof obj.domain !== 'string') {
    throw new ValidationError('domain', 'Object domain must be specified');
  }
  return true;
}

export function validateLADOperation(op: Partial<LADOperation>): op is LADOperation {
  if (!op.operation_id || !op.operation_id.startsWith('op_')) {
    throw new ValidationError('operation_id', `Invalid operation_id "${op.operation_id}". Must start with "op_"`);
  }
  if (!op.actor || !op.actor.startsWith('usr_')) {
    throw new ValidationError('actor', `Invalid actor "${op.actor}". Must start with "usr_"`);
  }
  if (typeof op.lamport_clock !== 'number' || op.lamport_clock < 0) {
    throw new ValidationError('lamport_clock', 'Lamport clock must be a non-negative integer');
  }
  if (!op.type || typeof op.type !== 'string') {
    throw new ValidationError('type', 'Operation type is required');
  }
  return true;
}

export function validateGraphNode(node: Partial<LADGraphNode>): node is LADGraphNode {
  if (!node.node_id || typeof node.node_id !== 'string') {
    throw new ValidationError('node_id', 'Node ID is required');
  }
  if (!node.type || !['user', 'object', 'agent', 'domain', 'tag'].includes(node.type)) {
    throw new ValidationError('type', `Invalid node type "${node.type}"`);
  }
  if (!node.label || typeof node.label !== 'string') {
    throw new ValidationError('label', 'Node label is required');
  }
  return true;
}

export function validateGraphEdge(edge: Partial<LADGraphEdge>): edge is LADGraphEdge {
  if (!edge.edge_id || typeof edge.edge_id !== 'string') {
    throw new ValidationError('edge_id', 'Edge ID is required');
  }
  if (!edge.source || !edge.target) {
    throw new ValidationError('source/target', 'Source and target node IDs are required');
  }
  return true;
}
