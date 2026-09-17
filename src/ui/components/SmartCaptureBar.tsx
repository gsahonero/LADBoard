/**
 * Hero Smart Capture Bar — Prominently positioned on the Living Board for instant, low-friction capture
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { CaptureParser } from '../../core/objects/capture-parser';
import { InferredStructure } from '../../core/objects/types';
import { LADObjectPriority } from '../../core/standard/types';
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
} from 'lucide-react';

export const SmartCaptureBar: React.FC = () => {
  const { createObjectFromCapture } = useLAD();
  const { t } = useI18n();

  const [input, setInput] = useState('');
  const [inferred, setInferred] = useState<InferredStructure | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Editable overrides when expanded
  const [overrideTitle, setOverrideTitle] = useState('');
  const [overrideDomain, setOverrideDomain] = useState('general');
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideAssignee, setOverrideAssignee] = useState('');
  const [overridePriority, setOverridePriority] = useState<LADObjectPriority>('medium');

  // Real-time parsing as user types
  useEffect(() => {
    if (!input.trim()) {
      setInferred(null);
      return;
    }
    const result = CaptureParser.parse(input);
    setInferred(result);
    setOverrideTitle(result.title);
    setOverrideDomain(result.domain);
    setOverrideDate(result.dueDate || '');
    setOverrideAssignee(result.assignedTo || '');
    setOverridePriority(result.priority);
  }, [input]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const finalStructure: InferredStructure = {
      rawText: input,
      title: overrideTitle.trim() || input.trim(),
      domain: overrideDomain || inferred?.domain || 'general',
      priority: overridePriority || inferred?.priority || 'medium',
      dueDate: overrideDate || inferred?.dueDate,
      assignedTo: overrideAssignee || inferred?.assignedTo,
      tags: inferred?.tags || [],
      extractedActions: inferred?.extractedActions || [],
      extractedEntities: inferred?.extractedEntities || [],
      suggestedAttributes: inferred?.suggestedAttributes || {},
    };

    await createObjectFromCapture(finalStructure);
    setInput('');
    setInferred(null);
    setIsExpanded(false);
  };

  const handleStarterClick = (promptTemplate: string) => {
    setInput(promptTemplate);
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
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => {
              if (inferred) setIsExpanded(true);
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
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!input.trim()}
          className="px-4 py-3 bg-lad-600 hover:bg-lad-700 disabled:opacity-40 disabled:hover:bg-lad-600 text-white font-bold text-xs rounded-2xl shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap"
        >
          <span>{t('capture.submit')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Live NLP Extraction Preview Pills */}
      {inferred && (
        <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 animate-in fade-in duration-100">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-lad-500" />
              {t('capture.inferredHeader')}
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[11px] text-lad-600 hover:underline font-bold"
            >
              {isExpanded ? 'Simple view' : 'Fine-tune details'}
            </button>
          </div>

          {/* Quick Pill Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200">
              {getDomainIcon(overrideDomain)}
              <span className="capitalize">{overrideDomain}</span>
            </span>

            {overrideDate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold border border-blue-200 dark:border-blue-800">
                <Calendar className="w-3 h-3" />
                <span>{overrideDate}</span>
              </span>
            )}

            {overrideAssignee && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-full text-xs font-semibold border border-purple-200 dark:border-purple-800">
                <User className="w-3 h-3" />
                <span>{overrideAssignee}</span>
              </span>
            )}

            {overridePriority === 'urgent' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-200">
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

          {/* Expanded Fine-tuning controls */}
          {isExpanded && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  {t('capture.domain')}
                </label>
                <select
                  value={overrideDomain}
                  onChange={(e) => setOverrideDomain(e.target.value)}
                  className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="health">🩺 Health</option>
                  <option value="finances">💳 Money</option>
                  <option value="shopping">🛒 Shopping</option>
                  <option value="home">🏠 Home</option>
                  <option value="documents">📄 Documents</option>
                  <option value="projects">💼 Projects</option>
                  <option value="general">✨ General</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  {t('capture.dueDate')}
                </label>
                <input
                  type="date"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  {t('capture.assignedTo')}
                </label>
                <input
                  type="text"
                  value={overrideAssignee}
                  onChange={(e) => setOverrideAssignee(e.target.value)}
                  placeholder="Person name"
                  className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  {t('capture.priority')}
                </label>
                <select
                  value={overridePriority}
                  onChange={(e) => setOverridePriority(e.target.value as any)}
                  className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Normal</option>
                  <option value="high">Important</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Prompt Starter Chips */}
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
            onClick={() => handleStarterClick(t('capture.quickStartersText.balance'))}
            className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <CreditCard className="w-3 h-3 text-emerald-500" />
            <span>{t('capture.quickStarters.balance')}</span>
          </button>

          <button
            type="button"
            onClick={() => handleStarterClick(t('capture.quickStartersText.shopping'))}
            className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-700 dark:text-amber-300 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ShoppingBag className="w-3 h-3 text-amber-500" />
            <span>{t('capture.quickStarters.shopping')}</span>
          </button>

          <button
            type="button"
            onClick={() => handleStarterClick(t('capture.quickStartersText.appointment'))}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Calendar className="w-3 h-3 text-slate-500" />
            <span>{t('capture.quickStarters.appointment')}</span>
          </button>
        </div>
      )}
    </div>
  );
};
