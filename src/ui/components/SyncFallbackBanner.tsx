/**
 * SyncFallbackBanner Component
 * Displays a non-muted, prominent, accessible alert banner whenever Google Drive
 * automatic synchronization fails and the system activates offline fallback.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudOff, RefreshCw, X, HardDrive } from 'lucide-react';
import { useOptionalLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';

/**
 * Play a polite, subtle notification chime if Web Audio is allowed.
 * Wrapped in try-catch so it never fails or crashes in restricted environments.
 */
function playFallbackChime() {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
    osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.15); // E4

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Audio may be blocked by browser autoplay policies before user interaction
  }
}

export const SyncFallbackBanner: React.FC = () => {
  const lad = useOptionalLAD();
  const { t } = useI18n();
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const lastChimedErrorRef = useRef<string | null>(null);

  const syncState = lad?.syncState;
  const isFallbackError =
    syncState?.status === 'needs_attention' &&
    Boolean(syncState?.errorMessage);

  const isVisible = isFallbackError && dismissedError !== syncState?.errorMessage;

  // Play audio chime when a new error occurs
  useEffect(() => {
    if (isVisible && syncState?.errorMessage && lastChimedErrorRef.current !== syncState.errorMessage) {
      lastChimedErrorRef.current = syncState.errorMessage;
      playFallbackChime();
    }
  }, [isVisible, syncState?.errorMessage]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setDismissedError(null);
    try {
      if (lad?.triggerSync) {
        await lad.triggerSync();
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDismiss = () => {
    if (syncState?.errorMessage) {
      setDismissedError(syncState.errorMessage);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          role="alert"
          aria-live="assertive"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.2 }}
          className="relative z-40 w-full px-4 pt-2.5 pb-1 max-w-5xl mx-auto"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:px-4 rounded-xl bg-amber-50/95 dark:bg-amber-950/85 border border-amber-300 dark:border-amber-700/80 text-amber-900 dark:text-amber-100 shadow-md backdrop-blur-md">
            {/* Left: Icon & Explanatory Text */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5 sm:mt-0">
                <CloudOff className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold tracking-tight text-amber-950 dark:text-amber-50">
                    {t('sync.fallbackBannerTitle')}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <HardDrive className="w-3 h-3" />
                    {t('sync.offlineActive')}
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 dark:text-amber-200/90 leading-relaxed max-w-2xl">
                  {t('sync.fallbackBannerMessage')}
                </p>
                {syncState?.errorMessage && (
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 font-mono pt-0.5">
                    {syncState.errorMessage}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>{t('sync.retrySync')}</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                aria-label={t('sync.dismiss')}
                className="p-1.5 rounded-lg text-amber-700 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-50 hover:bg-amber-200/60 dark:hover:bg-amber-900/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
