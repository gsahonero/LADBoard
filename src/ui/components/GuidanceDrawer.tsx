/**
 * GuidanceDrawer — Interactive Global Help, Concepts & Shortcuts Drawer
 * Provides an accessible, calm, searchable repository of all LAD Board capabilities.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GuidanceRegistry } from '../../core/guidance/guidance-registry';
import { GuidanceCategory } from '../../core/guidance/guidance-types';
import {
  X,
  Search,
  BookOpen,
  Keyboard,
  ChevronDown,
  ChevronUp,
  Compass,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

export interface GuidanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWelcomeTour?: () => void;
  initialTopicId?: string;
}

export const GuidanceDrawer: React.FC<GuidanceDrawerProps> = ({
  isOpen,
  onClose,
  onOpenWelcomeTour,
  initialTopicId,
}) => {
  const registry = GuidanceRegistry.getInstance();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<GuidanceCategory | 'all'>('all');
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(initialTopicId || null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
      if (initialTopicId) {
        setExpandedTopicId(initialTopicId);
      }
    } else {
      setSearchQuery('');
    }
  }, [isOpen, initialTopicId]);

  // Handle global Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredTopics = useMemo(() => {
    let list = registry.searchTopics(searchQuery);
    if (activeCategory !== 'all') {
      list = list.filter((t) => t.category === activeCategory);
    }
    return list;
  }, [searchQuery, activeCategory, registry]);

  const shortcuts = useMemo(() => {
    return registry.getAllShortcuts();
  }, [registry]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs cursor-pointer"
          data-testid="guidance-drawer-backdrop"
        />

        {/* Sliding Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl h-full flex flex-col z-10 overflow-hidden"
          role="dialog"
          aria-labelledby="guidance-drawer-title"
          data-testid="guidance-drawer-panel"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-800/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h2
                  id="guidance-drawer-title"
                  className="text-sm font-bold text-slate-900 dark:text-white"
                >
                  LAD Guide & Help
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Living Active Dynamic concepts & fast-flow navigation
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close Guide"
              data-testid="close-guidance-drawer-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-3 sm:px-5 sm:py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search concepts, triggers, shortcuts..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
                data-testid="guidance-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 pb-0.5 no-scrollbar text-xs">
              {[
                { id: 'all', label: 'All Topics' },
                { id: 'concepts', label: 'Concepts' },
                { id: 'capture', label: 'Capture' },
                { id: 'collaboration', label: 'Privacy & Sync' },
                { id: 'shortcuts', label: 'Shortcuts' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  data-testid={`category-filter-${cat.id}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Show Shortcuts Section if category is shortcuts or matching search */}
            {(activeCategory === 'shortcuts' || activeCategory === 'all') && (
              <div className="space-y-2.5" data-testid="guidance-shortcuts-section">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <Keyboard className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Keyboard Shortcuts</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {shortcuts.map((sc) => (
                    <div
                      key={sc.id}
                      className="p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {sc.description}
                      </span>
                      <kbd className="px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[10px] font-bold text-slate-800 dark:text-slate-200 shadow-xs shrink-0">
                        {sc.keyCombo}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Topics Accordion */}
            {activeCategory !== 'shortcuts' && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Core Guides ({filteredTopics.length})</span>
                </div>

                {filteredTopics.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <Search className="w-8 h-8 mx-auto stroke-1" />
                    <p className="text-xs">No guidance topics found matching "{searchQuery}"</p>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  filteredTopics.map((topic) => {
                    const isExpanded = expandedTopicId === topic.id;
                    return (
                      <div
                        key={topic.id}
                        className={`rounded-2xl border transition-all ${
                          isExpanded
                            ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-xs'
                            : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300'
                        }`}
                        data-testid={`guidance-topic-${topic.id}`}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                          className="w-full p-3.5 sm:p-4 text-left flex items-start justify-between gap-3 cursor-pointer"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {topic.title}
                              </span>
                              {topic.badge && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                                  {topic.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                              {topic.summary}
                            </p>
                          </div>
                          <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.18 }}
                              className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 space-y-3"
                            >
                              {topic.sections.map((sec, idx) => (
                                <div key={idx} className="space-y-1.5 pt-1">
                                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {sec.title}
                                  </h4>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {sec.body}
                                  </p>
                                  {sec.tip && (
                                    <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                                      <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                      <span>{sec.tip}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            {onOpenWelcomeTour && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWelcomeTour();
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-xl transition-all cursor-pointer"
                data-testid="drawer-replay-tour-btn"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Restart Welcome Tour</span>
              </button>
            )}

            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>100% Client-Side • Privacy-First</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
