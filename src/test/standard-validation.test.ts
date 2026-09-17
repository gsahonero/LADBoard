import { describe, it, expect } from 'vitest';
import {
  validateSpaceManifest,
  validateUserRegistry,
  validateLADObject,
  validateLADOperation,
  ValidationError,
} from '../core/standard/validators';
import { LAD_STANDARD_VERSION } from '../core/standard/constants';

describe('LAD Standard 1.0 Validators', () => {
  it('validates a valid Space Manifest', () => {
    const validManifest = {
      lad_standard: LAD_STANDARD_VERSION,
      schema_version: '1.0.0',
      space_id: 'spc_family_01',
      space_name: 'Family Hub',
      created_by: 'usr_alice_01',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(validateSpaceManifest(validManifest)).toBe(true);
  });

  it('rejects an invalid Space Manifest with wrong prefix or missing fields', () => {
    expect(() =>
      validateSpaceManifest({
        lad_standard: '2.0', // wrong standard
        space_id: 'family_01', // missing spc_ prefix
        space_name: 'Family',
        created_by: 'usr_01',
      })
    ).toThrow(ValidationError);
  });

  it('validates a valid User Registry (user.json)', () => {
    const validRegistry = {
      lad_standard: LAD_STANDARD_VERSION,
      schema_version: '1.0.0',
      user_id: 'usr_user_123',
      identities: [],
      spaces: [],
      preferences: {
        locale: 'en' as const,
        theme: 'system' as const,
        change_commit_threshold_ms: 5000,
        active_evaluation_interval_ms: 30000,
      },
      device_metadata: { device_id: 'dev_01', platform: 'web' },
      version: 1,
      updated_at: new Date().toISOString(),
    };

    expect(validateUserRegistry(validRegistry)).toBe(true);
  });

  it('validates a valid LADObject and rejects invalid identifiers', () => {
    const validObj = {
      object_id: 'obj_medical_01',
      space_id: 'spc_fam_01',
      title: 'Blood test appointment',
      domain: 'health',
      tags: ['lab'],
      priority: 'high' as const,
      status: 'active' as const,
      attributes: {},
      created_by: 'usr_01',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    };

    expect(validateLADObject(validObj)).toBe(true);

    expect(() =>
      validateLADObject({
        object_id: 'invalid_prefix',
        space_id: 'spc_01',
        title: 'Test',
        domain: 'general',
      })
    ).toThrow(ValidationError);
  });

  it('validates a valid LADOperation record', () => {
    const validOp = {
      operation_id: 'op_998877',
      space_id: 'spc_01',
      actor: 'usr_alice',
      timestamp: new Date().toISOString(),
      lamport_clock: 12,
      type: 'object.update' as const,
      target: 'obj_01',
      patch: { balance: 2500 },
    };

    expect(validateLADOperation(validOp)).toBe(true);
  });
});
