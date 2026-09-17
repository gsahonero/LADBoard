/**
 * Time View — Temporal projection of objects, actions, and follow-ups
 */

import React, { useState } from 'react';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { Clock, Calendar, CheckCircle, Sparkles } from 'lucide-react';
import { LADObject } from '../../core/standard/types';

export const TimeView: React.FC = () => {
  const { objects, updateObject } = useLAD();
  const { t } = useI18n();

  const [timeFilter, setTimeFilter] = useState<'today' | 'tomorrow' | 'upcoming' | 'recent'>('today');

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const filterObjects = () => {
    switch (timeFilter) {
      case 'today':
        return objects.filter((o) => o.due_date === todayStr || (!o.due_date && o.created_at.startsWith(todayStr)));
      case 'tomorrow':
        return objects.filter((o) => o.due_date === tomorrowStr);
      case 'upcoming':
        return objects.filter((o) => o.due_date && o.due_date > tomorrowStr);
      case 'recent':
        return [...objects].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  };

  const currentItems = filterObjects();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-lad-500" />
          {t('timeView.title')}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t('timeView.subtitle')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setTimeFilter('today')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            timeFilter === 'today'
              ? 'bg-lad-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {t('timeView.today')}
        </button>
        <button
          onClick={() => setTimeFilter('tomorrow')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            timeFilter === 'tomorrow'
              ? 'bg-lad-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {t('timeView.tomorrow')}
        </button>
        <button
          onClick={() => setTimeFilter('upcoming')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            timeFilter === 'upcoming'
              ? 'bg-lad-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {t('timeView.upcoming')}
        </button>
        <button
          onClick={() => setTimeFilter('recent')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            timeFilter === 'recent'
              ? 'bg-lad-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {t('timeView.recent')}
        </button>
      </div>

      {/* List */}
      {currentItems.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Sparkles className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('timeView.noItems')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentItems.map((obj: LADObject) => (
            <div
              key={obj.object_id}
              className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3 hover:border-slate-300 transition-all"
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() =>
                    updateObject(
                      obj.object_id,
                      { status: obj.status === 'completed' ? 'active' : 'completed' },
                      true
                    )
                  }
                  className={`mt-0.5 p-1 rounded-lg border transition-colors ${
                    obj.status === 'completed'
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'border-slate-300 dark:border-slate-700 hover:border-lad-500'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                </button>
                <div>
                  <div
                    className={`text-xs font-bold text-slate-900 dark:text-white ${
                      obj.status === 'completed' ? 'line-through opacity-60' : ''
                    }`}
                  >
                    {obj.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="uppercase font-semibold text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                      {obj.domain}
                    </span>
                    {obj.assigned_to && <span>• {obj.assigned_to}</span>}
                  </div>
                </div>
              </div>

              {obj.due_date && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{obj.due_date}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
