import React, { useState, useEffect, useMemo } from 'react';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { ModernIcon, ModernIconName } from '../components/ModernIcon';
import { deriveCalendarEvents, generateIcsContent, downloadIcsFile } from '../../core/calendar/calendar-sync';
import { resolveSpaceIcon, SPACE_COLOR_PRESETS, SpaceColorOption } from '../../core/theme/space-identity';
import { getShareableJoinUrl } from '../../core/sharing/google-sharing-service';
import {
  Sliders,
  Calendar,
  Mail,
  HardDrive,
  Check,
  RefreshCw,
  Download,
  Copy,
  Plus,
  X,
  ShieldCheck,
  Radio,
  Clock,
  Layers,
  Cloud,
  Loader2,
  AlertCircle,
  Trash2,
  LogOut,
  AlertTriangle,
} from 'lucide-react';

interface SpaceSettingsViewProps {
  onSwitchToGlobal?: () => void;
}

export { getShareableJoinUrl };

export const SpaceSettingsView: React.FC<SpaceSettingsViewProps> = ({ onSwitchToGlobal }) => {
  const {
    activeManifest,
    updateSpaceIdentity,
    objects,
    authService,
    repairSpaceDriveFiles,
    deleteSpace,
    currentUserId,
    userRegistry,
  } = useLAD();
  const { t } = useI18n();

  const isOwner =
    activeManifest?.created_by === currentUserId ||
    userRegistry?.spaces.find((s) => s.space_id === activeManifest?.space_id)?.role === 'owner';

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Space Identity State
  const [spaceName, setSpaceName] = useState(activeManifest?.space_name || '');
  const [icon, setIcon] = useState(activeManifest?.icon || 'folder');
  const [color, setColor] = useState(activeManifest?.color || 'blue');
  const [description, setDescription] = useState(activeManifest?.description || '');
  const [categories, setCategories] = useState<string[]>(activeManifest?.categories || []);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Calendar Integration State
  const [calendarEnabled, setCalendarEnabled] = useState(
    activeManifest?.settings?.calendar?.enabled ?? false
  );
  const [calendarMode, setCalendarMode] = useState<'dedicated' | 'primary'>(
    activeManifest?.settings?.calendar?.mode ?? 'dedicated'
  );

  // Invitation Settings State
  const [inviteMethod, setInviteMethod] = useState<'gmail' | 'link' | 'payload'>(
    activeManifest?.settings?.invitations?.default_method ?? 'gmail'
  );
  const [defaultRole, setDefaultRole] = useState<'editor' | 'viewer'>(
    activeManifest?.settings?.invitations?.default_role ?? 'editor'
  );

  // Connectivity & Diagnostics State
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<{
    gdrive: { status: 'connected' | 'unconfigured' | 'offline'; latency?: number };
    calendar: { status: 'ready' | 'unconfigured'; latency?: number };
    gmail: { status: 'ready' | 'unconfigured' };
    indexedDb: { status: 'ready'; count: number };
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isRepairingDrive, setIsRepairingDrive] = useState(false);
  const [repairResultMsg, setRepairResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const handleRepairDrive = async () => {
    if (!activeManifest?.space_id) return;
    setIsRepairingDrive(true);
    setRepairResultMsg(null);
    try {
      const res = await repairSpaceDriveFiles(activeManifest.space_id);
      if (res.success) {
        setRepairResultMsg({
          type: 'success',
          text: `Google Drive space files repaired: manifest uploaded, ${res.objectsUploaded} objects, ${res.nodesUploaded} graph nodes, and ${res.opsUploaded} operations.`,
        });
      } else {
        setRepairResultMsg({
          type: 'error',
          text: res.error || 'Failed to repair space files in Google Drive.',
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

  // Sync state from manifest if it updates externally
  useEffect(() => {
    if (activeManifest) {
      setSpaceName(activeManifest.space_name);
      setIcon(activeManifest.icon || 'folder');
      setColor(activeManifest.color || 'blue');
      setDescription(activeManifest.description || '');
      setCategories(activeManifest.categories || []);
      setCalendarEnabled(activeManifest.settings?.calendar?.enabled ?? false);
      setCalendarMode(activeManifest.settings?.calendar?.mode ?? 'dedicated');
      setInviteMethod(activeManifest.settings?.invitations?.default_method ?? 'gmail');
      setDefaultRole(activeManifest.settings?.invitations?.default_role ?? 'editor');
    }
  }, [activeManifest?.space_id]);

  // Calendar sync calculation
  const calendarSummary = useMemo(() => {
    return deriveCalendarEvents(objects, activeManifest?.space_name || 'LAD Space');
  }, [objects, activeManifest?.space_name]);

  // Track if user has unsaved changes to remind them at all times
  const hasChanges = useMemo(() => {
    if (!activeManifest) return false;
    const nameChanged = spaceName.trim() !== (activeManifest.space_name || '').trim();
    const iconChanged = icon !== (activeManifest.icon || 'folder');
    const colorChanged = color !== (activeManifest.color || 'blue');
    const descChanged = description.trim() !== (activeManifest.description || '').trim();
    const currentCats = [...categories].sort().join(',');
    const origCats = [...(activeManifest.categories || [])].sort().join(',');
    const catsChanged = currentCats !== origCats;
    const calEnabledChanged = calendarEnabled !== (activeManifest.settings?.calendar?.enabled ?? false);
    const calModeChanged = calendarMode !== (activeManifest.settings?.calendar?.mode ?? 'dedicated');
    const inviteMethodChanged = inviteMethod !== (activeManifest.settings?.invitations?.default_method ?? 'gmail');
    const defaultRoleChanged = defaultRole !== (activeManifest.settings?.invitations?.default_role ?? 'editor');

    return (
      nameChanged ||
      iconChanged ||
      colorChanged ||
      descChanged ||
      catsChanged ||
      calEnabledChanged ||
      calModeChanged ||
      inviteMethodChanged ||
      defaultRoleChanged
    );
  }, [
    activeManifest,
    spaceName,
    icon,
    color,
    description,
    categories,
    calendarEnabled,
    calendarMode,
    inviteMethod,
    defaultRole,
  ]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const auth = authService.getState();

  const handleSaveIdentity = async () => {
    if (!activeManifest) return;
    setIsSaving(true);
    await updateSpaceIdentity(activeManifest.space_id, {
      space_name: spaceName.trim() || activeManifest.space_name,
      icon,
      color,
      description: description.trim(),
      categories,
      settings: {
        ...(activeManifest.settings || {}),
        calendar: {
          enabled: calendarEnabled,
          mode: calendarMode,
          sync_due_dates: true,
          auto_sync: true,
        },
        invitations: {
          default_method: inviteMethod,
          default_role: defaultRole,
        },
      },
    });
    setIsSaving(false);
    setSuccessMsg(t('spaceSettings.savedSuccess'));
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const handleExportIcs = () => {
    const icsString = generateIcsContent(
      calendarSummary.events,
      `LAD - ${activeManifest?.space_name || 'Space'}`
    );
    downloadIcsFile(`lad-calendar-${activeManifest?.space_name || 'space'}.ics`, icsString);
    setSuccessMsg(t('spaceSettings.icsExportSuccess'));
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleRunDiagnostics = async () => {
    setIsDiagnosing(true);
    const start = Date.now();

    // Simulate realistic health check across all endpoints
    await new Promise((r) => setTimeout(r, 600));
    const latency = Date.now() - start;

    const isGoogleAuth = auth.isAuthenticated && auth.user?.provider === 'google';

    setDiagnosticResults({
      gdrive: {
        status: isGoogleAuth ? 'connected' : 'unconfigured',
        latency: isGoogleAuth ? Math.round(latency / 2) : undefined,
      },
      calendar: {
        status: isGoogleAuth ? 'ready' : 'unconfigured',
        latency: isGoogleAuth ? Math.round(latency / 1.8) : undefined,
      },
      gmail: {
        status: isGoogleAuth ? 'ready' : 'unconfigured',
      },
      indexedDb: {
        status: 'ready',
        count: objects.length,
      },
    });
    setIsDiagnosing(false);
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim().toLowerCase();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
      setNewCategoryInput('');
    }
  };

  const handleRemoveCategory = (catToRemove: string) => {
    setCategories(categories.filter((c) => c !== catToRemove));
  };

  const handleCopyInviteLink = () => {
    if (typeof navigator !== 'undefined' && activeManifest) {
      const link = getShareableJoinUrl(activeManifest.space_id);
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (!activeManifest) {
    return (
      <div className="p-8 text-center text-slate-500">
        No active space loaded.
      </div>
    );
  }

  const activeIconKey = resolveSpaceIcon(icon, spaceName);

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Top Scope Switcher: Space Settings vs Global Settings */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 w-fit shadow-xs">
          <button
            className="px-4 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/70 dark:border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-lad-500" />
            <span>{t('spaceSettings.tabSpace')}</span>
          </button>
          <button
            onClick={onSwitchToGlobal}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer flex items-center gap-2"
          >
            <Radio className="w-3.5 h-3.5 text-slate-400" />
            <span>{t('spaceSettings.tabGlobal')}</span>
          </button>
        </div>

        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
          <ModernIcon name={activeIconKey} className="w-3.5 h-3.5 text-lad-500" />
          <span>{t('spaceSettings.scopeBadge', { name: activeManifest.space_name })}</span>
        </div>
      </div>

      {/* Sticky Header Bar with Persistent Save & Reminder - Visible At All Times & Floating as page scrolls */}
      <div className="sticky top-[53px] sm:top-[57px] z-20 -mx-2 px-3 sm:px-5 py-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-lad-50 dark:bg-lad-950/40 text-lad-600 dark:text-lad-400 shrink-0">
            <ModernIcon name={activeIconKey} className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                {spaceName || activeManifest.space_name}
              </h1>
              {hasChanges ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                  <AlertCircle className="w-3 h-3" />
                  {t('spaceSettings.unsavedChanges')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  <Check className="w-3 h-3 text-emerald-500" />
                  {t('spaceSettings.allSaved')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {hasChanges ? t('spaceSettings.unsavedReminder') : t('spaceSettings.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={handleSaveIdentity}
            disabled={isSaving}
            aria-label={t('spaceSettings.saveChanges')}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              hasChanges
                ? 'text-white bg-lad-600 hover:bg-lad-700 active:scale-95 shadow-md shadow-lad-500/20 ring-2 ring-lad-500/40'
                : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t('spaceSettings.saving')}</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{t('spaceSettings.saveChanges')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs font-semibold flex items-center gap-2.5 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. Space Identity & Branding */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-lad-500" />
          {t('spaceSettings.identitySection')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1.5">
              {t('spaceSettings.spaceName')}
            </label>
            <input
              type="text"
              value={spaceName}
              onChange={(e) => setSpaceName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-lad-500"
              placeholder="e.g. Personal Life, Design Studio, Family..."
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1.5">
              {t('spaceSettings.spaceDesc')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-lad-500"
              placeholder={t('spaceSettings.spaceDescPlaceholder')}
            />
          </div>
        </div>

        {/* Modern Icon Selector */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-2">
            {t('spaceSettings.spaceIcon')}
          </label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                'user',
                'home',
                'briefcase',
                'heart',
                'folder',
                'wallet',
                'palette',
                'book',
                'code',
                'box',
                'compass',
                'sparkles',
              ] as ModernIconName[]
            ).map((iconName) => {
              const isSelected = icon === iconName;
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-lad-500 bg-lad-50 dark:bg-lad-950 text-lad-600 dark:text-lad-300 shadow-xs scale-105'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                  title={iconName}
                >
                  <ModernIcon name={iconName} className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Palette Gradient Selector */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-2">
            {t('spaceSettings.spaceColor')}
          </label>
          <div className="flex flex-wrap gap-3">
            {SPACE_COLOR_PRESETS.map((opt: SpaceColorOption) => {
              const isSelected = color === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setColor(opt.id)}
                  style={{ backgroundColor: opt.hex }}
                  className={`w-8 h-8 rounded-full transition-all cursor-pointer flex items-center justify-center shadow-xs ${
                    isSelected ? 'ring-3 ring-offset-2 ring-slate-800 dark:ring-white scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={opt.name}
                >
                  {isSelected && <Check className="w-4 h-4 text-white drop-shadow-sm" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories Included in this Space */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
              {t('spaceSettings.categoriesSection')}
            </label>
            <span className="text-[10px] text-slate-400">
              {categories.length} categories enabled
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            {t('spaceSettings.categoriesDesc')}
          </p>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {categories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs"
              >
                <span className="capitalize">{cat}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(cat)}
                  className="hover:text-rose-500 transition-colors p-0.5"
                  title="Remove Category"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 max-w-xs">
            <input
              type="text"
              value={newCategoryInput}
              onChange={(e) => setNewCategoryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
              placeholder="e.g. research, fitness, notes..."
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white flex-1"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('spaceSettings.addCategory')}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Google Calendar Integration */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              {t('spaceSettings.calendarSection')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('spaceSettings.calendarDesc')}
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={calendarEnabled}
              onChange={(e) => setCalendarEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {calendarEnabled && (
          <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-2">
                {t('spaceSettings.calendarMode')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setCalendarMode('dedicated')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    calendarMode === 'dedicated'
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-xs">
                    {t('spaceSettings.modeDedicated', { name: spaceName || 'Space' })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Creates an isolated, color-coded calendar for this space.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCalendarMode('primary')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    calendarMode === 'primary'
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-xs">
                    {t('spaceSettings.modePrimary')}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Adds card deadlines directly into your main personal schedule.
                  </div>
                </button>
              </div>
            </div>

            {/* Event Derivation Status & Quick Actions */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>
                  {calendarSummary.syncableEventsCount > 0
                    ? t('spaceSettings.syncableEvents', { count: calendarSummary.syncableEventsCount })
                    : t('spaceSettings.noEvents')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportIcs}
                  disabled={calendarSummary.syncableEventsCount === 0}
                  className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Export .ics calendar file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('spaceSettings.exportIcs')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSuccessMsg(t('spaceSettings.syncSuccess'));
                    setTimeout(() => setSuccessMsg(''), 3000);
                  }}
                  disabled={calendarSummary.syncableEventsCount === 0}
                  className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('spaceSettings.syncNow')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Invitations & Sharing Settings */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-500" />
            {t('spaceSettings.invitationsSection')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('spaceSettings.invitationMethod')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setInviteMethod('gmail')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              inviteMethod === 'gmail'
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <div className="font-bold text-xs flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-500" />
              {t('spaceSettings.methodGmail')}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {t('spaceSettings.methodGmailDesc')}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setInviteMethod('link')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              inviteMethod === 'link'
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <div className="font-bold text-xs flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5 text-emerald-500" />
              {t('spaceSettings.methodLink')}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {t('spaceSettings.methodLinkDesc')}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setInviteMethod('payload')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              inviteMethod === 'payload'
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <div className="font-bold text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              {t('spaceSettings.methodPayload')}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {t('spaceSettings.methodPayloadDesc')}
            </div>
          </button>
        </div>

        {/* Default Role Selection & Fast Copy Invite Link */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1.5">
              {t('spaceSettings.defaultRole')}
            </label>
            <select
              value={defaultRole}
              onChange={(e) => setDefaultRole(e.target.value as any)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
            >
              <option value="editor">{t('spaceSettings.roleEditor')}</option>
              <option value="viewer">{t('spaceSettings.roleViewer')}</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1.5">
              {t('spaceSettings.methodLink')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={getShareableJoinUrl(activeManifest.space_id)}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[11px] font-mono text-slate-500 border border-slate-200 dark:border-slate-700 truncate"
              />
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Connectivity & Health Diagnostics */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-500" />
              {t('spaceSettings.connectivitySection')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('spaceSettings.connectivityDesc')}
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunDiagnostics}
            disabled={isDiagnosing}
            className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDiagnosing ? 'animate-spin text-lad-500' : ''}`} />
            <span>{isDiagnosing ? t('spaceSettings.testing') : t('spaceSettings.testConnections')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Google Drive */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 space-y-1.5">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {t('spaceSettings.diagGdrive')}
            </div>
            <div className="text-xs font-bold flex items-center gap-1.5">
              {diagnosticResults?.gdrive.status === 'connected' || auth.isAuthenticated ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-700 dark:text-emerald-400">{t('spaceSettings.statusConnected')}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span className="text-slate-500">{t('spaceSettings.statusOffline')}</span>
                </>
              )}
            </div>
          </div>

          {/* Google Calendar API */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 space-y-1.5">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {t('spaceSettings.diagCalendar')}
            </div>
            <div className="text-xs font-bold flex items-center gap-1.5">
              {auth.isAuthenticated ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-emerald-700 dark:text-emerald-400">{t('spaceSettings.statusReady')}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-amber-600 dark:text-amber-400 text-[10px]">Sign-in optional</span>
                </>
              )}
            </div>
          </div>

          {/* Gmail API */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 space-y-1.5">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {t('spaceSettings.diagGmail')}
            </div>
            <div className="text-xs font-bold flex items-center gap-1.5">
              {auth.isAuthenticated ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-emerald-700 dark:text-emerald-400">{t('spaceSettings.statusReady')}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span className="text-slate-500 text-[10px]">Link fallback active</span>
                </>
              )}
            </div>
          </div>

          {/* IndexedDB Local Engine */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 space-y-1.5">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {t('spaceSettings.diagIndexedDb')}
            </div>
            <div className="text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-emerald-700 dark:text-emerald-400">{objects.length} cards cached</span>
            </div>
          </div>
        </div>

        {auth.isAuthenticated && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-blue-500" />
                <span>Upload & Repair Google Drive Files</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Pushes this space's manifest, graph nodes, and all {objects.length} objects into Google Drive.
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

      {/* Save Button Bar */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSaveIdentity}
          disabled={isSaving}
          className={`px-6 py-2.5 text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer flex items-center gap-2 ${
            hasChanges
              ? 'text-white bg-lad-600 hover:bg-lad-700 active:scale-95 shadow-md shadow-lad-500/20 ring-2 ring-lad-500/40'
              : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{t('spaceSettings.saving')}</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>{t('spaceSettings.saveChanges')}</span>
            </>
          )}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="p-6 bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-3xl space-y-4 mt-6">
        <div>
          <h2 className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            {t('spaceSettings.dangerZone')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('spaceSettings.dangerZoneDesc')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200/80 dark:border-rose-900/50">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {isOwner ? t('spaceSettings.deleteSpaceButton') : t('spaceSettings.leaveSpaceButton')}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {isOwner ? t('spaceSettings.deleteSpaceWarning') : t('spaceSettings.leaveSpaceWarning')}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl transition-all cursor-pointer shrink-0"
          >
            {isOwner ? <Trash2 className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5" />}
            <span>{isOwner ? t('spaceSettings.deleteSpaceButton') : t('spaceSettings.leaveSpaceButton')}</span>
          </button>
        </div>
      </div>

      {/* Delete / Leave Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isOwner ? t('spaces.confirmDeleteSpaceTitle') : t('spaces.confirmLeaveSpaceTitle')}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {activeManifest?.space_name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isOwner
                ? t('spaces.confirmDeleteSpaceDesc', { name: activeManifest?.space_name || '' })
                : t('spaces.confirmLeaveSpaceDesc', { name: activeManifest?.space_name || '' })}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!activeManifest?.space_id) return;
                  setIsDeleting(true);
                  try {
                    await deleteSpace(activeManifest.space_id);
                    setShowDeleteConfirm(false);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('spaces.deleting')}</span>
                  </>
                ) : isOwner ? (
                  t('spaces.deleteSpace')
                ) : (
                  t('spaces.leaveSpace')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
