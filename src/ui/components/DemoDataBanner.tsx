/**
 * Demo Data Starter Banner — 1-click onboarding for empty spaces
 */

import React, { useState } from 'react';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { Sparkles, Plus } from 'lucide-react';

export const DemoDataBanner: React.FC = () => {
  const { objects, createObjectFromCapture, inviteMember } = useLAD();
  const { t } = useI18n();
  const [loaded, setLoaded] = useState(false);

  // Only show if space has 0 or 1 item
  if (objects.length > 1 || loaded) return null;

  const handleLoadDemo = async () => {
    // 1. Health Item
    const twoWeeksDate = new Date();
    twoWeeksDate.setDate(twoWeeksDate.getDate() + 14);

    await createObjectFromCapture({
      rawText: 'Doctor says continue medication, blood test in 2 weeks, dad needs to schedule follow-up.',
      title: 'Doctor Follow-up & Blood Test',
      domain: 'health',
      priority: 'high',
      dueDate: twoWeeksDate.toISOString().split('T')[0],
      assignedTo: 'Dad',
      tags: ['health', 'medication', 'lab-test'],
      extractedActions: ['continue medication', 'blood test in 2 weeks', 'schedule follow-up'],
      extractedEntities: [{ name: 'Doctor', type: 'person' }, { name: 'Dad', type: 'person' }],
      suggestedAttributes: { has_followup: true },
    });

    // 2. Bank Account
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 8);

    await createObjectFromCapture({
      rawText: 'Checking account balance at Bank',
      title: 'Checking Account Balance',
      domain: 'finances',
      priority: 'medium',
      tags: ['bank', 'savings'],
      extractedActions: [],
      extractedEntities: [],
      suggestedAttributes: {
        balance: 1450,
        last_checked_at: staleDate.toISOString(),
      },
    });

    // 3. Shopping Item
    await createObjectFromCapture({
      rawText: 'Buy organic milk, sourdough bread, and fresh fruit from the farmers market',
      title: 'Weekend Groceries',
      domain: 'shopping',
      priority: 'medium',
      tags: ['groceries', 'market'],
      extractedActions: ['Buy organic milk, bread, fruits'],
      extractedEntities: [],
      suggestedAttributes: {},
    });

    // 4. Home maintenance
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    await createObjectFromCapture({
      rawText: 'Call electrician to check living room lighting circuit',
      title: 'Call Electrician for Lighting',
      domain: 'home',
      priority: 'urgent',
      dueDate: tomorrowDate.toISOString().split('T')[0],
      assignedTo: 'Partner',
      tags: ['home', 'repair'],
      extractedActions: ['Call electrician'],
      extractedEntities: [],
      suggestedAttributes: {},
    });

    // 5. Add a family collaborator invite
    await inviteMember('family.member@gmail.com', 'editor');

    setLoaded(true);
  };

  return (
    <div className="p-4 bg-gradient-to-r from-lad-50 to-indigo-50 dark:from-lad-950/40 dark:to-indigo-950/40 rounded-2xl border border-lad-200/80 dark:border-lad-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-lad-600 text-white rounded-xl shadow-sm">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-900 dark:text-white">
            {t('demo.bannerTitle')}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Adds a sample medical note, bank account, grocery list, and collaborator invite.
          </div>
        </div>
      </div>

      <button
        onClick={handleLoadDemo}
        className="px-4 py-2 bg-lad-600 hover:bg-lad-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>{t('demo.loadDemo')}</span>
      </button>
    </div>
  );
};
