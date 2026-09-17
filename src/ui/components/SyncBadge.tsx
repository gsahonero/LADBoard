/**
 * Sync Status Badge Component
 */

import React from 'react';
import { SyncState } from '../../core/sync/types';
import { useI18n } from '../../core/i18n/i18n-context';
import { CheckCircle2, RefreshCw, WifiOff, AlertTriangle, AlertCircle } from 'lucide-react';

export const SyncBadge: React.FC<{ syncState: SyncState; onSyncClick?: () => void }> = ({
  syncState,
  onSyncClick,
}) => {
  const { t } = useI18n();

  const getBadgeContent = () => {
    switch (syncState.status) {
      case 'synced':
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
      default:
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-500" />,
          text: t('sync.needsAttention'),
          bg: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        };
    }
  };

  const badge = getBadgeContent();

  return (
    <button
      onClick={onSyncClick}
      title={syncState.lastSyncedAt ? t('sync.lastSynced', { time: new Date(syncState.lastSyncedAt).toLocaleTimeString() }) : t('sync.neverSynced')}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors hover:opacity-85 ${badge.bg}`}
    >
      {badge.icon}
      <span>{badge.text}</span>
    </button>
  );
};
