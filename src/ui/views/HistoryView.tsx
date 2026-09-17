/**
 * History View — Git-like Version History and Provenance Audit Trail
 */

import React, { useState } from 'react';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { History, GitCommit, Search } from 'lucide-react';
import { normalizeSearchString } from '../../core/utils/fuzzy-search';

export const HistoryView: React.FC = () => {
  const { operations } = useLAD();
  const { t } = useI18n();

  const [searchQuery, setSearchQuery] = useState('');

  const normQ = normalizeSearchString(searchQuery);
  const filtered = operations
    .slice()
    .reverse()
    .filter((op) => {
      if (!normQ) return true;
      return (
        normalizeSearchString(op.operation_id).includes(normQ) ||
        normalizeSearchString(op.type).includes(normQ) ||
        normalizeSearchString(op.actor).includes(normQ) ||
        normalizeSearchString(op.target).includes(normQ)
      );
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History className="w-5 h-5 text-lad-500" />
          {t('historyView.title')}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t('historyView.subtitle')}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('historyView.searchOps')}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-lad-500 text-slate-900 dark:text-white"
        />
      </div>

      {/* Operations List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            No operations recorded yet.
          </div>
        ) : (
          filtered.map((op) => (
            <div
              key={op.operation_id}
              className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 font-mono text-xs"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <GitCommit className="w-3.5 h-3.5 text-lad-500" />
                  <span className="font-bold text-slate-900 dark:text-white">{op.operation_id}</span>
                  <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-[10px]">
                    clock:{op.lamport_clock}
                  </span>
                </div>
                <span className="text-[11px]">{new Date(op.timestamp).toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Type</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{op.type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Actor</span>
                  <span className="text-slate-700 dark:text-slate-300">{op.actor}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase">Target</span>
                  <span className="text-slate-700 dark:text-slate-300 truncate block">
                    {op.target}
                  </span>
                </div>
              </div>

              {/* Patch snippet */}
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800/80 overflow-x-auto">
                <pre className="text-[10px] text-slate-600 dark:text-slate-300">
                  {JSON.stringify(op.patch, null, 2)}
                </pre>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
