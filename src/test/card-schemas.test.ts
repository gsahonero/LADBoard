import { describe, it, expect } from 'vitest';
import { SchemaRegistry } from '../core/schemas/schema-registry';
import { DEFAULT_CARD_TYPES, DEFAULT_CATEGORIES } from '../core/schemas/default-card-types';

describe('Card Schema Registry', () => {
  it('loads built-in default categories and card types', () => {
    const registry = new SchemaRegistry();
    const categories = registry.getAllCategories();
    expect(categories.length).toBeGreaterThanOrEqual(DEFAULT_CATEGORIES.length);
    expect(categories.map((c) => c.id)).toContain('finances');
    expect(categories.map((c) => c.id)).toContain('shopping');
    expect(categories.map((c) => c.id)).toContain('health');

    const cardTypes = registry.getAllCardTypes();
    expect(cardTypes.length).toBeGreaterThanOrEqual(DEFAULT_CARD_TYPES.length);
    expect(cardTypes.map((c) => c.id)).toContain('finances.account_balance');
    expect(cardTypes.map((c) => c.id)).toContain('shopping.groceries_buying');
    expect(cardTypes.map((c) => c.id)).toContain('health.medical_appointment');
  });

  it('retrieves card types by category', () => {
    const registry = new SchemaRegistry();
    const financeTypes = registry.getCardTypesForCategory('finances');
    expect(financeTypes.length).toBeGreaterThanOrEqual(1);
    expect(financeTypes[0].id).toBe('finances.account_balance');

    const accountTypeField = financeTypes[0].fields.find((f) => f.key === 'account_type');
    expect(accountTypeField?.type).toBe('select');
    expect(accountTypeField?.options).toContain('checking');
  });

  it('allows adding and retrieving custom card types per space', () => {
    const registry = new SchemaRegistry();
    const custom = registry.addCustomCardType({
      id: 'custom.pet_vaccine',
      category: 'health',
      name: 'Pet Vaccine',
      description: 'Tracks pet vaccination records and boosters',
      fields: [
        { key: 'pet_name', label: 'Pet Name', type: 'text', required: true },
        { key: 'vaccine_name', label: 'Vaccine', type: 'text', required: true },
        { key: 'booster_due', label: 'Booster Date', type: 'date' },
      ],
      nlp: {
        keywords: ['vaccine', 'vacuna', 'pet', 'vet', 'veterinario'],
      },
      lifecycle: {
        hasFollowup: true,
      },
    });

    expect(custom.id).toBe('custom.pet_vaccine');
    expect(custom.isDefault).toBe(false);

    const fetched = registry.getCardType('custom.pet_vaccine');
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe('Pet Vaccine');

    // Default card types cannot be overwritten or deleted
    expect(() => {
      registry.addCustomCardType({
        id: 'finances.account_balance',
        category: 'finances',
        name: 'Hacked',
        fields: [],
      });
    }).toThrow();

    expect(() => {
      registry.deleteCustomCardType('finances.account_balance');
    }).toThrow();

    // Custom card types can be updated and deleted
    registry.updateCustomCardType('custom.pet_vaccine', { name: 'Pet Vaccination Record' });
    expect(registry.getCardType('custom.pet_vaccine')?.name).toBe('Pet Vaccination Record');

    const deleted = registry.deleteCustomCardType('custom.pet_vaccine');
    expect(deleted).toBe(true);
    expect(registry.getCardType('custom.pet_vaccine')).toBeUndefined();
  });

  it('supports unified deleteCardType for custom and default types', () => {
    const registry = new SchemaRegistry();

    // 1. Add custom card type and delete it via deleteCardType
    registry.addCustomCardType({
      id: 'custom.workout',
      category: 'health',
      name: 'Workout Log',
      fields: [{ key: 'reps', label: 'Reps', type: 'number' }],
    });
    expect(registry.getCardType('custom.workout')).toBeDefined();
    const customDeleted = registry.deleteCardType('custom.workout');
    expect(customDeleted).toBe(true);
    expect(registry.getCardType('custom.workout')).toBeUndefined();

    // 2. Delete default card type via deleteCardType (removes/disables it for space)
    expect(registry.getCardType('shopping.groceries_buying')).toBeDefined();
    expect(registry.isCardTypeDisabled('shopping.groceries_buying')).toBe(false);

    const defaultDeleted = registry.deleteCardType('shopping.groceries_buying');
    expect(defaultDeleted).toBe(true);
    expect(registry.isCardTypeDisabled('shopping.groceries_buying')).toBe(true);
    expect(registry.getCardType('shopping.groceries_buying')).toBeUndefined();

    // Not included in getAllCardTypes() by default
    const activeTypes = registry.getAllCardTypes();
    expect(activeTypes.some((ct) => ct.id === 'shopping.groceries_buying')).toBe(false);

    // Can be exported
    expect(registry.exportDisabledCardTypeIds()).toContain('shopping.groceries_buying');

    // Can be restored
    registry.restoreCardType('shopping.groceries_buying');
    expect(registry.isCardTypeDisabled('shopping.groceries_buying')).toBe(false);
    expect(registry.getCardType('shopping.groceries_buying')).toBeDefined();
  });

  it('generates quick starters dynamically matching available card types', async () => {
    const { getDefaultQuickStarters } = await import('../core/schemas/default-card-types');
    const registry = new SchemaRegistry();
    const available = registry.getAllCardTypes();

    const starters = getDefaultQuickStarters(available);
    expect(starters.length).toBeGreaterThan(0);
    expect(starters.every((s) => s.id && s.cardTypeId && s.label && s.templateText)).toBe(true);

    // If a card type is deleted/disabled, quick starters filter it out
    registry.deleteCardType('health.medical_appointment');
    const remainingAvailable = registry.getAllCardTypes();
    const filteredStarters = getDefaultQuickStarters(remainingAvailable);
    expect(filteredStarters.some((s) => s.cardTypeId === 'health.medical_appointment')).toBe(false);
  });
});
