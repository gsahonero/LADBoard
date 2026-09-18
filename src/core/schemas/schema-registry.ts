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
  private spaceCustomizedDefaults: Map<string, LADCardTypeDefinition> = new Map();

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
    this.spaceCustomizedDefaults.clear();
    if (!customTypes || !Array.isArray(customTypes)) return;

    for (const ct of customTypes) {
      if (!ct) continue;
      const targetDefaultId = ct.overridesDefaultId || (this.defaultCardTypes.has(ct.id) ? ct.id : null);

      if (targetDefaultId && this.defaultCardTypes.has(targetDefaultId)) {
        this.spaceCustomizedDefaults.set(targetDefaultId, {
          ...ct,
          id: targetDefaultId,
          overridesDefaultId: targetDefaultId,
          isDefault: true,
          isSpaceCustomized: true,
        });
      } else {
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
    const defaults = Array.from(this.defaultCardTypes.values()).map((def) => {
      return this.spaceCustomizedDefaults.get(def.id) || def;
    });
    return [
      ...defaults,
      ...Array.from(this.customCardTypes.values()),
    ];
  }

  getCardTypesForCategory(categoryId: string): LADCardTypeDefinition[] {
    return this.getAllCardTypes().filter((ct) => ct.category === categoryId);
  }

  getCardType(id: string): LADCardTypeDefinition | undefined {
    return (
      this.spaceCustomizedDefaults.get(id) ||
      this.customCardTypes.get(id) ||
      this.defaultCardTypes.get(id)
    );
  }

  /**
   * Customizes the space's copy of a default card type.
   * Does not mutate global default immutability, but provides a space override.
   */
  customizeDefaultCardType(
    defaultId: string,
    definition: Partial<LADCardTypeDefinition>
  ): LADCardTypeDefinition {
    const original = this.defaultCardTypes.get(defaultId);
    if (!original) {
      throw new Error(`Default card type "${defaultId}" not found`);
    }
    const current = this.spaceCustomizedDefaults.get(defaultId) || original;
    const updated: LADCardTypeDefinition = {
      ...current,
      ...definition,
      id: defaultId,
      overridesDefaultId: defaultId,
      isDefault: true,
      isSpaceCustomized: true,
    };
    this.spaceCustomizedDefaults.set(defaultId, updated);
    return updated;
  }

  /**
   * Resets a default card type to its original system defaults for this space.
   */
  resetDefaultCardType(defaultId: string): boolean {
    return this.spaceCustomizedDefaults.delete(defaultId);
  }

  /**
   * Checks if a default card type has been customized for this space.
   */
  isDefaultCustomized(defaultId: string): boolean {
    return this.spaceCustomizedDefaults.has(defaultId);
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
      return this.customizeDefaultCardType(id, definition);
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
      throw new Error(`Cannot delete default card type "${id}"`);
    }
    return this.customCardTypes.delete(id);
  }

  exportCustomCardTypes(): LADCardTypeDefinition[] {
    return [
      ...Array.from(this.customCardTypes.values()),
      ...Array.from(this.spaceCustomizedDefaults.values()),
    ];
  }

  importCustomCardTypes(types: LADCardTypeDefinition[]): void {
    this.loadCustomCardTypes(types);
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
