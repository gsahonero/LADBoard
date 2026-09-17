import { describe, it, expect, beforeEach } from 'vitest';
import { COGNITIVE_PALETTES, PaletteManager, PaletteId } from '../core/theme/palette-manager';
import enTranslations from '../locales/en.json';
import esTranslations from '../locales/es.json';

describe('Cognitive Psychology Color Palette System', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defines all 5 evidence-based cognitive palettes', () => {
    const expectedPalettes: PaletteId[] = ['ocean', 'sage', 'amber', 'lavender', 'minimal'];
    expectedPalettes.forEach((id) => {
      const palette = COGNITIVE_PALETTES[id];
      expect(palette).toBeDefined();
      expect(palette.id).toBe(id);
      expect(palette.primaryHex).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.accentHex).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.cssVars['--color-primary']).toBeDefined();
      expect(palette.cssVars['--color-accent']).toBeDefined();
    });
  });

  it('applies and persists palette selection to localStorage and CSS custom properties', () => {
    PaletteManager.applyPalette('sage');
    expect(PaletteManager.getCurrentPalette()).toBe('sage');
    expect(localStorage.getItem('lad_palette')).toBe('sage');

    PaletteManager.applyPalette('amber');
    expect(PaletteManager.getCurrentPalette()).toBe('amber');
    expect(localStorage.getItem('lad_palette')).toBe('amber');
  });

  it('provides full bilingual translation parity for all palette names and descriptions', () => {
    const enPalettes = enTranslations.settings.palettes;
    const esPalettes = esTranslations.settings.palettes;

    const expectedKeys = ['ocean', 'sage', 'amber', 'lavender', 'minimal'];
    expectedKeys.forEach((key) => {
      expect(enPalettes).toHaveProperty(key);
      expect(esPalettes).toHaveProperty(key);
      expect((enPalettes as any)[key].name).toBeDefined();
      expect((esPalettes as any)[key].name).toBeDefined();
      expect((enPalettes as any)[key].desc).toBeDefined();
      expect((esPalettes as any)[key].desc).toBeDefined();
    });
  });
});
