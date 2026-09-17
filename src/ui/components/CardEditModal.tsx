/**
 * CardEditModal — Full Card & Schema Field Editor for Space Board
 * Allows modifying the card's Category, Card Type, core attributes (Title, Priority, Due Date, Assignee),
 * and all specific dynamic fields defined by its schema (select with spaces, numbers, currency, checklist, etc.).
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LADObject, LADObjectPriority } from '../../core/standard/types';
import { SchemaRegistry } from '../../core/schemas/schema-registry';
import { LADCardTypeDefinition } from '../../core/schemas/card-types';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import {
  X,
  Check,
  Calendar,
  User,
  AlertCircle,
  Trash2,
  Edit3,
  CreditCard,
  Heart,
  ShoppingBag,
  Home,
  FileText,
  Briefcase,
  Sparkles,
  DollarSign,
  CheckSquare,
  Square,
  Layers,
  Loader2,
} from 'lucide-react';

interface CardEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  obj: LADObject;
}

export const CardEditModal: React.FC<CardEditModalProps> = ({ isOpen, onClose, obj }) => {
  const { updateObject } = useLAD();
  const { t } = useI18n();
  const registry = SchemaRegistry.getInstance();

  const [category, setCategory] = useState<string>(obj.domain || 'general');
  const [cardTypeId, setCardTypeId] = useState<string | undefined>(obj.attributes?.card_type);
  const [title, setTitle] = useState(obj.title);
  const [description, setDescription] = useState(obj.description || '');
  const [priority, setPriority] = useState<LADObjectPriority>(obj.priority || 'medium');
  const [dueDate, setDueDate] = useState(obj.due_date || '');
  const [assignedTo, setAssignedTo] = useState(obj.assigned_to || '');
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [newChecklistItemText, setNewChecklistItemText] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize state from object when opened
  useEffect(() => {
    setIsSaving(false);
    if (!isOpen) return;

    const initialCategory = obj.domain || 'general';
    setCategory(initialCategory);

    const typesForCat = registry.getCardTypesForCategory(initialCategory);
    const existingType = obj.attributes?.card_type;
    const initialTypeId = existingType && registry.getCardType(existingType)
      ? existingType
      : typesForCat[0]?.id;

    setCardTypeId(initialTypeId);
    setTitle(obj.title);
    setDescription(obj.description || '');
    setPriority(obj.priority || 'medium');
    setDueDate(obj.due_date || '');
    setAssignedTo(obj.assigned_to || '');
    setFieldValues({ ...(obj.attributes || {}) });
    setNewChecklistItemText({});
    setError(null);
  }, [isOpen, obj]);

  if (!isOpen) return null;

  const categories = registry.getAllCategories();
  const availableCardTypes = registry.getCardTypesForCategory(category);
  const activeCardTypeDef: LADCardTypeDefinition | undefined = cardTypeId
    ? registry.getCardType(cardTypeId)
    : availableCardTypes[0];

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    const types = registry.getCardTypesForCategory(newCat);
    if (types.length > 0) {
      setCardTypeId(types[0].id);
    } else {
      setCardTypeId(undefined);
    }
  };

  const handleFieldValueChange = (key: string, val: any) => {
    setFieldValues((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleAddChecklistItem = (fieldKey: string) => {
    const text = (newChecklistItemText[fieldKey] || '').trim();
    if (!text) return;

    const currentList: Array<{ id: string; text: string; completed: boolean }> =
      fieldValues[fieldKey] || [];

    const updated = [
      ...currentList,
      {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        text,
        completed: false,
      },
    ];

    handleFieldValueChange(fieldKey, updated);
    setNewChecklistItemText((prev) => ({ ...prev, [fieldKey]: '' }));
  };

  const handleToggleChecklistItem = (fieldKey: string, index: number) => {
    const currentList: Array<{ id: string; text: string; completed: boolean }> =
      fieldValues[fieldKey] || [];
    const updated = [...currentList];
    if (updated[index]) {
      updated[index] = { ...updated[index], completed: !updated[index].completed };
      handleFieldValueChange(fieldKey, updated);
    }
  };

  const handleRemoveChecklistItem = (fieldKey: string, index: number) => {
    const currentList: Array<{ id: string; text: string; completed: boolean }> =
      fieldValues[fieldKey] || [];
    const updated = currentList.filter((_, i) => i !== index);
    handleFieldValueChange(fieldKey, updated);
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (!title.trim()) {
      setError('Card title is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const mergedAttributes: Record<string, any> = {
        ...(obj.attributes || {}),
        ...fieldValues,
        card_type: cardTypeId,
      };

      const patch: Partial<LADObject> = {
        title: title.trim(),
        description: description.trim(),
        domain: category,
        priority,
        due_date: dueDate.trim() || undefined,
        assigned_to: assignedTo.trim() || undefined,
        attributes: mergedAttributes,
      };

      await updateObject(obj.object_id, patch, true);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update card');
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'health':
        return <Heart className="w-3.5 h-3.5 text-rose-500" />;
      case 'finances':
        return <CreditCard className="w-3.5 h-3.5 text-emerald-500" />;
      case 'shopping':
        return <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />;
      case 'home':
        return <Home className="w-3.5 h-3.5 text-indigo-500" />;
      case 'documents':
        return <FileText className="w-3.5 h-3.5 text-blue-500" />;
      case 'projects':
        return <Briefcase className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
          data-testid="card-edit-modal"
        >
          {/* Modal Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-lad-50 text-lad-600 dark:bg-lad-950/50 dark:text-lad-400 border border-lad-200/50 dark:border-lad-800/50">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Edit Card Details
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update fields, change card type, or adjust schema slots
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              data-testid="close-edit-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1 scrollbar-thin">
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2 text-xs text-rose-600 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Category Selection */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryChange(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                      data-testid={`edit-cat-${cat.id}`}
                    >
                      {getCategoryIcon(cat.id)}
                      <span>{t(`capture.domains.${cat.id}`) || cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Card Type Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Card Type
                </label>
                {activeCardTypeDef && (
                  <span className="text-[10px] text-slate-400">
                    {activeCardTypeDef.fields.length} {activeCardTypeDef.fields.length === 1 ? 'field' : 'fields'} in schema
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableCardTypes.map((ct) => {
                  const isSelected = cardTypeId === ct.id;
                  return (
                    <button
                      key={ct.id}
                      type="button"
                      onClick={() => setCardTypeId(ct.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-lad-600 text-white border-lad-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                      data-testid={`edit-cardtype-${ct.id}`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{ct.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Core Card Attributes */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Card Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Card title..."
                  className="w-full text-sm font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-lad-500 outline-none"
                  data-testid="edit-title-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Priority
                  </label>
                  <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
                    {(['low', 'medium', 'high', 'urgent'] as LADObjectPriority[]).map((p) => {
                      const isSel = priority === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`flex-1 py-1 text-[10px] font-bold capitalize rounded-lg transition-all cursor-pointer ${
                            isSel
                              ? p === 'urgent'
                                ? 'bg-rose-500 text-white shadow-xs'
                                : p === 'high'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Due Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Assigned To
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      placeholder="e.g. Dad, Doctor..."
                      className="w-full pl-8 pr-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Dynamic Schema Fields Section */}
            {activeCardTypeDef && activeCardTypeDef.fields.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {activeCardTypeDef.name} — Schema Specific Fields
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {activeCardTypeDef.category}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                  {activeCardTypeDef.fields.map((field) => {
                    // Skip title if defined in schema fields to avoid redundancy
                    if (field.key === 'title') return null;

                    const val = fieldValues[field.key] ?? field.defaultValue ?? '';

                    // Select / Dropdown field (supports spaces)
                    if (field.type === 'select') {
                      return (
                        <div key={field.key} className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400 block">
                            {field.label} {field.required && '*'}
                          </label>
                          <select
                            value={val || ''}
                            onChange={(e) => handleFieldValueChange(field.key, e.target.value)}
                            className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                            data-testid={`field-select-${field.key}`}
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

                    // Currency field
                    if (field.type === 'currency') {
                      return (
                        <div key={field.key} className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400 block">
                            {field.label} {field.required && '*'}
                          </label>
                          <div className="relative">
                            <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                            <input
                              type="number"
                              step="any"
                              value={val}
                              placeholder={field.placeholder || '0.00'}
                              onChange={(e) =>
                                handleFieldValueChange(
                                  field.key,
                                  e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                              data-testid={`field-currency-${field.key}`}
                            />
                          </div>
                        </div>
                      );
                    }

                    // Number field
                    if (field.type === 'number') {
                      return (
                        <div key={field.key} className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400 block">
                            {field.label} {field.required && '*'}
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={val}
                            placeholder={field.placeholder}
                            onChange={(e) =>
                              handleFieldValueChange(
                                field.key,
                                e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                            data-testid={`field-number-${field.key}`}
                          />
                        </div>
                      );
                    }

                    // Date field
                    if (field.type === 'date') {
                      return (
                        <div key={field.key} className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400 block">
                            {field.label} {field.required && '*'}
                          </label>
                          <input
                            type="date"
                            value={val}
                            onChange={(e) => handleFieldValueChange(field.key, e.target.value)}
                            className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                            data-testid={`field-date-${field.key}`}
                          />
                        </div>
                      );
                    }

                    // Person / Assignee field
                    if (field.type === 'person') {
                      return (
                        <div key={field.key} className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400 block">
                            {field.label} {field.required && '*'}
                          </label>
                          <input
                            type="text"
                            value={val}
                            placeholder={field.placeholder || 'e.g. Me, Dad, Dr. Smith'}
                            onChange={(e) => handleFieldValueChange(field.key, e.target.value)}
                            className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                            data-testid={`field-person-${field.key}`}
                          />
                        </div>
                      );
                    }

                    // Boolean field
                    if (field.type === 'boolean') {
                      return (
                        <div key={field.key} className="flex items-center gap-2 pt-4">
                          <input
                            type="checkbox"
                            id={`check-${field.key}`}
                            checked={Boolean(val)}
                            onChange={(e) => handleFieldValueChange(field.key, e.target.checked)}
                            className="w-4 h-4 rounded text-lad-600 focus:ring-lad-500 border-slate-300"
                          />
                          <label
                            htmlFor={`check-${field.key}`}
                            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                          >
                            {field.label}
                          </label>
                        </div>
                      );
                    }

                    // Checklist field
                    if (field.type === 'checklist') {
                      const items: Array<{ id: string; text: string; completed: boolean }> =
                        Array.isArray(val) ? val : [];

                      return (
                        <div key={field.key} className="sm:col-span-2 space-y-2 pt-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400 block">
                            {field.label} ({items.length})
                          </label>

                          {/* Existing items list */}
                          {items.length > 0 && (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {items.map((it, idx) => (
                                <div
                                  key={it.id || idx}
                                  className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                                >
                                  <div
                                    className="flex items-center gap-2 cursor-pointer flex-1"
                                    onClick={() => handleToggleChecklistItem(field.key, idx)}
                                  >
                                    {it.completed ? (
                                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                      <Square className="w-4 h-4 text-slate-400" />
                                    )}
                                    <span
                                      className={`${
                                        it.completed
                                          ? 'line-through text-slate-400 dark:text-slate-500'
                                          : 'text-slate-800 dark:text-slate-200'
                                      }`}
                                    >
                                      {it.text}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveChecklistItem(field.key, idx)}
                                    className="text-slate-400 hover:text-rose-500 p-1"
                                    title="Remove item"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add new checklist item */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newChecklistItemText[field.key] || ''}
                              onChange={(e) =>
                                setNewChecklistItemText((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddChecklistItem(field.key);
                                }
                              }}
                              placeholder="Add checklist item..."
                              className="flex-1 text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddChecklistItem(field.key)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // Default text field
                    return (
                      <div key={field.key} className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400 block">
                          {field.label} {field.required && '*'}
                        </label>
                        <input
                          type="text"
                          value={val}
                          placeholder={field.placeholder}
                          onChange={(e) => handleFieldValueChange(field.key, e.target.value)}
                          className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                          data-testid={`field-text-${field.key}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. Notes / Description */}
            <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Notes / Raw Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional notes, comments, or thought..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none resize-none"
              />
            </div>
          </div>

          {/* Interactive Progress Indicator Bar */}
          {isSaving && (
            <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative" data-testid="save-card-edit-progress">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
                className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-lad-400 via-lad-600 to-lad-500 rounded-full"
              />
            </div>
          )}

          {/* Modal Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {isSaving ? 'Updating card and syncing...' : 'Changes will sync locally and to Google Drive'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                aria-busy={isSaving}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition-all ${
                  isSaving
                    ? 'bg-lad-400 dark:bg-lad-800 cursor-not-allowed opacity-80'
                    : 'bg-lad-600 hover:bg-lad-700 cursor-pointer active:scale-95'
                }`}
                data-testid="save-card-edit-button"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" data-testid="save-card-edit-spinner" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
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
