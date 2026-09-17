/**
 * Cognitive Psychology Color Palette Definitions
 * Tailored specifically for sensory regulation, ADHD focus, autism-friendly ergonomics, and neurotypical comfort.
 */

export type PaletteId = 'ocean' | 'sage' | 'amber' | 'lavender' | 'minimal';

export interface CognitivePalette {
  id: PaletteId;
  nameKey: string;
  descKey: string;
  icon: string;
  primaryHex: string;
  accentHex: string;
  bgLightHex: string;
  bgDarkHex: string;
  cssVars: {
    '--color-primary': string;
    '--color-primary-hover': string;
    '--color-primary-light': string;
    '--color-primary-dark': string;
    '--color-accent': string;
    '--color-glow': string;
    '--doorway-gradient-from': string;
    '--doorway-gradient-via': string;
    '--doorway-gradient-to': string;
  };
}

export const COGNITIVE_PALETTES: Record<PaletteId, CognitivePalette> = {
  ocean: {
    id: 'ocean',
    nameKey: 'settings.palettes.ocean.name',
    descKey: 'settings.palettes.ocean.desc',
    icon: '🌊',
    primaryHex: '#2563eb',
    accentHex: '#0284c7',
    bgLightHex: '#f8fafc',
    bgDarkHex: '#0f172a',
    cssVars: {
      '--color-primary': '#2563eb',
      '--color-primary-hover': '#1d4ed8',
      '--color-primary-light': '#eff6ff',
      '--color-primary-dark': '#1e40af',
      '--color-accent': '#0284c7',
      '--color-glow': 'rgba(37, 99, 235, 0.25)',
      '--doorway-gradient-from': '#0f172a',
      '--doorway-gradient-via': '#1e1b4b',
      '--doorway-gradient-to': '#172554',
    },
  },
  sage: {
    id: 'sage',
    nameKey: 'settings.palettes.sage.name',
    descKey: 'settings.palettes.sage.desc',
    icon: '🌿',
    primaryHex: '#16a34a',
    accentHex: '#0d9488',
    bgLightHex: '#f4f7f4',
    bgDarkHex: '#0c1a11',
    cssVars: {
      '--color-primary': '#16a34a',
      '--color-primary-hover': '#15803d',
      '--color-primary-light': '#f0fdf4',
      '--color-primary-dark': '#166534',
      '--color-accent': '#0d9488',
      '--color-glow': 'rgba(22, 163, 74, 0.25)',
      '--doorway-gradient-from': '#064e3b',
      '--doorway-gradient-via': '#022c22',
      '--doorway-gradient-to': '#0f172a',
    },
  },
  amber: {
    id: 'amber',
    nameKey: 'settings.palettes.amber.name',
    descKey: 'settings.palettes.amber.desc',
    icon: '🌅',
    primaryHex: '#d97706',
    accentHex: '#ea580c',
    bgLightHex: '#faf7f2',
    bgDarkHex: '#1c1611',
    cssVars: {
      '--color-primary': '#d97706',
      '--color-primary-hover': '#b45309',
      '--color-primary-light': '#fffbeb',
      '--color-primary-dark': '#92400e',
      '--color-accent': '#ea580c',
      '--color-glow': 'rgba(217, 119, 6, 0.25)',
      '--doorway-gradient-from': '#78350f',
      '--doorway-gradient-via': '#451a03',
      '--doorway-gradient-to': '#0f172a',
    },
  },
  lavender: {
    id: 'lavender',
    nameKey: 'settings.palettes.lavender.name',
    descKey: 'settings.palettes.lavender.desc',
    icon: '💜',
    primaryHex: '#7c3aed',
    accentHex: '#9333ea',
    bgLightHex: '#f8f7fc',
    bgDarkHex: '#151120',
    cssVars: {
      '--color-primary': '#7c3aed',
      '--color-primary-hover': '#6d28d9',
      '--color-primary-light': '#faf5ff',
      '--color-primary-dark': '#5b21b6',
      '--color-accent': '#9333ea',
      '--color-glow': 'rgba(124, 58, 237, 0.25)',
      '--doorway-gradient-from': '#3b0764',
      '--doorway-gradient-via': '#2e1065',
      '--doorway-gradient-to': '#0f172a',
    },
  },
  minimal: {
    id: 'minimal',
    nameKey: 'settings.palettes.minimal.name',
    descKey: 'settings.palettes.minimal.desc',
    icon: '🌑',
    primaryHex: '#475569',
    accentHex: '#334155',
    bgLightHex: '#f8fafc',
    bgDarkHex: '#0f172a',
    cssVars: {
      '--color-primary': '#475569',
      '--color-primary-hover': '#334155',
      '--color-primary-light': '#f1f5f9',
      '--color-primary-dark': '#1e293b',
      '--color-accent': '#64748b',
      '--color-glow': 'rgba(71, 85, 105, 0.2)',
      '--doorway-gradient-from': '#1e293b',
      '--doorway-gradient-via': '#0f172a',
      '--doorway-gradient-to': '#020617',
    },
  },
};

export class PaletteManager {
  private static currentPalette: PaletteId = 'ocean';

  static applyPalette(paletteId: PaletteId): void {
    const palette = COGNITIVE_PALETTES[paletteId] || COGNITIVE_PALETTES.ocean;
    this.currentPalette = palette.id;

    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      Object.entries(palette.cssVars).forEach(([key, val]) => {
        root.style.setProperty(key, val);
      });
      root.setAttribute('data-palette', palette.id);
      localStorage.setItem('lad_palette', palette.id);
    }
  }

  static getInitialPalette(): PaletteId {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('lad_palette') as PaletteId;
      if (saved && COGNITIVE_PALETTES[saved]) {
        return saved;
      }
    }
    return 'ocean';
  }

  static getCurrentPalette(): PaletteId {
    return this.currentPalette;
  }
}
