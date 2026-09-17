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
  Loader2,
  LogOut,
  LogIn,
  Cloud,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface GlobalSettingsViewProps {
  onSwitchToSpace?: () => void;
}

export const GlobalSettingsView: React.FC<GlobalSettingsViewProps> = ({ onSwitchToSpace }) => {
  const { userRegistry, updatePreferences, updateProfile, connectGoogleDrive, authService, activeManifest, repairSpaceDriveFiles } = useLAD();
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
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isRepairingDrive, setIsRepairingDrive] = useState(false);
  const [repairResultMsg, setRepairResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
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
    setIsConnectingGoogle(true);
    try {
      await connectGoogleDrive(DEFAULT_GDRIVE_CLIENT_ID);
      setSuccessMsg(t('settings.connectedSuccess'));
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err: any) {
      alert(`Google Auth failed: ${err.message}`);
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleRepairDrive = async () => {
    setIsRepairingDrive(true);
    setRepairResultMsg(null);
    try {
      const res = await repairSpaceDriveFiles();
      if (res.success) {
        setRepairResultMsg({
          type: 'success',
          text: `Google Drive files repaired: user.json synced, manifest uploaded, ${res.objectsUploaded} objects, ${res.nodesUploaded} graph nodes, and ${res.opsUploaded} operations.`,
        });
      } else {
        setRepairResultMsg({
          type: 'error',
          text: res.error || 'Failed to repair Google Drive files.',
        });
      }
    } catch (err: any) {
      setRepairResultMsg({
        type: 'error',
        text: err.message || 'Error occurred while repairing files.',
      });
    } finally {
      setIsRepairingDrive(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      authService.signOut();
      setSuccessMsg(t('settings.signOutSuccess'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } finally {
      setIsSigningOut(false);
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
                  onClick={handleSignOut}
                  disabled={isSigningOut || isConnectingGoogle}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50"
                >
                  {isSigningOut ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-rose-500 shrink-0" />
                      <span>{t('settings.signingOut')}</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-3 h-3 text-rose-500 shrink-0" />
                      <span>{t('settings.signOut')}</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={isConnectingGoogle || isSigningOut}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold bg-lad-600 hover:bg-lad-700 text-white rounded-lg transition-all cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                >
                  {isConnectingGoogle ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-white shrink-0" />
                      <span>{t('settings.connecting')}</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-3 h-3 shrink-0" />
                      <span>{t('settings.signInGoogle')}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {auth.isAuthenticated && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-blue-500" />
                    <span>Upload & Repair Google Drive Files</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Syncs local user.json, space manifest, graph nodes, and all objects to your Google Drive.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRepairDrive}
                  disabled={isRepairingDrive}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/80 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {isRepairingDrive ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                      <span>Repairing files...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Fix GDrive Files</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {repairResultMsg && (
              <div
                className={`mt-2 p-3 rounded-xl text-xs flex items-center gap-2 border font-medium ${
                  repairResultMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                }`}
              >
                {repairResultMsg.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{repairResultMsg.text}</span>
              </div>
            )}
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
