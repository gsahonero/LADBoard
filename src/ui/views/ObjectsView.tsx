/**
 * Objects View — Full-text Search and Document Inspector
 */

import React, { useState } from 'react';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { FileText, Search, Calendar, Trash2, Edit3, Check } from 'lucide-react';
import { LADObject } from '../../core/standard/types';
import { fuzzyFilterObjects } from '../../core/utils/fuzzy-search';

export const ObjectsView: React.FC = () => {
  const { objects, deleteObject, updateObject } = useLAD();
  const { t } = useI18n();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const filtered = fuzzyFilterObjects(objects, searchQuery);

  const [editDueDate, setEditDueDate] = useState('');

  const getQuickDateStr = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  const handleStartEdit = (obj: LADObject) => {
    setEditingId(obj.object_id);
    setEditTitle(obj.title);
    setEditDesc(obj.description || '');
    setEditDueDate(obj.due_date || '');
  };

  const handleSaveEdit = async (objectId: string) => {
    await updateObject(
      objectId,
      {
        title: editTitle.trim() || 'Untitled',
        description: editDesc,
        due_date: editDueDate.trim() || undefined,
      },
      true
    );
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-lad-500" />
          {t('nav.objects')}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {filtered.length} objects in current Space
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('common.search')}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-lad-500 text-slate-900 dark:text-white"
        />
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((obj) => {
          const isEditing = editingId === obj.object_id;

          return (
            <div
              key={obj.object_id}
              className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('capture.title')}
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full text-xs font-bold p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span>{t('card.dueDateLabel')}</span>
                    </label>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setEditDueDate(getQuickDateStr(0))}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium transition-colors ${
                          editDueDate === getQuickDateStr(0)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {t('card.quickToday')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditDueDate(getQuickDateStr(1))}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium transition-colors ${
                          editDueDate === getQuickDateStr(1)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {t('card.quickTomorrow')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditDueDate(getQuickDateStr(7))}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium transition-colors ${
                          editDueDate === getQuickDateStr(7)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {t('card.quickNextWeek')}
                      </button>
                      {editDueDate && (
                        <button
                          type="button"
                          onClick={() => setEditDueDate('')}
                          className="text-[10px] px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 font-medium"
                        >
                          {t('card.clearDate')}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('spaces.spaceDescription')}
                    </label>
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={2}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(obj.object_id)}
                      className="px-3 py-1 text-xs font-semibold bg-lad-600 text-white rounded-lg flex items-center gap-1 shadow-sm"
                    >
                      <Check className="w-3 h-3" />
                      {t('common.save')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 rounded">
                        {obj.domain}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        {obj.title}
                      </h3>
                    </div>
                    {obj.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {obj.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(obj)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteObject(obj.object_id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Tags & Meta */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                <span>ID: {obj.object_id}</span>
                <span>•</span>
                <span>v{obj.version}</span>
                {obj.due_date && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {obj.due_date}
                    </span>
                  </>
                )}
                {obj.tags.map((t) => (
                  <span
                    key={t}
                    className="bg-slate-50 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
