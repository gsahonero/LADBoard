/**
 * People View — Space Members, Interpersonal Relationships, and Invitations
 */

import React, { useState } from 'react';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { Users, UserPlus, Check, Mail, Shield, Crown, RefreshCw, AlertCircle, Loader2, UserMinus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const PeopleView: React.FC = () => {
  const { nodes, inviteMember, removeMember, activeManifest, userRegistry, authService } = useLAD();
  const { t } = useI18n();
  const auth = authService.getState();

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'owner' | 'editor' | 'viewer'>('editor');
  const [isSending, setIsSending] = useState(false);
  const [reinvitingId, setReinvitingId] = useState<string | null>(null);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');

  const userNodes = nodes.filter((n) => n.type === 'user');

  const handleRemoveUser = async (nodeId: string, name: string, email?: string) => {
    if (removingId) return;
    setRemovingId(nodeId);
    setConfirmingRemoveId(null);
    try {
      const res = await removeMember(nodeId, email);
      if (res.success) {
        setSuccessMsg(t('peopleView.removeUserSuccess', { name }));
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setWarningMsg(res.warning || 'Failed to remove user from space');
        setTimeout(() => setWarningMsg(''), 7000);
      }
    } catch (err: any) {
      setWarningMsg(err.message || 'Error removing user');
      setTimeout(() => setWarningMsg(''), 7000);
    } finally {
      setRemovingId(null);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || isSending) return;
    setIsSending(true);
    try {
      const res = await inviteMember(inviteEmail.trim(), inviteRole, inviteName.trim() || undefined);
      setInviteName('');
      setInviteEmail('');
      if (res.gmailSent) {
        setSuccessMsg(t('peopleView.invitationSent'));
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setWarningMsg(res.warning || t('peopleView.invitationCreatedNoEmail'));
        setTimeout(() => setWarningMsg(''), 7000);
      }
    } catch (err: any) {
      setWarningMsg(err.message || 'Failed to send invitation');
    } finally {
      setIsSending(false);
    }
  };

  const handleReinvite = async (
    email: string,
    role: 'owner' | 'editor' | 'viewer' = 'editor',
    name?: string,
    nodeId?: string
  ) => {
    if (!email || !email.trim()) return;
    if (nodeId) setReinvitingId(nodeId);
    try {
      const res = await inviteMember(email.trim(), role, name?.trim() || undefined);
      if (res.gmailSent) {
        setSuccessMsg(t('peopleView.reinviteSuccess', { email: email.trim() }));
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setWarningMsg(res.warning || t('peopleView.invitationCreatedNoEmail'));
        setTimeout(() => setWarningMsg(''), 7000);
      }
    } catch (err) {
      console.error('Failed to reinvite member:', err);
    } finally {
      setReinvitingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
          <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          {t('peopleView.title')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('peopleView.subtitle')}
        </p>
      </div>

      {/* Invite Form */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
        <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('peopleView.inviteUser')}
        </h2>

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 border border-emerald-200 dark:border-emerald-800 font-medium"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}

        {warningMsg && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 rounded-xl text-xs flex items-start gap-2 border border-amber-200 dark:border-amber-800/80 font-medium"
          >
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{warningMsg}</span>
          </motion.div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              {t('peopleView.nameLabel')}
            </label>
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="e.g. Sarah Connor"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              {t('spaces.inviteEmail')} *
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="collaborator@gmail.com"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              Role
            </label>
            <div className="flex gap-2">
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="editor">{t('peopleView.roleEditor')}</option>
                <option value="viewer">{t('peopleView.roleViewer')}</option>
                <option value="owner">{t('peopleView.roleOwner')}</option>
              </select>
              <button
                onClick={handleSendInvite}
                disabled={!inviteEmail.trim() || isSending}
                className="px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer shrink-0 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('spaces.sending') || 'Sending...'}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>{t('spaces.sendInvite')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {t('peopleView.membersList')} ({userNodes.length})
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {userNodes.map((user) => {
            const role = user.metadata?.role || 'member';
            const isInvited = user.metadata?.status === 'invited';

            // Resolve user email
            let userEmail: string | undefined;
            if (user.metadata?.email && user.metadata.email !== 'user@ladboard.local') {
              userEmail = user.metadata.email;
            } else if (user.label.includes('@') && !user.label.endsWith('@ladboard.local')) {
              userEmail = user.label;
            }

            // Accurate isCurrentUser check (must NOT falsely flag invited owners as current local user)
            const isCurrentUser =
              !isInvited &&
              (user.node_id === `node_${userRegistry?.user_id}` ||
                user.node_id === userRegistry?.user_id ||
                user.ref_id === userRegistry?.user_id ||
                (Boolean(auth.isAuthenticated && auth.user?.email && userEmail) &&
                  userEmail?.toLowerCase() === auth.user?.email?.toLowerCase()));

            const isPrimaryOwner =
              Boolean(activeManifest?.created_by) &&
              (user.ref_id === activeManifest?.created_by ||
                user.node_id === `node_${activeManifest?.created_by}` ||
                user.node_id === activeManifest?.created_by);

            const canRemove = !isCurrentUser && !isPrimaryOwner;

            if (isCurrentUser) {
              if (auth.isAuthenticated && auth.user?.email) {
                userEmail = auth.user.email;
              } else if (
                userRegistry?.identities[0]?.email &&
                userRegistry.identities[0].email !== 'user@ladboard.local'
              ) {
                userEmail = userRegistry.identities[0].email;
              }
            }

            // Consistent display name resolution
            let userName: string;
            if (isCurrentUser) {
              userName =
                (auth.isAuthenticated && auth.user?.name) ||
                userRegistry?.identities[0]?.display_name ||
                (user.metadata?.name && user.metadata.name !== 'Current User' && user.metadata.name !== 'Owner'
                  ? user.metadata.name
                  : undefined) ||
                (user.label && !user.label.includes('@') && user.label !== 'Current User' && user.label !== 'Owner'
                  ? user.label
                  : 'You');
            } else {
              // For invited or other collaborators:
              // Strictly prioritize the entered name (invited_name or metadata.name or clean label)
              const candidate =
                user.metadata?.invited_name ||
                (user.metadata?.name && user.metadata.name !== 'Current User' && user.metadata.name !== 'Owner'
                  ? user.metadata.name
                  : undefined) ||
                (user.label && !user.label.includes('@') && user.label !== 'Current User' && user.label !== 'Owner'
                  ? user.label
                  : undefined);

              if (candidate && candidate.trim()) {
                userName = candidate.trim();
              } else if (userEmail) {
                // If only email was provided (e.g. sarah.connor@gmail.com), format a clean name: Sarah Connor
                const prefix = userEmail.split('@')[0];
                const parts = prefix.split(/[._-]/).filter(Boolean);
                userName =
                  parts.length > 0
                    ? parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
                    : prefix;
              } else {
                userName = user.label || 'Collaborator';
              }
            }

            const displayEmail = userEmail || t('peopleView.noRegisteredEmail');
            const hasEmail = Boolean(userEmail);

            const cleanedForInitials = userName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
            const initials =
              (cleanedForInitials || 'U')
                .split(/\s+/)
                .map((p: string) => p[0])
                .filter(Boolean)
                .join('')
                .substring(0, 2)
                .toUpperCase() || 'U';

            return (
              <div
                key={user.node_id}
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/20 text-blue-600 dark:text-blue-400 font-black text-sm flex items-center justify-center border border-blue-500/20 shrink-0 shadow-xs">
                    {initials}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="truncate">{userName}</span>
                      {role === 'owner' && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold border border-blue-200/50 flex items-center gap-1 shrink-0">
                          <Crown className="w-2.5 h-2.5 text-amber-500" />
                          Owner
                        </span>
                      )}
                    </div>
                    <div className="text-xs truncate flex items-center gap-1.5">
                      <Mail
                        className={`w-3 h-3 shrink-0 ${
                          hasEmail ? 'text-slate-400' : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                      <span
                        className={
                          hasEmail
                            ? 'truncate text-slate-500 dark:text-slate-400 font-medium'
                            : 'italic text-slate-400 dark:text-slate-500'
                        }
                      >
                        {displayEmail}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isInvited ? (
                    <span className="text-[11px] bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80 px-2.5 py-1 rounded-xl font-semibold">
                      Invited
                    </span>
                  ) : (
                    role !== 'owner' && (
                      <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl font-semibold capitalize flex items-center gap-1">
                        <Shield className="w-3 h-3 text-slate-400" />
                        {role === 'editor' ? t('peopleView.roleEditor') : t('peopleView.roleViewer')}
                      </span>
                    )
                  )}

                  {/* Reinvite Button for invited members or non-owner collaborators with email */}
                  {!isCurrentUser && userEmail && (
                    <button
                      type="button"
                      onClick={() => handleReinvite(userEmail, role as any, userName, user.node_id)}
                      disabled={reinvitingId === user.node_id}
                      title={t('peopleView.reinvite')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/80 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          reinvitingId === user.node_id ? 'animate-spin text-blue-500' : ''
                        }`}
                      />
                      <span className="hidden sm:inline">
                        {reinvitingId === user.node_id
                          ? t('peopleView.reinviting')
                          : t('peopleView.reinvite')}
                      </span>
                    </button>
                  )}

                  {/* Remove User Button & Confirmation for removable members */}
                  {canRemove && (
                    confirmingRemoveId === user.node_id ? (
                      <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 p-1 rounded-xl border border-rose-200 dark:border-rose-900/60 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(user.node_id, userName, userEmail)}
                          disabled={removingId === user.node_id}
                          className="px-2 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50"
                        >
                          {removingId === user.node_id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>{t('peopleView.confirmRemove')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingRemoveId(null)}
                          disabled={removingId === user.node_id}
                          className="px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                        >
                          {t('peopleView.cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingRemoveId(user.node_id)}
                        disabled={Boolean(removingId)}
                        title={t('peopleView.removeUser')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/80 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                      >
                        {removingId === user.node_id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                        ) : (
                          <UserMinus className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {removingId === user.node_id
                            ? t('peopleView.removingUser')
                            : t('peopleView.removeUser')}
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
