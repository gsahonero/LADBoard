import { describe, it, expect } from 'vitest';
import { ActiveEngine } from '../core/active/active-engine';
import { LADObject } from '../core/standard/types';

describe('Active Layer Monitoring & Trigger Engine', () => {
  const refDate = new Date('2026-09-16T12:00:00Z');

  it('detects and flags stale bank balances (> 5 days without update)', () => {
    const engine = new ActiveEngine('spc_test');

    const staleBankObject: LADObject = {
      object_id: 'obj_bank_01',
      space_id: 'spc_test',
      title: 'Main Checking Account',
      domain: 'finances',
      tags: ['bank'],
      priority: 'medium',
      status: 'active',
      attributes: { balance: 1500 },
      last_checked_at: '2026-09-08T12:00:00Z', // 8 days ago
      created_by: 'usr_01',
      created_at: '2026-09-08T12:00:00Z',
      updated_at: '2026-09-08T12:00:00Z',
      version: 1,
    };

    const freshBankObject: LADObject = {
      ...staleBankObject,
      object_id: 'obj_bank_02',
      last_checked_at: '2026-09-15T12:00:00Z', // 1 day ago
    };

    const alerts = engine.evaluateObjects([staleBankObject, freshBankObject], refDate);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('stale_balance');
    expect(alerts[0].target_id).toBe('obj_bank_01');
    expect(alerts[0].days_stale).toBe(8);
  });

  it('detects upcoming events and appointments within 3-day window', () => {
    const engine = new ActiveEngine('spc_test');

    const upcomingAppointment: LADObject = {
      object_id: 'obj_med_01',
      space_id: 'spc_test',
      title: 'Cardiologist Consultation',
      domain: 'health',
      tags: ['doctor'],
      priority: 'high',
      status: 'active',
      due_date: '2026-09-18', // 2 days away from 2026-09-16
      attributes: {},
      created_by: 'usr_01',
      created_at: '2026-09-10T12:00:00Z',
      updated_at: '2026-09-10T12:00:00Z',
      version: 1,
    };

    const farAwayAppointment: LADObject = {
      ...upcomingAppointment,
      object_id: 'obj_med_02',
      due_date: '2026-10-20', // > 1 month away
    };

    const alerts = engine.evaluateObjects([upcomingAppointment, farAwayAppointment], refDate);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('upcoming_event');
    expect(alerts[0].target_id).toBe('obj_med_01');
  });

  it('allows dismissing and snoozing active alerts', () => {
    const engine = new ActiveEngine('spc_test');
    const staleObject: LADObject = {
      object_id: 'obj_bank_01',
      space_id: 'spc_test',
      title: 'Savings Account',
      domain: 'finances',
      tags: [],
      priority: 'medium',
      status: 'active',
      attributes: {},
      last_checked_at: '2026-09-01T12:00:00Z',
      created_by: 'usr_01',
      created_at: '2026-09-01T12:00:00Z',
      updated_at: '2026-09-01T12:00:00Z',
      version: 1,
    };

    engine.evaluateObjects([staleObject], refDate);
    expect(engine.getActiveAlerts()).toHaveLength(1);

    // Dismiss alert
    engine.dismissAlert('alert_stale_obj_bank_01');
    expect(engine.getActiveAlerts()).toHaveLength(0);
  });
});
