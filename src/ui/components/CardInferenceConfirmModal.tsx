/**
 * CardInferenceConfirmModal — User Confirmation Modal for NLP-Inferred Cards
 * Triggers when the user submits a raw mind dump without having modified finer details.
 * Allows agreeing to save the inferred card or declining to return to finer details editing.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InferredStructure } from '../../core/objects/types';
import { LADCardTypeDefinition } from '../../core/schemas/card-types';
import {
  Sparkles,
  Check,
  Edit3,
  X,
  CreditCard,
  Heart,
  ShoppingBag,
  Calendar,
  User,
  HelpCircle,
} from 'lucide-react';

interface CardInferenceConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawText: string;
  inferred: InferredStructure | null;
  cardType?: LADCardTypeDefinition;
  onConfirm: () => void;
  onDecline: () => void;
}

export const CardInferenceConfirmModal: React.FC<CardInferenceConfirmModalProps> = ({
  isOpen,
  onClose,
  rawText,
  inferred,
  cardType,
  onConfirm,
  onDecline,
}) => {
  if (!isOpen || !inferred) return null;

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

  const fieldValues = inferred.fieldValues || {};

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
          data-testid="card-inference-confirm-modal"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-lad-500/10 text-lad-600 dark:text-lad-400 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Confirm Inferred Card
                </h2>
                <p className="text-[11px] text-slate-500">
                  LAD Board structured your mind dump into this card.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Raw Mind Dump Callout */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                What you had in mind:
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 italic font-mono" data-testid="raw-thought-quote">
                &quot;{rawText}&quot;
              </p>
            </div>

            {/* Inferred Card Preview Box */}
            <div className="p-4 rounded-2xl border-2 border-lad-500/20 bg-gradient-to-b from-lad-50/20 via-transparent to-transparent dark:from-lad-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white dark:bg-slate-800 rounded-full text-[11px] font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    {getDomainIcon(inferred.domain)}
                    <span className="capitalize">{inferred.domain}</span>
                  </span>

                  {cardType && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-full text-[11px] font-bold border border-indigo-200 dark:border-indigo-800">
                      <span>{cardType.name}</span>
                    </span>
                  )}
                </div>

                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Card Preview
                </span>
              </div>

              {/* Title */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  Card Title
                </span>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {inferred.title}
                </h3>
              </div>

              {/* Inferred Field Slots Grid */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Inferred Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {fieldValues.bank && (
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Bank</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{fieldValues.bank}</span>
                    </div>
                  )}

                  {fieldValues.account_type && (
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Account Type</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{fieldValues.account_type}</span>
                    </div>
                  )}

                  {fieldValues.balance !== undefined && (
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                      <span className="text-[9px] font-bold block uppercase opacity-80">Balance</span>
                      <span className="text-sm font-black">${Number(fieldValues.balance).toLocaleString()}</span>
                    </div>
                  )}

                  {fieldValues.specialty && (
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Specialty</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{fieldValues.specialty}</span>
                    </div>
                  )}

                  {fieldValues.patient && fieldValues.patient !== 'Me' && (
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Patient</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{fieldValues.patient}</span>
                      </div>
                    </div>
                  )}

                  {fieldValues.estimated_budget !== undefined && (
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Budget</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">${fieldValues.estimated_budget}</span>
                    </div>
                  )}

                  {fieldValues.checklist && fieldValues.checklist.length > 0 && (
                    <div className="p-2 sm:col-span-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase mb-1">
                        Checklist ({fieldValues.checklist.length} items)
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {fieldValues.checklist.map((it: any, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[11px] text-slate-700 dark:text-slate-200 font-medium"
                          >
                            {typeof it === 'string' ? it : it.text}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {inferred.dueDate && (
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Due / Target</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{inferred.dueDate}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Prompt Question */}
            <div className="flex items-center gap-2 p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200">
              <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                Do you agree with how this card was inferred, or would you like to modify the finer details?
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onDecline}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              data-testid="decline-inference-button"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Adjust Finer Details</span>
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className="px-5 py-2.5 bg-lad-600 hover:bg-lad-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              data-testid="confirm-inference-button"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Agree & Save Card</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
