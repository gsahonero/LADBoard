import React, { useState, useEffect } from 'react';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { validateSpaceAccessAndInvitation, SpaceInviteVerificationResult } from '../../core/sharing/google-sharing-service';
import { ModernIcon } from './ModernIcon';
import { resolveSpaceIcon } from '../../core/theme/space-identity';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  LogIn,
  CheckCircle2,
  X,
  Loader2,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const JoinSpaceModal: React.FC = () => {
  const {
    pendingJoinSpaceId,
    joinSpace,
    dismissPendingJoinSpace,
    authService,
    storageManager,
    connectGoogleDrive,
  } = useLAD();
  const { t } = useI18n();

  const [auth, setAuth] = useState(() => authService.getState());
  const [isVerifying, setIsVerifying] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [verification, setVerification] = useState<SpaceInviteVerificationResult | null>(null);

  const isGoogleAuth = auth.isAuthenticated && auth.user?.provider === 'google';
  const currentUserEmail = auth.user?.email || '';

  const runVerification = React.useCallback(
    async (overrideStorage?: any) => {
      if (!pendingJoinSpaceId) {
        setVerification(null);
        return;
      }

      const currentAuth = authService.getState();
      if (!currentAuth.isAuthenticated || currentAuth.user?.provider !== 'google') {
        setVerification(null);
        return;
      }

      setIsVerifying(true);
      const userEmail = currentAuth.user?.email || '';
      const storage = overrideStorage || storageManager.getRemoteProvider() || storageManager.getLocalProvider();
      
      try {
        const result = await validateSpaceAccessAndInvitation(storage, pendingJoinSpaceId, userEmail);
        setVerification(result);
      } catch (err: any) {
        setVerification({
          isValid: false,
          error: err.message || 'SPACE_UNAVAILABLE',
        });
      } finally {
        setIsVerifying(false);
      }
    },
    [pendingJoinSpaceId, authService, storageManager]
  );

  useEffect(() => {
    return authService.subscribe((newAuth) => {
      setAuth(newAuth);
    });
  }, [authService]);

  useEffect(() => {
    if (!pendingJoinSpaceId) {
      setVerification(null);
      return;
    }

    if (isGoogleAuth) {
      runVerification();
    }
  }, [pendingJoinSpaceId, isGoogleAuth, runVerification]);

  const handleGoogleLogin = async () => {
    try {
      setIsVerifying(true);
      const user = await connectGoogleDrive();
      if (user) {
        const storage = storageManager.getRemoteProvider() || storageManager.getLocalProvider();
        await runVerification(storage);
      }
    } catch {
      // Handled in context
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAcceptJoin = async () => {
    if (!pendingJoinSpaceId) return;
    setIsJoining(true);
    await joinSpace(pendingJoinSpaceId);
    setIsJoining(false);
  };

  const iconKey = resolveSpaceIcon(
    verification?.manifest?.icon || 'folder',
    verification?.manifest?.space_name || 'Space'
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-7 relative"
        >
          <button
            onClick={dismissPendingJoinSpace}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200/60 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {t('joinModal.title')}
              </h2>
              <div className="text-xs text-slate-500 font-mono">
                {pendingJoinSpaceId}
              </div>
            </div>
          </div>

          {!isGoogleAuth ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t('joinModal.authRequiredTitle')}</span>
                </div>
                <p>
                  {t('joinModal.authRequiredDesc')}
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  onClick={handleGoogleLogin}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t('joinModal.signInWithGoogle')}</span>
                </button>

                <button
                  onClick={dismissPendingJoinSpace}
                  className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : isVerifying ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('joinModal.verifying')}
              </div>
              <div className="text-[11px] text-slate-400">
                {t('joinModal.verifyingDetail')}
              </div>
            </div>
          ) : verification?.error === 'IDENTITY_MISMATCH' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <div className="font-bold flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{t('joinModal.mismatchTitle')}</span>
                </div>
                <p className="leading-relaxed">
                  {t('joinModal.mismatchDesc')}
                </p>
                <div className="pt-1 space-y-1 font-medium">
                  <div className="text-[11px] text-amber-700/80 dark:text-amber-400">
                    • {t('joinModal.invitedAccount')}: <strong className="text-amber-900 dark:text-white">{verification.invitedEmail || 'Authorized Email'}</strong>
                  </div>
                  <div className="text-[11px] text-amber-700/80 dark:text-amber-400">
                    • {t('joinModal.currentAccount')}: <strong className="text-amber-900 dark:text-white">{currentUserEmail}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  onClick={handleGoogleLogin}
                  className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t('joinModal.switchAccount')}</span>
                </button>

                <button
                  onClick={dismissPendingJoinSpace}
                  className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all cursor-pointer"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          ) : verification?.isValid && verification.manifest ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                    <ModernIcon name={iconKey} className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {verification.manifest.space_name}
                    </div>
                    {verification.manifest.description && (
                      <div className="text-xs text-slate-500 truncate max-w-xs">
                        {verification.manifest.description}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">{t('joinModal.invitedBy')}:</span>
                    <strong className="text-slate-700 dark:text-slate-200 truncate block">
                      {verification.inviterName || 'Space Owner'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{t('joinModal.roleAssigned')}:</span>
                    <span className="inline-block font-bold text-blue-600 dark:text-blue-400 uppercase">
                      {verification.role}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t('joinModal.identityVerifiedNotice', { email: currentUserEmail })}</span>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  onClick={handleAcceptJoin}
                  disabled={isJoining}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isJoining ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{isJoining ? t('common.loading') : t('joinModal.acceptButton')}</span>
                </button>

                <button
                  onClick={dismissPendingJoinSpace}
                  disabled={isJoining}
                  className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all cursor-pointer"
                >
                  {t('joinModal.decline')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <span>{t('joinModal.notFoundTitle')}</span>
                </div>
                <p>
                  {t('joinModal.notFoundDesc')}
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  onClick={() => runVerification()}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{t('joinModal.retryVerification')}</span>
                </button>

                <button
                  onClick={dismissPendingJoinSpace}
                  className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all cursor-pointer"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
