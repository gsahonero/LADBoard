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
  quickEdit?: boolean; // When true, allows for a quick editor directly on the card without editing the full card
}

export type OnItsWayActionType = 'schedule' | 'delegate' | 'complete' | 'snooze';

export interface OnItsWayActionOption {
  id: string;
  label: string;
  actionType: OnItsWayActionType;
  description?: string;
}

export interface LADCardLifecycleConfig {
  autoArchiveEnabled?: boolean; // Whether auto-archive is enabled for this card type
  autoArchiveDays?: number; // Days before passive card transitions to Archive (defaults to space setting)
  hasFollowup?: boolean;
  onItsWayActions?: OnItsWayActionOption[];
}

export interface LADCardNLPConfig {
  keywords: string[]; // Keywords that indicate this card type
  slotPatterns?: Record<string, string[]>; // regex patterns for extracting field values
}

export type LADCardTitleMode = 'input_text' | 'fixed' | 'template';

export interface LADCardTitleConfig {
  mode: LADCardTitleMode;
  fixedTitle?: string; // If mode is 'fixed' (e.g. "Saldo", "Account Balance")
  template?: string; // If mode is 'template' (e.g. "{bank} Balance", "{specialty} Appointment")
}

export interface LADCardTypeDefinition {
  id: string; // e.g. 'finances.account_balance', 'shopping.groceries_buying'
  category: string; // 'finances', 'shopping', 'health', 'home', 'documents', 'projects', 'general'
  name: string; // Human-friendly display name
  description?: string;
  icon?: string;
  isDefault?: boolean; // Immutable system default vs space custom type
  isSpaceCustomized?: boolean; // True when this space has customized this default card type
  overridesDefaultId?: string; // If this custom card type is a space-customized copy of a default card type
  isUniqueState?: boolean; // When true, cards of this type represent a unique continuous state rather than duplicate cards (e.g. account/card balance for a bank)
  uniqueKeyFields?: string[]; // Field keys that define entity uniqueness (e.g. ['bank'])
  storeNotes?: boolean; // When false, no notes/raw description is stored for cards of this type (defaults to true)
  noNotesStored?: boolean; // Optional alias: when true, no notes/raw description is stored for cards of this type
  fields: LADFieldDefinition[];
  titleConfig?: LADCardTitleConfig; // Configurable title behavior
  nlp?: LADCardNLPConfig;
  lifecycle?: LADCardLifecycleConfig;
}

/**
 * Checks whether storage of notes and raw description is disabled for a given card type.
 * Optional behavior: returns true if storeNotes is false, noNotesStored is true, or storeRawDescription is false.
 */
export function isNotesStorageDisabled(cardType?: LADCardTypeDefinition | null): boolean {
  if (!cardType) return false;
  return Boolean(
    cardType.storeNotes === false ||
    cardType.noNotesStored === true ||
    (cardType as any).storeRawDescription === false
  );
}

export interface LADCategoryDefinition {
  id: string; // e.g. 'finances', 'health'
  name: string;
  icon: string;
  color: string;
  keywords: string[]; // Seed keywords for category detection
  inferredKeywords?: string[]; // Learned or space-configured synonyms
}
