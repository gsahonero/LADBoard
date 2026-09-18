/**
 * CardTypeEditorModal — Visual Schema Builder & Modifier for Categories and Card Types
 * Allows creating, modifying, and customizing card types and their slot fields per Space.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LADCardTypeDefinition,
  LADFieldDefinition,
  LADFieldType,
  LADCardTitleMode,
  LADCardTitleConfig,
} from '../../core/schemas/card-types';
import { SchemaRegistry } from '../../core/schemas/schema-registry';
import { useLAD } from '../context/LADContext';
import {
  X,
  Plus,
  Trash2,
  Check,
  Layers,
  AlertCircle,
  Copy,
  Lock,
  Loader2,
} from 'lucide-react';

interface CardTypeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardType?: LADCardTypeDefinition | null;
  defaultCategory?: string;
  onSaved?: (savedType: LADCardTypeDefinition) => void;
}

export const CardTypeEditorModal: React.FC<CardTypeEditorModalProps> = ({
  isOpen,
  onClose,
  cardType,
  defaultCategory = 'general',
  onSaved,
}) => {
  const { activeManifest, updateSpaceIdentity } = useLAD();
  const registry = SchemaRegistry.getInstance();

  const isDefault = cardType?.isDefault ?? false;
  const isEditing = Boolean(cardType && !isDefault);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [description, setDescription] = useState('');
  const [keywordsStr, setKeywordsStr] = useState('');
  const [autoArchiveDays, setAutoArchiveDays] = useState<number>(7);
  const [titleMode, setTitleMode] = useState<LADCardTitleMode>('input_text');
  const [fixedTitle, setFixedTitle] = useState('');
  const [titleTemplate, setTitleTemplate] = useState('');
  const [fields, setFields] = useState<LADFieldDefinition[]>([]);
  const [optionsRawMap, setOptionsRawMap] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load state on open
  useEffect(() => {
    setIsSaving(false);
    if (cardType) {
      setName(cardType.name);
      setCategory(cardType.category);
      setDescription(cardType.description || '');
      setKeywordsStr(cardType.nlp?.keywords?.join(', ') || '');
      setAutoArchiveDays(cardType.lifecycle?.autoArchiveDays || 7);
      setTitleMode(cardType.titleConfig?.mode || 'input_text');
      setFixedTitle(cardType.titleConfig?.fixedTitle || '');
      setTitleTemplate(cardType.titleConfig?.template || '');
      const initialFields = cardType.fields.map((f) => ({
        ...f,
        options: f.options ? [...f.options] : undefined,
      }));
      setFields(initialFields);
      const rawMap: Record<number, string> = {};
      initialFields.forEach((f, idx) => {
        if (f.type === 'select' && f.options) {
          rawMap[idx] = f.options.join(', ');
        }
      });
      setOptionsRawMap(rawMap);
    } else {
      setName('');
      setCategory(defaultCategory);
      setDescription('');
      setKeywordsStr('');
      setAutoArchiveDays(7);
      setTitleMode('input_text');
      setFixedTitle('');
      setTitleTemplate('');
      setFields([
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'comments', label: 'Comments / Notes', type: 'text', required: false },
      ]);
      setOptionsRawMap({});
    }
    setError(null);
  }, [cardType, defaultCategory, isOpen]);

  if (!isOpen) return null;

  const handleAddField = () => {
    const newIdx = fields.length + 1;
    setFields([
      ...fields,
      {
        key: `field_${newIdx}`,
        label: `Field ${newIdx}`,
        type: 'text',
        required: false,
      },
    ]);
  };

  const handleRemoveField = (index: number) => {
    if (fields.length <= 1) return;
    setFields(fields.filter((_, i) => i !== index));
    setOptionsRawMap((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const num = Number(k);
        if (num < index) next[num] = v;
        else if (num > index) next[num - 1] = v;
      });
      return next;
    });
  };

  const handleFieldChange = (index: number, patch: Partial<LADFieldDefinition>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...patch };
    // Auto-slugify key from label if key was default
    if (patch.label && updated[index].key.startsWith('field_')) {
      updated[index].key = patch.label.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    }
    setFields(updated);
  };

  const handleOptionsRawChange = (fieldIdx: number, rawValue: string) => {
    setOptionsRawMap((prev) => ({ ...prev, [fieldIdx]: rawValue }));
    // Split by comma and trim each individual option, preserving spaces inside each option
    const parsed = rawValue
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    handleFieldChange(fieldIdx, { options: parsed });
  };

  const handleRemoveOptionBadge = (fieldIdx: number, optToRemove: string) => {
    const currentOptions = fields[fieldIdx]?.options || [];
    const updatedOptions = currentOptions.filter((o) => o !== optToRemove);
    handleFieldChange(fieldIdx, { options: updatedOptions });
    setOptionsRawMap((prev) => ({ ...prev, [fieldIdx]: updatedOptions.join(', ') }));
  };

  const handleDuplicateAsCustom = () => {
    setName(`${cardType?.name || 'Card'} (Custom)`);
    setCategory(cardType?.category || defaultCategory);
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (!name.trim()) {
      setError('Card Type name is required');
      return;
    }

    if (fields.length === 0) {
      setError('At least one field must be defined');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const id = isEditing && cardType
        ? cardType.id
        : `custom.${category}.${name.toLowerCase().replace(/[^a-z0-9_]/g, '_')}_${Date.now()}`;

      const keywords = keywordsStr
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

      const titleConfig: LADCardTitleConfig = {
        mode: titleMode,
        ...(titleMode === 'fixed' ? { fixedTitle: fixedTitle.trim() } : {}),
        ...(titleMode === 'template' ? { template: titleTemplate.trim() } : {}),
      };

      const definition: LADCardTypeDefinition = {
        id,
        category,
        name: name.trim(),
        description: description.trim(),
        isDefault: false,
        fields,
        titleConfig,
        nlp: {
          keywords: keywords.length > 0 ? keywords : [name.toLowerCase()],
        },
        lifecycle: {
          autoArchiveDays: Number(autoArchiveDays) || 7,
        },
      };

      if (isEditing) {
        registry.updateCustomCardType(id, definition);
      } else {
        registry.addCustomCardType(definition);
      }

      // Persist custom card types to space manifest
      if (activeManifest) {
        const exportedCustom = registry.exportCustomCardTypes();
        await updateSpaceIdentity(activeManifest.space_id, {
          settings: {
            ...(activeManifest.settings || {}),
            custom_card_types: exportedCustom,
          },
        });
      }

      onSaved?.(definition);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save card type');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
          data-testid="card-type-editor-modal"
        >
          {/* Modal Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-lad-500/10 text-lad-600 dark:text-lad-400 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isDefault && cardType
                    ? `Default Card Schema: ${cardType.name}`
                    : isEditing && cardType
                    ? `Edit Card Type: ${cardType.name}`
                    : 'Create New Card Type'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {isDefault
                    ? 'Default card types are immutable core baselines. Duplicate to create a customizable version.'
                    : 'Define custom card fields, slot extractors, and NLP keywords for this category.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isDefault && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    This built-in default card type cannot be directly modified to preserve system stability.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDuplicateAsCustom}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Customize Copy</span>
                </button>
              </div>
            )}

            {/* General Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Card Type Name
                </label>
                <input
                  type="text"
                  disabled={isDefault}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pet Vaccination, Vehicle Maintenance"
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60"
                  data-testid="card-type-name-input"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Category
                </label>
                <select
                  disabled={isDefault}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60 font-medium"
                >
                  {registry.getAllCategories().map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  disabled={isDefault}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what this card tracks..."
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  NLP Trigger Keywords (comma separated)
                </label>
                <input
                  type="text"
                  disabled={isDefault}
                  value={keywordsStr}
                  onChange={(e) => setKeywordsStr(e.target.value)}
                  placeholder="e.g. vaccine, pet, vet, booster"
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Auto-Archive After (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  disabled={isDefault}
                  value={autoArchiveDays}
                  onChange={(e) => setAutoArchiveDays(parseInt(e.target.value) || 7)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60"
                />
              </div>
            </div>

            {/* Card Title Behavior */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800" data-testid="card-title-behavior-section">
              <label className="text-[10px] font-bold uppercase text-slate-400 block">
                Card Title Behavior
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isDefault}
                  onClick={() => setTitleMode('input_text')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    titleMode === 'input_text'
                      ? 'border-lad-500 bg-lad-50/50 dark:bg-lad-950/30 text-lad-700 dark:text-lad-300 ring-1 ring-lad-500'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  } disabled:opacity-60 cursor-pointer`}
                  data-testid="title-mode-input-text"
                >
                  <div className="text-xs font-bold mb-0.5">From Input Text</div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    Uses the text written in the capture bar.
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isDefault}
                  onClick={() => setTitleMode('fixed')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    titleMode === 'fixed'
                      ? 'border-lad-500 bg-lad-50/50 dark:bg-lad-950/30 text-lad-700 dark:text-lad-300 ring-1 ring-lad-500'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  } disabled:opacity-60 cursor-pointer`}
                  data-testid="title-mode-fixed"
                >
                  <div className="text-xs font-bold mb-0.5">Fixed Title</div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    Sets a standard title. Supports wildcards (e.g. &quot;Saldo &#123;bank&#125;&quot;).
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isDefault}
                  onClick={() => setTitleMode('template')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    titleMode === 'template'
                      ? 'border-lad-500 bg-lad-50/50 dark:bg-lad-950/30 text-lad-700 dark:text-lad-300 ring-1 ring-lad-500'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  } disabled:opacity-60 cursor-pointer`}
                  data-testid="title-mode-template"
                >
                  <div className="text-xs font-bold mb-0.5">Field Template</div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    Interpolates fields into title (e.g. &quot;&#123;bank&#125; Balance&quot;).
                  </div>
                </button>
              </div>

              {titleMode === 'fixed' && (
                <div className="pt-1 space-y-1.5">
                  <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">
                    Fixed Title Text (Supports wildcards e.g. &#123;bank&#125;)
                  </label>
                  <input
                    type="text"
                    disabled={isDefault}
                    value={fixedTitle}
                    onChange={(e) => setFixedTitle(e.target.value)}
                    placeholder="e.g. Saldo, Saldo {bank}, Daily Log"
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60 font-medium"
                    data-testid="card-type-fixed-title-input"
                  />
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[9px] text-slate-400">Insert wildcard:</span>
                    {fields.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        disabled={isDefault}
                        onClick={() => setFixedTitle((prev) => `${prev} {${f.key}}`.trim())}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-lad-50 dark:hover:bg-lad-950/40 border border-slate-200 dark:border-slate-700 cursor-pointer"
                        data-testid={`insert-fixed-token-${f.key}`}
                      >
                        &#123;{f.key}&#125;
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {titleMode === 'template' && (
                <div className="pt-1 space-y-1.5">
                  <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">
                    Title Template Pattern
                  </label>
                  <input
                    type="text"
                    disabled={isDefault}
                    value={titleTemplate}
                    onChange={(e) => setTitleTemplate(e.target.value)}
                    placeholder="e.g. {bank} Balance, {specialty} Appointment"
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60 font-medium font-mono"
                    data-testid="card-type-template-input"
                  />
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[9px] text-slate-400">Insert field token:</span>
                    {fields.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        disabled={isDefault}
                        onClick={() => setTitleTemplate((prev) => `${prev} {${f.key}}`.trim())}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-lad-50 dark:hover:bg-lad-950/40 border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        &#123;{f.key}&#125;
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Field Schema Builder */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Card Field Definitions ({fields.length})
                </span>
                {!isDefault && (
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="text-xs font-semibold text-lad-600 hover:text-lad-700 flex items-center gap-1 cursor-pointer"
                    data-testid="add-field-button"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Field</span>
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {fields.map((field, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">
                          Field Label
                        </label>
                        <input
                          type="text"
                          disabled={isDefault}
                          value={field.label}
                          onChange={(e) => handleFieldChange(idx, { label: e.target.value })}
                          className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-60"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">
                          Field Key (Identifier)
                        </label>
                        <input
                          type="text"
                          disabled={isDefault}
                          value={field.key}
                          onChange={(e) => handleFieldChange(idx, { key: e.target.value })}
                          className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono disabled:opacity-60"
                        />
                      </div>

                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">
                            Data Type
                          </label>
                          <select
                            disabled={isDefault}
                            value={field.type}
                            onChange={(e) =>
                              handleFieldChange(idx, { type: e.target.value as LADFieldType })
                            }
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-60"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="currency">Currency ($)</option>
                            <option value="date">Date</option>
                            <option value="select">Select / Dropdown</option>
                            <option value="person">Person / Assignee</option>
                            <option value="checklist">Checklist</option>
                            <option value="boolean">Checkbox (Yes/No)</option>
                          </select>
                        </div>

                        {!isDefault && fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveField(idx)}
                            className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Remove field"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Options for Select fields */}
                    {field.type === 'select' && (
                      <div className="pt-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-bold uppercase text-slate-400 block">
                            Dropdown Options (allows spaces, comma-separated)
                          </label>
                          {field.options && field.options.length > 0 && (
                            <span className="text-[9px] font-medium text-slate-400">
                              {field.options.length} {field.options.length === 1 ? 'option' : 'options'}
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          disabled={isDefault}
                          value={optionsRawMap[idx] !== undefined ? optionsRawMap[idx] : (field.options?.join(', ') || '')}
                          placeholder="e.g. Checking Account, Savings Account, Credit Card"
                          onChange={(e) => handleOptionsRawChange(idx, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const current = optionsRawMap[idx] ?? (field.options?.join(', ') || '');
                              if (current.trim() && !current.endsWith(', ')) {
                                handleOptionsRawChange(idx, current + ', ');
                              }
                            }
                          }}
                          className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-60"
                        />
                        {/* Interactive Pill Badges showing parsed options with spaces preserved */}
                        {field.options && field.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {field.options.map((opt, optIdx) => (
                              <span
                                key={optIdx}
                                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-lad-50 text-lad-700 border border-lad-200/60 dark:bg-lad-950/40 dark:text-lad-300 dark:border-lad-800"
                              >
                                <span>{opt}</span>
                                {!isDefault && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOptionBadge(idx, opt)}
                                    className="hover:text-rose-500 rounded cursor-pointer transition-colors ml-0.5"
                                    title={`Remove "${opt}"`}
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Progress Indicator Bar */}
          {isSaving && (
            <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative" data-testid="save-card-type-progress">
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
            <span className="text-[11px] text-slate-400">
              {isSaving
                ? 'Syncing schema with space...'
                : isDefault
                ? 'Viewing default schema'
                : 'Custom schema will sync with this space.'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Close
              </button>
              {!isDefault && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  aria-busy={isSaving}
                  className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all ${
                    isSaving
                      ? 'bg-lad-400 dark:bg-lad-800 cursor-not-allowed opacity-80'
                      : 'bg-lad-600 hover:bg-lad-700 cursor-pointer active:scale-95'
                  }`}
                  data-testid="save-card-type-button"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" data-testid="save-card-type-spinner" />
                      <span>Saving Card Type...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Card Type</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
