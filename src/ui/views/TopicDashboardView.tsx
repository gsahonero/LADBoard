import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { ObjectCard } from '../components/ObjectCard';
import { ModernIcon } from '../components/ModernIcon';
import { fuzzyFilterObjects } from '../../core/utils/fuzzy-search';
import { Search, ArrowLeft, Plus, Layers } from 'lucide-react';
import { CardTypeEditorModal } from '../components/CardTypeEditorModal';

import { getCategoryMeta } from '../../core/theme/space-identity';

interface TopicDashboardViewProps {
  topicId: string;
  onBackToHub: () => void;
  onOpenCapture: (domain?: string) => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.03,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const TopicDashboardView: React.FC<TopicDashboardViewProps> = ({
  topicId,
  onBackToHub,
  onOpenCapture,
}) => {
  const { t } = useI18n();
  const { objects, activeManifest, activeSpaceId } = useLAD();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [isCardTypeEditorOpen, setIsCardTypeEditorOpen] = useState(false);

  const meta = getCategoryMeta(topicId);
  const topicTitle = meta.labelKey ? t(meta.labelKey) : (meta.label || topicId);

  const effectiveSpaceId = activeSpaceId || activeManifest?.space_id;
  // Filter objects for this topic and active space
  const topicObjects = useMemo(() => {
    return objects.filter((o) => o.domain === topicId && (!effectiveSpaceId || !o.space_id || o.space_id === effectiveSpaceId));
  }, [objects, topicId, effectiveSpaceId]);

  // Extract unique tags/subcategories
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    topicObjects.forEach((o) => {
      o.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags);
  }, [topicObjects]);

  // Filtered by query and selected tag
  const filteredObjects = useMemo(() => {
    let list = topicObjects;
    if (selectedTag !== 'all') {
      list = list.filter((o) => o.tags?.includes(selectedTag));
    }
    if (searchQuery.trim()) {
      list = fuzzyFilterObjects(list, searchQuery);
    }
    return list;
  }, [topicObjects, searchQuery, selectedTag]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-5xl mx-auto space-y-6 pb-12"
    >
      {/* 1. Header with Breadcrumb & Topic Hero Banner (Seamless Frosted Glass Surface) */}
      <motion.div
        variants={itemVariants}
        className="relative rounded-3xl p-6 sm:p-8 backdrop-blur-2xl bg-gradient-to-b from-white/70 via-white/40 to-white/10 dark:from-slate-900/60 dark:via-slate-900/30 dark:to-slate-950/20 border-t border-l border-white/50 dark:border-white/10 border-r-0 border-b-0 space-y-4 transition-all duration-300"
      >
        <div className="flex items-center justify-between">
          <motion.button
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={onBackToHub}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('topics.backToHub')}</span>
          </motion.button>
          <span className="px-3 py-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 border border-white/30 dark:border-white/5">
            {activeManifest?.space_name || 'Personal'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ rotate: [0, -5, 5, 0], transition: { duration: 0.5 } }}
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.color} flex items-center justify-center shadow-md text-white`}
            >
              <ModernIcon name={meta.iconName} className="w-7 h-7 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {topicTitle}
              </h1>
              {meta.descKey && (
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                  {t(meta.descKey)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsCardTypeEditorOpen(true)}
              className="px-3.5 py-2.5 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              data-testid="category-card-types-btn"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Card Schemas</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onOpenCapture(topicId)}
              style={{ backgroundColor: 'var(--color-primary)' }}
              className="px-5 py-2.5 text-white font-semibold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t('boardView.addItem')}</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* 2. Search & Tag Filters Bar */}
      <motion.div
        variants={itemVariants}
        className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700/60 flex flex-col md:flex-row items-center gap-3"
      >
        <div className="relative w-full md:flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('topics.searchPlaceholder', { topic: topicTitle })}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Tags / Subcategories */}
        {availableTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto pb-1 md:pb-0" data-testid="topic-subcategories-bar">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedTag('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedTag === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {t('topics.allSubcategories')} ({topicObjects.length})
            </motion.button>
            {availableTags.map((tag) => (
              <motion.button
                key={tag}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedTag === tag
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                #{tag}
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>

      {/* 3. Items Grid */}
      <AnimatePresence mode="popLayout">
        {filteredObjects.length > 0 ? (
          <motion.div
            variants={itemVariants}
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start"
            data-testid="topic-dashboard-grid"
          >
            {filteredObjects.map((obj) => (
              <motion.div
                key={obj.object_id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <ObjectCard obj={obj} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            variants={itemVariants}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-100 dark:border-slate-700/60 space-y-4 shadow-sm"
          >
            <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-300">
              <ModernIcon name={meta.iconName} className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              {t('topics.emptyTopic', { topic: topicTitle })}
            </h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              {t('boardView.emptyCategory')}
            </p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onOpenCapture(topicId)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t('capture.quickCapture')}</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      <CardTypeEditorModal
        isOpen={isCardTypeEditorOpen}
        onClose={() => setIsCardTypeEditorOpen(false)}
        defaultCategory={topicId}
      />
    </motion.div>
  );
};
