import { describe, it, expect } from 'vitest';
import { ActiveEngine } from '../core/active/active-engine';
import { LADObject } from '../core/standard/types';

describe('Card Ambient Lifecycle & Auto-Archival', () => {
  const refDate = new Date('2026-09-17T12:00:00Z');

  it('auto-archives passive cards older than threshold to the Archive without deleting them', () => {
    const engine = new ActiveEngine('spc_test');

    const eightDaysAgo = new Date(refDate.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(refDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const passiveOldCard: LADObject = {
      object_id: 'obj_bank_01',
      space_id: 'spc_test',
      title: 'Bank A Checking Balance',
      domain: 'finances',
      tags: ['finances'],
      attributes: {
        card_type: 'finances.account_balance',
        bank: 'Bank A',
        balance: 19,
      },
      priority: 'medium',
      status: 'active',
      created_by: 'usr_1',
      created_at: eightDaysAgo,
      updated_at: eightDaysAgo,
      last_checked_at: eightDaysAgo,
      version: 1,
    };

    const passiveRecentCard: LADObject = {
      object_id: 'obj_bank_02',
      space_id: 'spc_test',
      title: 'Bank B Savings Balance',
      domain: 'finances',
      tags: ['finances'],
      attributes: {
        card_type: 'finances.account_balance',
        bank: 'Bank B',
        balance: 500,
      },
      priority: 'medium',
      status: 'active',
      created_by: 'usr_1',
      created_at: twoDaysAgo,
      updated_at: twoDaysAgo,
      version: 1,
    };

    const activeObjects = [passiveOldCard, passiveRecentCard];
    engine.evaluateObjects(activeObjects, refDate, 7);

    // Old passive card transitioned to archived
    expect(passiveOldCard.status).toBe('archived');
    // Object remains completely intact, not deleted!
    expect(passiveOldCard.attributes.balance).toBe(19);

    // Recent passive card remains active
    expect(passiveRecentCard.status).toBe('active');
  });

  it('does not auto-archive passive cards if the card type has autoArchiveEnabled: false', () => {
    const engine = new ActiveEngine('spc_test');
    const eightDaysAgo = new Date(refDate.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();

    const noteCard: LADObject = {
      object_id: 'obj_note_01',
      space_id: 'spc_test',
      title: 'Important Philosophy Note',
      domain: 'general',
      tags: ['general'],
      attributes: {
        card_type: 'general.note',
        content: 'Knowledge preservation test',
      },
      priority: 'low',
      status: 'active',
      created_by: 'usr_1',
      created_at: eightDaysAgo,
      updated_at: eightDaysAgo,
      last_checked_at: eightDaysAgo,
      version: 1,
    };

    engine.evaluateObjects([noteCard], refDate, 7);

    // Note card has autoArchiveEnabled = false (or undefined) in schema, so it remains active
    expect(noteCard.status).toBe('active');
  });

  it('keeps actionable cards with follow-up dormant until the target date arrives', () => {
    const engine = new ActiveEngine('spc_test');

    const followupFutureCard: LADObject = {
      object_id: 'obj_med_future',
      space_id: 'spc_test',
      title: 'Dentistry Appointment (Carlos)',
      domain: 'health',
      tags: ['health'],
      attributes: {
        card_type: 'health.medical_appointment',
        specialty: 'Dentistry',
        needs_followup: true,
        followup: {
          date: '2026-10-01', // 14 days in future
          reason: 'Cavity checkup',
          status: 'pending',
        },
      },
      priority: 'medium',
      status: 'active',
      created_by: 'usr_1',
      created_at: refDate.toISOString(),
      updated_at: refDate.toISOString(),
      version: 1,
    };

    const followupDueTodayCard: LADObject = {
      object_id: 'obj_med_due',
      space_id: 'spc_test',
      title: 'Cardiology Appointment (Dad)',
      domain: 'health',
      tags: ['health'],
      attributes: {
        card_type: 'health.medical_appointment',
        specialty: 'Cardiology',
        needs_followup: true,
        followup: {
          date: '2026-09-17', // due today!
          reason: 'Blood pressure evaluation',
          status: 'pending',
        },
      },
      priority: 'medium',
      status: 'active',
      created_by: 'usr_1',
      created_at: refDate.toISOString(),
      updated_at: refDate.toISOString(),
      version: 1,
    };

    const alerts = engine.evaluateObjects(
      [followupFutureCard, followupDueTodayCard],
      refDate,
      7
    );

    // Future card does NOT raise active attention alert
    const futureAlert = alerts.find((a) => a.target_id === 'obj_med_future');
    expect(futureAlert).toBeUndefined();

    // Due card awakens and raises pending_followup alert
    const dueAlert = alerts.find((a) => a.target_id === 'obj_med_due');
    expect(dueAlert).toBeDefined();
    expect(dueAlert?.type).toBe('pending_followup');
    expect(dueAlert?.message).toContain('Blood pressure evaluation');
  });
});
