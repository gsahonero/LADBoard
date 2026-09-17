/**
 * LAD Board — Declarative Card & Field Schema Types
 */

export type LADFieldType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'select'
  | 'person'
  | 'checklist'
  | 'boolean';

export interface LADChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface LADFieldConditional {
  field: string;
  operator?: 'equals' | 'truthy' | 'falsy';
  value?: any;
}

export interface LADFieldDefinition {
  key: string;
  label: string;
  type: LADFieldType;
  required?: boolean;
  defaultValue?: any;
  placeholder?: string;
  options?: string[]; // For 'select' type (supports extensible write-ins)
  allowCustomOption?: boolean;
  conditional?: LADFieldConditional;
  description?: string;
}

export type OnItsWayActionType = 'schedule' | 'delegate' | 'complete' | 'snooze';

export interface OnItsWayActionOption {
  id: string;
  label: string;
  actionType: OnItsWayActionType;
  description?: string;
}

export interface LADCardLifecycleConfig {
  autoArchiveDays?: number; // Days before passive card transitions to Archive (defaults to space setting)
  hasFollowup?: boolean;
  onItsWayActions?: OnItsWayActionOption[];
}

export interface LADCardNLPConfig {
  keywords: string[]; // Keywords that indicate this card type
  slotPatterns?: Record<string, string[]>; // regex patterns for extracting field values
}

export interface LADCardTypeDefinition {
  id: string; // e.g. 'finances.account_balance', 'shopping.groceries_buying'
  category: string; // 'finances', 'shopping', 'health', 'home', 'documents', 'projects', 'general'
  name: string; // Human-friendly display name
  description?: string;
  icon?: string;
  isDefault?: boolean; // Immutable system default vs space custom type
  fields: LADFieldDefinition[];
  nlp?: LADCardNLPConfig;
  lifecycle?: LADCardLifecycleConfig;
}

export interface LADCategoryDefinition {
  id: string; // e.g. 'finances', 'health'
  name: string;
  icon: string;
  color: string;
  keywords: string[]; // Seed keywords for category detection
  inferredKeywords?: string[]; // Learned or space-configured synonyms
}
