/**
 * Living Board View — The primary intuitive daily cockpit for LAD Board
 */

import React, { useState } from 'react';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { SmartCaptureBar } from '../components/SmartCaptureBar';
import { AttentionCard } from '../components/AttentionCard';
import { ObjectCard } from '../components/ObjectCard';
import { TimelineRibbon } from '../components/TimelineRibbon';
import { DemoDataBanner } from '../components/DemoDataBanner';
import {
  Bell,
  Heart,
  CreditCard,
  ShoppingBag,
  Home,
  FileText,
  Briefcase,
  Sparkles,
  Bot,
  Check,
  X,
} from 'lucide-react';

export const LivingBoardView: React.FC = () => {
  const { objects, activeAlerts, proposals, approveProposal, rejectProposal } = useLAD();
  const { t } = useI18n();

  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string | null>(null);

  const domainFilters = [
    { id: 'all', label: t('boardView.allCategories'), icon: Sparkles },
    { id: 'health', label: t('capture.domains.health'), icon: Heart },
    { id: 'finances', label: t('capture.domains.finances'), icon: CreditCard },
    { id: 'shopping', label: t('capture.domains.shopping'), icon: ShoppingBag },
    { id: 'home', label: t('capture.domains.home'), icon: Home },
    { id: 'documents', label: t('capture.domains.documents'), icon: FileText },
    { id: 'projects', label: t('capture.domains.projects'), icon: Briefcase },
  ];

  const filteredObjects = objects.filter((o) => {
    if (selectedDomain !== 'all' && o.domain !== selectedDomain) return false;
    if (dateFilter && o.due_date !== dateFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Guided Starter Demo Banner (if empty) */}
      <DemoDataBanner />

      {/* 2. Hero Smart Capture Bar */}
      <SmartCaptureBar />

      {/* 3. Things to Check / Attention Hub (if any alerts or proposals) */}
      {(activeAlerts.length > 0 || proposals.length > 0) && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('active.title')}</span>
              <span className="px-2 py-0.2 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-full text-[10px] font-bold">
                {activeAlerts.length + proposals.length}
              </span>
            </h2>
          </div>

          {/* Bot Proposals */}
          {proposals.length > 0 && (
            <div className="grid gap-3">
              {proposals.map((prop) => (
                <div
                  key={prop.proposalId}
                  className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {prop.agentName}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300">
                        {prop.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => rejectProposal(prop.proposalId)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{t('active.reject')}</span>
                    </button>
                    <button
                      onClick={() => approveProposal(prop.proposalId)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{t('active.approve')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active Alert Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeAlerts.map((alert) => (
              <AttentionCard key={alert.alert_id} alert={alert} />
            ))}
          </div>
        </section>
      )}

      {/* 4. Timeline Ribbon Strip */}
      <div className="pt-2">
        <TimelineRibbon
          objects={objects}
          onSelectDateFilter={(d) => setDateFilter(dateFilter === d ? null : d)}
        />
      </div>

      {/* 5. Category Filter Pills */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {domainFilters.map((df) => {
            const Icon = df.icon;
            const isSelected = selectedDomain === df.id;
            const count =
              df.id === 'all'
                ? objects.length
                : objects.filter((o) => o.domain === df.id).length;

            return (
              <button
                key={df.id}
                onClick={() => {
                  setSelectedDomain(df.id);
                  setDateFilter(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{df.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Object Cards Grid */}
      {filteredObjects.length === 0 ? (
        <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-2">
          <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('boardView.emptyCategory')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredObjects.map((obj) => (
            <ObjectCard key={obj.object_id} obj={obj} />
          ))}
        </div>
      )}
    </div>
  );
};
