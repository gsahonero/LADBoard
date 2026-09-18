/**
 * Sync Status Badge Component with Real-Time Hover Status Pane
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SyncState } from '../../core/sync/types';
import { useI18n } from '../../core/i18n/i18n-context';
import { useOptionalLAD } from '../context/LADContext';
import {
  CheckCircle2,
  RefreshCw,
  WifiOff,
  AlertTriangle,
  AlertCircle,
  Cloud,
  HardDrive,
  User,
} from 'lucide-react';

export const SyncBadge: React.FC<{ syncState: SyncState; onSyncClick?: () => void }> = ({
  syncState,
  onSyncClick,
}) => {
  const { t } = useI18n();
  const lad = useOptionalLAD();
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 250);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const authState = lad?.authService?.getState();
  const isGDriveConfigured = !!lad?.storageManager?.getRemoteProvider();
  const isExpired = lad?.authService?.isTokenExpired ? lad.authService.isTokenExpired() : false;
  const isGoogleUser = lad
    ? Boolean(authState?.isAuthenticated && authState?.user?.provider === 'google' && !isExpired && isGDriveConfigured)
    : true;
  const userEmail = authState?.user?.email || lad?.userRegistry?.user_id;

  const getBadgeContent = () => {
    if (isExpired && authState?.isAuthenticated) {
      return {
        icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
        text: t('sync.sessionExpired') || 'Session Expired',
        bg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      };
    }

    switch (syncState.status) {
      case 'synced':
        if (!isGoogleUser) {
          return {
            icon: <HardDrive className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />,
            text: t('sync.savedLocallyBadge') || 'Saved on device',
            bg: 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          };
        }
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
          text: t('sync.synced'),
          bg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'syncing':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-lad-500 animate-spin" />,
          text: t('sync.syncing'),
          bg: 'bg-lad-50 dark:bg-lad-950/30 text-lad-700 dark:text-lad-300 border-lad-200 dark:border-lad-800',
        };
      case 'saving_locally':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-lad-500 animate-spin" />,
          text: t('sync.savedLocally'),
          bg: 'bg-lad-50 dark:bg-lad-950/30 text-lad-700 dark:text-lad-300 border-lad-200 dark:border-lad-800',
        };
      case 'offline':
        return {
          icon: <WifiOff className="w-3.5 h-3.5 text-amber-500" />,
          text: t('sync.offline'),
          bg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      case 'pending_changes':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-amber-500" />,
          text: t('sync.pendingChanges', { count: syncState.pendingOpsCount }),
          bg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      case 'conflict_detected':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />,
          text: t('sync.conflictDetected'),
          bg: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        };
      case 'needs_attention':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />,
          text: syncState.errorMessage ? t('sync.offlineFallbackActive') : t('sync.needsAttention'),
          bg: 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700',
        };
      default:
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-500" />,
          text: t('sync.needsAttention'),
          bg: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        };
    }
  };

  const badge = getBadgeContent();

  const getGDriveStatus = () => {
    if (!isGoogleUser && !isGDriveConfigured) {
      return {
        icon: <AlertCircle className="w-3 h-3 text-neutral-400" />,
        text: t('sync.gdriveNotConnected'),
        color: 'text-neutral-500 dark:text-neutral-400',
      };
    }
    if (syncState.status === 'syncing') {
      return {
        icon: <RefreshCw className="w-3 h-3 text-lad-500 animate-spin" />,
        text: t('sync.gdriveSyncing'),
        color: 'text-lad-600 dark:text-lad-400',
      };
    }
    if (syncState.status === 'needs_attention' || syncState.errorMessage) {
      return {
        icon: <AlertTriangle className="w-3 h-3 text-amber-500" />,
        text: t('sync.gdriveSyncFailed'),
        color: 'text-amber-600 dark:text-amber-400',
      };
    }
    if (syncState.status === 'offline' || !syncState.isOnline) {
      return {
        icon: <WifiOff className="w-3 h-3 text-amber-500" />,
        text: t('sync.gdriveOffline'),
        color: 'text-amber-600 dark:text-amber-400',
      };
    }
    if (syncState.status === 'conflict_detected') {
      return {
        icon: <AlertTriangle className="w-3 h-3 text-rose-500" />,
        text: t('sync.conflictDetected'),
        color: 'text-rose-600 dark:text-rose-400',
      };
    }
    return {
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-500" />,
      text: t('sync.gdriveConnected'),
      color: 'text-emerald-600 dark:text-emerald-400',
    };
  };

  const gdriveStatus = getGDriveStatus();
  const lastSyncedText = syncState.lastSyncedAt
    ? t('sync.lastSynced', { time: new Date(syncState.lastSyncedAt).toLocaleTimeString() })
    : t('sync.neverSynced');

  const handleBadgeClick = () => {
    if (syncState.status === 'conflict_detected' || syncState.activeConflicts.length > 0) {
      if (lad?.openConflictModal) {
        lad.openConflictModal();
        return;
      }
    }
    if (onSyncClick) onSyncClick();
  };

  return (
    <div
      className="relative inline-block text-left"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleBadgeClick}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors hover:opacity-85 cursor-pointer ${badge.bg}`}
      >
        {badge.icon}
        <span>{badge.text}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 sm:w-80 p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl z-50 text-left cursor-default select-text"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                {t('sync.paneTitle')}
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                {lastSyncedText}
              </span>
            </div>

            {/* Status Breakdown */}
            <div className="py-2.5 space-y-3">
              {/* Google Drive Status */}
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mt-0.5">
                  <Cloud className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                      {t('sync.gdriveTitle')}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${gdriveStatus.color}`}>
                      {gdriveStatus.icon}
                      <span>{gdriveStatus.text}</span>
                    </span>
                  </div>
                  {userEmail && isGoogleUser ? (
                    <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                      <User className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{userEmail}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                      {t('sync.gdriveNotConnected')}
                    </div>
                  )}
                </div>
              </div>

              {/* Offline Storage Status */}
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mt-0.5">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                      {t('sync.offlineTitle')}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{t('sync.offlineActive')}</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {syncState.pendingOpsCount > 0
                      ? t('sync.offlinePending', { count: syncState.pendingOpsCount })
                      : syncState.errorMessage
                      ? t('sync.offlineSafeguard')
                      : t('sync.offlineAllSaved')}
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message if present */}
            {syncState.errorMessage && (
              <div className="mb-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                <span className="line-clamp-2">{syncState.errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
              {syncState.activeConflicts.length > 0 && (
                <button
                  type="button"
                  data-testid="btn-resolve-conflicts-pane"
                  onClick={() => {
                    if (lad?.openConflictModal) {
                      lad.openConflictModal();
                      setIsOpen(false);
                    }
                  }}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>
                    {t('sync.resolveConflicts', { count: syncState.activeConflicts.length })}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (onSyncClick) onSyncClick();
                  else if (lad?.triggerSync) lad.triggerSync();
                }}
                disabled={syncState.status === 'syncing'}
                className="w-full py-1.5 px-3 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${syncState.status === 'syncing' ? 'animate-spin' : ''}`} />
                <span>{syncState.status === 'needs_attention' || syncState.errorMessage ? t('sync.retrySync') : t('sync.syncNow')}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
