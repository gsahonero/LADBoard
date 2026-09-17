/**
 * LAD Standard 1.0 — Core Data Types and Schemas
 */

export interface LADUserIdentity {
  provider: 'google' | 'local' | 'oidc';
  email?: string;
  subject_id: string;
  display_name?: string;
  avatar_url?: string;
}

export interface LADUserSpaceRef {
  space_id: string;
  space_name: string;
  icon?: string;
  color?: string;
  description?: string;
  categories?: string[];
  storage_provider: 'google_drive' | 'local_indexeddb' | 'memory';
  storage_reference: string; // folder_id or storage key
  role: 'owner' | 'editor' | 'viewer';
  status: 'active' | 'unavailable' | 'pending';
  last_synced_at?: string;
}

export interface LADUserRegistry {
  lad_standard: string; // "1.0"
  schema_version: string; // "1.0.0"
  user_id: string; // "usr_..."
  identities: LADUserIdentity[];
  spaces: LADUserSpaceRef[];
  preferences: {
    locale: 'en' | 'es';
    theme: 'light' | 'dark' | 'system';
    palette_theme?: string;
    change_commit_threshold_ms: number;
    active_evaluation_interval_ms: number;
    gdrive_client_id?: string;
  };
  device_metadata: {
    device_id: string;
    platform: string;
  };
  version: number;
  updated_at: string;
}

export interface LADSpaceSettings {
  calendar?: {
    enabled?: boolean;
    mode?: 'dedicated' | 'primary';
    calendar_name?: string;
    sync_due_dates?: boolean;
    sync_milestones?: boolean;
    auto_sync?: boolean;
  };
  invitations?: {
    default_method?: 'gmail' | 'link' | 'payload';
    default_role?: 'viewer' | 'editor';
  };
  connectivity?: {
    gdrive_enabled?: boolean;
    gmail_enabled?: boolean;
    calendar_enabled?: boolean;
  };
  auto_archive_days?: number;
  custom_card_types?: any[];
}

export interface LADSpaceManifest {
  lad_standard: string; // "1.0"
  schema_version: string; // "1.0.0"
  space_id: string; // "spc_..."
  space_name: string;
  icon?: string;
  color?: string;
  description?: string;
  categories?: string[];
  settings?: LADSpaceSettings;
  created_by: string; // "usr_..."
  created_at: string;
  updated_at: string;
  schema_extensions?: string[];
}

export type LADNodeType = 'user' | 'object' | 'agent' | 'domain' | 'tag';

export interface LADGraphNode {
  node_id: string;
  type: LADNodeType;
  label: string;
  ref_id?: string; // Links to object_id or user_id or agent_id
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type LADEdgePolicyTree = {
  notification?: {
    modification?: boolean | Record<string, any>;
    creation?: boolean | Record<string, any>;
    deletion?: boolean | Record<string, any>;
    [key: string]: any;
  };
  interaction?: {
    auto_forward?: boolean | Record<string, any>;
    [key: string]: any;
  };
  [key: string]: any;
};

export interface LADGraphEdge {
  edge_id: string;
  source: string; // node_id
  target: string; // node_id
  type: 'member_of' | 'assigned_to' | 'relates_to' | 'monitors' | 'collaborator' | string;
  policies?: LADEdgePolicyTree;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface LADGraph {
  space_id: string;
  nodes: LADGraphNode[];
  edges: LADGraphEdge[];
  updated_at: string;
}

export type LADObjectPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface LADObject {
  object_id: string; // "obj_..."
  space_id: string;
  title: string;
  description?: string;
  domain: string; // "health", "finances", "documents", "shopping", "home", etc.
  tags: string[];
  attributes: Record<string, any>; // Extensible document payload (e.g. balance, due_date, dosage)
  due_date?: string; // ISO date string
  assigned_to?: string; // user_id or node_id
  priority: LADObjectPriority;
  status: 'active' | 'completed' | 'archived' | 'pending';
  last_checked_at?: string; // for staleness tracking
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export type LADOperationType =
  | 'object.create'
  | 'object.update'
  | 'object.delete'
  | 'graph.node.add'
  | 'graph.node.update'
  | 'graph.node.remove'
  | 'graph.edge.add'
  | 'graph.edge.update'
  | 'graph.edge.remove'
  | 'space.manifest.update'
  | 'invitation.create'
  | 'invitation.accept'
  | 'membership.accept'
  | 'membership.remove';

export interface LADOperation {
  operation_id: string; // "op_..."
  space_id: string;
  actor: string; // "usr_..."
  timestamp: string;
  lamport_clock: number;
  type: LADOperationType;
  target: string; // object_id or node_id or edge_id
  patch: Record<string, any>; // JSON patch / delta
  prev_state_hash?: string;
}

export interface LADInvitation {
  invitation_id: string; // "inv_..."
  space_id: string;
  invited_by: string; // "usr_..."
  invited_name?: string;
  invited_email: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'invited' | 'accepted' | 'declined';
  created_at: string;
  accepted_at?: string;
}

export interface LADActiveAlert {
  alert_id: string;
  space_id: string;
  type: 'stale_balance' | 'upcoming_event' | 'unresolved_shopping' | 'pending_followup' | 'agent_proposal' | 'sync_fallback' | string;
  target_id: string; // object_id or agent_id
  title: string;
  message: string;
  due_date?: string;
  days_stale?: number;
  domain?: string;
  status: 'active' | 'dismissed' | 'snoozed' | 'approved' | 'rejected';
  created_at: string;
  metadata?: Record<string, any>;
}
