import React, { useState, useEffect } from 'react';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { DEFAULT_GDRIVE_CLIENT_ID } from '../../core/standard/constants';
import { PaletteManager, PaletteId } from '../../core/theme/palette-manager';
import { CognitivePalettePicker } from '../components/CognitivePalettePicker';
import {
  Settings,
  User,
  Clock,
  Globe,
  Check,
  Palette,
  Sliders,
  Radio,
  ShieldCheck,
} from 'lucide-react';

interface GlobalSettingsViewProps {
  onSwitchToSpace?: () => void;
}

export const GlobalSettingsView: React.FC<GlobalSettingsViewProps> = ({ onSwitchToSpace }) => {
  const { userRegistry, updatePreferences, updateProfile, connectGoogleDrive, authService, activeManifest } = useLAD();
  const { locale, setLocale, t } = useI18n();

  const [currentPalette, setCurrentPalette] = useState<PaletteId>(() => PaletteManager.getInitialPalette());
  const [displayName, setDisplayName] = useState(
    userRegistry?.identities?.[0]?.display_name || 'Owner'
  );
  const [threshold, setThreshold] = useState(
    (userRegistry?.preferences.change_commit_threshold_ms || 5000) / 1000
  );
  const [activeInterval, setActiveInterval] = useState(
    (userRegistry?.preferences.active_evaluation_interval_ms || 30000) / 1000
  );
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    PaletteManager.applyPalette(currentPalette);
  }, [currentPalette]);

  useEffect(() => {
    if (userRegistry?.identities?.[0]?.display_name) {
      setDisplayName(userRegistry.identities[0].display_name);
    }
  }, [userRegistry?.identities]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    if (displayName.trim()) {
      await updateProfile(displayName.trim());
    }
    await updatePreferences({
      locale,
      change_commit_threshold_ms: threshold * 1000,
      active_evaluation_interval_ms: activeInterval * 1000,
      palette_theme: currentPalette,
    });
    setIsSaving(false);
    setSuccessMsg(t('settings.savedSuccess'));
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleConnectGoogle = async () => {
    try {
      await connectGoogleDrive(DEFAULT_GDRIVE_CLIENT_ID);
      setSuccessMsg('Connected to Google Account successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(`Google Auth failed: ${err.message}`);
    }
  };

  const auth = authService.getState();

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Top Scope Switcher: Space Settings vs Global Settings */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 w-fit shadow-xs">
          {activeManifest && (
            <button
              onClick={onSwitchToSpace}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer flex items-center gap-2"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('settings.tabSpace')}</span>
            </button>
          )}
          <button
            className="px-4 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/70 dark:border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-lad-500" />
            <span>{t('settings.tabGlobal')}</span>
          </button>
        </div>

        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-lad-500" />
          <span>System & Account Configuration</span>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-lad-500" />
          {t('settings.title')}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs font-semibold flex items-center gap-2.5 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. Identity & Profile Section */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <User className="w-4 h-4 text-lad-500" />
          {t('settings.identitySection')}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1.5">
              {t('settings.displayName')}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-lad-500"
              placeholder="e.g. Patty, Alex..."
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1.5">
              {t('settings.userId')}
            </label>
            <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 truncate">
              {userRegistry?.user_id}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1.5">
              {t('settings.googleAuth')}
            </label>
            <div className="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[42px]">
              <span className="text-xs text-slate-700 dark:text-slate-300 px-2 truncate">
                {auth.isAuthenticated && auth.user?.email
                  ? t('settings.connectedAs', { email: auth.user.email })
                  : t('settings.notConnected')}
              </span>
              {auth.isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => authService.signOut()}
                  className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  {t('settings.signOut')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  className="px-3 py-1 text-[11px] font-bold bg-lad-600 text-white rounded-lg hover:bg-lad-700 transition-colors cursor-pointer shrink-0"
                >
                  {t('settings.signInGoogle')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Operational Timing & 5-Second Commit Threshold */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          {t('settings.timingSection')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>{t('settings.commitThreshold')}</span>
              <span className="text-lad-600 font-bold">{threshold}s</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
              className="w-full accent-lad-600"
            />
            <p className="text-[11px] text-slate-400">
              {t('settings.commitThresholdDesc')}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>{t('settings.activeInterval')}</span>
              <span className="text-lad-600 font-bold">{activeInterval}s</span>
            </div>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={activeInterval}
              onChange={(e) => setActiveInterval(parseInt(e.target.value, 10))}
              className="w-full accent-lad-600"
            />
            <p className="text-[11px] text-slate-400">
              {t('settings.activeIntervalDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Cognitive Color Palette Section */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Palette className="w-4 h-4 text-blue-500" />
            {t('settings.paletteSection')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('settings.paletteSubtitle')}
          </p>
        </div>

        <CognitivePalettePicker
          currentPalette={currentPalette}
          onSelectPalette={(newPalette) => {
            setCurrentPalette(newPalette);
            updatePreferences({ palette_theme: newPalette });
          }}
        />
      </div>

      {/* 4. Localization Section */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Globe className="w-4 h-4 text-purple-500" />
          {t('settings.localizationSection')}
        </h2>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLocale('en')}
            className={`px-4 py-2.5 text-xs font-bold rounded-2xl border transition-all cursor-pointer ${
              locale === 'en'
                ? 'bg-lad-600 text-white border-lad-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            English (EN)
          </button>
          <button
            type="button"
            onClick={() => setLocale('es')}
            className={`px-4 py-2.5 text-xs font-bold rounded-2xl border transition-all cursor-pointer ${
              locale === 'es'
                ? 'bg-lad-600 text-white border-lad-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            Español (ES)
          </button>
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="px-6 py-2.5 text-xs font-bold text-white bg-lad-600 hover:bg-lad-700 active:scale-95 rounded-2xl shadow-sm transition-all cursor-pointer"
        >
          {isSaving ? 'Saving...' : t('settings.saveSettings')}
        </button>
      </div>
    </div>
  );
};
