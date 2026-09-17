/**
 * Space Identity Presets & Cognitive Styling Helpers
 * Provides curated icons, cognitive colors, gradient maps, and helper functions
 */

export interface SpaceColorOption {
  id: string;
  name: string;
  hex: string;
  twBorder: string;
  twBgLight: string;
  twBgDark: string;
  twText: string;
  twBadge: string;
  twGlow: string;
  gradient: string;
}

export const SPACE_COLOR_PRESETS: SpaceColorOption[] = [
  {
    id: 'blue',
    name: 'Sapphire Blue',
    hex: '#2563eb',
    twBorder: 'border-blue-500/80 dark:border-blue-400/80',
    twBgLight: 'bg-blue-500/10',
    twBgDark: 'dark:bg-blue-950/40',
    twText: 'text-blue-600 dark:text-blue-400',
    twBadge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    twGlow: 'rgba(37, 99, 235, 0.25)',
    gradient: 'from-blue-600 to-indigo-600',
  },
  {
    id: 'emerald',
    name: 'Forest Sage',
    hex: '#10b981',
    twBorder: 'border-emerald-500/80 dark:border-emerald-400/80',
    twBgLight: 'bg-emerald-500/10',
    twBgDark: 'dark:bg-emerald-950/40',
    twText: 'text-emerald-600 dark:text-emerald-400',
    twBadge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    twGlow: 'rgba(16, 185, 129, 0.25)',
    gradient: 'from-emerald-600 to-teal-600',
  },
  {
    id: 'amber',
    name: 'Warm Sunset',
    hex: '#f59e0b',
    twBorder: 'border-amber-500/80 dark:border-amber-400/80',
    twBgLight: 'bg-amber-500/10',
    twBgDark: 'dark:bg-amber-950/40',
    twText: 'text-amber-600 dark:text-amber-400',
    twBadge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    twGlow: 'rgba(245, 158, 11, 0.25)',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 'purple',
    name: 'Soft Iris',
    hex: '#8b5cf6',
    twBorder: 'border-purple-500/80 dark:border-purple-400/80',
    twBgLight: 'bg-purple-500/10',
    twBgDark: 'dark:bg-purple-950/40',
    twText: 'text-purple-600 dark:text-purple-400',
    twBadge: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    twGlow: 'rgba(139, 92, 246, 0.25)',
    gradient: 'from-purple-600 to-violet-600',
  },
  {
    id: 'rose',
    name: 'Rose Quartz',
    hex: '#f43f5e',
    twBorder: 'border-rose-500/80 dark:border-rose-400/80',
    twBgLight: 'bg-rose-500/10',
    twBgDark: 'dark:bg-rose-950/40',
    twText: 'text-rose-600 dark:text-rose-400',
    twBadge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    twGlow: 'rgba(244, 63, 94, 0.25)',
    gradient: 'from-rose-500 to-pink-600',
  },
  {
    id: 'cyan',
    name: 'Ocean Teal',
    hex: '#06b6d4',
    twBorder: 'border-cyan-500/80 dark:border-cyan-400/80',
    twBgLight: 'bg-cyan-500/10',
    twBgDark: 'dark:bg-cyan-950/40',
    twText: 'text-cyan-600 dark:text-cyan-400',
    twBadge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
    twGlow: 'rgba(6, 182, 212, 0.25)',
    gradient: 'from-cyan-600 to-blue-600',
  },
  {
    id: 'indigo',
    name: 'Deep Indigo',
    hex: '#6366f1',
    twBorder: 'border-indigo-500/80 dark:border-indigo-400/80',
    twBgLight: 'bg-indigo-500/10',
    twBgDark: 'dark:bg-indigo-950/40',
    twText: 'text-indigo-600 dark:text-indigo-400',
    twBadge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
    twGlow: 'rgba(99, 102, 241, 0.25)',
    gradient: 'from-indigo-600 to-purple-600',
  },
  {
    id: 'slate',
    name: 'Minimal Slate',
    hex: '#64748b',
    twBorder: 'border-slate-500/80 dark:border-slate-400/80',
    twBgLight: 'bg-slate-500/10',
    twBgDark: 'dark:bg-slate-900/60',
    twText: 'text-slate-600 dark:text-slate-300',
    twBadge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    twGlow: 'rgba(100, 116, 139, 0.25)',
    gradient: 'from-slate-600 to-slate-800',
  },
];

export const SPACE_ICON_PRESETS = [
  'fingerprint',
  'users',
  'workflow',
  'microscope',
  'palette',
  'boxes',
  'dna',
  'orbit',
  'cpu',
  'activity',
  'wallet',
  'shield',
  'target',
  'sparkles',
  'gem',
  'compass',
  'layers',
  'flame',
];

export function getSpaceColorConfig(colorId?: string): SpaceColorOption {
  if (!colorId) return SPACE_COLOR_PRESETS[0];
  const found = SPACE_COLOR_PRESETS.find((c) => c.id === colorId || c.hex === colorId);
  return found || SPACE_COLOR_PRESETS[0];
}

export function resolveSpaceIcon(icon?: string, spaceName?: string): string {
  if (icon && icon.trim()) return icon.trim();
  if (!spaceName) return 'orbit';
  const lower = spaceName.toLowerCase();
  if (lower.includes('fam') || lower.includes('hogar') || lower.includes('house')) return 'users';
  if (lower.includes('work') || lower.includes('trabajo') || lower.includes('proj')) return 'workflow';
  if (lower.includes('person') || lower.includes('vida')) return 'fingerprint';
  if (lower.includes('stud') || lower.includes('estudio') || lower.includes('investig') || lower.includes('lab') || lower.includes('sci')) return 'microscope';
  if (lower.includes('art') || lower.includes('creat') || lower.includes('design')) return 'palette';
  return 'orbit';
}

export interface SpaceTemplateConfig {
  id: 'personal' | 'family' | 'work' | 'custom';
  nameKey: string;
  defaultName: string;
  descKey: string;
  defaultDesc: string;
  defaultIcon: string;
  defaultColor: string;
  categories: string[];
}

export const SPACE_TEMPLATES: Record<'personal' | 'family' | 'work' | 'custom', SpaceTemplateConfig> = {
  personal: {
    id: 'personal',
    nameKey: 'createSpaceView.personal.title',
    defaultName: 'Personal',
    descKey: 'createSpaceView.personal.desc',
    defaultDesc: 'Health, finances, personal documents & routines',
    defaultIcon: 'fingerprint',
    defaultColor: 'blue',
    categories: ['health', 'finances', 'documents', 'shopping', 'home'],
  },
  family: {
    id: 'family',
    nameKey: 'createSpaceView.family.title',
    defaultName: 'Family & Household',
    descKey: 'createSpaceView.family.desc',
    defaultDesc: 'Shared family logistics, household maintenance & expenses',
    defaultIcon: 'users',
    defaultColor: 'emerald',
    categories: ['home', 'shopping', 'finances', 'health'],
  },
  work: {
    id: 'work',
    nameKey: 'createSpaceView.work.title',
    defaultName: 'Work & Projects',
    descKey: 'createSpaceView.work.desc',
    defaultDesc: 'Professional deliverables, clients, milestones & projects',
    defaultIcon: 'workflow',
    defaultColor: 'indigo',
    categories: ['projects', 'documents', 'finances'],
  },
  custom: {
    id: 'custom',
    nameKey: 'createSpaceView.custom.title',
    defaultName: 'Custom Space',
    descKey: 'createSpaceView.custom.desc',
    defaultDesc: 'Create a tailored space without prefilled categories',
    defaultIcon: 'orbit',
    defaultColor: 'blue',
    categories: [],
  },
};

export interface CategoryMeta {
  id: string;
  iconName: string;
  labelKey?: string;
  label?: string;
  descKey?: string;
  color: string;
  badgeBg: string;
}

export const KNOWN_CATEGORIES: Record<string, CategoryMeta> = {
  health: {
    id: 'health',
    iconName: 'activity',
    labelKey: 'topics.labels.health',
    descKey: 'topics.descriptions.health',
    color: 'from-rose-500/15 via-pink-500/10 to-rose-600/5 border-rose-200/80 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 hover:border-rose-400 dark:hover:border-rose-700',
    badgeBg: 'bg-rose-100/90 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200',
  },
  finances: {
    id: 'finances',
    iconName: 'wallet',
    labelKey: 'topics.labels.finances',
    descKey: 'topics.descriptions.finances',
    color: 'from-emerald-500/15 via-teal-500/10 to-emerald-600/5 border-emerald-200/80 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 hover:border-emerald-400 dark:hover:border-emerald-700',
    badgeBg: 'bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200',
  },
  shopping: {
    id: 'shopping',
    iconName: 'shopping-bag',
    labelKey: 'topics.labels.shopping',
    descKey: 'topics.descriptions.shopping',
    color: 'from-amber-500/15 via-yellow-500/10 to-amber-600/5 border-amber-200/80 dark:border-amber-900/50 text-amber-700 dark:text-amber-300 hover:border-amber-400 dark:hover:border-amber-700',
    badgeBg: 'bg-amber-100/90 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200',
  },
  home: {
    id: 'home',
    iconName: 'home',
    labelKey: 'topics.labels.home',
    descKey: 'topics.descriptions.home',
    color: 'from-blue-500/15 via-indigo-500/10 to-blue-600/5 border-blue-200/80 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 hover:border-blue-400 dark:hover:border-blue-700',
    badgeBg: 'bg-blue-100/90 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200',
  },
  documents: {
    id: 'documents',
    iconName: 'file-text',
    labelKey: 'topics.labels.documents',
    descKey: 'topics.descriptions.documents',
    color: 'from-purple-500/15 via-violet-500/10 to-purple-600/5 border-purple-200/80 dark:border-purple-900/50 text-purple-700 dark:text-purple-300 hover:border-purple-400 dark:hover:border-purple-700',
    badgeBg: 'bg-purple-100/90 dark:bg-purple-950/80 text-purple-800 dark:text-purple-200',
  },
  projects: {
    id: 'projects',
    iconName: 'workflow',
    labelKey: 'topics.labels.projects',
    descKey: 'topics.descriptions.projects',
    color: 'from-cyan-500/15 via-sky-500/10 to-cyan-600/5 border-cyan-200/80 dark:border-cyan-900/50 text-cyan-700 dark:text-cyan-300 hover:border-cyan-400 dark:hover:border-cyan-700',
    badgeBg: 'bg-cyan-100/90 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-200',
  },
};

export function getCategoryMeta(categoryId: string): CategoryMeta {
  const norm = (categoryId || 'general').toLowerCase().trim();
  if (KNOWN_CATEGORIES[norm]) {
    return KNOWN_CATEGORIES[norm];
  }
  return {
    id: norm,
    iconName: 'boxes',
    label: norm.charAt(0).toUpperCase() + norm.slice(1),
    color: 'from-slate-500/15 via-zinc-500/10 to-slate-600/5 border-slate-200/80 dark:border-slate-900/50 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-700',
    badgeBg: 'bg-slate-100/90 dark:bg-slate-950/80 text-slate-800 dark:text-slate-200',
  };
}

export function getSpaceCategories(
  space: { space_name?: string; categories?: string[] } | null | undefined,
  objects: Array<{ domain?: string }> = []
): string[] {
  let baseCategories: string[] = [];
  if (space?.categories !== undefined) {
    baseCategories = [...space.categories];
  } else if (space?.space_name) {
    const lower = space.space_name.toLowerCase();
    if (lower.includes('person') || lower === 'personal') {
      baseCategories = SPACE_TEMPLATES.personal.categories;
    } else if (lower.includes('fam') || lower.includes('hogar') || lower.includes('house')) {
      baseCategories = SPACE_TEMPLATES.family.categories;
    } else if (lower.includes('work') || lower.includes('trabajo') || lower.includes('proj')) {
      baseCategories = SPACE_TEMPLATES.work.categories;
    } else {
      baseCategories = [];
    }
  }

  const objectCategories = (objects || [])
    .map((o) => o.domain)
    .filter((d): d is string => Boolean(d && typeof d === 'string'));

  const seen = new Set<string>();
  const result: string[] = [];

  for (const cat of [...baseCategories, ...objectCategories]) {
    const norm = cat.toLowerCase().trim();
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      result.push(norm);
    }
  }

  return result;
}
