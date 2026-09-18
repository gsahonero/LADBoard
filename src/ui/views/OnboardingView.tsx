import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import {
  User,
  Mail,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Globe,
  Home,
  Users,
  Briefcase,
  PenTool,
  CheckCircle2,
  CloudDownload,
} from 'lucide-react';

import {
  SPACE_ICON_PRESETS,
  SPACE_COLOR_PRESETS,
  SPACE_TEMPLATES,
} from '../../core/theme/space-identity';
import { ModernIcon } from '../components/ModernIcon';

interface OnboardingViewProps {
  onComplete: () => void;
}

type SpaceChoice = 'personal' | 'family' | 'work' | 'custom';

const stepVariants: Variants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 30 : -30,
    filter: 'blur(3px)',
  }),
  animate: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -30 : 30,
    filter: 'blur(2px)',
    transition: {
      duration: 0.25,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const { t, locale, setLocale } = useI18n();
  const { userRegistry, updateProfile, createSpace, updateSpaceIdentity, spaces, restoreFromGoogleDrive } = useLAD();

  const [step, setStep] = useState<1 | 2>(1);
  const [direction, setDirection] = useState<number>(1);

  // Step 1: User Identity
  const [name, setName] = useState(
    userRegistry?.identities[0]?.display_name &&
      userRegistry.identities[0].display_name !== 'LAD User'
      ? userRegistry.identities[0].display_name
      : ''
  );
  const [email, setEmail] = useState(
    userRegistry?.identities[0]?.email &&
      !userRegistry.identities[0].email.endsWith('@ladboard.local')
      ? userRegistry.identities[0].email
      : ''
  );

  // Step 2: First Space Choice
  const [spaceChoice, setSpaceChoice] = useState<SpaceChoice>('personal');
  const [customSpaceName, setCustomSpaceName] = useState('');
  const [customSpaceIcon, setCustomSpaceIcon] = useState('palette');
  const [customSpaceColor, setCustomSpaceColor] = useState('purple');
  const [customSpaceDesc, setCustomSpaceDesc] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRestoreFromGoogleDrive = async () => {
    setIsRestoring(true);
    setErrorMsg('');
    try {
      const res = await restoreFromGoogleDrive();
      if (res.success) {
        onComplete();
      } else if (res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to restore from Google Drive.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter your name or preferred display name.');
      return;
    }
    setErrorMsg('');
    setDirection(1);
    setStep(2);
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    setDirection(-1);
    setStep(1);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const finalName = name.trim() || 'Alex';
      await updateProfile(finalName, email.trim() || undefined);

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
        targetSpaceName = customSpaceName.trim() || 'My Workspace';
        targetSpaceDesc = customSpaceDesc.trim() || 'Custom space in LAD Board';
        targetSpaceIcon = customSpaceIcon;
        targetSpaceColor = customSpaceColor;
        targetCategories = []; // Custom space has NO prefilled categories
      }

      // If user has only the default initial space, customize that space cleanly
      if (spaces.length <= 1 && spaces[0]) {
        await updateSpaceIdentity(spaces[0].space_id, {
          space_name: targetSpaceName,
          description: targetSpaceDesc,
          icon: targetSpaceIcon,
          color: targetSpaceColor,
          categories: targetCategories,
        });
      } else {
        const existing = spaces.find(
          (s) => s.space_name.toLowerCase() === targetSpaceName.toLowerCase()
        );
        if (!existing) {
          await createSpace(
            targetSpaceName,
            targetSpaceDesc,
            targetSpaceIcon,
            targetSpaceColor,
            targetCategories
          );
        }
      }

      localStorage.setItem('lad_onboarded', 'true');
      onComplete();
    } catch (err: any) {
      console.error('Failed to complete onboarding:', err);
      setErrorMsg(err?.message || 'Could not complete onboarding. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 px-4 sm:px-6 py-6 sm:py-8 transition-colors duration-500">
      {/* Top Zen Navigation Bar */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/20">
            LAD
          </div>
          <div>
            <span className="font-bold text-sm text-slate-900 dark:text-white block leading-tight">
              {t('app.title')}
            </span>
            <span className="text-[11px] text-slate-400">Living Active Dynamic Board</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Step Indicator Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
            <span
              className={`w-2 h-2 rounded-full ${
                step === 1 ? 'bg-blue-600 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            {step === 1 ? t('onboarding.step1.badge') : t('onboarding.step2.badge')}
          </div>

          {/* Language Switcher */}
          <button
            onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200/60 dark:border-slate-700/60"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span className="uppercase">{locale}</span>
          </button>
        </div>
      </header>

      {/* Main Full-Page Step Container */}
      <main className="max-w-2xl w-full mx-auto my-auto py-8">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 1 ? (
            /* STEP 1: Identification & Profile */
            <motion.div
              key="step1"
              custom={direction}
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-700/80 shadow-2xl shadow-slate-200/50 dark:shadow-none"
            >
              <div className="text-center max-w-lg mx-auto mb-8">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800"
                >
                  <Sparkles className="w-7 h-7" />
                </motion.div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {t('onboarding.step1.title')}
                </h1>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {t('onboarding.step1.subtitle')}
                </p>
              </div>

              {errorMsg && (
                <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleNextStep} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    {t('onboarding.step1.nameLabel')}{' '}
                    <span className="text-blue-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('onboarding.step1.namePlaceholder')}
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    {t('onboarding.step1.emailLabel')}
                  </label>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
                    {t('onboarding.step1.emailHint')}
                  </p>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('onboarding.step1.emailPlaceholder')}
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-base rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>{t('onboarding.step1.continueButton')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </form>

              {/* Already used LAD Board flow for cross-device restore */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white/90 dark:bg-slate-800/90 px-3 text-slate-400 font-semibold tracking-wider">
                    {t('onboarding.alreadyUsedDivider')}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {t('onboarding.alreadyUsedPrompt')}
                </p>
                <button
                  type="button"
                  data-testid="restore-from-gdrive-btn"
                  onClick={handleRestoreFromGoogleDrive}
                  disabled={isRestoring || isSubmitting}
                  className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm rounded-2xl border border-slate-200/80 dark:border-slate-600/80 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <CloudDownload className={`w-4 h-4 text-blue-500 ${isRestoring ? 'animate-bounce' : ''}`} />
                  <span>
                    {isRestoring ? t('onboarding.restoring') : t('onboarding.restoreFromDrive')}
                  </span>
                </button>
              </div>
            </motion.div>
          ) : (
            /* STEP 2: First Space Creation */
            <motion.div
              key="step2"
              custom={direction}
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-700/80 shadow-2xl shadow-slate-200/50 dark:shadow-none"
            >
              <div className="text-center max-w-lg mx-auto mb-8">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                  <Home className="w-7 h-7" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {t('onboarding.step2.title')}
                </h1>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {t('onboarding.step2.subtitle')}
                </p>
              </div>

              {errorMsg && (
                <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleFinalSubmit} className="space-y-4">
                <div className="space-y-3">
                  {/* Preset 1: Personal */}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSpaceChoice('personal')}
                    className={`w-full p-4 rounded-2xl border text-left flex items-start justify-between gap-4 transition-all ${
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
                          {t('onboarding.step2.personal.title')}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {t('onboarding.step2.personal.desc')}
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
                    className={`w-full p-4 rounded-2xl border text-left flex items-start justify-between gap-4 transition-all ${
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
                          {t('onboarding.step2.family.title')}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {t('onboarding.step2.family.desc')}
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
                    className={`w-full p-4 rounded-2xl border text-left flex items-start justify-between gap-4 transition-all ${
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
                          {t('onboarding.step2.work.title')}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {t('onboarding.step2.work.desc')}
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
                            {t('onboarding.step2.custom.title')}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {t('onboarding.step2.custom.desc')}
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
                              {t('onboarding.step2.custom.nameLabel')}{' '}
                              <span className="text-blue-500">*</span>
                            </label>
                            <input
                              type="text"
                              required={spaceChoice === 'custom'}
                              autoFocus
                              value={customSpaceName}
                              onChange={(e) => setCustomSpaceName(e.target.value)}
                              placeholder={t('onboarding.step2.custom.namePlaceholder')}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                          </div>

                          {/* Icon Selector */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Icon
                            </label>
                            <div className="flex flex-wrap gap-1.5 p-2 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                              {SPACE_ICON_PRESETS.slice(0, 12).map((ic) => (
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
                          </div>

                          {/* Color Selector */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Color Accent
                            </label>
                            <div className="flex flex-wrap items-center gap-2 p-2 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                              {SPACE_COLOR_PRESETS.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => setCustomSpaceColor(c.id)}
                                  title={c.name}
                                  style={{ backgroundColor: c.hex }}
                                  className={`w-6 h-6 rounded-full transition-transform cursor-pointer flex items-center justify-center text-white ${
                                    customSpaceColor === c.id
                                      ? 'ring-2 ring-offset-2 ring-blue-500 scale-110 shadow-sm'
                                      : 'hover:scale-105 opacity-85 hover:opacity-100'
                                  }`}
                                >
                                  {customSpaceColor === c.id && <CheckCircle2 className="w-3.5 h-3.5" />}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              {t('onboarding.step2.custom.descLabel')}
                            </label>
                            <input
                              type="text"
                              value={customSpaceDesc}
                              onChange={(e) => setCustomSpaceDesc(e.target.value)}
                              placeholder={t('onboarding.step2.custom.descPlaceholder')}
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
                    onClick={handlePrevStep}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="py-3.5 px-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{t('onboarding.step2.backButton')}</span>
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
                        ? t('onboarding.step2.creating')
                        : t('onboarding.step2.finishButton')}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center text-xs text-slate-400 dark:text-slate-500 py-2">
        <span>{t('app.title')} {t('app.version')}</span> &bull;{' '}
        <span>Privacy-First &bull; Offline-Capable</span>
      </footer>
    </div>
  );
};
