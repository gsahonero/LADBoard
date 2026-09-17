/**
 * Universal Capture Modal supporting Free Text and Guided Cards with real-time heuristic NLP inference
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { CaptureParser } from '../../core/objects/capture-parser';
import { InferredStructure } from '../../core/objects/types';
import { LADObjectPriority } from '../../core/standard/types';
import {
  X,
  Sparkles,
  Check,
  Calendar,
  User,
  Tag,
  AlertCircle,
  FileText,
  CreditCard,
  Heart,
  ShoppingBag,
  Home,
  Briefcase,
} from 'lucide-react';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDomain?: string;
}

export const CaptureModal: React.FC<CaptureModalProps> = ({
  isOpen,
  onClose,
  defaultDomain,
}) => {
  const { createObjectFromCapture } = useLAD();
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<'text' | 'cards'>('text');
  const [inputText, setInputText] = useState('');
  const [inferred, setInferred] = useState<InferredStructure | null>(null);

  // Editable inference overrides
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState(defaultDomain || 'general');
  const [priority, setPriority] = useState<LADObjectPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [tagsStr, setTagsStr] = useState('');

  // Sync domain if defaultDomain changes
  useEffect(() => {
    if (defaultDomain) {
      setDomain(defaultDomain);
    }
  }, [defaultDomain]);

  // Re-run NLP parser on input text change
  useEffect(() => {
    if (!inputText.trim()) {
      setInferred(null);
      return;
    }
    const result = CaptureParser.parse(inputText);
    setInferred(result);
    setTitle(result.title);
    if (!defaultDomain) {
      setDomain(result.domain);
    }
    setPriority(result.priority);
    setDueDate(result.dueDate || '');
    setAssignedTo(result.assignedTo || '');
    setTagsStr(result.tags.join(', '));
  }, [inputText, defaultDomain]);

  const handleSave = async () => {
    if (!title.trim() && !inputText.trim()) return;

    const finalStructure: InferredStructure = {
      rawText: inputText,
      title: title.trim() || inputText.trim(),
      domain,
      cardTypeId: inferred?.cardTypeId,
      priority,
      dueDate: dueDate || undefined,
      assignedTo: assignedTo || undefined,
      tags: tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      extractedActions: inferred?.extractedActions || [],
      extractedEntities: inferred?.extractedEntities || [],
      suggestedAttributes: inferred?.suggestedAttributes || {},
      fieldValues: inferred?.fieldValues || {},
    };

    await createObjectFromCapture(finalStructure);
    setInputText('');
    setInferred(null);
    onClose();
  };

  const domainOptions = [
    { id: 'health', label: t('capture.domains.health'), icon: Heart, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/30' },
    { id: 'finances', label: t('capture.domains.finances'), icon: CreditCard, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' },
    { id: 'shopping', label: t('capture.domains.shopping'), icon: ShoppingBag, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' },
    { id: 'home', label: t('capture.domains.home'), icon: Home, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' },
    { id: 'documents', label: t('capture.domains.documents'), icon: FileText, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30' },
    { id: 'projects', label: t('capture.domains.projects'), icon: Briefcase, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/30' },
    { id: 'general', label: t('capture.domains.general'), icon: Sparkles, color: 'text-slate-500 bg-slate-50 dark:bg-slate-800' },
  ];

  const handleQuickStarter = (starterText: string, suggestedDomain: string) => {
    setInputText(starterText);
    setDomain(suggestedDomain);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] z-10"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('capture.quickCapture')}
                  </h2>
                  <p className="text-xs text-slate-400">Low cognitive load input</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Tab Switcher */}
            <div className="px-6 pt-3 flex gap-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <button
                onClick={() => setActiveTab('text')}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'text'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{t('capture.textTab')}</span>
              </button>
              <button
                onClick={() => setActiveTab('cards')}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'cards'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('capture.cardsTab')}</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {activeTab === 'text' ? (
                <div className="space-y-3">
                  {/* Quick Starters */}
                  <div className="flex flex-wrap gap-1.5">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleQuickStarter(t('capture.quickStartersText.medication'), 'health')}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      <span>{t('capture.quickStarters.medication')}</span>
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleQuickStarter(t('capture.quickStartersText.balance'), 'finances')}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t('capture.quickStarters.balance')}</span>
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleQuickStarter(t('capture.quickStartersText.shopping'), 'shopping')}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                      <span>{t('capture.quickStarters.shopping')}</span>
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleQuickStarter(t('capture.quickStartersText.appointment'), 'health')}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span>{t('capture.quickStarters.appointment')}</span>
                    </motion.button>
                  </div>

                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={t('capture.placeholder')}
                    rows={3}
                    autoFocus
                    className="w-full text-sm p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      {t('capture.title')}
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Schedule pediatric dental checkup"
                      className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      {t('capture.domain')}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {domainOptions.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = domain === opt.id;
                        return (
                          <motion.button
                            key={opt.id}
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setDomain(opt.id)}
                            className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 font-bold ring-2 ring-blue-500/20 shadow-sm'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg ${opt.color}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="truncate">{opt.label}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Inferred Structure Review Panel */}
              {(inferred || activeTab === 'cards') && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      {t('capture.inferredHeader')}
                    </span>
                    <span className="text-[10px] font-normal text-slate-400">Editable</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                        <Calendar className="w-3 h-3" />
                        {t('capture.dueDate')}
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                        <User className="w-3 h-3" />
                        {t('capture.assignedTo')}
                      </label>
                      <input
                        type="text"
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        placeholder="e.g. Dad, Alice"
                        className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                        <AlertCircle className="w-3 h-3" />
                        {t('capture.priority')}
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as LADObjectPriority)}
                        className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="low">{t('capture.priorities.low')}</option>
                        <option value="medium">{t('capture.priorities.medium')}</option>
                        <option value="high">{t('capture.priorities.high')}</option>
                        <option value="urgent">{t('capture.priorities.urgent')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                        <Tag className="w-3 h-3" />
                        {t('capture.tags')}
                      </label>
                      <input
                        type="text"
                        value={tagsStr}
                        onChange={(e) => setTagsStr(e.target.value)}
                        placeholder="health, prescription"
                        className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                {t('capture.cancel')}
              </button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={!inputText.trim() && !title.trim()}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all"
              >
                <Check className="w-4 h-4" />
                {t('capture.confirmAndSave')}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
