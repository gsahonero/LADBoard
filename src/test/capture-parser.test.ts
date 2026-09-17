import { describe, it, expect } from 'vitest';
import { CaptureParser } from '../core/objects/capture-parser';

describe('Capture NLP & Heuristic Inference Engine', () => {
  const refDate = new Date('2026-09-16T12:00:00Z');

  it('correctly interprets the canonical medical specification example in English', () => {
    const input = 'Doctor says continue medication, blood test in 2 weeks, dad needs to schedule follow-up.';
    const result = CaptureParser.parse(input, refDate);

    expect(result.domain).toBe('health');
    expect(result.assignedTo).toBe('Dad');
    expect(result.tags).toContain('health');
    expect(result.tags).toContain('medication');
    expect(result.tags).toContain('lab-test');
    expect(result.tags).toContain('follow-up');

    // 2 weeks from 2026-09-16 -> 2026-09-30
    expect(result.dueDate).toBe('2026-09-30');
    expect(result.extractedEntities.some((e) => e.name === 'Doctor')).toBe(true);
    expect(result.extractedEntities.some((e) => e.name === 'Dad')).toBe(true);
  });

  it('correctly interprets Spanish medical capture text', () => {
    const input = 'El médico dice continuar medicación, análisis en 2 semanas, papá tiene que programar el seguimiento.';
    const result = CaptureParser.parse(input, refDate);

    expect(result.domain).toBe('health');
    expect(result.assignedTo).toBe('Dad');
    expect(result.dueDate).toBe('2026-09-30');
  });

  it('detects finance domains and urgency in English and Spanish', () => {
    const inputEn = 'Urgent: Bank balance is low, need to pay electricity bill tomorrow';
    const resEn = CaptureParser.parse(inputEn, refDate);

    expect(resEn.domain).toBe('finances');
    expect(resEn.priority).toBe('urgent');
    // Tomorrow from 2026-09-16 -> 2026-09-17
    expect(resEn.dueDate).toBe('2026-09-17');

    const inputEs = 'Urgente: revisar saldo del banco y pagar factura mañana';
    const resEs = CaptureParser.parse(inputEs, refDate);

    expect(resEs.domain).toBe('finances');
    expect(resEs.priority).toBe('urgent');
    expect(resEs.dueDate).toBe('2026-09-17');
  });

  it('detects shopping domain and grocery items', () => {
    const input = 'Buy organic milk, apples, and bread from supermarket';
    const res = CaptureParser.parse(input, refDate);

    expect(res.domain).toBe('shopping');
    expect(res.priority).toBe('medium');
  });
});
