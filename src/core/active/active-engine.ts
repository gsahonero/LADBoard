/**
 * Active Layer Engine for LAD Board
 * Continuously evaluates declarative triggers across Space objects and surfaces attention alerts.
 */

import { LADActiveAlert, LADObject } from '../standard/types';
import { ActiveTriggerRule } from './types';

export class ActiveEngine {
  public readonly spaceId: string;
  private rules: ActiveTriggerRule[] = [];
  private activeAlerts: Map<string, LADActiveAlert> = new Map();
  private listeners: Array<(alerts: LADActiveAlert[]) => void> = [];

  constructor(spaceId: string) {
    this.spaceId = spaceId;
    this.registerDefaultRules();
  }

  private registerDefaultRules() {
    // 1. Stale Bank Balance / Finance Rule
    this.registerRule({
      ruleId: 'stale_finance_balance',
      name: 'Stale Bank Balance Monitor',
      domain: 'finances',
      type: 'staleness',
      stalenessThresholdDays: 5,
      evaluate: (obj, { now }) => {
        if (obj.domain !== 'finances') return null;
        if (obj.status !== 'active') return null;

        const checkDate = obj.last_checked_at ? new Date(obj.last_checked_at) : new Date(obj.updated_at);
        const diffMs = now.getTime() - checkDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays >= 5) {
          return {
            alert_id: `alert_stale_${obj.object_id}`,
            space_id: obj.space_id,
            type: 'stale_balance',
            target_id: obj.object_id,
            title: obj.title,
            message: `Bank balance has not been updated for ${diffDays} days.`,
            days_stale: diffDays,
            domain: obj.domain,
            status: 'active',
            created_at: now.toISOString(),
          };
        }
        return null;
      },
    });

    // 2. Upcoming Follow-up / Appointment Rule
    this.registerRule({
      ruleId: 'upcoming_due_events',
      name: 'Upcoming Appointments & Follow-ups',
      type: 'temporal_due',
      dueWindowDays: 3,
      evaluate: (obj, { now }) => {
        if (!obj.due_date || obj.status !== 'active') return null;

        const dueDate = new Date(obj.due_date);
        const diffMs = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        // Within next 3 days or today or overdue
        if (diffDays <= 3 && diffDays >= -1) {
          return {
            alert_id: `alert_due_${obj.object_id}`,
            space_id: obj.space_id,
            type: 'upcoming_event',
            target_id: obj.object_id,
            title: obj.title,
            message: `Upcoming action scheduled: ${obj.title}`,
            due_date: obj.due_date,
            domain: obj.domain,
            status: 'active',
            created_at: now.toISOString(),
          };
        }
        return null;
      },
    });

    // 3. Unresolved Shopping Items
    this.registerRule({
      ruleId: 'unresolved_shopping',
      name: 'Unresolved Shopping Items',
      domain: 'shopping',
      type: 'unresolved_state',
      evaluate: (obj, { now }) => {
        if (obj.domain !== 'shopping' || obj.status !== 'active') return null;

        const createdDate = new Date(obj.created_at);
        const diffMs = now.getTime() - createdDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays >= 3) {
          return {
            alert_id: `alert_shopping_${obj.object_id}`,
            space_id: obj.space_id,
            type: 'unresolved_shopping',
            target_id: obj.object_id,
            title: obj.title,
            message: `Shopping list item unresolved for ${diffDays} days.`,
            days_stale: diffDays,
            domain: obj.domain,
            status: 'active',
            created_at: now.toISOString(),
          };
        }
        return null;
      },
    });
  }

  registerRule(rule: ActiveTriggerRule) {
    this.rules.push(rule);
  }

  subscribe(listener: (alerts: LADActiveAlert[]) => void): () => void {
    this.listeners.push(listener);
    listener(this.getActiveAlerts());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const alerts = this.getActiveAlerts();
    for (const listener of this.listeners) {
      listener(alerts);
    }
  }

  getActiveAlerts(): LADActiveAlert[] {
    return Array.from(this.activeAlerts.values()).filter((a) => a.status === 'active');
  }

  getAllAlerts(): LADActiveAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  evaluateObjects(objects: LADObject[], referenceDate: Date = new Date()): LADActiveAlert[] {
    const currentAlertMap = new Map<string, LADActiveAlert>();

    for (const obj of objects) {
      for (const rule of this.rules) {
        try {
          const alert = rule.evaluate(obj, { now: referenceDate });
          if (alert) {
            // Check if already dismissed or snoozed
            const existing = this.activeAlerts.get(alert.alert_id);
            if (existing && existing.status !== 'active') {
              currentAlertMap.set(alert.alert_id, existing);
            } else {
              currentAlertMap.set(alert.alert_id, alert);
            }
          }
        } catch (err) {
          console.warn(`Rule evaluation error [${rule.ruleId}]:`, err);
        }
      }
    }

    this.activeAlerts = currentAlertMap;
    this.notify();
    return this.getActiveAlerts();
  }

  dismissAlert(alertId: string) {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'dismissed';
      this.notify();
    }
  }

  snoozeAlert(alertId: string) {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'snoozed';
      this.notify();
    }
  }

  addCustomAlert(alert: LADActiveAlert) {
    this.activeAlerts.set(alert.alert_id, alert);
    this.notify();
  }
}
