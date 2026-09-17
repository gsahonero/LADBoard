import React, { useState } from 'react';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { SyncBadge } from './SyncBadge';
import { Plus, Globe, ChevronDown, Sparkles, Menu } from 'lucide-react';
import { resolveSpaceIcon, getSpaceColorConfig } from '../../core/theme/space-identity';
import { ModernIcon } from './ModernIcon';
import { MobileDrawer } from './MobileDrawer';
import { LADLogo } from './LADLogo';

export const Header: React.FC<{
  onOpenCapture: () => void;
  onOpenSpaceManager: () => void;
  onOpenCreateSpace?: () => void;
  onOpenSettings?: () => void;
  onGoToHub?: () => void;
}> = ({ onOpenCapture, onOpenSpaceManager, onOpenCreateSpace, onOpenSettings, onGoToHub }) => {
  const { activeManifest, syncState, triggerSync, spaces, switchSpace } = useLAD();
  const { locale, setLocale, t } = useI18n();
  const [spaceDropdownOpen, setSpaceDropdownOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const activeIcon = resolveSpaceIcon(activeManifest?.icon, activeManifest?.space_name);
  const activeColorCfg = getSpaceColorConfig(activeManifest?.color);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-2 sm:py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: App Logo & Space Selector */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={onGoToHub}
              className="flex items-center gap-2.5 hover:opacity-90 transition-opacity text-left cursor-pointer shrink-0"
              title="Return to Main Hub"
            >
              <LADLogo size={32} className="shrink-0 shadow-xs" />
              <div className="hidden md:block">
                <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                  {t('app.title')}
                  <span
                    style={{
                      backgroundColor: 'var(--color-primary-light)',
                      color: 'var(--color-primary-dark)',
                    }}
                    className="text-[10px] px-1.5 py-0.2 rounded font-semibold"
                  >
                    {t('app.version')}
                  </span>
                </h1>
              </div>
            </button>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-0.5 sm:mx-1 hidden md:block" />

            {/* Space Dropdown */}
            <div className="relative min-w-0">
              <button
                onClick={() => setSpaceDropdownOpen(!spaceDropdownOpen)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer min-w-0"
              >
                <ModernIcon name={activeIcon} className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200 shrink-0" />
                <span className="max-w-[100px] xs:max-w-[140px] sm:max-w-[180px] truncate">
                  {activeManifest?.space_name || t('spaces.currentSpace')}
                </span>
                <span
                  style={{ backgroundColor: activeColorCfg.hex }}
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                />
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {spaceDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setSpaceDropdownOpen(false)}
                  />
                  <div className="absolute left-0 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {t('spaces.title')}
                    </div>
                    {spaces.map((s) => {
                      const sIcon = resolveSpaceIcon(s.icon, s.space_name);
                      const sColorCfg = getSpaceColorConfig(s.color);
                      const isCurrent = s.space_id === activeManifest?.space_id;

                      return (
                        <button
                          key={s.space_id}
                          onClick={() => {
                            switchSpace(s.space_id);
                            setSpaceDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-lad-50 dark:bg-lad-950/50 text-lad-700 dark:text-lad-300 font-semibold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <ModernIcon name={sIcon} className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{s.space_name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              style={{ backgroundColor: sColorCfg.hex }}
                              className="w-2 h-2 rounded-full"
                            />
                            <span className="text-[10px] text-slate-400 uppercase">{s.role}</span>
                          </div>
                        </button>
                      );
                    })}
                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                    <button
                      onClick={() => {
                        setSpaceDropdownOpen(false);
                        if (onOpenCreateSpace) {
                          onOpenCreateSpace();
                        } else {
                          onOpenSpaceManager();
                        }
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-lad-600 dark:text-lad-400 hover:bg-lad-50 dark:hover:bg-lad-950/30 rounded-lg font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t('spaces.createNew')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Quick Capture, Sync Status, Language Switcher & Mobile Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Desktop Only: Sync Badge */}
            <div className="hidden sm:block">
              <SyncBadge syncState={syncState} onSyncClick={triggerSync} />
            </div>

            {/* Desktop Only: Language Switch */}
            <button
              onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
              title="Switch Language (English / Español)"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span className="uppercase font-bold">{locale}</span>
            </button>

            {/* Quick Capture Button */}
            <button
              onClick={onOpenCapture}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-lad-600 hover:bg-lad-700 active:scale-95 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">{t('capture.quickCapture')}</span>
            </button>

            {/* Mobile Menu Drawer Button */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="sm:hidden p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        onOpenSpaceManager={onOpenSpaceManager}
        onOpenCreateSpace={onOpenCreateSpace}
        onOpenSettings={onOpenSettings || onOpenSpaceManager}
        onOpenCapture={onOpenCapture}
      />
    </>
  );
};

