/**
 * Dashboard View — Dynamic Domain Projections of the Knowledge Graph
 */

import React, { useState, useMemo } from 'react';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { ModernIcon } from '../components/ModernIcon';
import { getSpaceCategories, getCategoryMeta } from '../../core/theme/space-identity';
import {
  Sparkles,
  Calendar,
  User,
  Plus,
  Trash2,
} from 'lucide-react';
import { LADObject } from '../../core/standard/types';

export const DashboardView: React.FC<{ onOpenCapture: () => void }> = ({ onOpenCapture }) => {
  const { objects, activeManifest, deleteObject } = useLAD();
  const { t } = useI18n();

  const [selectedDomain, setSelectedDomain] = useState<string>('all');

  const spaceCategories = useMemo(() => {
    return getSpaceCategories(activeManifest, objects);
  }, [activeManifest, objects]);

  const domainDefs = useMemo(() => {
    const list = [{ id: 'all', label: t('domainsView.all'), iconName: 'sparkles' }];
    spaceCategories.forEach((catId) => {
      const meta = getCategoryMeta(catId);
      list.push({
        id: catId,
        label: meta.labelKey ? t(meta.labelKey) : (meta.label || catId),
        iconName: meta.iconName,
      });
    });
    return list;
  }, [spaceCategories, t]);

  const filteredObjects =
    selectedDomain === 'all'
      ? objects
      : objects.filter((o) => o.domain === selectedDomain);

  const getDomainIcon = (domain: string) => {
    const meta = getCategoryMeta(domain);
    return <ModernIcon name={meta.iconName} className="w-3.5 h-3.5" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t('domainsView.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('domainsView.subtitle')}
          </p>
        </div>
        <button
          onClick={onOpenCapture}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-lad-600 hover:bg-lad-700 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Capture</span>
        </button>
      </div>

      {/* Domain Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {domainDefs.map((def) => {
          const isSelected = selectedDomain === def.id;
          const count =
            def.id === 'all'
              ? objects.length
              : objects.filter((o) => o.domain === def.id).length;

          return (
            <button
              key={def.id}
              onClick={() => setSelectedDomain(def.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                isSelected
                  ? 'bg-lad-600 text-white border-lad-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <ModernIcon name={def.iconName} className="w-3.5 h-3.5" />
              <span>{def.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Objects Grid */}
      {filteredObjects.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Sparkles className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('domainsView.noItems')}
          </p>
          <button
            onClick={onOpenCapture}
            className="px-3.5 py-1.5 text-xs font-semibold text-lad-600 bg-lad-50 dark:bg-lad-950/40 hover:bg-lad-100 dark:hover:bg-lad-900 rounded-lg transition-colors"
          >
            {t('domainsView.addItem', { domain: selectedDomain })}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredObjects.map((obj: LADObject) => (
            <div
              key={obj.object_id}
              className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {getDomainIcon(obj.domain)}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {obj.domain}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteObject(obj.object_id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded transition-opacity"
                    title="Delete object"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                  {obj.title}
                </h3>

                {obj.description && obj.description !== obj.title && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {obj.description}
                  </p>
                )}
              </div>

              {/* Card Metadata Footer */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  {obj.due_date && (
                    <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-medium">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {obj.due_date}
                    </span>
                  )}
                  {obj.assigned_to && (
                    <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-medium">
                      <User className="w-3 h-3 text-slate-400" />
                      {obj.assigned_to}
                    </span>
                  )}
                  {obj.attributes?.balance !== undefined && (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">
                      ${Number(obj.attributes.balance).toLocaleString()}
                    </span>
                  )}
                </div>

                {obj.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {obj.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 px-1.5 py-0.2 rounded border border-slate-200/60 dark:border-slate-700/60"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
