/**
 * LAD Board — Schema Registry for Categories & Card Types
 * Manages immutable system defaults and mutable per-space custom card types.
 */

import { LADCardTypeDefinition, LADCategoryDefinition } from './card-types';
import { DEFAULT_CARD_TYPES, DEFAULT_CATEGORIES } from './default-card-types';

export class SchemaRegistry {
  private categories: Map<string, LADCategoryDefinition> = new Map();
  private defaultCardTypes: Map<string, LADCardTypeDefinition> = new Map();
  private customCardTypes: Map<string, LADCardTypeDefinition> = new Map();

  constructor(customTypes: LADCardTypeDefinition[] = []) {
    // Seed default categories
    for (const cat of DEFAULT_CATEGORIES) {
      this.categories.set(cat.id, { ...cat });
    }

    // Seed default card types
    for (const ct of DEFAULT_CARD_TYPES) {
      this.defaultCardTypes.set(ct.id, { ...ct, isDefault: true });
    }

    // Load custom types if any
    this.loadCustomCardTypes(customTypes);
  }

  loadCustomCardTypes(customTypes: LADCardTypeDefinition[]) {
    this.customCardTypes.clear();
    for (const ct of customTypes) {
      if (!this.defaultCardTypes.has(ct.id)) {
        this.customCardTypes.set(ct.id, { ...ct, isDefault: false });
      }
    }
  }

  getAllCategories(): LADCategoryDefinition[] {
    return Array.from(this.categories.values());
  }

  getCategory(id: string): LADCategoryDefinition | undefined {
    return this.categories.get(id);
  }

  getAllCardTypes(): LADCardTypeDefinition[] {
    return [
      ...Array.from(this.defaultCardTypes.values()),
      ...Array.from(this.customCardTypes.values()),
    ];
  }

  getCardTypesForCategory(categoryId: string): LADCardTypeDefinition[] {
    return this.getAllCardTypes().filter((ct) => ct.category === categoryId);
  }

  getCardType(id: string): LADCardTypeDefinition | undefined {
    return this.defaultCardTypes.get(id) || this.customCardTypes.get(id);
  }

  addCustomCardType(definition: LADCardTypeDefinition): LADCardTypeDefinition {
    if (this.defaultCardTypes.has(definition.id)) {
      throw new Error(`Cannot overwrite default card type "${definition.id}"`);
    }
    const sanitized: LADCardTypeDefinition = {
      ...definition,
      isDefault: false,
    };
    this.customCardTypes.set(sanitized.id, sanitized);
    return sanitized;
  }

  updateCustomCardType(id: string, definition: Partial<LADCardTypeDefinition>): LADCardTypeDefinition {
    if (this.defaultCardTypes.has(id)) {
      throw new Error(`Cannot modify immutable default card type "${id}"`);
    }
    const existing = this.customCardTypes.get(id);
    if (!existing) {
      throw new Error(`Custom card type "${id}" not found`);
    }
    const updated: LADCardTypeDefinition = {
      ...existing,
      ...definition,
      id,
      isDefault: false,
    };
    this.customCardTypes.set(id, updated);
    return updated;
  }

  deleteCustomCardType(id: string): boolean {
    if (this.defaultCardTypes.has(id)) {
      throw new Error(`Cannot delete immutable default card type "${id}"`);
    }
    return this.customCardTypes.delete(id);
  }

  exportCustomCardTypes(): LADCardTypeDefinition[] {
    return Array.from(this.customCardTypes.values());
  }

  /**
   * Singleton instance for general use
   */
  private static instance: SchemaRegistry;
  static getInstance(): SchemaRegistry {
    if (!SchemaRegistry.instance) {
      SchemaRegistry.instance = new SchemaRegistry();
    }
    return SchemaRegistry.instance;
  }
}
