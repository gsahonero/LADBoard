/**
 * Privacy-Conscious Telemetry and Audit Bus for LAD Board
 */

export type TelemetryCategory =
  | 'user_interaction'
  | 'application_event'
  | 'sync_event'
  | 'operation'
  | 'performance_metric'
  | 'error';

export interface TelemetryEvent {
  eventId: string;
  category: TelemetryCategory;
  name: string;
  timestamp: string;
  spaceId?: string;
  durationMs?: number;
  payload?: Record<string, any>;
}

export class TelemetryBus {
  private static instance: TelemetryBus;
  private events: TelemetryEvent[] = [];
  private maxStoredEvents = 200;
  private listeners: Array<(event: TelemetryEvent) => void> = [];

  static getInstance(): TelemetryBus {
    if (!TelemetryBus.instance) {
      TelemetryBus.instance = new TelemetryBus();
    }
    return TelemetryBus.instance;
  }

  record(category: TelemetryCategory, name: string, payload?: Record<string, any>, durationMs?: number) {
    const event: TelemetryEvent = {
      eventId: `tel_${Math.random().toString(36).substring(2, 10)}`,
      category,
      name,
      timestamp: new Date().toISOString(),
      durationMs,
      // Strip any potential sensitive PII from telemetry payloads
      payload: payload ? this.sanitizePayload(payload) : undefined,
    };

    this.events.push(event);
    if (this.events.length > this.maxStoredEvents) {
      this.events.shift();
    }

    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private sanitizePayload(payload: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(payload)) {
      if (['password', 'accessToken', 'token', 'secret'].includes(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof val === 'string' && val.length > 200) {
        sanitized[key] = `${val.substring(0, 197)}...`;
      } else {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }

  getRecentEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  subscribe(listener: (event: TelemetryEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  clear() {
    this.events = [];
  }
}
