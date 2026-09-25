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
  Columns3,
  LayoutGrid,
  Plus,
  Clock,
} from 'lucide-react';

export const LivingBoardView: React.FC = () => {
  const { objects, activeAlerts, proposals, approveProposal, rejectProposal, activeSpaceId, activeManifest } = useLAD();
  const { t } = useI18n();

  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState<boolean>(false);
  const [archiveSearchQuery, setArchiveSearchQuery] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'stacks' | 'masonry'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lad_board_view_mode');
      if (saved === 'masonry' || saved === 'stacks') return saved;
    }
    return 'stacks';
  });

  const handleToggleViewMode = (mode: 'stacks' | 'masonry') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lad_board_view_mode', mode);
    }
  };

  const domainFilters = [
    { id: 'all', label: t('boardView.allCategories'), icon: Sparkles },
    { id: 'health', label: t('capture.domains.health'), icon: Heart },
    { id: 'finances', label: t('capture.domains.finances'), icon: CreditCard },
    { id: 'shopping', label: t('capture.domains.shopping'), icon: ShoppingBag },
    { id: 'home', label: t('capture.domains.home'), icon: Home },
    { id: 'documents', label: t('capture.domains.documents'), icon: FileText },
    { id: 'projects', label: t('capture.domains.projects'), icon: Briefcase },
  ];

  const CATEGORY_STACK_DEFS = [
    { id: 'finances', label: t('capture.domains.finances') || 'Money', icon: CreditCard, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
    { id: 'shopping', label: t('capture.domains.shopping') || 'Shopping', icon: ShoppingBag, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
    { id: 'health', label: t('capture.domains.health') || 'Health', icon: Heart, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' },
    { id: 'home', label: t('capture.domains.home') || 'Home', icon: Home, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800' },
    { id: 'documents', label: t('capture.domains.documents') || 'Documents', icon: FileText, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800' },
    { id: 'projects', label: t('capture.domains.projects') || 'Projects', icon: Briefcase, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800' },
  ];

  const effectiveSpaceId = activeSpaceId || activeManifest?.space_id;
  const spaceObjects = useMemo(() => {
    if (!effectiveSpaceId) return objects;
    return objects.filter((o) => !o.space_id || o.space_id === effectiveSpaceId);
  }, [objects, effectiveSpaceId]);

  const activeObjects = spaceObjects.filter((o) => o.status !== 'archived');
  const archivedObjects = spaceObjects.filter((o) => o.status === 'archived');

  const stackCategories = useMemo(() => {
    if (selectedDomain !== 'all') {
      const found = CATEGORY_STACK_DEFS.find((c) => c.id === selectedDomain);
      if (found) return [found];
      return [{
        id: selectedDomain,
        label: selectedDomain.charAt(0).toUpperCase() + selectedDomain.slice(1),
        icon: Sparkles,
        color: 'text-slate-500 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      }];
    }

    const definedIds = CATEGORY_STACK_DEFS.map((d) => d.id);
    const extraDomains = Array.from(
      new Set(activeObjects.map((o) => o.domain).filter((d) => !definedIds.includes(d)))
    );

    return [
      ...CATEGORY_STACK_DEFS,
      ...extraDomains.map((dom) => ({
        id: dom,
        label: dom.charAt(0).toUpperCase() + dom.slice(1),
        icon: Sparkles,
        color: 'text-slate-500 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      })),
    ];
  }, [selectedDomain, activeObjects, t]);

  const filteredObjects = useMemo(() => {
    if (showArchive) {
      const base = !archiveSearchQuery.trim()
        ? archivedObjects
        : fuzzyFilterObjects(archivedObjects, archiveSearchQuery);
      return [...base].sort(
        (a, b) =>
          new Date(b.created_at || b.updated_at || 0).getTime() -
          new Date(a.created_at || a.updated_at || 0).getTime()
      );
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
    return [...result].sort(
      (a, b) =>
        new Date(b.created_at || b.updated_at || 0).getTime() -
        new Date(a.created_at || a.updated_at || 0).getTime()
    );
  }, [showArchive, archivedObjects, activeObjects, archiveSearchQuery, selectedDomain, dateFilter, searchQuery]);

  const visibleStacks = useMemo(() => {
    if (searchQuery.trim()) {
      return stackCategories.filter((cat) =>
        filteredObjects.some((o) => o.domain === cat.id)
      );
    }
    return stackCategories;
  }, [stackCategories, filteredObjects, searchQuery]);

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

      {/* 5. Navigation Bar: Category Pills, Search Bar, View Mode Toggle & Archive Toggle */}
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
            <div className="relative flex-1 min-w-[180px] max-w-xs sm:max-w-sm">
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

            {/* View Mode Toggle: Stacks vs Masonry */}
            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shrink-0" data-testid="board-view-mode-toggle">
              <button
                type="button"
                onClick={() => handleToggleViewMode('stacks')}
                title="Category Stacks View"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  viewMode === 'stacks'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                data-testid="view-mode-stacks"
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Stacks</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleViewMode('masonry')}
                title="Masonry Flow View"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  viewMode === 'masonry'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                data-testid="view-mode-masonry"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Masonry</span>
              </button>
            </div>

            {/* Sorting Order Visual Cue */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs select-none shrink-0"
              data-testid="sorting-order-visual-cue"
              title={t('boardView.sortRecentToOldTooltip') || 'Cards are sorted chronologically: newest created appear first'}
            >
              <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>{t('boardView.sortRecentToOld') || 'Recent to old'}</span>
              <span className="text-indigo-500 font-bold text-xs leading-none">↓</span>
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

      {/* 6. Object Cards: Category Stacks View vs Masonry Flow View */}
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
      ) : showArchive || viewMode === 'masonry' ? (
        /* Masonry Flow View (Zero Row Gaps) */
        <div
          className="columns-1 sm:columns-2 lg:columns-3 gap-3.5 space-y-3.5 [column-fill:_balance]"
          data-testid="living-board-grid"
        >
          {filteredObjects.map((obj) => (
            <div key={obj.object_id} className="break-inside-avoid">
              <ObjectCard obj={obj} />
            </div>
          ))}
        </div>
      ) : (
        /* Category Stacks View (Grouped by domain, no vertical gaps, empty drop-zones) */
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start"
          data-testid="living-board-grid"
        >
          {visibleStacks.map((cat) => {
            const Icon = cat.icon;
            const cardsInStack = filteredObjects.filter((o) => o.domain === cat.id);

            return (
              <div
                key={cat.id}
                className="flex flex-col space-y-3 bg-slate-50/70 dark:bg-slate-900/40 p-3.5 rounded-3xl border border-slate-200/70 dark:border-slate-800/70 transition-all h-fit"
                data-testid={`category-stack-${cat.id}`}
              >
                {/* Stack Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-xl border ${cat.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {cat.label}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {cardsInStack.length}
                    </span>
                    {cardsInStack.length > 0 && (
                      <span
                        className="text-[10px] text-slate-400 font-medium hidden sm:inline-flex items-center gap-0.5"
                        data-testid={`stack-sort-cue-${cat.id}`}
                        title="Sorted recent to old"
                      >
                        <span>{t('boardView.newestFirst') || 'Newest'}</span>
                        <span className="text-indigo-500 font-bold">↓</span>
                      </span>
                    )}
                  </div>
                  {selectedDomain === 'all' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDomain(cat.id);
                        setDateFilter(null);
                      }}
                      className="text-[11px] font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                      title={`Filter to ${cat.label}`}
                    >
                      Focus
                    </button>
                  )}
                </div>

                {/* Cards or Empty Drop-Zone Placeholder */}
                {cardsInStack.length > 0 ? (
                  <div className="space-y-3" data-testid={`stack-cards-${cat.id}`}>
                    {cardsInStack.map((obj) => (
                      <ObjectCard key={obj.object_id} obj={obj} />
                    ))}
                  </div>
                ) : (
                  <div
                    className="p-6 border-2 border-dashed border-slate-200/90 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 bg-white/50 dark:bg-slate-900/30"
                    data-testid={`empty-dropzone-${cat.id}`}
                  >
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        No active cards
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Add or capture {cat.label.toLowerCase()} cards here
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const inputEl = document.querySelector(
                          '[data-testid="smart-capture-input"]'
                        ) as HTMLInputElement;
                        if (inputEl) {
                          inputEl.focus();
                          inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                      className="mt-1 px-3 py-1 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add card</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
