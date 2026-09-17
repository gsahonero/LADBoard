import { describe, it, expect } from 'vitest';
import { CaptureParser } from '../core/objects/capture-parser';
import { SchemaRegistry } from '../core/schemas/schema-registry';

describe('CaptureParser Schema & Dynamic Slot Filling', () => {
  const refDate = new Date('2026-09-17T12:00:00Z');

  it('infers finances category, account_balance card type, bank, account type, and balance from user query', () => {
    const input = 'Bank A checking account new balance is $19';
    const result = CaptureParser.parse(input, refDate);

    expect(result.domain).toBe('finances');
    expect(result.cardTypeId).toBe('finances.account_balance');
    expect(result.fieldValues?.bank).toBe('Bank A');
    expect(result.fieldValues?.account_type).toBe('checking');
    expect(result.fieldValues?.balance).toBe(19);
    expect(result.suggestedAttributes.balance).toBe(19);
    expect(result.suggestedAttributes.bank).toBe('Bank A');
    expect(result.suggestedAttributes.account_type).toBe('checking');
  });

  it('infers shopping groceries checklist and estimated budget', () => {
    const input = 'Weekly groceries buy milk, bread, eggs, budget $45 due tomorrow';
    const result = CaptureParser.parse(input, refDate);

    expect(result.domain).toBe('shopping');
    expect(result.cardTypeId).toBe('shopping.groceries_buying');
    expect(result.fieldValues?.estimated_budget).toBe(45);
    expect(result.fieldValues?.checklist).toBeDefined();
    expect(result.fieldValues?.checklist.length).toBeGreaterThanOrEqual(3);

    const itemTexts = result.fieldValues?.checklist.map((i: any) => i.text.toLowerCase());
    expect(itemTexts).toContain('milk');
    expect(itemTexts).toContain('bread');
    expect(itemTexts).toContain('eggs');
    expect(result.dueDate).toBe('2026-09-18');
  });

  it('infers health medical appointment, specialty, patient, outcome, and conditional follow-up', () => {
    const input = 'Medical appointment with dentist for Carlos today outcome: cavity filled, follow up in 2 weeks';
    const result = CaptureParser.parse(input, refDate);

    expect(result.domain).toBe('health');
    expect(result.cardTypeId).toBe('health.medical_appointment');
    expect(result.fieldValues?.specialty).toBe('Dentistry');
    expect(result.fieldValues?.patient).toBe('Carlos');
    expect(result.fieldValues?.outcome).toBe('cavity filled');
    expect(result.fieldValues?.needs_followup).toBe(true);
    expect(result.fieldValues?.followup_date).toBe('2026-10-01'); // 14 days after Sept 17
    expect(result.suggestedAttributes.has_followup).toBe(true);
    expect(result.suggestedAttributes.followup?.date).toBe('2026-10-01');
  });

  it('gracefully handles custom space categories and card types', () => {
    const registry = new SchemaRegistry();
    registry.addCustomCardType({
      id: 'custom.pet_visit',
      category: 'health',
      name: 'Veterinary Visit',
      fields: [
        { key: 'pet', label: 'Pet', type: 'text', required: true },
        { key: 'vet', label: 'Vet Clinic', type: 'text' },
      ],
      nlp: {
        keywords: ['vet', 'veterinary', 'veterinario'],
      },
    });

    const input = 'veterinary visit for Max at City Vet';
    const result = CaptureParser.parse(input, refDate, registry);

    expect(result.domain).toBe('health');
    expect(result.cardTypeId).toBe('custom.pet_visit');
  });
});
