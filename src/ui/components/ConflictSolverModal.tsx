/**
 * ConflictSolverModal Component
 * Interactive conflict resolution dialogue allowing users to review concurrent changes
 * side-by-side, inspect conflicting fields, and choose between keeping local changes,
 * accepting remote changes, or custom field-by-field merging.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Download,
  Upload,
  Split,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  HardDrive,
  Cloud,
  CheckCircle2,
} from 'lucide-react';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';

export const ConflictSolverModal: React.FC = () => {
  const {
    syncState,
    resolveConflict,
    isConflictModalOpen,
    closeConflictModal,
    objects,
    nodes,
    userRegistry,
  } = useLAD();
  const { t } = useI18n();

  const activeConflicts = syncState.activeConflicts;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolutionMode, setResolutionMode] = useState<'quick' | 'merge'>('quick');
  const [isResolving, setIsResolving] = useState(false);
  const [customFieldPicks, setCustomFieldPicks] = useState<Record<string, 'local' | 'remote' | 'custom'>>({});
  const [customValues, setCustomValues] = useState<Record<string, any>>({});

  // Ensure currentIndex stays within range as conflicts are resolved
  useEffect(() => {
    if (currentIndex >= activeConflicts.length && activeConflicts.length > 0) {
      setCurrentIndex(Math.max(0, activeConflicts.length - 1));
    }
  }, [activeConflicts.length, currentIndex]);

  const currentConflict = activeConflicts[currentIndex];

  // Initialize field picks when active conflict changes
  useEffect(() => {
    if (!currentConflict) return;
    const initialPicks: Record<string, 'local' | 'remote' | 'custom'> = {};
    const initialValues: Record<string, any> = {};

    for (const key of currentConflict.conflictingKeys) {
      initialPicks[key] = 'local';
      initialValues[key] = currentConflict.localOperation.patch[key] ?? '';
    }
    setCustomFieldPicks(initialPicks);
    setCustomValues(initialValues);
    setResolutionMode('quick');
  }, [currentConflict?.conflictId]);

  // Target object information
  const targetObject = useMemo(() => {
    if (!currentConflict) return undefined;
    return objects.find((o) => o.object_id === currentConflict.targetId);
  }, [currentConflict, objects]);

  const itemTitle =
    targetObject?.title ||
    currentConflict?.targetTitle ||
    currentConflict?.localOperation.patch?.title ||
    currentConflict?.remoteOperation.patch?.title ||
    t('conflictSolver.itemFallbackTitle', { id: currentConflict?.targetId?.slice(0, 8) || '' });

  // Remote actor resolution
  const remoteActorName = useMemo(() => {
    if (!currentConflict) return t('conflictSolver.remoteActor');
    const remoteActorId = currentConflict.remoteOperation.actor;
    const actorNode = nodes.find(
      (n) => n.ref_id === remoteActorId || n.node_id === `node_${remoteActorId}` || n.node_id === remoteActorId
    );
    return (
      actorNode?.metadata?.name ||
      actorNode?.label ||
      actorNode?.metadata?.email ||
      t('conflictSolver.remoteActor')
    );
  }, [currentConflict, nodes, t]);

  const localActorName =
    userRegistry?.identities[0]?.display_name || t('conflictSolver.localActor');

  if (!isConflictModalOpen || activeConflicts.length === 0 || !currentConflict) {
    return null;
  }

  const formatFieldValue = (val: any): string => {
    if (val === undefined || val === null) return '—';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const handleResolveQuick = async (choice: 'keep_local' | 'accept_remote') => {
    if (!currentConflict || isResolving) return;
    setIsResolving(true);
    try {
      await resolveConflict(currentConflict.conflictId, choice);
    } catch (err) {
      console.error('[LAD:ConflictSolver] Failed to resolve conflict:', err);
    } finally {
      setIsResolving(false);
    }
  };

  const handleResolveCustomMerge = async () => {
    if (!currentConflict || isResolving) return;
    setIsResolving(true);

    const mergedPatch: Record<string, any> = {
      ...currentConflict.remoteOperation.patch,
      ...currentConflict.localOperation.patch,
    };

    for (const key of currentConflict.conflictingKeys) {
      const pick = customFieldPicks[key];
      if (pick === 'remote') {
        mergedPatch[key] = currentConflict.remoteOperation.patch[key];
      } else if (pick === 'local') {
        mergedPatch[key] = currentConflict.localOperation.patch[key];
      } else if (pick === 'custom') {
        mergedPatch[key] = customValues[key];
      }
    }

    try {
      await resolveConflict(currentConflict.conflictId, 'merge', mergedPatch);
    } catch (err) {
      console.error('[LAD:ConflictSolver] Failed to apply merged conflict:', err);
    } finally {
      setIsResolving(false);
    }
  };

  const localTime = new Date(currentConflict.localOperation.timestamp).toLocaleTimeString();
  const remoteTime = new Date(currentConflict.remoteOperation.timestamp).toLocaleTimeString();

  return (
    <AnimatePresence>
      <div
        data-testid="conflict-solver-modal"
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 bg-gradient-to-r from-rose-50/50 via-amber-50/30 to-transparent dark:from-rose-950/20 dark:via-amber-950/10">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0 border border-rose-200/80 dark:border-rose-900/60">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {t('conflictSolver.dialogTitle')}
                  </h2>
                  {activeConflicts.length > 1 && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                      {t('conflictSolver.conflictCounter', {
                        current: currentIndex + 1,
                        total: activeConflicts.length,
                      })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {t('conflictSolver.dialogSubtitle', { title: itemTitle })}
                </p>
              </div>
            </div>

            <button
              onClick={closeConflictModal}
              title={t('conflictSolver.reviewLater')}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Multiple Conflicts Navigation Bar */}
          {activeConflicts.length > 1 && (
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {itemTitle}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {currentIndex + 1} / {activeConflicts.length}
                </span>
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(activeConflicts.length - 1, prev + 1))}
                  disabled={currentIndex === activeConflicts.length - 1}
                  className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Body: Side-by-Side Comparison */}
          <div className="p-4 sm:p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {/* Local Version Card */}
              <div className="p-4 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border-2 border-blue-200/80 dark:border-blue-900/60 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5" />
                      {t('conflictSolver.localVersionTitle')}
                    </span>
                    <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {localTime}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <User className="w-3 h-3 text-blue-500" />
                    <span className="font-semibold">{localActorName}</span>
                  </div>

                  {/* Conflicting Properties */}
                  <div className="space-y-1.5 pt-2">
                    {currentConflict.conflictingKeys.map((key) => {
                      const val = currentConflict.localOperation.patch[key];
                      return (
                        <div
                          key={key}
                          className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-blue-200/60 dark:border-blue-900/40"
                        >
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">
                            {key}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 break-words">
                            {formatFieldValue(val)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="btn-keep-local"
                  onClick={() => handleResolveQuick('keep_local')}
                  disabled={isResolving}
                  className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t('conflictSolver.keepLocal')}</span>
                </button>
              </div>

              {/* Remote Version Card */}
              <div className="p-4 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border-2 border-emerald-200/80 dark:border-emerald-900/60 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5" />
                      {t('conflictSolver.remoteVersionTitle')}
                    </span>
                    <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {remoteTime}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <User className="w-3 h-3 text-emerald-500" />
                    <span className="font-semibold">{remoteActorName}</span>
                  </div>

                  {/* Conflicting Properties */}
                  <div className="space-y-1.5 pt-2">
                    {currentConflict.conflictingKeys.map((key) => {
                      const val = currentConflict.remoteOperation.patch[key];
                      return (
                        <div
                          key={key}
                          className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200/60 dark:border-emerald-900/40"
                        >
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">
                            {key}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 break-words">
                            {formatFieldValue(val)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="btn-accept-remote"
                  onClick={() => handleResolveQuick('accept_remote')}
                  disabled={isResolving}
                  className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('conflictSolver.acceptRemote')}</span>
                </button>
              </div>
            </div>

            {/* Custom Merge Expandable Option */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <button
                type="button"
                data-testid="btn-toggle-merge-mode"
                onClick={() => setResolutionMode(resolutionMode === 'merge' ? 'quick' : 'merge')}
                className="w-full p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Split className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>{t('conflictSolver.customMerge')}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {resolutionMode === 'merge' ? '▲ Hide' : '▼ Pick per field'}
                </span>
              </button>

              {resolutionMode === 'merge' && (
                <div className="p-4 space-y-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('conflictSolver.customMergeDesc')}
                  </p>

                  <div className="space-y-2">
                    {currentConflict.conflictingKeys.map((key) => {
                      const localVal = currentConflict.localOperation.patch[key];
                      const remoteVal = currentConflict.remoteOperation.patch[key];
                      const pick = customFieldPicks[key] || 'local';

                      return (
                        <div
                          key={key}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {key}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setCustomFieldPicks((prev) => ({ ...prev, [key]: 'local' }))
                                }
                                className={`px-2 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                                  pick === 'local'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {t('conflictSolver.mergeChoiceMine')}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setCustomFieldPicks((prev) => ({ ...prev, [key]: 'remote' }))
                                }
                                className={`px-2 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                                  pick === 'remote'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {t('conflictSolver.mergeChoiceTheirs')}
                              </button>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-600 dark:text-slate-300 pl-1">
                            <span className="text-slate-400">Selected value: </span>
                            <span className="font-semibold">
                              {pick === 'local'
                                ? formatFieldValue(localVal)
                                : formatFieldValue(remoteVal)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    data-testid="btn-apply-merge"
                    onClick={handleResolveCustomMerge}
                    disabled={isResolving}
                    className="w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('conflictSolver.applyResolution')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400">
              {t('conflictSolver.unresolvedNotice')}
            </span>
            <button
              type="button"
              onClick={closeConflictModal}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-xl transition-colors cursor-pointer"
            >
              {t('conflictSolver.reviewLater')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
