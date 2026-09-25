/**
 * Hero Smart Capture Bar — Prominently positioned on the Living Board for instant, low-friction capture.
 * Provides real-time category, card type, and slot extraction with adaptive schema fine-tuning.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { CaptureParser } from '../../core/objects/capture-parser';
import { InferredStructure } from '../../core/objects/types';
import { LADObjectPriority } from '../../core/standard/types';
import { SchemaRegistry } from '../../core/schemas/schema-registry';
import { LADCardTypeDefinition, isNotesStorageDisabled } from '../../core/schemas/card-types';
import { CardInferenceConfirmModal } from './CardInferenceConfirmModal';
import {
  Sparkles,
  ArrowRight,
  Heart,
  CreditCard,
  ShoppingBag,
  Calendar,
  User,
  Tag,
  AlertCircle,
  X,
  CheckSquare,
} from 'lucide-react';

export const SmartCaptureBar: React.FC = () => {
  const { createObjectFromCapture } = useLAD();
  const { t } = useI18n();
  const registry = SchemaRegistry.getInstance();

  const [input, setInput] = useState('');
  const [inferred, setInferred] = useState<InferredStructure | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasModifiedDetails, setHasModifiedDetails] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Editable overrides when expanded
  const [overrideTitle, setOverrideTitle] = useState('');
  const [overrideDomain, setOverrideDomain] = useState('general');
  const [overrideCardTypeId, setOverrideCardTypeId] = useState<string | undefined>();
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideAssignee, setOverrideAssignee] = useState('');
  const [overridePriority, setOverridePriority] = useState<LADObjectPriority>('medium');
  const [fieldOverrides, setFieldOverrides] = useState<Record<string, any>>({});

  // Real-time parsing as user types
  useEffect(() => {
    if (!input.trim()) {
      setInferred(null);
      return;
    }
    const result = CaptureParser.parse(input, new Date(), registry);
    setInferred(result);
    setOverrideTitle(result.title);
    setOverrideDomain(result.domain);
    setOverrideCardTypeId(result.cardTypeId);
    setOverrideDate(result.dueDate || '');
    setOverrideAssignee(result.assignedTo || '');
    setOverridePriority(result.priority);
    setFieldOverrides(result.fieldValues || {});
  }, [input]);

  const activeCardTypeId = overrideCardTypeId || inferred?.cardTypeId;
  const activeCardType: LADCardTypeDefinition | undefined = activeCardTypeId
    ? registry.getCardType(activeCardTypeId)
    : undefined;

  const availableCardTypes = registry.getCardTypesForCategory(overrideDomain);

  const handleFieldChange = (key: string, value: any) => {
    setFieldOverrides((prev) => ({ ...prev, [key]: value }));
    setHasModifiedDetails(true);
  };

  const handleToggleChecklistItem = (index: number) => {
    const list = [...(fieldOverrides.checklist || [])];
    if (list[index]) {
      list[index].completed = !list[index].completed;
      handleFieldChange('checklist', list);
      setHasModifiedDetails(true);
    }
  };

  const handleAddChecklistItem = (text: string) => {
    if (!text.trim()) return;
    const list = [...(fieldOverrides.checklist || [])];
    list.push({ id: `item_${Date.now()}`, text: text.trim(), completed: false });
    handleFieldChange('checklist', list);
    setHasModifiedDetails(true);
  };

  const buildFinalStructure = (): InferredStructure => {
    const mergedFieldValues = {
      ...(inferred?.fieldValues || {}),
      ...fieldOverrides,
    };

    const effectiveCardTypeId = overrideCardTypeId || inferred?.cardTypeId;
    const cardTypeDef = effectiveCardTypeId
      ? SchemaRegistry.getInstance().getCardType(effectiveCardTypeId)
      : undefined;
    const noNotes = isNotesStorageDisabled(cardTypeDef);

    return {
      rawText: input,
      title: overrideTitle.trim() || inferred?.title || input.trim(),
      domain: overrideDomain || inferred?.domain || 'general',
      cardTypeId: effectiveCardTypeId,
      priority: overridePriority || inferred?.priority || 'medium',
      dueDate: overrideDate || inferred?.dueDate || mergedFieldValues.due_date,
      assignedTo: overrideAssignee || inferred?.assignedTo || mergedFieldValues.patient,
      tags: inferred?.tags || [],
      extractedActions: inferred?.extractedActions || [],
      extractedEntities: inferred?.extractedEntities || [],
      suggestedAttributes: {
        ...(inferred?.suggestedAttributes || {}),
        ...(noNotes ? {} : { raw_thought: input }),
        ...mergedFieldValues,
      },
      fieldValues: mergedFieldValues,
    };
  };

  const executeSave = async () => {
    const finalStructure = buildFinalStructure();
    await createObjectFromCapture(finalStructure);
    setInput('');
    setInferred(null);
    setIsExpanded(false);
    setFieldOverrides({});
    setHasModifiedDetails(false);
    setShowConfirmModal(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    // If user has NOT changed anything on finer details, trigger confirmation modal
    if (!hasModifiedDetails) {
      setShowConfirmModal(true);
      return;
    }

    // If user modified finer details, save directly as per their edits
    await executeSave();
  };

  const handleDeclineConfirm = () => {
    setShowConfirmModal(false);
    setIsExpanded(true);
    setHasModifiedDetails(true);
  };

  const handleAcceptConfirm = async () => {
    await executeSave();
  };

  const handleStarterClick = (promptTemplate: string) => {
    setInput(promptTemplate);
    setHasModifiedDetails(false);
    inputRef.current?.focus();
  };

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case 'health':
        return <Heart className="w-3.5 h-3.5 text-rose-500" />;
      case 'finances':
        return <CreditCard className="w-3.5 h-3.5 text-emerald-500" />;
      case 'shopping':
        return <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-lad-500" />;
    }
  };

  return (
    <div className="w-full bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lad-500">
            <Sparkles className="w-4 h-4" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setHasModifiedDetails(false);
            }}
            placeholder={t('capture.placeholder')}
            className="w-full pl-10 pr-10 py-3 text-sm font-medium rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-lad-500 focus:border-transparent text-slate-900 dark:text-white shadow-inner transition-all placeholder:text-slate-400"
          />
          {input && (
            <button
              type="button"
              onClick={() => {
                setInput('');
                setInferred(null);
                setIsExpanded(false);
                setFieldOverrides({});
                setHasModifiedDetails(false);
                setShowConfirmModal(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!input.trim()}
          className="px-4 py-3 bg-lad-600 hover:bg-lad-700 disabled:opacity-40 disabled:hover:bg-lad-600 text-white font-bold text-xs rounded-2xl shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          data-testid="smart-capture-submit-btn"
        >
          <span>{t('capture.submit')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Live NLP Extraction Preview Badges */}
      {inferred && (
        <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 animate-in fade-in duration-100">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-lad-500" />
              <span>Inferred Structure</span>
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[11px] text-lad-600 hover:underline font-bold"
            >
              {isExpanded ? 'Simple view' : 'Fine-tune details'}
            </button>
          </div>

          {/* Quick Pill Badges for Category, Card Type, and Inferred Slots */}
          <div className="flex flex-wrap items-center gap-1.5" data-testid="live-token-badges">
            {/* Category Pill */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200">
              {getDomainIcon(overrideDomain)}
              <span className="capitalize">{overrideDomain}</span>
            </span>

            {/* Card Type Pill */}
            {activeCardType && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold border border-indigo-200 dark:border-indigo-800">
                <span>{activeCardType.name}</span>
              </span>
            )}

            {/* Extracted Slot Pills */}
            {activeCardType &&
              activeCardType.fields.map((field) => {
                if (field.key === 'title') return null;
                const val = fieldOverrides[field.key];
                if (val === undefined || val === '' || val === null) return null;

                if (field.key === 'bank') {
                  return (
                    <span
                      key={field.key}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-medium border border-emerald-200 dark:border-emerald-800"
                    >
                      <span>Bank: {val}</span>
                    </span>
                  );
                }

                if (field.type === 'currency') {
                  return (
                    <span
                      key={field.key}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs"
                    >
                      <span>${Number(val).toLocaleString()}</span>
                    </span>
                  );
                }

                if (field.type === 'select') {
                  return (
                    <span
                      key={field.key}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium border border-indigo-200 dark:border-indigo-800"
                    >
                      <span>{val}</span>
                    </span>
                  );
                }

                if (field.type === 'checklist' && Array.isArray(val) && val.length > 0) {
                  return (
                    <span
                      key={field.key}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-medium border border-amber-200 dark:border-amber-800"
                    >
                      <CheckSquare className="w-3 h-3" />
                      <span>{val.length} items</span>
                    </span>
                  );
                }

                return (
                  <span
                    key={field.key}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium"
                  >
                    <span>{field.label}: {String(val)}</span>
                  </span>
                );
              })}

            {fieldOverrides.needs_followup && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium border border-blue-200 dark:border-blue-800">
                <Calendar className="w-3 h-3" />
                <span>Follow-up {fieldOverrides.followup_date || ''}</span>
              </span>
            )}

            {overrideDate && !fieldOverrides.needs_followup && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium border border-blue-200 dark:border-blue-800">
                <Calendar className="w-3 h-3" />
                <span>{overrideDate}</span>
              </span>
            )}

            {overrideAssignee && !fieldOverrides.patient && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium border border-purple-200 dark:border-purple-800">
                <User className="w-3 h-3" />
                <span>{overrideAssignee}</span>
              </span>
            )}

            {overridePriority === 'urgent' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold border border-rose-200">
                <AlertCircle className="w-3 h-3" />
                <span>Urgent</span>
              </span>
            )}

            {inferred.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-slate-50 dark:bg-slate-800/80 text-slate-500 rounded-md text-[10px]"
              >
                <Tag className="w-2.5 h-2.5" />
                <span>{tag}</span>
              </span>
            ))}
          </div>

          {/* Expanded Fine-tuning controls tailored to Card Type Schema */}
          {isExpanded && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3" data-testid="finer-details-drawer">
              {/* Card Title Override */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Card Title
                </label>
                <input
                  type="text"
                  value={overrideTitle}
                  onChange={(e) => {
                    setOverrideTitle(e.target.value);
                    setHasModifiedDetails(true);
                  }}
                  placeholder="Card Title"
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  data-testid="finer-details-title-input"
                />
              </div>

              {/* Category & Card Type Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Category
                  </label>
                  <select
                    value={overrideDomain}
                    onChange={(e) => {
                      const newDomain = e.target.value;
                      setOverrideDomain(newDomain);
                      setHasModifiedDetails(true);
                      const types = registry.getCardTypesForCategory(newDomain);
                      if (types.length > 0) {
                        const newType = types[0];
                        setOverrideCardTypeId(newType.id);
                        const updatedTitle = CaptureParser.generateTitle(
                          input,
                          inferred?.extractedActions || [],
                          newType,
                          fieldOverrides
                        );
                        setOverrideTitle(updatedTitle);
                      }
                    }}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium cursor-pointer"
                    data-testid="finer-details-category-select"
                  >
                    {registry.getAllCategories().map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Card Type
                  </label>
                  <select
                    value={overrideCardTypeId || ''}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setOverrideCardTypeId(newId);
                      setHasModifiedDetails(true);
                      const newType = registry.getCardType(newId);
                      if (newType) {
                        const updatedTitle = CaptureParser.generateTitle(
                          input,
                          inferred?.extractedActions || [],
                          newType,
                          fieldOverrides
                        );
                        setOverrideTitle(updatedTitle);
                      }
                    }}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium cursor-pointer"
                    data-testid="finer-details-cardtype-select"
                  >
                    {availableCardTypes.map((ct) => (
                      <option key={ct.id} value={ct.id}>
                        {ct.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Schema Fields for Active Card Type */}
              {activeCardType && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  {activeCardType.fields.map((field) => {
                    // Check conditional visibility
                    if (field.conditional) {
                      const parentVal = fieldOverrides[field.conditional.field];
                      if (field.conditional.operator === 'truthy' && !parentVal) return null;
                      if (field.conditional.operator === 'falsy' && parentVal) return null;
                      if (field.conditional.operator === 'equals' && parentVal !== field.conditional.value)
                        return null;
                    }

                    const val = fieldOverrides[field.key] ?? field.defaultValue ?? '';

                    if (field.type === 'boolean') {
                      return (
                        <div key={field.key} className="flex items-center gap-2 sm:col-span-2 pt-1">
                          <input
                            type="checkbox"
                            id={`field_${field.key}`}
                            checked={Boolean(val)}
                            onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                            className="rounded border-slate-300 text-lad-600 focus:ring-lad-500 w-4 h-4"
                          />
                          <label
                            htmlFor={`field_${field.key}`}
                            className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                          >
                            {field.label}
                          </label>
                        </div>
                      );
                    }

                    if (field.type === 'checklist') {
                      const items: Array<{ id: string; text: string; completed: boolean }> =
                        fieldOverrides.checklist || [];
                      return (
                        <div key={field.key} className="sm:col-span-2 space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-slate-400 block">
                            {field.label}
                          </label>
                          <div className="space-y-1">
                            {items.map((it, idx) => (
                              <div
                                key={it.id || idx}
                                className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg"
                              >
                                <input
                                  type="checkbox"
                                  checked={it.completed}
                                  onChange={() => handleToggleChecklistItem(idx)}
                                  className="rounded border-slate-300"
                                />
                                <span className={it.completed ? 'line-through text-slate-400' : ''}>
                                  {it.text}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="Add item..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddChecklistItem((e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                              className="flex-1 text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      );
                    }

                    if (field.type === 'select') {
                      return (
                        <div key={field.key}>
                          <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                            {field.label}
                          </label>
                          <select
                            value={val || ''}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                          >
                            <option value="">Select {field.label}...</option>
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                            {val && !field.options?.includes(val) && (
                              <option value={val}>{val} (Custom)</option>
                            )}
                          </select>
                        </div>
                      );
                    }

                    return (
                      <div key={field.key}>
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          {field.label}
                        </label>
                        <input
                          type={field.type === 'currency' || field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                          value={val}
                          placeholder={field.placeholder}
                          onChange={(e) =>
                            handleFieldChange(
                              field.key,
                              field.type === 'currency' || field.type === 'number'
                                ? parseFloat(e.target.value) || 0
                                : e.target.value
                            )
                          }
                          className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick Starter Chips */}
      {!input && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">
            {t('capture.quickStartersLabel')}
          </span>
          <button
            type="button"
            onClick={() => handleStarterClick(t('capture.quickStartersText.medication'))}
            className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-700 dark:text-rose-300 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Heart className="w-3 h-3 text-rose-500" />
            <span>{t('capture.quickStarters.medication')}</span>
          </button>

          <button
            type="button"
            onClick={() => handleStarterClick('Bank A checking account new balance is $19')}
            className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <CreditCard className="w-3 h-3 text-emerald-500" />
            <span>Bank Balance</span>
          </button>

          <button
            type="button"
            onClick={() => handleStarterClick('Weekly groceries buy milk, bread, eggs budget $50')}
            className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-700 dark:text-amber-300 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ShoppingBag className="w-3 h-3 text-amber-500" />
            <span>Groceries List</span>
          </button>

          <button
            type="button"
            onClick={() => handleStarterClick('Medical appointment with dentist for Carlos today outcome: cavity filled, follow up in 2 weeks')}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Calendar className="w-3 h-3 text-slate-500" />
            <span>Medical Appointment</span>
          </button>
        </div>
      )}

      {/* Confirmation Modal when user submits without having modified finer details */}
      <CardInferenceConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        rawText={input}
        inferred={inferred ? buildFinalStructure() : null}
        cardType={activeCardType}
        onConfirm={handleAcceptConfirm}
        onDecline={handleDeclineConfirm}
      />
    </div>
  );
};
