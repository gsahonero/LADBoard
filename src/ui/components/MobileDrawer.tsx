import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { useNavigationGuard } from '../context/NavigationGuardContext';
import { SyncBadge } from './SyncBadge';
import { ModernIcon } from './ModernIcon';
import { resolveSpaceIcon, getSpaceColorConfig } from '../../core/theme/space-identity';
import {
  X,
  Globe,
  Settings,
  Plus,
  ArrowRight,
  HardDrive,
  Sparkles,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSpaceManager: () => void;
  onOpenCreateSpace?: () => void;
  onOpenSettings: () => void;
  onOpenCapture: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  onOpenSpaceManager,
  onOpenCreateSpace,
  onOpenSettings,
  onOpenCapture,
}) => {
  const {
    activeManifest,
    spaces,
    switchSpace,
    syncState,
    triggerSync,
    userRegistry,
    objects,
  } = useLAD();
  const { confirmNavigation } = useNavigationGuard();
  const { locale, setLocale, t } = useI18n();

  const activeIcon = resolveSpaceIcon(activeManifest?.icon, activeManifest?.space_name);
  const activeColorCfg = getSpaceColorConfig(activeManifest?.color);
  const userEmail = userRegistry?.identities[0]?.email;
  const isGoogleConnected = userEmail && !userEmail.endsWith('@ladboard.local');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Drawer Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col z-10"
          >
            {/* Grab Handle for mobile touch */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>

            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-sm"
                >
                  LAD
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {t('app.title')}
                  </h2>
                  <p className="text-[10px] text-slate-400">
                    {t('app.version')} &bull; 100% Offline-Capable
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* 1. Active Space Card */}
              <div
                style={{
                  background: `linear-gradient(135deg, ${activeColorCfg.hex}15, ${activeColorCfg.hex}08)`,
                  borderColor: `${activeColorCfg.hex}30`,
                }}
                className="p-4 rounded-2xl border space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      style={{
                        backgroundColor: `${activeColorCfg.hex}25`,
                        borderColor: `${activeColorCfg.hex}50`,
                        color: activeColorCfg.hex,
                      }}
                      className="w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 shadow-xs"
                    >
                      <ModernIcon name={activeIcon} className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="truncate">{activeManifest?.space_name}</span>
                        <span className="text-[9px] bg-blue-600 text-white px-2 py-0.2 rounded-full font-bold">
                          Active
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {objects.length} {t('spaces.objectsCount', { count: objects.length })}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      confirmNavigation(() => {
                        onClose();
                        onOpenSpaceManager();
                      });
                    }}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    {t('spaces.title')}
                  </button>
                </div>

                {/* Quick Space Switcher Carousel Pills */}
                {spaces.length > 1 && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      {t('spaces.switchSpace')}
                    </span>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {spaces.map((s) => {
                        const isSelected = s.space_id === activeManifest?.space_id;
                        const sIcon = resolveSpaceIcon(s.icon, s.space_name);
                        const sColorCfg = getSpaceColorConfig(s.color);
                        return (
                          <button
                            key={s.space_id}
                            onClick={() => {
                              confirmNavigation(() => {
                                switchSpace(s.space_id);
                                onClose();
                              });
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-blue-500/50 shadow-xs'
                                : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-transparent hover:bg-white'
                            }`}
                          >
                            <ModernIcon name={sIcon} className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[100px]">{s.space_name}</span>
                            <span
                              style={{ backgroundColor: sColorCfg.hex }}
                              className="w-1.5 h-1.5 rounded-full"
                            />
                          </button>
                        );
                      })}
                      {onOpenCreateSpace && (
                        <button
                          onClick={() => {
                            confirmNavigation(() => {
                              onClose();
                              onOpenCreateSpace();
                            });
                          }}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 border border-blue-200/60 dark:border-blue-800/60 flex items-center gap-1 whitespace-nowrap cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t('spaces.createNew')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Cloud Sync & Storage Tile */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Sync & Privacy</span>
                  </span>
                  <SyncBadge syncState={syncState} onSyncClick={triggerSync} />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isGoogleConnected ? 'Google Drive Synced' : 'Offline / IndexedDB'}</span>
                  </span>
                  <button
                    onClick={() => triggerSync()}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{t('sync.syncNow')}</span>
                  </button>
                </div>
              </div>

              {/* 3. Quick Actions & Preferences */}
              <div className="space-y-2">
                {/* Language Switcher */}
                <button
                  onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
                  className="w-full p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <span>{t('settings.selectLanguage')}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-bold uppercase text-slate-700 dark:text-slate-200">
                    {locale === 'en' ? 'English (EN)' : 'Español (ES)'}
                  </span>
                </button>

                {/* Settings View */}
                <button
                  onClick={() => {
                    confirmNavigation(() => {
                      onClose();
                      onOpenSettings();
                    });
                  }}
                  className="w-full p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>{t('settings.title')}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* Quick Capture Button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onClose();
                    onOpenCapture();
                  }}
                  style={{ background: 'linear-gradient(to right, var(--color-primary), var(--color-accent))' }}
                  className="w-full p-3.5 text-white font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{t('capture.quickCapture')}</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
