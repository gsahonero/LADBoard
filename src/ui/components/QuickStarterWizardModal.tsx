/**
 * QuickStarterWizardModal — Interactive Step-by-Step Wizard for Defining Quick Starters
 * Allows users to easily configure fast-capture templates tailored to any card type in the space.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SchemaRegistry } from '../../core/schemas/schema-registry';
import { LADCardTypeDefinition, LADQuickStarter } from '../../core/schemas/card-types';
import {
  X,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  CreditCard,
  Heart,
  ShoppingBag,
  Calendar,
  FileText,
  Home,
  Briefcase,
  AlertCircle,
  Loader2,
  Trash2,
  Layers,
  CheckSquare,
  Activity,
  PlusCircle,
  Zap,
} from 'lucide-react';

interface QuickStarterWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  starter?: LADQuickStarter | null;
  onSave: (starter: LADQuickStarter) => Promise<void> | void;
  onDelete?: (starterId: string) => Promise<void> | void;
}

const AVAILABLE_COLORS = [
  { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { id: 'rose', name: 'Rose', bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  { id: 'amber', name: 'Amber', bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  { id: 'blue', name: 'Blue', bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  { id: 'purple', name: 'Purple', bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  { id: 'slate', name: 'Slate', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
];

const AVAILABLE_ICONS = [
  { id: 'CreditCard', label: 'Credit Card', icon: CreditCard },
  { id: 'Heart', label: 'Health / Heart', icon: Heart },
  { id: 'ShoppingBag', label: 'Shopping', icon: ShoppingBag },
  { id: 'Calendar', label: 'Calendar', icon: Calendar },
  { id: 'FileText', label: 'Document', icon: FileText },
  { id: 'Home', label: 'Home', icon: Home },
  { id: 'Briefcase', label: 'Projects', icon: Briefcase },
  { id: 'CheckSquare', label: 'Checklist', icon: CheckSquare },
  { id: 'Activity', label: 'Activity', icon: Activity },
  { id: 'Zap', label: 'Quick Action', icon: Zap },
  { id: 'Sparkles', label: 'Magic / Idea', icon: Sparkles },
  { id: 'PlusCircle', label: 'Plus', icon: PlusCircle },
];

export const QuickStarterWizardModal: React.FC<QuickStarterWizardModalProps> = ({
  isOpen,
  onClose,
  starter,
  onSave,
  onDelete,
}) => {
  const registry = SchemaRegistry.getInstance();
  const allCardTypes = registry.getAllCardTypes();

  // Step state (1 to 4)
  const [step, setStep] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCardTypeId, setSelectedCardTypeId] = useState<string>('');
  const [label, setLabel] = useState<string>('');
  const [templateText, setTemplateText] = useState<string>('');
  const [domain, setDomain] = useState<string>('general');
  const [icon, setIcon] = useState<string>('Sparkles');
  const [color, setColor] = useState<string>('indigo');
  const [description, setDescription] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset form state
  useEffect(() => {
    setError(null);
    setIsSaving(false);
    if (starter) {
      setSelectedCardTypeId(starter.cardTypeId);
      setLabel(starter.label);
      setTemplateText(starter.templateText);
      setDomain(starter.domain);
      setIcon(starter.icon || 'Sparkles');
      setColor(starter.color || 'indigo');
      setDescription(starter.description || '');
      setStep(1);
    } else {
      const defaultCt = allCardTypes[0];
      if (defaultCt) {
        setSelectedCardTypeId(defaultCt.id);
        setLabel(defaultCt.name);
        setDomain(defaultCt.category);
        setIcon(defaultCt.icon || 'Sparkles');
        setColor(
          defaultCt.category === 'finances'
            ? 'emerald'
            : defaultCt.category === 'health'
            ? 'rose'
            : defaultCt.category === 'shopping'
            ? 'amber'
            : 'indigo'
        );
        setTemplateText(generateDefaultTemplate(defaultCt));
      } else {
        setSelectedCardTypeId('');
        setLabel('');
        setDomain('general');
        setIcon('Sparkles');
        setColor('indigo');
        setTemplateText('');
      }
      setDescription('');
      setStep(1);
    }
  }, [starter, isOpen]);

  if (!isOpen) return null;

  function generateDefaultTemplate(ct: LADCardTypeDefinition): string {
    if (ct.id === 'finances.account_balance') {
      return 'Bank A checking account new balance is $19';
    }
    if (ct.id === 'shopping.groceries_buying') {
      return 'Weekly groceries buy milk, bread, eggs budget $50';
    }
    if (ct.id === 'health.medical_appointment') {
      return 'Medical appointment with dentist tomorrow at 10:00 AM';
    }
    const fieldHints = ct.fields
      .slice(0, 3)
      .map((f) => `{${f.key}}`)
      .join(' ');
    return `${ct.name} ${fieldHints}`.trim();
  }

  const selectedCardType = allCardTypes.find((ct) => ct.id === selectedCardTypeId);

  const handleSelectCardType = (ct: LADCardTypeDefinition) => {
    setSelectedCardTypeId(ct.id);
    setDomain(ct.category);
    if (!starter || starter.cardTypeId !== ct.id) {
      setLabel(ct.name);
      setTemplateText(generateDefaultTemplate(ct));
      setIcon(ct.icon || 'Sparkles');
      setColor(
        ct.category === 'finances'
          ? 'emerald'
          : ct.category === 'health'
          ? 'rose'
          : ct.category === 'shopping'
          ? 'amber'
          : 'indigo'
      );
    }
  };

  const handleInsertToken = (token: string) => {
    setTemplateText((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} {${token}}` : `{${token}}`;
    });
  };

  const handleSaveStarter = async () => {
    if (!label.trim()) {
      setError('Please provide a button label for the Quick Starter');
      setStep(3);
      return;
    }
    if (!templateText.trim()) {
      setError('Please provide a prompt template');
      setStep(2);
      return;
    }
    if (!selectedCardTypeId) {
      setError('Please select a target Card Type');
      setStep(1);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const id = starter ? starter.id : `qs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newStarter: LADQuickStarter = {
        id,
        cardTypeId: selectedCardTypeId,
        label: label.trim(),
        templateText: templateText.trim(),
        domain: domain || 'general',
        icon,
        color,
        description: description.trim(),
      };
      await onSave(newStarter);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save quick starter');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStarter = async () => {
    if (!starter || !onDelete) return;
    if (!window.confirm(`Delete quick starter "${starter.label}"?`)) return;
    setIsSaving(true);
    try {
      await onDelete(starter.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete quick starter');
    } finally {
      setIsSaving(false);
    }
  };

  // Render Icon helper
  const renderIcon = (iconName: string, className = 'w-3.5 h-3.5') => {
    const found = AVAILABLE_ICONS.find((i) => i.id === iconName);
    const IconComp = found ? found.icon : Sparkles;
    return <IconComp className={className} />;
  };

  const currentColorConfig =
    AVAILABLE_COLORS.find((c) => c.id === color) || AVAILABLE_COLORS[0];

  const filteredCardTypes = allCardTypes.filter((ct) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ct.name.toLowerCase().includes(q) ||
      ct.category.toLowerCase().includes(q) ||
      (ct.description && ct.description.toLowerCase().includes(q))
    );
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
          data-testid="quick-starter-wizard-modal"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-lad-500/10 text-lad-600 dark:text-lad-400 rounded-xl">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {starter ? 'Edit Quick Starter' : 'Quick Starter Wizard'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  Step {step} of 4: {step === 1 ? 'Target Card Type' : step === 2 ? 'Prompt Template' : step === 3 ? 'Style & Label' : 'Preview & Save'}
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

          {/* Stepper Progress Bar */}
          <div className="px-5 pt-3 pb-1 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
              {[
                { num: 1, label: 'Card Type' },
                { num: 2, label: 'Template' },
                { num: 3, label: 'Style' },
                { num: 4, label: 'Preview' },
              ].map((s) => (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setStep(s.num)}
                  className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    step === s.num
                      ? 'bg-lad-600 text-white shadow-xs'
                      : step > s.num
                      ? 'text-lad-600 dark:text-lad-400 hover:bg-lad-50 dark:hover:bg-lad-950/40'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                  data-testid={`wizard-step-tab-${s.num}`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${step === s.num ? 'bg-white text-lad-600 font-bold' : step > s.num ? 'bg-lad-100 text-lad-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                    {step > s.num ? '✓' : s.num}
                  </span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: Select Card Type */}
            {step === 1 && (
              <div className="space-y-3" data-testid="wizard-step-1-card-type">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Select the Card Type for this Quick Starter
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    When clicked, this quick starter chip will target this specific card schema and category.
                  </p>
                </div>

                <input
                  type="text"
                  placeholder="Filter card types by name or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  data-testid="wizard-card-type-search"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {filteredCardTypes.map((ct) => {
                    const isSelected = ct.id === selectedCardTypeId;
                    return (
                      <button
                        key={ct.id}
                        type="button"
                        onClick={() => handleSelectCardType(ct)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'border-lad-500 bg-lad-50/50 dark:bg-lad-950/30 ring-1 ring-lad-500'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                        }`}
                        data-testid={`select-card-type-${ct.id}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-lad-500 shrink-0" />
                            {ct.name}
                          </span>
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                            {ct.category}
                          </span>
                        </div>
                        {ct.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">{ct.description}</p>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1">
                          {ct.fields.length} {ct.fields.length === 1 ? 'field' : 'fields'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Template Prompt */}
            {step === 2 && (
              <div className="space-y-3" data-testid="wizard-step-2-template">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Define Quick Capture Text Template
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    This prompt is inserted into the capture bar when the user clicks the quick starter chip.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-400 block">
                    Starter Template Prompt
                  </label>
                  <textarea
                    rows={3}
                    value={templateText}
                    onChange={(e) => setTemplateText(e.target.value)}
                    placeholder="e.g. Bank Chase checking account balance is $2500"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                    data-testid="wizard-template-textarea"
                  />
                </div>

                {/* Available Card Type Fields as Clickable Tokens */}
                {selectedCardType && selectedCardType.fields.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400 block">
                      Click to insert field wildcard:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCardType.fields.map((f) => (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => handleInsertToken(f.key)}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-lad-50 dark:bg-slate-800 dark:hover:bg-lad-950/40 text-slate-700 dark:text-slate-300 text-[11px] font-mono border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                          title={`Insert {${f.key}}`}
                        >
                          +{f.label} ({f.key})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested template triggers */}
                {selectedCardType && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
                      Suggested standard template:
                    </span>
                    <button
                      type="button"
                      onClick={() => setTemplateText(generateDefaultTemplate(selectedCardType))}
                      className="text-[11px] text-lad-600 dark:text-lad-400 hover:underline text-left cursor-pointer"
                    >
                      &quot;{generateDefaultTemplate(selectedCardType)}&quot;
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Style & Appearance */}
            {step === 3 && (
              <div className="space-y-3" data-testid="wizard-step-3-style">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Customize Chip Label, Color & Icon
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Choose how the starter chip will look in the quick capture bar and modals.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Button Label
                    </label>
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="e.g. Bank Balance, Pet Vaccine"
                      className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                      data-testid="wizard-label-input"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Category Domain
                    </label>
                    <select
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    >
                      {registry.getAllCategories().map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Color Palette Selector */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 block">
                    Chip Color Theme
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setColor(c.id)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          color === c.id ? `${c.bg} ring-2 ring-lad-500 shadow-xs` : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                        data-testid={`color-select-${c.id}`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-current shrink-0" />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon Selector */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 block">
                    Chip Icon
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {AVAILABLE_ICONS.map((i) => {
                      const IconComp = i.icon;
                      const isSelected = icon === i.id;
                      return (
                        <button
                          key={i.id}
                          type="button"
                          onClick={() => setIcon(i.id)}
                          className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-lad-500 bg-lad-50/50 dark:bg-lad-950/30 text-lad-700 dark:text-lad-300 ring-1 ring-lad-500'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                          data-testid={`icon-select-${i.id}`}
                        >
                          <IconComp className="w-4 h-4 shrink-0" />
                          <span className="text-[11px] truncate font-medium">{i.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Live Interactive Preview */}
            {step === 4 && (
              <div className="space-y-4" data-testid="wizard-step-4-preview">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Preview & Confirm Quick Starter
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Verify how your new starter will look and behave when users capture items in this space.
                  </p>
                </div>

                {/* Live Chip Render */}
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col items-center justify-center space-y-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Live Starter Chip Preview:
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xs cursor-pointer select-none transition-transform hover:scale-105 active:scale-95">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${currentColorConfig.bg}`}>
                      {renderIcon(icon, 'w-3.5 h-3.5')}
                      <span>{label || 'Quick Starter'}</span>
                    </span>
                  </div>
                </div>

                {/* Configuration Summary */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Target Card Type:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedCardType?.name || selectedCardTypeId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Category Domain:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 uppercase font-mono">
                      {domain}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Template Text inserted on click:
                    </span>
                    <p className="text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono">
                      {templateText}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              {starter && onDelete ? (
                <button
                  type="button"
                  onClick={handleDeleteStarter}
                  disabled={isSaving}
                  className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  data-testid="wizard-delete-starter-btn"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Starter</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  disabled={isSaving}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 rounded-xl flex items-center gap-1 cursor-pointer"
                  data-testid="wizard-prev-btn"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="px-4 py-2 text-xs font-bold text-white bg-lad-600 hover:bg-lad-700 rounded-xl shadow-xs flex items-center gap-1 cursor-pointer"
                  data-testid="wizard-next-btn"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveStarter}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-bold text-white bg-lad-600 hover:bg-lad-700 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  data-testid="wizard-save-btn"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Starter...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Quick Starter</span>
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
