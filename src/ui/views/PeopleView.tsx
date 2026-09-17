/**
 * People View — Space Members, Interpersonal Relationships, and Invitations
 */

import React, { useState } from 'react';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { Users, UserPlus, Check, Mail, Shield, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

export const PeopleView: React.FC = () => {
  const { nodes, inviteMember, userRegistry } = useLAD();
  const { t } = useI18n();

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'owner' | 'editor' | 'viewer'>('editor');
  const [successMsg, setSuccessMsg] = useState('');

  const userNodes = nodes.filter((n) => n.type === 'user');

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;
    await inviteMember(inviteEmail.trim(), inviteRole, inviteName.trim() || undefined);
    setInviteName('');
    setInviteEmail('');
    setSuccessMsg(t('peopleView.invitationSent'));
    setTimeout(() => setSuccessMsg(''), 2500);
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
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
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
                disabled={!inviteEmail.trim()}
                className="px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>{t('spaces.sendInvite')}</span>
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

            // Resolve real user display name
            let userName = user.metadata?.name || user.label;
            if (
              user.node_id === `node_${userRegistry?.user_id}` ||
              user.node_id === userRegistry?.user_id ||
              role === 'owner'
            ) {
              if (
                userRegistry?.identities[0]?.display_name &&
                (userName === 'Current User' || userName === 'Owner' || !userName)
              ) {
                userName = userRegistry.identities[0].display_name;
              }
            }

            const userEmail =
              user.metadata?.email ||
              (user.label.includes('@') ? user.label : undefined) ||
              (role === 'owner' ? userRegistry?.identities[0]?.email : undefined);

            const initials = (userName || 'U')
              .split(' ')
              .map((p: string) => p[0])
              .filter(Boolean)
              .join('')
              .substring(0, 2)
              .toUpperCase();

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
                    {userEmail && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{userEmail}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isInvited ? (
                    <span className="text-[11px] bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-xl font-semibold">
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
