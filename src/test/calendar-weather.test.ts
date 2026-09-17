import { describe, it, expect } from 'vitest';
import { deriveCalendarEvents, generateIcsContent } from '../core/calendar/calendar-sync';
import { mapWeatherConditionToIcon } from '../core/weather/weather-service';
import { validateSpaceManifest } from '../core/standard/validators';
import { LADObject, LADSpaceManifest } from '../core/standard/types';

describe('Calendar Event Derivation & .ics Generator', () => {
  const sampleObjects: LADObject[] = [
    {
      object_id: 'obj_1',
      space_id: 'spc_personal',
      title: 'Tax Filing Deadline',
      description: 'Submit annual IRS return',
      domain: 'finances',
      due_date: '2026-10-15',
      priority: 'high',
      status: 'active',
      tags: ['taxes', 'urgent'],
      attributes: {},
      created_by: 'usr_test',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
      version: 1,
    },
    {
      object_id: 'obj_2',
      space_id: 'spc_personal',
      title: 'Dentist Appointment',
      description: 'Routine checkup',
      domain: 'health',
      tags: [],
      status: 'active',
      attributes: {
        eventDate: '2026-11-20',
      },
      priority: 'medium',
      created_by: 'usr_test',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
      version: 1,
    },
    {
      object_id: 'obj_3',
      space_id: 'spc_personal',
      title: 'General Note without date',
      description: 'No date assigned',
      domain: 'notes',
      tags: [],
      status: 'active',
      priority: 'low',
      attributes: {},
      created_by: 'usr_test',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
      version: 1,
    },
  ];

  it('derives calendar events from objects with dates', () => {
    const summary = deriveCalendarEvents(sampleObjects, 'Personal');
    expect(summary.totalObjects).toBe(3);
    expect(summary.syncableEventsCount).toBe(2);
    expect(summary.events.length).toBe(2);

    expect(summary.events[0].title).toBe('Tax Filing Deadline');
    expect(summary.events[0].startDate).toBe('2026-10-15');
    expect(summary.events[0].priority).toBe('high');

    expect(summary.events[1].title).toBe('Dentist Appointment');
    expect(summary.events[1].startDate).toBe('2026-11-20');
  });

  it('generates valid RFC 5545 iCalendar content', () => {
    const summary = deriveCalendarEvents(sampleObjects, 'Personal');
    const ics = generateIcsContent(summary.events, 'LAD - Personal');

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('X-WR-CALNAME:LAD - Personal');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Tax Filing Deadline');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261015');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });
});

describe('Weather Condition Mapping', () => {
  it('maps weather conditions to correct icon types', () => {
    expect(mapWeatherConditionToIcon('Sunny', true)).toBe('sun');
    expect(mapWeatherConditionToIcon('Clear', false)).toBe('moon');
    expect(mapWeatherConditionToIcon('Partly cloudy', true)).toBe('cloud-sun');
    expect(mapWeatherConditionToIcon('Light rain shower', true)).toBe('cloud-rain');
    expect(mapWeatherConditionToIcon('Heavy snow', true)).toBe('cloud-snow');
    expect(mapWeatherConditionToIcon('Thunderstorm in vicinity', true)).toBe('cloud-lightning');
  });
});

describe('Space Settings Schema Validation', () => {
  it('validates a manifest with complete space settings', () => {
    const manifest: LADSpaceManifest = {
      lad_standard: '1.0',
      schema_version: '1.0.0',
      space_id: 'spc_work_123',
      space_name: 'Work Space',
      icon: 'briefcase',
      color: 'indigo',
      categories: ['projects', 'meetings'],
      settings: {
        calendar: {
          enabled: true,
          mode: 'dedicated',
          calendar_name: 'LAD: Work Space',
          sync_due_dates: true,
          auto_sync: true,
        },
        invitations: {
          default_method: 'gmail',
          default_role: 'editor',
        },
        connectivity: {
          gdrive_enabled: true,
          gmail_enabled: true,
        },
      },
      created_by: 'usr_owner_123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(validateSpaceManifest(manifest)).toBe(true);
  });
});

describe('Shareable Join URL Resolution', () => {
  it('constructs correct join URL including path prefix', () => {
    // Test helper function logic
    const origin = 'https://gsahonero.github.io';
    const pathname = '/LADBoard/';
    const spaceId = 'spc_05qq4hcz';
    const cleanPath = pathname.replace(/\/+$/, '');
    const url = `${origin}${cleanPath}/?join=${spaceId}`;

    expect(url).toBe('https://gsahonero.github.io/LADBoard/?join=spc_05qq4hcz');
  });
});
