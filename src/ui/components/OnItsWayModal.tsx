/**
 * OnItsWayModal — Ambient Closed-Loop Resolution Modal
 * Triggers when a user clicks 'On its way' on an actionable or follow-up card.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LADObject } from '../../core/standard/types';
import { useLAD } from '../context/LADContext';
import {
  Calendar,
  UserCheck,
  CheckCircle2,
  Clock,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface OnItsWayModalProps {
  isOpen: boolean;
  onClose: () => void;
  obj: LADObject;
  onResolved?: () => void;
}

export const OnItsWayModal: React.FC<OnItsWayModalProps> = ({
  isOpen,
  onClose,
  obj,
  onResolved,
}) => {
  const { updateObject } = useLAD();

  const [selectedAction, setSelectedAction] = useState<
    'schedule' | 'delegate' | 'complete' | 'snooze' | null
  >(null);
  const [scheduleDate, setScheduleDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [delegatePerson, setDelegatePerson] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selectedAction) return;
    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      const patch: Partial<LADObject> = {
        last_checked_at: now,
      };

      const existingFollowup = obj.attributes?.followup || {};
      const historyLog = obj.attributes?.resolution_history || [];

      if (selectedAction === 'complete') {
        patch.status = 'archived';
        patch.attributes = {
          ...obj.attributes,
          followup: {
            ...existingFollowup,
            status: 'resolved',
            resolved_at: now,
            action: 'complete',
            notes,
          },
          resolution_history: [
            ...historyLog,
            { action: 'completed', timestamp: now, notes: notes || 'Marked as completed' },
          ],
        };
      } else if (selectedAction === 'schedule') {
        patch.due_date = scheduleDate;
        patch.attributes = {
          ...obj.attributes,
          followup: {
            ...existingFollowup,
            date: scheduleDate,
            status: 'pending',
            scheduled_at: now,
            notes,
          },
          resolution_history: [
            ...historyLog,
            { action: 'scheduled', timestamp: now, target_date: scheduleDate, notes },
          ],
        };
      } else if (selectedAction === 'delegate') {
        const assignedName = delegatePerson.trim() || 'Delegated Person';
        patch.assigned_to = assignedName;
        patch.attributes = {
          ...obj.attributes,
          followup: {
            ...existingFollowup,
            status: 'delegated',
            delegated_to: assignedName,
            delegated_at: now,
            notes,
          },
          resolution_history: [
            ...historyLog,
            { action: 'delegated', timestamp: now, delegated_to: assignedName, notes },
          ],
        };
      } else if (selectedAction === 'snooze') {
        patch.attributes = {
          ...obj.attributes,
          followup: {
            ...existingFollowup,
            date: scheduleDate,
            status: 'snoozed',
            snoozed_at: now,
            notes,
          },
          resolution_history: [
            ...historyLog,
            { action: 'snoozed', timestamp: now, snooze_until: scheduleDate, notes },
          ],
        };
      }

      await updateObject(obj.object_id, patch, true);
      onResolved?.();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSnooze = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    setScheduleDate(target.toISOString().split('T')[0]);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
          data-testid="on-its-way-modal"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-lad-600 dark:text-lad-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>On Its Way Resolution</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                {obj.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Select what action was taken to advance or close this loop:
            </p>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedAction('schedule')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                  selectedAction === 'schedule'
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
                data-testid="action-scheduled"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Scheduled something
                  </span>
                  <span className="text-[11px] text-slate-500 line-clamp-1">
                    Booked a date or appointment
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction('delegate')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                  selectedAction === 'delegate'
                    ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 ring-2 ring-purple-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
                data-testid="action-delegated"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Delegated to someone
                  </span>
                  <span className="text-[11px] text-slate-500 line-clamp-1">
                    Handed off to a space member
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction('complete')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                  selectedAction === 'complete'
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
                data-testid="action-complete"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Handled / Completed
                  </span>
                  <span className="text-[11px] text-slate-500 line-clamp-1">
                    Done and safe to archive
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction('snooze')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                  selectedAction === 'snooze'
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
                data-testid="action-snooze"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Need more time
                  </span>
                  <span className="text-[11px] text-slate-500 line-clamp-1">
                    Postpone follow-up reminder
                  </span>
                </div>
              </button>
            </div>

            {/* Dynamic contextual inputs based on selected action */}
            {selectedAction === 'schedule' && (
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800/60 space-y-2">
                <label className="text-xs font-bold text-blue-900 dark:text-blue-200 block">
                  New Scheduled Date:
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            )}

            {selectedAction === 'delegate' && (
              <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800/60 space-y-2">
                <label className="text-xs font-bold text-purple-900 dark:text-purple-200 block">
                  Assignee / Contact Name:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Carlos, Dad, Partner"
                  value={delegatePerson}
                  onChange={(e) => setDelegatePerson(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            )}

            {selectedAction === 'snooze' && (
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800/60 space-y-2">
                <label className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                  Snooze until:
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickSnooze(3)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-200 hover:bg-slate-50"
                  >
                    +3 days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSnooze(7)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-200 hover:bg-slate-50"
                  >
                    +1 week
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSnooze(14)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-200 hover:bg-slate-50"
                  >
                    +2 weeks
                  </button>
                </div>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white mt-1"
                />
              </div>
            )}

            {/* Optional Notes */}
            {selectedAction && (
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Resolution Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Appointment booked with Dr. Smith for next Tuesday"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedAction || isSubmitting}
              onClick={handleConfirm}
              className="px-4 py-2 bg-lad-600 hover:bg-lad-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
              data-testid="confirm-resolution-button"
            >
              <span>Confirm Resolution</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
