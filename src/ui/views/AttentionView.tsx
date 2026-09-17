/**
 * Attention View — Surfaces items from the Active Layer requiring user interaction or follow-up
 */

import React, { useState } from 'react';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import {
  Bell,
  AlertTriangle,
  Calendar,
  DollarSign,
  ShoppingBag,
  Bot,
  Check,
  X,
  Clock,
} from 'lucide-react';

export const AttentionView: React.FC<{ onNavigateToDomain?: (domain: string) => void }> = ({
  onNavigateToDomain,
}) => {
  const { activeAlerts, dismissAlert, snoozeAlert, proposals, approveProposal, rejectProposal, updateObject } = useLAD();
  const { t } = useI18n();

  const [editingBalanceId, setEditingBalanceId] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState('');

  const handleUpdateBalance = async (objectId: string) => {
    if (!newBalance) return;
    await updateObject(
      objectId,
      {
        attributes: { balance: parseFloat(newBalance) },
        last_checked_at: new Date().toISOString(),
      },
      true // Immediate commit
    );
    setEditingBalanceId(null);
    setNewBalance('');
  };

  const hasItems = activeAlerts.length > 0 || proposals.length > 0;

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-lad-500" />
          {t('active.title')}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t('active.subtitle')}
        </p>
      </div>

      {!hasItems ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-6 h-6" />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
            {t('active.empty')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Agent Proposals Section (Approval Required) */}
          {proposals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-indigo-500" />
                Pending Agent Approvals ({proposals.length})
              </h2>

              <div className="grid gap-3">
                {proposals.map((prop) => (
                  <div
                    key={prop.proposalId}
                    className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 rounded-xl space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 rounded-lg">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                            {prop.agentName}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                            {prop.description}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-full">
                        Approval Required
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-indigo-100 dark:border-indigo-900/40">
                      <button
                        onClick={() => rejectProposal(prop.proposalId)}
                        className="px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        {t('active.reject')}
                      </button>
                      <button
                        onClick={() => approveProposal(prop.proposalId)}
                        className="px-3.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {t('active.approve')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Alerts Section */}
          {activeAlerts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Active Alerts ({activeAlerts.length})
              </h2>

              <div className="grid gap-3">
                {activeAlerts.map((alert) => {
                  return (
                    <div
                      key={alert.alert_id}
                      className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl">
                            {alert.type === 'stale_balance' && <DollarSign className="w-4 h-4" />}
                            {alert.type === 'upcoming_event' && <Calendar className="w-4 h-4" />}
                            {alert.type === 'unresolved_shopping' && (
                              <ShoppingBag className="w-4 h-4" />
                            )}
                            {alert.type !== 'stale_balance' &&
                              alert.type !== 'upcoming_event' &&
                              alert.type !== 'unresolved_shopping' && (
                                <AlertTriangle className="w-4 h-4" />
                              )}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                              {alert.title}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {alert.type === 'stale_balance' &&
                                t('active.staleBalance', { days: alert.days_stale || 5 })}
                              {alert.type === 'upcoming_event' &&
                                t('active.upcomingAppointment', { title: alert.title })}
                              {alert.type === 'unresolved_shopping' &&
                                t('active.unresolvedShopping', { days: alert.days_stale || 3 })}
                            </div>
                          </div>
                        </div>

                        {alert.domain && (
                          <span
                            onClick={() => onNavigateToDomain && onNavigateToDomain(alert.domain!)}
                            className="cursor-pointer text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-2 py-0.5 rounded-full hover:bg-slate-200 transition-colors uppercase"
                          >
                            {alert.domain}
                          </span>
                        )}
                      </div>

                      {/* Special Quick Inline Actions (e.g. Update Balance) */}
                      {alert.type === 'stale_balance' && editingBalanceId === alert.target_id && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <input
                            type="number"
                            value={newBalance}
                            onChange={(e) => setNewBalance(e.target.value)}
                            placeholder="Enter new balance amount"
                            className="text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white flex-1"
                          />
                          <button
                            onClick={() => handleUpdateBalance(alert.target_id)}
                            className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingBalanceId(null)}
                            className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {alert.type === 'stale_balance' && editingBalanceId !== alert.target_id && (
                          <button
                            onClick={() => setEditingBalanceId(alert.target_id)}
                            className="px-3 py-1 text-xs font-semibold text-lad-600 hover:bg-lad-50 dark:hover:bg-lad-950/40 rounded-lg transition-colors"
                          >
                            {t('active.staleBalanceAction')}
                          </button>
                        )}
                        <button
                          onClick={() => snoozeAlert(alert.alert_id)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3" />
                          {t('active.snooze')}
                        </button>
                        <button
                          onClick={() => dismissAlert(alert.alert_id)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
                        >
                          {t('active.dismiss')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
