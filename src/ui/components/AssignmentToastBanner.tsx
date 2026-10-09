/**
 * AssignmentToastBanner Component
 * Displays a non-intrusive, accessible notification banner whenever
 * a card assignment takes place in the active Space.
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, X } from 'lucide-react';
import { useOptionalLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';

export const AssignmentToastBanner: React.FC = () => {
  const lad = useOptionalLAD();
  const { t } = useI18n();

  const notification = lad?.assignmentNotification;
  const dismiss = lad?.dismissAssignmentNotification;

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (notification && dismiss) {
      const timer = setTimeout(() => {
        dismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, dismiss]);

  if (!notification) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed bottom-5 right-5 z-50 max-w-sm w-full pointer-events-none"
        data-testid="assignment-toast-container"
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-auto bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/60 rounded-2xl p-4 shadow-xl shadow-purple-500/10 flex items-start gap-3"
          role="status"
          aria-live="polite"
        >
          <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {t('card.assignedNotificationTitle') || 'Card Assigned'}
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                Notification
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
              <strong>{notification.assigneeName}</strong>{' '}
              {t('card.assignedNotificationMsg', {
                person: notification.assigneeName,
                title: notification.cardTitle,
              }) || `was assigned to "${notification.cardTitle}"`}
            </p>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            title="Dismiss notification"
            data-testid="dismiss-assignment-toast"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
