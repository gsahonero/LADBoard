import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorageProvider } from '../core/storage/memory-provider';
import { UserRegistryManager } from '../core/identity/user-registry';
import { CaptureParser } from '../core/objects/capture-parser';
import enTranslations from '../locales/en.json';
import esTranslations from '../locales/es.json';

describe('Cognitive Hub & Onboarding Flow', () => {
  let storage: MemoryStorageProvider;
  let registryManager: UserRegistryManager;

  beforeEach(() => {
    storage = new MemoryStorageProvider();
    registryManager = new UserRegistryManager(storage);
  });

  it('allows user to customize identity profile during onboarding', async () => {
    const registry = await registryManager.loadOrCreateRegistry();
    expect(registry.identities[0].display_name).toBe('LAD User');

    await registryManager.updateIdentity('Maria G.', 'maria@example.com');
    const updated = registryManager.getRegistry();

    expect(updated?.identities[0].display_name).toBe('Maria G.');
    expect(updated?.identities[0].email).toBe('maria@example.com');
  });

  it('guarantees translation key parity for onboarding, hub, and topics', () => {
    const checkKeys = (enObj: any, esObj: any, path = '') => {
      for (const key of Object.keys(enObj)) {
        const currentPath = path ? `${path}.${key}` : key;
        expect(esObj).toHaveProperty(key);
        if (typeof enObj[key] === 'object' && enObj[key] !== null) {
          checkKeys(enObj[key], esObj[key], currentPath);
        }
      }
    };

    expect(enTranslations.onboarding).toBeDefined();
    expect(esTranslations.onboarding).toBeDefined();
    expect(enTranslations.hub).toBeDefined();
    expect(esTranslations.hub).toBeDefined();
    expect(enTranslations.topics).toBeDefined();
    expect(esTranslations.topics).toBeDefined();

    checkKeys(enTranslations.onboarding, esTranslations.onboarding);
    checkKeys(enTranslations.hub, esTranslations.hub);
    checkKeys(enTranslations.topics, esTranslations.topics);
  });

  it('heuristically infers domain from quick starters and natural phrasing in EN and ES', () => {
    // EN Starters
    const healthResult = CaptureParser.parse(enTranslations.capture.quickStartersText.medication);
    expect(healthResult.domain).toBe('health');
    expect(healthResult.dueDate).toBeDefined();

    const financeResult = CaptureParser.parse(enTranslations.capture.quickStartersText.balance);
    expect(financeResult.domain).toBe('finances');

    const shoppingResult = CaptureParser.parse(enTranslations.capture.quickStartersText.shopping);
    expect(shoppingResult.domain).toBe('shopping');

    const appointmentResult = CaptureParser.parse(enTranslations.capture.quickStartersText.appointment);
    expect(appointmentResult.domain).toBe('health');
    expect(appointmentResult.dueDate).toBeDefined();

    // ES Starters (e.g. +Saldo de Banco)
    const esHealthResult = CaptureParser.parse(esTranslations.capture.quickStartersText.medication);
    expect(esHealthResult.domain).toBe('health');
    expect(esHealthResult.dueDate).toBeDefined();

    const esFinanceResult = CaptureParser.parse(esTranslations.capture.quickStartersText.balance);
    expect(esFinanceResult.domain).toBe('finances');

    const esShoppingResult = CaptureParser.parse(esTranslations.capture.quickStartersText.shopping);
    expect(esShoppingResult.domain).toBe('shopping');

    const esAppointmentResult = CaptureParser.parse(esTranslations.capture.quickStartersText.appointment);
    expect(esAppointmentResult.domain).toBe('health');
    expect(esAppointmentResult.dueDate).toBeDefined();
  });
});
