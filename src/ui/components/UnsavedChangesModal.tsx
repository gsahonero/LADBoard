/**
 * UnsavedChangesModal — Three-Way Decision Dialog for Navigation Protection
 * Prompts user to Save & Continue, Discard & Leave, or Keep Editing.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigationGuard } from '../context/NavigationGuardContext';
import { AlertTriangle, Check, Trash2, X, Loader2 } from 'lucide-react';

export const UnsavedChangesModal: React.FC = () => {
  const {
    isModalOpen,
    activeGuard,
    saveAndProceed,
    discardAndProceed,
    cancelNavigation,
    isSaving,
  } = useNavigationGuard();

  if (!isModalOpen || !activeGuard) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        data-testid="unsaved-changes-modal"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Unsaved Changes
                </h3>
                <p className="text-[11px] text-slate-500">
                  {activeGuard.description}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={cancelNavigation}
              disabled={isSaving}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              data-testid="unsaved-modal-close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              You have unsaved changes in <strong className="font-semibold text-slate-900 dark:text-white">{activeGuard.description}</strong>. Would you like to save your changes before leaving?
            </p>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-xl text-[11px] text-amber-800 dark:text-amber-200">
              Leaving without saving will permanently discard any modifications made during this session.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
            <button
              type="button"
              onClick={cancelNavigation}
              disabled={isSaving}
              className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              data-testid="unsaved-modal-keep-editing"
            >
              Keep Editing
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={discardAndProceed}
                disabled={isSaving}
                className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 hover:bg-amber-200/80 dark:hover:bg-amber-900/60 rounded-xl transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                data-testid="unsaved-modal-discard"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Discard & Leave</span>
              </button>

              <button
                type="button"
                onClick={saveAndProceed}
                disabled={isSaving}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-white bg-lad-600 hover:bg-lad-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                data-testid="unsaved-modal-save"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save & Continue</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
