import { describe, it, expect } from 'vitest';
import {
  normalizeSearchString,
  levenshteinDistance,
  fuzzyMatchScore,
  fuzzyFilterObjects,
} from '../core/utils/fuzzy-search';
import { MemoryStorageProvider } from '../core/storage/memory-provider';
import { ObjectStore } from '../core/objects/object-store';

describe('Fuzzy Search & Diacritic Normalization', () => {
  it('normalizes accents and diacritics in Spanish and English', () => {
    expect(normalizeSearchString('Más')).toBe('mas');
    expect(normalizeSearchString('Médico')).toBe('medico');
    expect(normalizeSearchString('Canción')).toBe('cancion');
    expect(normalizeSearchString('ÁÉÍÓÚ ñ')).toBe('aeiou n');
    expect(levenshteinDistance('medico', 'médico')).toBe(1);
  });

  it('matches diacritic variations seamlessly (e.g. "mas" matches "Más")', () => {
    const score1 = fuzzyMatchScore('Más elementos de salud', 'mas');
    expect(score1).toBeGreaterThan(0);

    const score2 = fuzzyMatchScore('Consulta con el médico general', 'medico');
    expect(score2).toBeGreaterThan(0);

    const score3 = fuzzyMatchScore('Actualización de saldo', 'actualizacion');
    expect(score3).toBeGreaterThan(0);
  });

  it('tolerates typos and minor misspellings', () => {
    // "doctro" -> "Doctor"
    const score1 = fuzzyMatchScore('Doctor appointment tomorrow', 'doctro');
    expect(score1).toBeGreaterThan(0);

    // "presion" -> "presión"
    const score2 = fuzzyMatchScore('Medicamento para la presión arterial', 'presion');
    expect(score2).toBeGreaterThan(0);
  });

  it('accurately ranks and filters LAD objects with fuzzy search', () => {
    const items = [
      {
        object_id: 'obj_1',
        title: 'Prescripción Más reciente',
        description: 'Continuar tratamiento',
        domain: 'health',
        tags: ['salud', 'receta'],
      },
      {
        object_id: 'obj_2',
        title: 'Saldo en cuenta bancaria',
        description: 'Cheque depositado',
        domain: 'finances',
        tags: ['banco'],
      },
      {
        object_id: 'obj_3',
        title: 'Comprar frutas y verduras',
        description: 'Supermercado',
        domain: 'shopping',
        tags: ['compras'],
      },
    ];

    // Search for "mas" should match "Prescripción Más reciente"
    const resultsMas = fuzzyFilterObjects(items, 'mas');
    expect(resultsMas.length).toBe(1);
    expect(resultsMas[0].object_id).toBe('obj_1');

    // Search for "prescripcion" without accent
    const resultsPresc = fuzzyFilterObjects(items, 'prescripcion');
    expect(resultsPresc.length).toBe(1);
    expect(resultsPresc[0].object_id).toBe('obj_1');

    // Search for "banco"
    const resultsBanco = fuzzyFilterObjects(items, 'banco');
    expect(resultsBanco.length).toBe(1);
    expect(resultsBanco[0].object_id).toBe('obj_2');
  });

  it('works seamlessly inside ObjectStore.search', async () => {
    const storage = new MemoryStorageProvider();
    const store = new ObjectStore('spc_test', storage);

    await store.save(
      store.createObject({
        title: 'Cita con el Médico Cardiólogo',
        description: 'Llevar análisis de sangre',
        domain: 'health',
        tags: ['médico', 'corazón'],
        actorUserId: 'usr_test',
      })
    );

    await store.save(
      store.createObject({
        title: 'Revisión del saldo mensual',
        description: 'Cuentas claras',
        domain: 'finances',
        tags: ['banco'],
        actorUserId: 'usr_test',
      })
    );

    // Search "medico" without accents
    const foundMedico = store.search('medico');
    expect(foundMedico.length).toBe(1);
    expect(foundMedico[0].title).toBe('Cita con el Médico Cardiólogo');

    // Search "cardiologo" without accents
    const foundCardio = store.search('cardiologo');
    expect(foundCardio.length).toBe(1);
    expect(foundCardio[0].title).toBe('Cita con el Médico Cardiólogo');

    // Search "corazon" without accent
    const foundCorazon = store.search('corazon');
    expect(foundCorazon.length).toBe(1);
  });
});
