import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LADObject, LADObjectPriority } from '../../core/standard/types';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import {
  Heart,
  CreditCard,
  ShoppingBag,
  Home,
  FileText,
  Briefcase,
  Sparkles,
  Calendar,
  User,
  CheckCircle2,
  Circle,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';

export const ObjectCard: React.FC<{ obj: LADObject }> = ({ obj }) => {
  const { updateObject, deleteObject } = useLAD();
  const { t } = useI18n();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(obj.title);
  const [editDescription, setEditDescription] = useState(obj.description || '');
  const [editDueDate, setEditDueDate] = useState(obj.due_date || '');
  const [editAssignedTo, setEditAssignedTo] = useState(obj.assigned_to || '');
  const [editPriority, setEditPriority] = useState<LADObjectPriority>(obj.priority || 'medium');
  const [editBalance, setEditBalance] = useState(
    obj.attributes?.balance !== undefined ? String(obj.attributes.balance) : ''
  );

  const isCompleted = obj.status === 'completed';

  const handleStartEditing = () => {
    setEditTitle(obj.title);
    setEditDescription(obj.description || '');
    setEditDueDate(obj.due_date || '');
    setEditAssignedTo(obj.assigned_to || '');
    setEditPriority(obj.priority || 'medium');
    setEditBalance(
      obj.attributes?.balance !== undefined ? String(obj.attributes.balance) : ''
    );
    setIsEditing(true);
  };

  const handleToggleCompleted = async () => {
    await updateObject(
      obj.object_id,
      {
        status: isCompleted ? 'active' : 'completed',
        last_checked_at: new Date().toISOString(),
      },
      true
    );
  };

  const getQuickDateStr = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  const handleSaveEdit = async () => {
    const patch: Partial<LADObject> = {
      title: editTitle.trim() || obj.title,
      description: editDescription,
      due_date: editDueDate.trim() || undefined,
      assigned_to: editAssignedTo.trim() || undefined,
      priority: editPriority,
    };

    if (obj.domain === 'finances' && editBalance !== '') {
      patch.attributes = { ...obj.attributes, balance: parseFloat(editBalance) || 0 };
    }

    await updateObject(obj.object_id, patch, true);
    setIsEditing(false);
  };

  const getDomainStyle = (domain: string) => {
    switch (domain) {
      case 'health':
        return {
          icon: <Heart className="w-3.5 h-3.5 text-rose-500" />,
          border: 'hover:border-rose-300 dark:hover:border-rose-700',
          badge: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          dot: 'bg-rose-500',
        };
      case 'finances':
        return {
          icon: <CreditCard className="w-3.5 h-3.5 text-emerald-500" />,
          border: 'hover:border-emerald-300 dark:hover:border-emerald-700',
          badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          dot: 'bg-emerald-500',
        };
      case 'shopping':
        return {
          icon: <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />,
          border: 'hover:border-amber-300 dark:hover:border-amber-700',
          badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          dot: 'bg-amber-500',
        };
      case 'home':
        return {
          icon: <Home className="w-3.5 h-3.5 text-indigo-500" />,
          border: 'hover:border-indigo-300 dark:hover:border-indigo-700',
          badge: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          dot: 'bg-indigo-500',
        };
      case 'documents':
        return {
          icon: <FileText className="w-3.5 h-3.5 text-blue-500" />,
          border: 'hover:border-blue-300 dark:hover:border-blue-700',
          badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          dot: 'bg-blue-500',
        };
      case 'projects':
        return {
          icon: <Briefcase className="w-3.5 h-3.5 text-purple-500" />,
          border: 'hover:border-purple-300 dark:hover:border-purple-700',
          badge: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          dot: 'bg-purple-500',
        };
      default:
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-slate-500" />,
          border: 'hover:border-slate-300 dark:hover:border-slate-700',
          badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const style = getDomainStyle(obj.domain);

  return (
    <motion.div
      whileHover={{ y: isEditing ? 0 : -2, transition: { duration: 0.2 } }}
      className={`p-4 bg-white dark:bg-slate-900 rounded-2xl border ${
        isEditing
          ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg'
          : `border-slate-200 dark:border-slate-800/80 shadow-sm transition-shadow hover:shadow-md ${style.border}`
      } flex flex-col justify-between space-y-3 group ${
        isCompleted && !isEditing ? 'opacity-65 bg-slate-50/60 dark:bg-slate-950/60' : ''
      }`}
    >
      <div className="space-y-2">
        {/* Top Meta Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${style.badge}`}
            >
              {style.icon}
              <span>{t(`capture.domains.${obj.domain}`) || obj.domain}</span>
            </span>

            {obj.priority === 'urgent' && !isEditing && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-full">
                {t('capture.priorities.urgent')}
              </span>
            )}
          </div>

          {!isEditing && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleStartEditing}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                title={t('common.edit')}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => deleteObject(obj.object_id)}
                className="p-1 text-slate-400 hover:text-rose-500 rounded"
                title={t('common.delete')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          )}
        </div>

        {/* Content / Editor */}
        {isEditing ? (
          <div className="space-y-3 pt-1">
            {/* Title */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {t('capture.title')}
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder={t('card.titlePlaceholder')}
                className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                autoFocus
              />
            </div>

            {/* Date & Due Date Picker + Quick Helpers */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span>{t('card.dueDateLabel')}</span>
                </label>
                {editDueDate && (
                  <button
                    type="button"
                    onClick={() => setEditDueDate('')}
                    className="text-[10px] text-rose-500 hover:text-rose-600 font-medium flex items-center gap-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                    <span>{t('card.clearDate')}</span>
                  </button>
                )}
              </div>

              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
              />

              {/* Quick Date Helpers */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                <button
                  type="button"
                  onClick={() => setEditDueDate(getQuickDateStr(0))}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium transition-colors ${
                    editDueDate === getQuickDateStr(0)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t('card.quickToday')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditDueDate(getQuickDateStr(1))}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium transition-colors ${
                    editDueDate === getQuickDateStr(1)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t('card.quickTomorrow')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditDueDate(getQuickDateStr(7))}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium transition-colors ${
                    editDueDate === getQuickDateStr(7)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t('card.quickNextWeek')}
                </button>
              </div>
            </div>

            {/* Description / Notes */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {t('spaces.spaceDescription')}
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder={t('card.notesPlaceholder')}
                rows={2}
                className="w-full text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white resize-none"
              />
            </div>

            {/* Finance balance input (if finances or balance is set) */}
            {obj.domain === 'finances' && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('card.balanceLabel')}
                </label>
                <input
                  type="number"
                  step="any"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                />
              </div>
            )}

            {/* Assignee & Priority */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>{t('card.assignedToLabel')}</span>
                </label>
                <input
                  type="text"
                  value={editAssignedTo}
                  onChange={(e) => setEditAssignedTo(e.target.value)}
                  placeholder="e.g. Alice"
                  className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                  <AlertCircle className="w-3 h-3 text-slate-400" />
                  <span>{t('card.priorityLabel')}</span>
                </label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as LADObjectPriority)}
                  className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                >
                  <option value="low">{t('capture.priorities.low')}</option>
                  <option value="medium">{t('capture.priorities.medium')}</option>
                  <option value="high">{t('capture.priorities.high')}</option>
                  <option value="urgent">{t('capture.priorities.urgent')}</option>
                </select>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex justify-end gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl transition-colors"
              >
                {t('common.cancel')}
              </button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={handleSaveEdit}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{t('common.save')}</span>
              </motion.button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2.5">
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={handleToggleCompleted}
              className="mt-0.5 text-slate-400 hover:text-emerald-500 transition-colors"
            >
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </motion.button>
            <div className="flex-1">
              <h3
                className={`text-xs font-bold text-slate-900 dark:text-white leading-snug transition-all ${
                  isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                }`}
              >
                {obj.title}
              </h3>
              {obj.description && obj.description !== obj.title && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {obj.description}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Details: Balance / Due Date / Person / Tags (when not editing) */}
      {!isEditing && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {obj.attributes?.balance !== undefined && (
              <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200/50">
                ${Number(obj.attributes.balance).toLocaleString()}
              </span>
            )}

            {obj.due_date ? (
              <span
                onClick={handleStartEditing}
                className="cursor-pointer flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2 py-0.5 rounded-lg text-[10px] font-semibold border border-blue-200/50 dark:border-blue-800/50 transition-colors"
                title="Click to edit date"
              >
                <Calendar className="w-3 h-3 text-blue-500" />
                <span>{obj.due_date}</span>
              </span>
            ) : (
              <span
                onClick={handleStartEditing}
                className="cursor-pointer flex items-center gap-1 text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 px-1.5 py-0.5 rounded-lg text-[10px] font-medium border border-dashed border-slate-200 dark:border-slate-700 transition-colors"
                title={t('card.dueDateLabel')}
              >
                <Calendar className="w-2.5 h-2.5" />
                <span>+ {t('card.dueDateLabel')}</span>
              </span>
            )}

            {obj.assigned_to && (
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-[10px] font-semibold">
                <User className="w-3 h-3 text-slate-400" />
                <span>{obj.assigned_to}</span>
              </span>
            )}
          </div>

          {obj.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {obj.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] font-medium text-slate-400 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.2 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

