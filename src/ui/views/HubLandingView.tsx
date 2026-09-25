import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { AttentionCard } from '../components/AttentionCard';
import { SyncBadge } from '../components/SyncBadge';
import {
  Sparkles,
  Globe,
  Plus,
  ArrowRight,
  Settings,
  Layers,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react';
import { ModernIcon } from '../components/ModernIcon';
import { MobileDrawer } from '../components/MobileDrawer';
import { WeatherPill } from '../components/WeatherPill';
import { LADLogo } from '../components/LADLogo';
import {
  resolveSpaceIcon,
  getSpaceColorConfig,
  getSpaceCategories,
  getCategoryMeta,
} from '../../core/theme/space-identity';

interface HubLandingViewProps {
  onOpenHomeDashboard: () => void;
  onSelectTopic: (topicId: string) => void;
  onOpenCapture: () => void;
  onOpenSpaceManager: () => void;
  onOpenCreateSpace?: () => void;
  onOpenSettings: () => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};



export const HubLandingView: React.FC<HubLandingViewProps> = ({
  onOpenHomeDashboard,
  onSelectTopic,
  onOpenCapture,
  onOpenSpaceManager,
  onOpenCreateSpace,
  onOpenSettings,
}) => {
  const { t, locale, setLocale } = useI18n();
  const {
    userRegistry,
    spaces,
    activeSpaceId,
    activeManifest,
    switchSpace,
    activeAlerts,
    objects,
    syncState,
    triggerSync,
  } = useLAD();
  const userName = userRegistry?.identities[0]?.display_name || 'Friend';
  const spaceName = activeManifest?.space_name || 'Personal';
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const currentSpaceIndex = Math.max(
    0,
    spaces.findIndex((s) => s.space_id === activeSpaceId)
  );

  const handlePrevSpace = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (spaces.length <= 1) return;
    const prevIdx = (currentSpaceIndex - 1 + spaces.length) % spaces.length;
    switchSpace(spaces[prevIdx].space_id);
  };

  const handleNextSpace = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (spaces.length <= 1) return;
    const nextIdx = (currentSpaceIndex + 1) % spaces.length;
    switchSpace(spaces[nextIdx].space_id);
  };

  const effectiveSpaceId = activeSpaceId || activeManifest?.space_id;
  const spaceObjects = useMemo(() => {
    if (!effectiveSpaceId) return objects;
    return objects.filter((o) => !o.space_id || o.space_id === effectiveSpaceId);
  }, [objects, effectiveSpaceId]);

  const previewCards = useMemo(() => {
    return spaceObjects
      .filter((o) => o.status !== 'archived')
      .sort((a, b) => {
        const aFollowup = Boolean(a.attributes?.needs_followup || a.attributes?.followup?.date);
        const bFollowup = Boolean(b.attributes?.needs_followup || b.attributes?.followup?.date);
        if (aFollowup && !bFollowup) return -1;
        if (!aFollowup && bFollowup) return 1;

        const aCompleted = a.status === 'completed';
        const bCompleted = b.status === 'completed';
        if (!aCompleted && bCompleted) return -1;
        if (aCompleted && !bCompleted) return 1;

        if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
        if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;

        // Oldest items surface first so they don't get neglected
        const aDate = new Date(a.last_checked_at || a.created_at).getTime();
        const bDate = new Date(b.last_checked_at || b.created_at).getTime();
        return aDate - bDate;
      })
      .slice(0, 3);
  }, [spaceObjects]);

  const activeSpaceCategories = useMemo(() => {
    return getSpaceCategories(activeManifest, spaceObjects);
  }, [activeManifest, spaceObjects]);

  const getTopicIcon = (domain: string) => {
    return <ModernIcon name={domain} className="w-4 h-4 text-white/90 shrink-0" />;
  };

  const hour = new Date().getHours();
  const getGreeting = () => {
    if (hour >= 5 && hour < 12) return t('hub.greetingMorning', { name: userName });
    if (hour >= 12 && hour < 18) return t('hub.greetingAfternoon', { name: userName });
    return t('hub.greetingEvening', { name: userName });
  };

  const formattedDate = new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const topAlerts = activeAlerts.slice(0, 3);
  const activeIcon = resolveSpaceIcon(activeManifest?.icon, spaceName);
  const activeColorCfg = getSpaceColorConfig(activeManifest?.color);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-between bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500">
      {/* Ambient Visual Atmosphere Layers */}
      <div className="absolute inset-0 bg-mesh-pattern bg-radial-vignette pointer-events-none opacity-60 dark:opacity-40" />
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-br from-blue-400/15 to-indigo-500/10 dark:from-blue-600/10 dark:to-indigo-500/15 blur-[120px] pointer-events-none animate-calm-glow" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 rounded-full bg-gradient-to-bl from-teal-400/15 to-blue-500/10 dark:from-teal-600/10 dark:to-purple-600/15 blur-[140px] pointer-events-none animate-calm-glow" />

      <div className="relative z-10 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 flex-1 flex flex-col justify-between">
        {/* 1. Zen Minimalist Top Bar — Fully Responsive on Mobile */}
        <header className="flex items-center justify-between gap-2.5 pb-4 sm:pb-8">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <LADLogo size={42} className="shrink-0 shadow-md" />
            <div className="min-w-0">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white block leading-tight truncate">
                {t('app.title')}
              </span>
              <div className="hidden xs:flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium capitalize mt-0.5 truncate">
                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{formattedDate}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Desktop Only: Full Sync Badge */}
            <div className="hidden md:block">
              <SyncBadge syncState={syncState} onSyncClick={triggerSync} />
            </div>

            {/* Desktop Only: Language Switcher */}
            <button
              onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-200/80 dark:border-slate-700/80 shadow-xs cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span className="uppercase font-bold">{locale}</span>
            </button>

            {/* Desktop Only: Settings Button */}
            <button
              onClick={onOpenSettings}
              className="hidden sm:flex p-2 text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-200/80 dark:border-slate-700/80 shadow-xs cursor-pointer"
              title={t('nav.settings')}
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Quick Action Button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenCapture}
              style={{ background: 'linear-gradient(to right, var(--color-primary), var(--color-accent))' }}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">{t('capture.quickCapture')}</span>
            </motion.button>

            {/* Mobile Menu Drawer Button (Visible on mobile screens) */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="sm:hidden p-2 text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md hover:bg-white dark:hover:bg-slate-700 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs cursor-pointer flex items-center justify-center relative"
              title="Open Navigation Menu"
            >
              <Menu className="w-4 h-4" />
              {syncState.status !== 'synced' && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          </div>
        </header>

        {/* 2. Main Zen Content */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-5 sm:space-y-8 my-auto py-2"
        >
          {/* Live IP Weather / Temperature & Welcome Heading */}
          <motion.div variants={itemVariants} className="text-center max-w-2xl mx-auto space-y-2">
            <WeatherPill />

            <h1 className="text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {getGreeting()}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-base max-w-xl mx-auto font-medium">
              {t('hub.spacePrompt')}
            </p>
          </motion.div>

          {/* Top Attention Items (if present) */}
          {topAlerts.length > 0 && (
            <motion.div variants={itemVariants} className="max-w-4xl mx-auto w-full space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  {t('hub.attentionHeader')}
                </h2>
                <span className="text-xs font-medium text-slate-400">
                  {topAlerts.length} {t('common.actions').toLowerCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {topAlerts.map((alert) => (
                  <AttentionCard key={alert.alert_id} alert={alert} />
                ))}
              </div>
            </motion.div>
          )}

          {/* The Two Grand Doorway Cards */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto w-full"
          >
            {/* Doorway 1: Space Home Dashboard (Interactive Space Carousel with Live Card Previews) */}
            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              style={{
                background:
                  'linear-gradient(135deg, var(--doorway-gradient-from) 0%, var(--doorway-gradient-via) 60%, var(--doorway-gradient-to) 100%)',
                boxShadow: `0 25px 50px -15px ${activeColorCfg.twGlow}`,
              }}
              className="group relative rounded-3xl p-5 sm:p-8 overflow-hidden text-white flex flex-col justify-between transition-all cursor-pointer border-t border-l border-white/25 border-r-0 border-b-0 backdrop-blur-3xl"
              onClick={onOpenHomeDashboard}
            >
              {/* Internal Abstract Architectural Mesh Pattern & Large Blurred Ambient Icon */}
              <div className="absolute inset-0 bg-grid-lines opacity-15 pointer-events-none" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={`ambient_icon_${activeSpaceId}`}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 0.15, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="absolute -right-6 -bottom-8 w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center filter blur-[6px] select-none pointer-events-none transform rotate-12 text-white"
                >
                  <ModernIcon name={activeIcon} className="w-full h-full" strokeWidth={1} />
                </motion.div>
              </AnimatePresence>
              <div className="absolute -right-12 -bottom-12 w-60 h-60 bg-white/10 rounded-full blur-3xl pointer-events-none animate-calm-glow" />

              <div className="space-y-4 relative z-10">
                {/* Header: Space Icon + Status on left, Carousel Switcher on right */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <motion.div
                      key={`icon_box_${activeSpaceId}`}
                      initial={{ scale: 0.9, opacity: 0.7 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.25 }}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner shrink-0"
                    >
                      <ModernIcon name={activeIcon} className="w-5 h-5 text-white" />
                    </motion.div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-white/90 shrink-0">
                      <span
                        style={{ backgroundColor: activeColorCfg.hex }}
                        className="w-2 h-2 rounded-full animate-pulse shrink-0"
                      />
                      <span>{spaces.length > 1 ? `${currentSpaceIndex + 1} / ${spaces.length}` : t('spaces.currentSpace')}</span>
                    </div>
                  </div>

                  {/* Carousel Left/Right Space Switcher & Add Space */}
                  <div
                    className="flex items-center gap-1 p-1 bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {spaces.length > 1 && (
                      <>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={handlePrevSpace}
                          className="p-1.5 hover:bg-white/15 text-white/70 hover:text-white rounded-xl transition-all cursor-pointer"
                          title={t('hub.spaceNavPrev')}
                        >
                          <ChevronLeft className="w-4 h-4 opacity-75 hover:opacity-100" />
                        </motion.button>

                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={handleNextSpace}
                          className="p-1.5 hover:bg-white/15 text-white/70 hover:text-white rounded-xl transition-all cursor-pointer"
                          title={t('hub.spaceNavNext')}
                        >
                          <ChevronRight className="w-4 h-4 opacity-75 hover:opacity-100" />
                        </motion.button>

                        <div className="w-[1px] h-3 bg-white/15 mx-0.5" />
                      </>
                    )}

                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        if (onOpenCreateSpace) {
                          onOpenCreateSpace();
                        } else {
                          onOpenSpaceManager();
                        }
                      }}
                      className="p-1.5 hover:bg-white/15 text-white/70 hover:text-white rounded-xl transition-all cursor-pointer flex items-center gap-1"
                      title={t('spaces.createNew')}
                    >
                      <Plus className="w-4 h-4 opacity-75 hover:opacity-100" />
                    </motion.button>
                  </div>
                </div>

                {/* Space Title: Full Width, Naturally Wrapping, Prominent Typography */}
                <div className="pt-0.5">
                  <motion.h2
                    key={`name_${activeSpaceId}`}
                    initial={{ opacity: 0.7, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white leading-tight break-words"
                  >
                    {spaceName}
                  </motion.h2>
                </div>

                {/* Space Description */}
                <motion.div
                  key={`desc_${activeSpaceId}`}
                  initial={{ opacity: 0.7 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="text-white/85 text-xs sm:text-sm leading-relaxed line-clamp-2">
                    {activeManifest?.description ||
                      (activeManifest?.space_name?.toLowerCase().includes('fam')
                        ? t('onboarding.step2.family.desc')
                        : activeManifest?.space_name?.toLowerCase().includes('work') || activeManifest?.space_name?.toLowerCase().includes('trab')
                        ? t('onboarding.step2.work.desc')
                        : t('onboarding.step2.personal.desc'))}
                  </p>
                </motion.div>

                {/* Live Card Previews in Selected Space */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-white/70">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-white/90" />
                      {t('hub.recentItems')}
                    </span>
                  </div>

                  <AnimatePresence mode="wait">
                    {previewCards.length > 0 ? (
                      <motion.div
                        key={`cards_${activeSpaceId}`}
                        initial={{ opacity: 0.7, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0.7, y: -3 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2"
                      >
                        {previewCards.map((obj) => (
                          <motion.div
                            key={obj.object_id}
                            whileHover={{ x: 3 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenHomeDashboard();
                            }}
                            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 flex items-center justify-between gap-2.5 transition-all shadow-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {getTopicIcon(obj.domain)}
                              <span className="text-xs font-bold text-white truncate">
                                {obj.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                              {obj.priority === 'urgent' && (
                                <span className="px-1.5 py-0.5 rounded-full bg-rose-500/80 text-white font-bold text-[9px] border border-rose-300/40">
                                  Urgent
                                </span>
                              )}
                              {obj.attributes?.balance !== undefined && (
                                <span className="font-bold text-emerald-200 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-400/30">
                                  ${Number(obj.attributes.balance).toLocaleString()}
                                </span>
                              )}
                              {obj.due_date && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 text-white/90 font-medium">
                                  <Calendar className="w-2.5 h-2.5" />
                                  <span>{obj.due_date}</span>
                                </span>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div
                        key={`empty_${activeSpaceId}`}
                        initial={{ opacity: 0.7 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0.7 }}
                        transition={{ duration: 0.2 }}
                        className="p-4 rounded-xl bg-white/10 border border-white/10 text-center space-y-1"
                      >
                        <p className="text-xs text-white/80 font-medium">
                          {t('hub.noItemsInSpace')}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-white/10 text-white">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-white/90 font-medium">
                    {t('spaces.objectsCount', { count: spaceObjects.length })}
                  </span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenHomeDashboard();
                  }}
                  className="px-4 py-2 bg-white font-bold text-xs rounded-xl shadow-lg shadow-black/20 flex items-center gap-2 transition-all cursor-pointer"
                  style={{ color: 'var(--color-primary-dark)' }}
                >
                  <span>{t('hub.openDashboard')}</span>
                  <ArrowRight className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                </motion.button>
              </div>
            </motion.div>

            {/* Doorway 2: Explore by Topic (Seamless Frosted Glass Canvas) */}
            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className="relative rounded-3xl p-5 sm:p-8 backdrop-blur-2xl bg-gradient-to-b from-white/60 via-white/30 to-white/15 dark:from-slate-900/60 dark:via-slate-900/30 dark:to-slate-950/20 border-t border-l border-white/50 dark:border-white/10 border-r-0 border-b-0 flex flex-col justify-between transition-all"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-blue-100/60 dark:from-indigo-950/80 dark:to-slate-800/60 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/40 dark:border-white/10 shrink-0">
                    <ModernIcon name="boxes" className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t('hub.categoriesCount', { count: activeSpaceCategories.length })}
                  </span>
                </div>

                <div>
                  <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {t('hub.doorwayTopicTitle')}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed">
                    {t('hub.doorwayTopicDesc')}
                  </p>
                </div>

                {/* Quick Topic Buttons Grid (Jewel Cards) or Empty State */}
                {activeSpaceCategories.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 pt-1">
                    {activeSpaceCategories.map((catId) => {
                      const catMeta = getCategoryMeta(catId);
                      const topicCount = spaceObjects.filter((o) => o.domain === catId).length;
                      const shortDomainKey = `capture.domains.${catId}`;
                      const hasShortDomain = ['health', 'finances', 'documents', 'shopping', 'home', 'projects', 'general'].includes(catId.toLowerCase());
                      const displayLabel = hasShortDomain
                        ? t(shortDomainKey)
                        : (catMeta.labelKey ? t(catMeta.labelKey) : (catMeta.label || catId));

                      return (
                        <motion.button
                          key={catId}
                          whileHover={{ y: -2, scale: 1.02 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => onSelectTopic(catId)}
                          className={`p-2.5 sm:p-3 rounded-2xl border bg-gradient-to-br ${catMeta.color} transition-all text-left flex flex-col justify-between gap-2 shadow-xs cursor-pointer min-h-[72px] sm:min-h-[78px]`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="p-1.5 sm:p-2 rounded-xl bg-white/70 dark:bg-slate-800/70 shadow-xs border border-white/40 dark:border-white/10">
                              <ModernIcon name={catMeta.iconName} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                            <span
                              className={`text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full ${catMeta.badgeBg}`}
                            >
                              {topicCount}
                            </span>
                          </div>
                          <div className="min-w-0 w-full">
                            <span className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-white leading-tight block break-words line-clamp-2">
                              {displayLabel}
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 px-4 rounded-2xl border border-dashed border-slate-200/80 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/30 text-center space-y-2 mt-2">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <ModernIcon name="boxes" className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xs mx-auto">
                      {t('hub.noCategoriesInSpace')}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-medium text-slate-400">
                  {t('hub.selectTopicPrompt')}
                </span>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onOpenCapture}
                  className="px-3 sm:px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{t('capture.quickCapture')}</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* 3. Minimalist Zen Footer */}
        <footer className="pt-6 sm:pt-8 text-center text-xs text-slate-400 dark:text-slate-500 flex flex-wrap items-center justify-center gap-2 sm:gap-4">
          <span className="font-semibold">{t('app.title')} {t('app.version')}</span>
          <span>&bull;</span>
          <span>100% Offline-First</span>
        </footer>
      </div>

      {/* Mobile Menu Action Sheet & Drawer */}
      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        onOpenSpaceManager={onOpenSpaceManager}
        onOpenCreateSpace={onOpenCreateSpace}
        onOpenSettings={onOpenSettings}
        onOpenCapture={onOpenCapture}
      />
    </div>
  );
};
