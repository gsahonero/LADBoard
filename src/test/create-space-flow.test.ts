import { describe, it, expect } from 'vitest';
import { SpaceManager } from '../core/space/space-manager';
import { MemoryStorageProvider } from '../core/storage/memory-provider';
import { resolveSpaceIcon, getSpaceColorConfig } from '../core/theme/space-identity';

describe('Full-Page Create Space Flow & Template Presets', () => {
  it('creates recommended template spaces with correct default icons and colors', async () => {
    const localStorage = new MemoryStorageProvider();
    const manager = new SpaceManager(localStorage);

    // 1. Personal Space Template
    const personal = await manager.createSpace({
      spaceName: 'Personal',
      description: 'Health, finances, personal documents & routines',
      icon: 'fingerprint',
      color: 'blue',
      categories: ['health', 'finances', 'documents', 'shopping', 'home'],
      createdByUserId: 'usr_test_01',
    });
    expect(personal.space_name).toBe('Personal');
    expect(personal.categories).toEqual(['health', 'finances', 'documents', 'shopping', 'home']);
    expect(resolveSpaceIcon(personal.icon, personal.space_name)).toBe('fingerprint');
    expect(getSpaceColorConfig(personal.color).hex.toLowerCase()).toBe('#2563eb');

    // 2. Family Space Template
    const family = await manager.createSpace({
      spaceName: 'Family & Household',
      description: 'Shared family logistics, household maintenance & expenses',
      icon: 'users',
      color: 'emerald',
      categories: ['home', 'shopping', 'finances', 'health'],
      createdByUserId: 'usr_test_01',
    });
    expect(family.space_name).toBe('Family & Household');
    expect(family.categories).toEqual(['home', 'shopping', 'finances', 'health']);
    expect(resolveSpaceIcon(family.icon, family.space_name)).toBe('users');
    expect(getSpaceColorConfig(family.color).hex.toLowerCase()).toBe('#10b981');

    // 3. Work Space Template
    const work = await manager.createSpace({
      spaceName: 'Work & Projects',
      description: 'Professional deliverables, clients, milestones & projects',
      icon: 'workflow',
      color: 'indigo',
      categories: ['projects', 'documents', 'finances'],
      createdByUserId: 'usr_test_01',
    });
    expect(work.space_name).toBe('Work & Projects');
    expect(work.categories).toEqual(['projects', 'documents', 'finances']);
    expect(resolveSpaceIcon(work.icon, work.space_name)).toBe('workflow');
    expect(getSpaceColorConfig(work.color).hex.toLowerCase()).toBe('#6366f1');
  });

  it('creates custom spaces with selected modern icon, cognitive color theme, and description', async () => {
    const localStorage = new MemoryStorageProvider();
    const manager = new SpaceManager(localStorage);

    const custom = await manager.createSpace({
      spaceName: 'Biochemistry Research',
      description: 'Enzyme assays, structural models, and PubMed citations',
      icon: 'microscope',
      color: 'amber',
      categories: [],
      createdByUserId: 'usr_scientist_01',
    });

    expect(custom.space_name).toBe('Biochemistry Research');
    expect(custom.icon).toBe('microscope');
    expect(custom.color).toBe('amber');
    expect(custom.categories).toEqual([]);
    expect(getSpaceColorConfig(custom.color).hex.toLowerCase()).toBe('#f59e0b');
    expect(custom.description).toBe('Enzyme assays, structural models, and PubMed citations');
  });

  it('derives categories dynamically from template defaults and actual space objects', async () => {
    const { getSpaceCategories } = await import('../core/theme/space-identity');

    // Custom space with no objects has 0 categories
    const emptyCustom = getSpaceCategories({ space_name: 'Custom Research', categories: [] }, []);
    expect(emptyCustom).toEqual([]);

    // Custom space with objects gains categories dynamically
    const populatedCustom = getSpaceCategories(
      { space_name: 'Custom Research', categories: [] },
      [
        { domain: 'projects' },
        { domain: 'documents' },
        { domain: 'projects' }, // duplicates removed
      ]
    );
    expect(populatedCustom).toEqual(['projects', 'documents']);

    // Work space template has only work-related categories, not health or shopping
    const workCategories = getSpaceCategories({ space_name: 'Work & Projects', categories: ['projects', 'documents', 'finances'] }, []);
    expect(workCategories).toEqual(['projects', 'documents', 'finances']);
    expect(workCategories).not.toContain('health');
    expect(workCategories).not.toContain('shopping');
  });
});
