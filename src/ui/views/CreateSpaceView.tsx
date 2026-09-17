import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Globe,
  Home,
  Users,
  Briefcase,
  PenTool,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  SPACE_ICON_PRESETS,
  SPACE_COLOR_PRESETS,
  SPACE_TEMPLATES,
} from '../../core/theme/space-identity';
import { ModernIcon } from '../components/ModernIcon';

interface CreateSpaceViewProps {
  onComplete: () => void;
  onCancel: () => void;
}

type SpaceChoice = 'personal' | 'family' | 'work' | 'custom';

export const CreateSpaceView: React.FC<CreateSpaceViewProps> = ({ onComplete, onCancel }) => {
  const { t, locale, setLocale } = useI18n();
  const { createSpace, spaces } = useLAD();

  const [spaceChoice, setSpaceChoice] = useState<SpaceChoice>('personal');
  const [customSpaceName, setCustomSpaceName] = useState('');
  const [customSpaceIcon, setCustomSpaceIcon] = useState('orbit');
  const [customSpaceColor, setCustomSpaceColor] = useState('blue');
  const [customSpaceDesc, setCustomSpaceDesc] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let targetSpaceName = '';
      let targetSpaceDesc = '';
      let targetSpaceIcon = 'orbit';
      let targetSpaceColor = 'blue';
      let targetCategories: string[] = [];

      if (spaceChoice === 'personal') {
        targetSpaceName = SPACE_TEMPLATES.personal.defaultName;
        targetSpaceDesc = SPACE_TEMPLATES.personal.defaultDesc;
        targetSpaceIcon = SPACE_TEMPLATES.personal.defaultIcon;
        targetSpaceColor = SPACE_TEMPLATES.personal.defaultColor;
        targetCategories = SPACE_TEMPLATES.personal.categories;
      } else if (spaceChoice === 'family') {
        targetSpaceName = SPACE_TEMPLATES.family.defaultName;
        targetSpaceDesc = SPACE_TEMPLATES.family.defaultDesc;
        targetSpaceIcon = SPACE_TEMPLATES.family.defaultIcon;
        targetSpaceColor = SPACE_TEMPLATES.family.defaultColor;
        targetCategories = SPACE_TEMPLATES.family.categories;
      } else if (spaceChoice === 'work') {
        targetSpaceName = SPACE_TEMPLATES.work.defaultName;
        targetSpaceDesc = SPACE_TEMPLATES.work.defaultDesc;
        targetSpaceIcon = SPACE_TEMPLATES.work.defaultIcon;
        targetSpaceColor = SPACE_TEMPLATES.work.defaultColor;
        targetCategories = SPACE_TEMPLATES.work.categories;
      } else if (spaceChoice === 'custom') {
        targetSpaceName = customSpaceName.trim();
        targetSpaceDesc = customSpaceDesc.trim();
        targetSpaceIcon = customSpaceIcon;
        targetSpaceColor = customSpaceColor;
        targetCategories = []; // Custom space has NO prefilled categories
      }

      if (!targetSpaceName) {
        setErrorMsg('Please provide a name for this space.');
        setIsSubmitting(false);
        return;
      }

      // Check if space name is already taken
      const existing = spaces.find(
        (s) => s.space_name.toLowerCase() === targetSpaceName.toLowerCase()
      );
      if (existing) {
        setErrorMsg(`A space named "${targetSpaceName}" already exists. Please choose another name.`);
        setIsSubmitting(false);
        return;
      }

      await createSpace(
        targetSpaceName,
        targetSpaceDesc || undefined,
        targetSpaceIcon,
        targetSpaceColor,
        targetCategories
      );

      onComplete();
    } catch (err: any) {
      console.error('Failed to create space:', err);
      setErrorMsg(err?.message || 'Could not create space. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 px-4 sm:px-6 py-6 sm:py-8 transition-colors duration-500">
      {/* Top Zen Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/20">
            LAD
          </div>
          <div>
            <span className="font-bold text-sm text-slate-900 dark:text-white block leading-tight">
              {t('app.title')}
            </span>
            <span className="text-[11px] text-slate-400">
              {t('createSpaceView.badge')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <button
            onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200/60 dark:border-slate-700/60 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span className="uppercase font-bold">{locale}</span>
          </button>

          {/* Close / Cancel Button */}
          <button
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title={t('createSpaceView.cancel')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl w-full mx-auto my-auto py-8">
        <motion.div
          initial={{ opacity: 0, y: 15, filter: 'blur(3px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-700/80 shadow-2xl shadow-slate-200/50 dark:shadow-none"
        >
          <div className="text-center max-w-lg mx-auto mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
              <Sparkles className="w-7 h-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('createSpaceView.title')}
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              {t('createSpaceView.subtitle')}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleCreateSpace} className="space-y-4">
            <div className="space-y-3">
              {/* Preset 1: Personal */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.99 }}
                onClick={() => setSpaceChoice('personal')}
                className={`w-full p-4 rounded-2xl border text-left flex items-start justify-between gap-4 transition-all cursor-pointer ${
                  spaceChoice === 'personal'
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/30 ring-2 ring-blue-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white/50 dark:bg-slate-900/50'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mt-0.5">
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      {t('createSpaceView.personal.title')}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t('createSpaceView.personal.desc')}
                    </div>
                  </div>
                </div>
                {spaceChoice === 'personal' && (
                  <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                )}
              </motion.button>

              {/* Preset 2: Family */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.99 }}
                onClick={() => setSpaceChoice('family')}
                className={`w-full p-4 rounded-2xl border text-left flex items-start justify-between gap-4 transition-all cursor-pointer ${
                  spaceChoice === 'family'
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/30 ring-2 ring-blue-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white/50 dark:bg-slate-900/50'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      {t('createSpaceView.family.title')}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t('createSpaceView.family.desc')}
                    </div>
                  </div>
                </div>
                {spaceChoice === 'family' && (
                  <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                )}
              </motion.button>

              {/* Preset 3: Work */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.99 }}
                onClick={() => setSpaceChoice('work')}
                className={`w-full p-4 rounded-2xl border text-left flex items-start justify-between gap-4 transition-all cursor-pointer ${
                  spaceChoice === 'work'
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/30 ring-2 ring-blue-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white/50 dark:bg-slate-900/50'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 mt-0.5">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      {t('createSpaceView.work.title')}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t('createSpaceView.work.desc')}
                    </div>
                  </div>
                </div>
                {spaceChoice === 'work' && (
                  <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                )}
              </motion.button>

              {/* Option 4: Custom Space */}
              <div
                onClick={() => setSpaceChoice('custom')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  spaceChoice === 'custom'
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/30 ring-2 ring-blue-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white/50 dark:bg-slate-900/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mt-0.5">
                      <PenTool className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {t('createSpaceView.custom.title')}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {t('createSpaceView.custom.desc')}
                      </div>
                    </div>
                  </div>
                  {spaceChoice === 'custom' && (
                    <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  )}
                </div>

                {/* Expandable Custom Form Fields */}
                <AnimatePresence>
                  {spaceChoice === 'custom' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="pt-4 mt-3 border-t border-blue-200/60 dark:border-blue-800/60 space-y-3"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {t('createSpaceView.custom.nameLabel')}{' '}
                          <span className="text-blue-500">*</span>
                        </label>
                        <input
                          type="text"
                          required={spaceChoice === 'custom'}
                          autoFocus
                          value={customSpaceName}
                          onChange={(e) => setCustomSpaceName(e.target.value)}
                          placeholder={t('createSpaceView.custom.namePlaceholder')}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>

                      {/* Icon Selector */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {t('createSpaceView.custom.iconLabel')}
                          </label>
                          <span className="text-[10px] text-slate-400">
                            {t('spaceSettings.customIconHelp')}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 p-2 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                          {SPACE_ICON_PRESETS.map((ic) => (
                            <button
                              key={ic}
                              type="button"
                              onClick={() => setCustomSpaceIcon(ic)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                customSpaceIcon === ic
                                  ? 'bg-white dark:bg-slate-700 shadow-md ring-2 ring-blue-500 scale-110 text-blue-600 dark:text-blue-400'
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                              }`}
                            >
                              <ModernIcon name={ic} className="w-4 h-4" />
                            </button>
                          ))}
                        </div>

                        {/* Custom Icon / Emoji Paste Input with Live Preview */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={customSpaceIcon}
                              onChange={(e) => setCustomSpaceIcon(e.target.value)}
                              placeholder={t('spaceSettings.customIconPlaceholder')}
                              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-blue-500"
                            />
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-4 pointer-events-none text-blue-500">
                              <ModernIcon name={customSpaceIcon} className="w-4 h-4" />
                            </div>
                          </div>

                          <div className="hidden sm:flex items-center gap-1">
                            {['🚀', '🔬', '💡', '🌿', '🎨', '🛡️', '🎯', '☕', '🧠'].map((em) => (
                              <button
                                key={em}
                                type="button"
                                onClick={() => setCustomSpaceIcon(em)}
                                className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center transition-all cursor-pointer ${
                                  customSpaceIcon === em
                                    ? 'bg-blue-100 dark:bg-blue-950 ring-2 ring-blue-500 scale-110'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 opacity-80 hover:opacity-100'
                                }`}
                                title={em}
                              >
                                {em}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Color Selector */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {t('createSpaceView.custom.colorLabel')}
                        </label>
                        <div className="flex flex-wrap items-center gap-2 p-2 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                          {SPACE_COLOR_PRESETS.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setCustomSpaceColor(c.id)}
                              title={c.name}
                              style={{ backgroundColor: c.hex }}
                              className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center text-white ${
                                customSpaceColor === c.id
                                  ? 'ring-2 ring-offset-2 ring-blue-500 scale-110 shadow-sm'
                                  : 'hover:scale-105 opacity-85 hover:opacity-100'
                              }`}
                            >
                              {customSpaceColor === c.id && <CheckCircle2 className="w-4 h-4" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {t('createSpaceView.custom.descLabel')}
                        </label>
                        <input
                          type="text"
                          value={customSpaceDesc}
                          onChange={(e) => setCustomSpaceDesc(e.target.value)}
                          placeholder={t('createSpaceView.custom.descPlaceholder')}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="pt-6 flex items-center gap-3">
              <motion.button
                type="button"
                onClick={onCancel}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="py-3.5 px-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('createSpaceView.back')}</span>
              </motion.button>

              <motion.button
                type="submit"
                disabled={
                  isSubmitting ||
                  (spaceChoice === 'custom' && !customSpaceName.trim())
                }
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-3.5 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-base rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <span>
                  {isSubmitting
                    ? t('createSpaceView.creating')
                    : t('createSpaceView.createButton')}
                </span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </form>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center text-xs text-slate-400 dark:text-slate-500 py-2">
        <span>{t('app.title')} {t('app.version')}</span> &bull;{' '}
        <span>Privacy-First &bull; Offline-Capable</span>
      </footer>
    </div>
  );
};
