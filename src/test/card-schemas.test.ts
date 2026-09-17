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
});
