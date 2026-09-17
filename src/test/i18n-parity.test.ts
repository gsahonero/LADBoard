import { describe, it, expect } from 'vitest';
import en from '../locales/en.json';
import es from '../locales/es.json';

describe('Multilingual i18n Key Parity (EN & ES)', () => {
  function getFlattenedKeys(obj: any, prefix = ''): string[] {
    let keys: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys = keys.concat(getFlattenedKeys(value, fullPath));
      } else {
        keys.push(fullPath);
      }
    }
    return keys.sort();
  }

  it('has identical keys in English and Spanish locale files', () => {
    const enKeys = getFlattenedKeys(en);
    const esKeys = getFlattenedKeys(es);

    const missingInEs = enKeys.filter((k) => !esKeys.includes(k));
    const missingInEn = esKeys.filter((k) => !enKeys.includes(k));

    expect(missingInEs, `Keys in EN but missing in ES: ${missingInEs.join(', ')}`).toEqual([]);
    expect(missingInEn, `Keys in ES but missing in EN: ${missingInEn.join(', ')}`).toEqual([]);
  });

  it('contains no empty translation strings', () => {
    const enKeys = getFlattenedKeys(en);
    for (const key of enKeys) {
      const parts = key.split('.');
      let valEn: any = en;
      let valEs: any = es;
      for (const p of parts) {
        valEn = valEn[p];
        valEs = valEs[p];
      }
      expect(typeof valEn === 'string' && valEn.trim().length > 0).toBe(true);
      expect(typeof valEs === 'string' && valEs.trim().length > 0).toBe(true);
    }
  });
});
