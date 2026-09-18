/**
 * Living Board View — The primary intuitive daily cockpit for LAD Board
 * Features active cards by category/timeline and a dedicated, searchable Archive section.
 */

import React, { useState, useMemo } from 'react';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { fuzzyFilterObjects } from '../../core/utils/fuzzy-search';
import { SmartCaptureBar } from '../components/SmartCaptureBar';
import { AttentionCard } from '../components/AttentionCard';
import { ObjectCard } from '../components/ObjectCard';
import { TimelineRibbon } from '../components/TimelineRibbon';
import { DemoDataBanner } from '../components/DemoDataBanner';
import {
  Bell,
  Heart,
  CreditCard,
  ShoppingBag,
  Home,
  FileText,
  Briefcase,
  Sparkles,
  Bot,
  Check,
  X,
  Archive,
  Search,
} from 'lucide-react';

export const LivingBoardView: React.FC = () => {
  const { objects, activeAlerts, proposals, approveProposal, rejectProposal } = useLAD();
  const { t } = useI18n();

  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState<boolean>(false);
  const [archiveSearchQuery, setArchiveSearchQuery] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const domainFilters = [
    { id: 'all', label: t('boardView.allCategories'), icon: Sparkles },
    { id: 'health', label: t('capture.domains.health'), icon: Heart },
    { id: 'finances', label: t('capture.domains.finances'), icon: CreditCard },
    { id: 'shopping', label: t('capture.domains.shopping'), icon: ShoppingBag },
    { id: 'home', label: t('capture.domains.home'), icon: Home },
    { id: 'documents', label: t('capture.domains.documents'), icon: FileText },
    { id: 'projects', label: t('capture.domains.projects'), icon: Briefcase },
  ];

  const activeObjects = objects.filter((o) => o.status !== 'archived');
  const archivedObjects = objects.filter((o) => o.status === 'archived');

  const filteredObjects = useMemo(() => {
    if (showArchive) {
      if (!archiveSearchQuery.trim()) return archivedObjects;
      return fuzzyFilterObjects(archivedObjects, archiveSearchQuery);
    }

    let result = activeObjects;
    if (selectedDomain !== 'all') {
      result = result.filter((o) => o.domain === selectedDomain);
    }
    if (dateFilter) {
      result = result.filter((o) => o.due_date === dateFilter);
    }
    if (searchQuery.trim()) {
      result = fuzzyFilterObjects(result, searchQuery);
    }
    return result;
  }, [showArchive, archivedObjects, activeObjects, archiveSearchQuery, selectedDomain, dateFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. Guided Starter Demo Banner (if empty) */}
      <DemoDataBanner />

      {/* 2. Hero Smart Capture Bar */}
      <SmartCaptureBar />

      {/* 3. Things to Check / Attention Hub (if any alerts or proposals) */}
      {(activeAlerts.length > 0 || proposals.length > 0) && !showArchive && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('active.title')}</span>
              <span className="px-2 py-0.2 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-full text-[10px] font-bold">
                {activeAlerts.length + proposals.length}
              </span>
            </h2>
          </div>

          {/* Bot Proposals */}
          {proposals.length > 0 && (
            <div className="grid gap-3">
              {proposals.map((prop) => (
                <div
                  key={prop.proposalId}
                  className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {prop.agentName}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300">
                        {prop.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => rejectProposal(prop.proposalId)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{t('active.reject')}</span>
                    </button>
                    <button
                      onClick={() => approveProposal(prop.proposalId)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{t('active.approve')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active Attention Alerts */}
          {activeAlerts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeAlerts.map((alert) => (
                <AttentionCard key={alert.alert_id} alert={alert} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. Timeline Ribbon Strip (for active view) */}
      {!showArchive && (
        <div className="pt-2">
          <TimelineRibbon
            objects={activeObjects}
            onSelectDateFilter={(d) => setDateFilter(dateFilter === d ? null : d)}
          />
        </div>
      )}

      {/* 5. Navigation Bar: Category Pills, Search Bar & Archive Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200/80 dark:border-slate-800 pb-3" data-testid="categories-filter-bar">
        {!showArchive ? (
          <>
            <div className="flex flex-wrap items-center gap-1.5 py-0.5" data-testid="category-filter-buttons">
              {domainFilters.map((df) => {
                const Icon = df.icon;
                const isSelected = selectedDomain === df.id;
                const count =
                  df.id === 'all'
                    ? activeObjects.length
                    : activeObjects.filter((o) => o.domain === df.id).length;

                return (
                  <button
                    key={df.id}
                    onClick={() => {
                      setSelectedDomain(df.id);
                      setDateFilter(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                      isSelected
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{df.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Smart Space Board Search Bar */}
            <div className="relative flex-1 min-w-[200px] max-w-xs sm:max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cards, banks, tags..."
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm transition-all"
                data-testid="space-board-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
                  data-testid="clear-search-button"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </>
        ) : (
          /* Archive Search Bar */
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={archiveSearchQuery}
              onChange={(e) => setArchiveSearchQuery(e.target.value)}
              placeholder="Search archive by title, bank, patient, or notes..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
              data-testid="archive-search-input"
            />
          </div>
        )}

        {/* Archive Toggle Button */}
        <button
          type="button"
          onClick={() => setShowArchive(!showArchive)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
            showArchive
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
          data-testid="archive-toggle-button"
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Archive</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              showArchive
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}
          >
            {archivedObjects.length}
          </span>
        </button>
      </div>

      {/* Archive Context Banner */}
      {showArchive && (
        <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Archive Section:</strong> Passive and completed cards are non-destructively preserved here. They remain fully searchable and restorable at any time.
            </span>
          </div>
        </div>
      )}

      {/* 6. Object Cards Grid */}
      {filteredObjects.length === 0 ? (
        <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-2">
          <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {showArchive
              ? 'No archived items found.'
              : searchQuery.trim()
              ? `No cards found matching "${searchQuery}".`
              : t('boardView.emptyCategory')}
          </p>
          {!showArchive && searchQuery.trim() && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 underline"
              data-testid="empty-clear-search-button"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 items-start" data-testid="living-board-grid">
          {filteredObjects.map((obj) => (
            <ObjectCard key={obj.object_id} obj={obj} />
          ))}
        </div>
      )}
    </div>
  );
};
