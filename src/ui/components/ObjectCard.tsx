import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LADObject } from '../../core/standard/types';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { OnItsWayModal } from './OnItsWayModal';
import { CardEditModal } from './CardEditModal';
import { SchemaRegistry } from '../../core/schemas/schema-registry';
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
  CheckSquare,
  Square,
  Trash2,
  Edit2,
  Clock,
  RotateCcw,
} from 'lucide-react';

export const ObjectCard: React.FC<{ obj: LADObject }> = ({ obj }) => {
  const { updateObject, deleteObject } = useLAD();
  const { t } = useI18n();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isOnItsWayOpen, setIsOnItsWayOpen] = useState(false);

  const isCompleted = obj.status === 'completed';
  const isArchived = obj.status === 'archived';
  const cardType = obj.attributes?.card_type;
  const registeredCardTypeDef = cardType ? SchemaRegistry.getInstance().getCardType(cardType) : undefined;
  const checklist: Array<{ id: string; text: string; completed: boolean }> =
    obj.attributes?.checklist || [];
  const followup = obj.attributes?.followup;

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

  const handleRestoreToBoard = async () => {
    await updateObject(
      obj.object_id,
      {
        status: 'active',
        last_checked_at: new Date().toISOString(),
      },
      true
    );
  };

  const handleToggleChecklistItem = async (index: number) => {
    const updated = [...checklist];
    if (updated[index]) {
      updated[index] = { ...updated[index], completed: !updated[index].completed };
      await updateObject(
        obj.object_id,
        {
          attributes: {
            ...obj.attributes,
            checklist: updated,
          },
          last_checked_at: new Date().toISOString(),
        },
        true
      );
    }
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
    <>
      <motion.div
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        className={`p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm transition-shadow hover:shadow-md ${style.border} flex flex-col justify-between space-y-3 h-fit group ${
          isCompleted ? 'opacity-65 bg-slate-50/60 dark:bg-slate-950/60' : ''
        } ${isArchived ? 'opacity-75 border-dashed border-slate-300 dark:border-slate-700' : ''}`}
        data-testid={`card-${obj.object_id}`}
      >
        <div className="space-y-2">
          {/* Top Meta Bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${style.badge}`}
              >
                {style.icon}
                <span>{t(`capture.domains.${obj.domain}`) || obj.domain}</span>
              </span>

              {cardType === 'finances.account_balance' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Account Balance
                </span>
              )}

              {cardType === 'shopping.groceries_buying' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-full border border-amber-200 dark:border-amber-800">
                  Groceries
                </span>
              )}

              {cardType === 'health.medical_appointment' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-full border border-rose-200 dark:border-rose-800">
                  {obj.attributes?.specialty || 'Medical Appointment'}
                </span>
              )}

              {registeredCardTypeDef &&
                !['finances.account_balance', 'shopping.groceries_buying', 'health.medical_appointment'].includes(
                  cardType || ''
                ) && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-lad-50 dark:bg-lad-950/40 text-lad-700 dark:text-lad-300 rounded-full border border-lad-200 dark:border-lad-800">
                    {registeredCardTypeDef.name}
                  </span>
                )}

              {isArchived && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full">
                  Archived
                </span>
              )}

              {obj.priority === 'urgent' && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-full">
                  {t('capture.priorities.urgent')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isArchived ? (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleRestoreToBoard}
                    className="p-1 text-lad-600 hover:text-lad-700 rounded flex items-center gap-1 text-[11px] font-semibold"
                    title="Restore to active board"
                    data-testid="restore-to-board-button"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </motion.button>
                ) : (
                  <>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setIsEditModalOpen(true)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                      title={t('common.edit')}
                      data-testid="edit-card-button"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => deleteObject(obj.object_id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  </>
                )}
              </div>
            </div>

          {/* Card Body */}
          <div>
              {/* Specialized View: Account Balance */}
              {cardType === 'finances.account_balance' ? (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {obj.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {obj.attributes?.bank && (
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {obj.attributes.bank}
                          </span>
                        )}
                        {obj.attributes?.account_type && (
                          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                            • {obj.attributes.account_type} Account
                          </span>
                        )}
                      </div>
                    </div>
                    {obj.attributes?.balance !== undefined && (
                      <div className="text-right">
                        <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                          ${Number(obj.attributes.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                  {obj.description && obj.description !== obj.title && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {obj.description}
                    </p>
                  )}
                </div>
              ) : cardType === 'shopping.groceries_buying' ? (
                /* Specialized View: Groceries Buying with Interactive Checklist */
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {obj.title}
                    </h3>
                    {checklist.length > 0 && (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {checklist.filter((i) => i.completed).length} / {checklist.length} done
                      </span>
                    )}
                  </div>

                  {checklist.length > 0 && (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {checklist.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          onClick={() => handleToggleChecklistItem(idx)}
                          className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs"
                          data-testid={`checklist-item-${idx}`}
                        >
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => {}} // handled by parent div click
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span
                            className={
                              item.completed
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-700 dark:text-slate-200'
                            }
                          >
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {obj.attributes?.estimated_budget !== undefined && (
                    <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-lg inline-block">
                      Budget: ${Number(obj.attributes.estimated_budget).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : cardType === 'health.medical_appointment' ? (
                /* Specialized View: Medical Appointment with Follow-up Action */
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        {obj.title}
                      </h3>
                      {obj.attributes?.patient && (
                        <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold block">
                          Patient: {obj.attributes.patient}
                        </span>
                      )}
                    </div>
                    {obj.attributes?.date && (
                      <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{obj.attributes.date}</span>
                      </span>
                    )}
                  </div>

                  {obj.attributes?.outcome && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-700 dark:text-slate-200">Notes: </span>
                      {obj.attributes.outcome}
                    </p>
                  )}

                  {(followup?.date || obj.attributes?.needs_followup) && (
                    <div className="flex items-center justify-between p-2 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 rounded-xl">
                      <div className="text-[11px]">
                        <span className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-rose-500" />
                          <span>Follow-up: {followup?.date || 'Pending'}</span>
                        </span>
                        {followup?.reason && (
                          <span className="text-slate-500 text-[10px] block line-clamp-1">
                            {followup.reason}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsOnItsWayOpen(true)}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg shadow-xs transition-colors whitespace-nowrap"
                        data-testid="on-its-way-trigger-button"
                      >
                        On its way
                      </button>
                    </div>
                  )}
                </div>
              ) : registeredCardTypeDef ? (
                /* Dynamic View for Custom or Registered Card Types */
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {obj.title}
                    </h3>
                  </div>

                  {/* Dynamic field attributes according to schema */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                    {registeredCardTypeDef.fields.map((field) => {
                      if (field.key === 'title') return null;
                      const val = obj.attributes?.[field.key];
                      if (val === undefined || val === '' || val === null) return null;

                      if (field.type === 'checklist' && Array.isArray(val)) {
                        return (
                          <div key={field.key} className="col-span-full space-y-1">
                            <span className="text-[10px] font-bold uppercase text-slate-400">
                              {field.label} ({val.filter((i: any) => i.completed).length}/{val.length})
                            </span>
                            <div className="space-y-0.5 max-h-24 overflow-y-auto">
                              {val.map((item: any, idx: number) => (
                                <div
                                  key={idx}
                                  onClick={() => handleToggleChecklistItem(idx)}
                                  className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                                >
                                  <input type="checkbox" checked={item.completed} readOnly className="rounded" />
                                  <span className={item.completed ? 'line-through text-slate-400' : ''}>
                                    {item.text}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      if (field.type === 'select') {
                        return (
                          <div key={field.key} className="text-xs">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                              {field.label}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                              {String(val)}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div key={field.key} className="text-xs">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                            {field.label}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {field.type === 'currency' ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                                ${Number(val).toLocaleString('en-US')}
                              </span>
                            ) : (
                              String(val)
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {obj.description && obj.description !== obj.title && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 line-clamp-2">
                      {obj.description}
                    </p>
                  )}
                </div>
              ) : (
                /* Fallback View: General Card */
                <div className="flex items-start gap-2.5">
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={handleToggleCompleted}
                    className="mt-0.5 text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer"
                  >
                    {isCompleted ? (
                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Square className="w-4 h-4" />
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
          </div>

        {/* Footer Meta: Dates, Actions & Tags */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
            <div className="flex flex-wrap items-center gap-1.5">
              {obj.due_date && cardType !== 'health.medical_appointment' && (
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-lg text-[10px] font-semibold border border-blue-200/50 dark:border-blue-800/50">
                  <Calendar className="w-3 h-3 text-blue-500" />
                  <span>{obj.due_date}</span>
                </span>
              )}

              {obj.assigned_to && cardType !== 'health.medical_appointment' && (
                <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-[10px] font-semibold">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>{obj.assigned_to}</span>
                </span>
              )}
            </div>

            {/* Actionable button for general cards with due dates */}
            {obj.due_date && cardType !== 'health.medical_appointment' && !isArchived && (
              <button
                type="button"
                onClick={() => setIsOnItsWayOpen(true)}
                className="px-2 py-0.5 text-[10px] font-semibold text-lad-600 hover:bg-lad-50 dark:hover:bg-lad-950/40 rounded-md border border-lad-200 dark:border-lad-800 transition-colors"
              >
                On its way
              </button>
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
      </motion.div>

      {/* OnItsWayModal resolution */}
      <OnItsWayModal
        isOpen={isOnItsWayOpen}
        onClose={() => setIsOnItsWayOpen(false)}
        obj={obj}
      />

      {/* Full Schema Card Edit Modal */}
      <CardEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        obj={obj}
      />
    </>
  );
};
