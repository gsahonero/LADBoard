/**
 * Calendar Synchronization & Event Derivation Engine
 * Extracts scheduling data from LAD Cards/Objects and maps to Google Calendar / iCalendar formats.
 */

import { LADObject } from '../standard/types';

export interface LADCalendarEvent {
  id: string;
  objectId: string;
  title: string;
  description: string;
  startDate: string; // ISO String (e.g. 2026-09-17)
  endDate: string;
  allDay: boolean;
  priority?: LADObject['priority'];
  domain?: string;
  tags?: string[];
  url?: string;
}

export interface CalendarSyncSummary {
  totalObjects: number;
  syncableEventsCount: number;
  upcomingCount: number;
  overdueCount: number;
  events: LADCalendarEvent[];
}

/**
 * Derives structured calendar events from space objects
 */
export function deriveCalendarEvents(
  objects: LADObject[],
  spaceName: string = 'LAD Space'
): CalendarSyncSummary {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const events: LADCalendarEvent[] = [];
  let upcomingCount = 0;
  let overdueCount = 0;

  for (const obj of objects) {
    if (obj.status === 'archived') continue;

    // Check if object has a due date or date-like attributes
    const rawDate =
      obj.due_date ||
      (obj as any).dueDate ||
      obj.attributes?.due_date ||
      obj.attributes?.dueDate ||
      obj.attributes?.deadline ||
      obj.attributes?.eventDate;

    if (rawDate) {
      let isoDate: string;
      try {
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) {
          isoDate = parsed.toISOString().split('T')[0];
        } else {
          isoDate = rawDate;
        }
      } catch {
        isoDate = rawDate;
      }

      if (isoDate < todayStr) {
        overdueCount++;
      } else {
        upcomingCount++;
      }

      const descLines = [
        obj.description || '',
        `Space: ${spaceName}`,
        `Domain: ${obj.domain}`,
        obj.priority ? `Priority: ${obj.priority.toUpperCase()}` : '',
        obj.tags?.length ? `Tags: ${obj.tags.map((t) => `#${t}`).join(' ')}` : '',
        `LAD Object ID: ${obj.object_id}`,
      ]
        .filter(Boolean)
        .join('\n');

      events.push({
        id: `cal_evt_${obj.object_id}`,
        objectId: obj.object_id,
        title: obj.title,
        description: descLines,
        startDate: isoDate,
        endDate: isoDate,
        allDay: true,
        priority: obj.priority,
        domain: obj.domain,
        tags: obj.tags,
      });
    }
  }

  // Sort events chronologically
  events.sort((a, b) => a.startDate.localeCompare(b.startDate));

  return {
    totalObjects: objects.length,
    syncableEventsCount: events.length,
    upcomingCount,
    overdueCount,
    events,
  };
}

/**
 * Generates an iCalendar (.ics) RFC 5545 string for export
 */
export function generateIcsContent(events: LADCalendarEvent[], calendarName: string = 'LAD Board'): string {
  const formatIcsDate = (dateStr: string) => {
    return dateStr.replace(/-/g, '');
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LAD Board//LAD Standard 1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    'X-WR-TIMEZONE:UTC',
  ];

  for (const evt of events) {
    const dStr = formatIcsDate(evt.startDate);
    const createdStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    lines.push(
      'BEGIN:VEVENT',
      `UID:${evt.id}@ladboard.app`,
      `DTSTAMP:${createdStamp}`,
      `DTSTART;VALUE=DATE:${dStr}`,
      `DTEND;VALUE=DATE:${dStr}`,
      `SUMMARY:${evt.title.replace(/\n/g, ' ')}`,
      `DESCRIPTION:${evt.description.replace(/\n/g, '\\n')}`,
      `STATUS:CONFIRMED`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers a browser file download of the generated .ics file
 */
export function downloadIcsFile(filename: string, content: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.ics') ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
