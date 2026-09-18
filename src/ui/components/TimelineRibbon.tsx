/**
 * Timeline Ribbon — A friendly horizontal day-strip for chronological awareness
 */

import React from 'react';
import { LADObject } from '../../core/standard/types';
import { Calendar } from 'lucide-react';

export const TimelineRibbon: React.FC<{
  objects: LADObject[];
  onSelectDateFilter?: (filter: string) => void;
}> = ({ objects, onSelectDateFilter }) => {
  const today = new Date();
  const days: Array<{ label: string; dateStr: string; isToday: boolean; count: number }> = [];

  for (let i = 0; i < 5; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = i === 0;

    let label = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
    if (i === 0) label = 'Today';
    else if (i === 1) label = 'Tomorrow';

    const count = objects.filter((o) => o.due_date === dateStr && o.status !== 'completed').length;

    days.push({ label, dateStr, isToday, count });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pb-1" data-testid="timeline-ribbon-bar">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mr-1 whitespace-nowrap">
        <Calendar className="w-3.5 h-3.5" />
        <span>Timeline:</span>
      </div>

      {days.map((day) => (
        <button
          key={day.dateStr}
          onClick={() => onSelectDateFilter && onSelectDateFilter(day.dateStr)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
            day.isToday
              ? 'bg-lad-50 dark:bg-lad-950/40 border-lad-300 dark:border-lad-700 text-lad-800 dark:text-lad-200 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
          }`}
        >
          <span>{day.label}</span>
          {day.count > 0 ? (
            <span className="w-4 h-4 rounded-full bg-lad-600 text-white text-[10px] font-bold flex items-center justify-center">
              {day.count}
            </span>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
          )}
        </button>
      ))}
    </div>
  );
};
