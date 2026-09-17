/**
 * Attention Card — Interactive Active Layer Alert with 1-click micro-actions & 'On its way' modal
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LADActiveAlert } from '../../core/standard/types';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { OnItsWayModal } from './OnItsWayModal';
import {
  DollarSign,
  Calendar,
  ShoppingBag,
  Clock,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export const AttentionCard: React.FC<{ alert: LADActiveAlert }> = ({ alert }) => {
  const { objects, updateObject, dismissAlert, snoozeAlert } = useLAD();
  const { t } = useI18n();

  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [isOnItsWayOpen, setIsOnItsWayOpen] = useState(false);

  const targetObject = objects.find((o) => o.object_id === alert.target_id);

  const handleSaveBalance = async () => {
    if (!balanceInput) return;
    await updateObject(
      alert.target_id,
      {
        attributes: { balance: parseFloat(balanceInput) },
        last_checked_at: new Date().toISOString(),
      },
      true
    );
    dismissAlert(alert.alert_id);
    setIsUpdatingBalance(false);
  };

  const handleMarkDone = async () => {
    await updateObject(
      alert.target_id,
      {
        status: 'completed',
        last_checked_at: new Date().toISOString(),
      },
      true
    );
    dismissAlert(alert.alert_id);
  };

  const getAlertVisuals = () => {
    switch (alert.type) {
      case 'pending_followup':
        return {
          icon: <Clock className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
          bg: 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-800/60',
          badgeText: alert.due_date ? `Due ${alert.due_date}` : 'Follow-up Due',
        };
      case 'stale_balance':
        return {
          icon: <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
          bg: 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60',
          badgeText: `${alert.days_stale || 5} days without update`,
        };
      case 'upcoming_event':
        return {
          icon: <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
          bg: 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-800/60',
          badgeText: alert.due_date ? `Due ${alert.due_date}` : 'Upcoming',
        };
      case 'unresolved_shopping':
        return {
          icon: <ShoppingBag className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          bg: 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/60',
          badgeText: `${alert.days_stale || 3} days waiting`,
        };
      default:
        return {
          icon: <AlertTriangle className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
          bg: 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-200/80 dark:border-purple-800/60',
          badgeText: 'Check required',
        };
    }
  };

  const visual = getAlertVisuals();

  return (
    <>
      <motion.div
        layout
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        className={`p-4 rounded-2xl border shadow-sm transition-shadow hover:shadow-md ${visual.bg} flex flex-col justify-between space-y-3`}
        data-testid={`alert-${alert.alert_id}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
              {visual.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {alert.title}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border border-slate-200/50">
                  {visual.badgeText}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                {alert.message ||
                  (alert.type === 'stale_balance' &&
                    t('active.staleBalance', { days: alert.days_stale || 5 })) ||
                  (alert.type === 'upcoming_event' &&
                    t('active.upcomingAppointment', { title: alert.title })) ||
                  (alert.type === 'unresolved_shopping' &&
                    t('active.unresolvedShopping', { days: alert.days_stale || 3 }))}
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => dismissAlert(alert.alert_id)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            title={t('active.dismiss')}
          >
            <X className="w-3.5 h-3.5" />
          </motion.button>
        </div>

        {/* Inline Balance Update */}
        <AnimatePresence>
          {alert.type === 'stale_balance' && isUpdatingBalance && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-800/60 overflow-hidden"
            >
              <input
                type="number"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                placeholder="Enter current balance ($)"
                autoFocus
                className="w-full text-xs p-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveBalance();
                }}
              />
              <button
                type="button"
                onClick={handleSaveBalance}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold whitespace-nowrap"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsUpdatingBalance(false)}
                className="px-2 py-2 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-1.5">
            {alert.type === 'pending_followup' && targetObject && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOnItsWayOpen(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1 transition-all"
                data-testid="attention-on-its-way-button"
              >
                <span>On its way</span>
                <ArrowRight className="w-3 h-3" />
              </motion.button>
            )}

            {alert.type === 'stale_balance' && !isUpdatingBalance && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsUpdatingBalance(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                {t('active.staleBalanceAction')}
              </motion.button>
            )}

            {alert.type !== 'stale_balance' && alert.type !== 'pending_followup' && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleMarkDone}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-all"
              >
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('common.done')}</span>
              </motion.button>
            )}

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => snoozeAlert(alert.alert_id)}
              className="px-2.5 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-900/60 font-semibold text-xs rounded-xl flex items-center gap-1 transition-colors"
            >
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{t('active.snooze')}</span>
            </motion.button>
          </div>

          <span className="text-[10px] font-bold uppercase text-slate-400">
            {alert.domain}
          </span>
        </div>
      </motion.div>

      {/* OnItsWayModal for this follow-up alert */}
      {targetObject && (
        <OnItsWayModal
          isOpen={isOnItsWayOpen}
          onClose={() => {
            setIsOnItsWayOpen(false);
            dismissAlert(alert.alert_id);
          }}
          obj={targetObject}
        />
      )}
    </>
  );
};
