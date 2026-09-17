import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import {
  X,
  Layers,
  Plus,
  UserPlus,
  HardDrive,
  Check,
  Pencil,
  Palette,
  Smile,
  FileText,
  Loader2,
} from 'lucide-react';
import {
  SPACE_ICON_PRESETS,
  SPACE_COLOR_PRESETS,
  getSpaceColorConfig,
  resolveSpaceIcon,
} from '../../core/theme/space-identity';
import { ModernIcon } from './ModernIcon';

export const SpaceManagerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateSpace?: () => void;
}> = ({ isOpen, onClose, onOpenCreateSpace }) => {
  const { spaces, activeSpaceId, switchSpace, createSpace, updateSpaceIdentity, inviteMember } = useLAD();
  const { t } = useI18n();

  const [isInviting, setIsInviting] = useState(false);

  // Create Space form state
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceIcon, setNewSpaceIcon] = useState('orbit');
  const [newSpaceColor, setNewSpaceColor] = useState('blue');
  const [newSpaceDesc, setNewSpaceDesc] = useState('');

  // Editing Space state
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('orbit');
  const [editColor, setEditColor] = useState('blue');
  const [editDesc, setEditDesc] = useState('');

  // Invitation state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');

  const [activeSubTab, setActiveSubTab] = useState<'list' | 'create' | 'invite'>('list');
  const [successMsg, setSuccessMsg] = useState('');

  const handleStartEdit = (s: any) => {
    setEditingSpaceId(s.space_id);
    setEditName(s.space_name);
    setEditIcon(resolveSpaceIcon(s.icon, s.space_name));
    setEditColor(s.color || 'blue');
    setEditDesc(s.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editingSpaceId || !editName.trim()) return;
    await updateSpaceIdentity(editingSpaceId, {
      space_name: editName.trim(),
      icon: editIcon,
      color: editColor,
      description: editDesc.trim(),
    });
    setEditingSpaceId(null);
    setSuccessMsg('Space identity updated successfully!');
    setTimeout(() => setSuccessMsg(''), 1500);
  };

  const handleCreate = async () => {
    if (!newSpaceName.trim()) return;
    await createSpace(
      newSpaceName.trim(),
      newSpaceDesc.trim() || undefined,
      newSpaceIcon,
      newSpaceColor
    );
    setNewSpaceName('');
    setNewSpaceDesc('');
    setNewSpaceIcon('orbit');
    setNewSpaceColor('blue');
    setSuccessMsg('Space created successfully!');
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 800);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || isInviting) return;
    setIsInviting(true);
    try {
      await inviteMember(inviteEmail.trim(), inviteRole, inviteName.trim() || undefined);
      setInviteName('');
      setInviteEmail('');
      setSuccessMsg(t('peopleView.invitationSent'));
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Invite error in modal:', err);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[88vh] z-10"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('spaces.title')}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Customize space icons, colors, roles and storage
                  </p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Sub-tabs */}
            <div className="px-6 pt-3 flex gap-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <button
                onClick={() => {
                  setEditingSpaceId(null);
                  setActiveSubTab('list');
                }}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  activeSubTab === 'list'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {t('spaces.title')}
              </button>
              <button
                onClick={() => {
                  if (onOpenCreateSpace) {
                    onClose();
                    onOpenCreateSpace();
                  } else {
                    setEditingSpaceId(null);
                    setActiveSubTab('create');
                  }
                }}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  activeSubTab === 'create'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {t('spaces.createNew')}
              </button>
              <button
                onClick={() => {
                  setEditingSpaceId(null);
                  setActiveSubTab('invite');
                }}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  activeSubTab === 'invite'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {t('spaces.inviteMember')}
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 border border-emerald-200 dark:border-emerald-800 font-medium"
                >
                  <Check className="w-4 h-4" />
                  <span>{successMsg}</span>
                </motion.div>
              )}

              {/* TAB 1: SPACES LIST & INLINE EDITING */}
              {activeSubTab === 'list' && (
                <div className="space-y-3">
                  {spaces.map((s) => {
                    const isActive = s.space_id === activeSpaceId;
                    const isEditing = editingSpaceId === s.space_id;
                    const icon = resolveSpaceIcon(s.icon, s.space_name);
                    const colorCfg = getSpaceColorConfig(s.color);

                    return (
                      <motion.div
                        key={s.space_id}
                        layout
                        className={`p-4 rounded-2xl border transition-all ${
                          isActive
                            ? 'border-2 border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs'
                            : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        {isEditing ? (
                          /* Full Identity Edit Panel */
                          <div className="space-y-3.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <Pencil className="w-3.5 h-3.5 text-blue-500" />
                                Edit Space Identity
                              </span>
                              <button
                                onClick={() => setEditingSpaceId(null)}
                                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>

                            {/* Name */}
                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                Space Name
                              </label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* Icon Picker */}
                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                Space Icon
                              </label>
                              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                                {SPACE_ICON_PRESETS.map((ic) => (
                                  <button
                                    key={ic}
                                    type="button"
                                    onClick={() => setEditIcon(ic)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                      editIcon === ic
                                        ? 'bg-white dark:bg-slate-700 shadow-md ring-2 ring-blue-500 scale-110 text-blue-600 dark:text-blue-400'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                                    }`}
                                  >
                                    <ModernIcon name={ic} className="w-4 h-4" />
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Color Picker */}
                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                Base Color
                              </label>
                              <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                                {SPACE_COLOR_PRESETS.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setEditColor(c.id)}
                                    title={c.name}
                                    style={{ backgroundColor: c.hex }}
                                    className={`w-6 h-6 rounded-full transition-transform cursor-pointer flex items-center justify-center text-white ${
                                      editColor === c.id
                                        ? 'ring-2 ring-offset-2 ring-blue-500 scale-110 shadow-sm'
                                        : 'hover:scale-105 opacity-85 hover:opacity-100'
                                    }`}
                                  >
                                    {editColor === c.id && <Check className="w-3.5 h-3.5" />}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Description */}
                            <div>
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                Description
                              </label>
                              <input
                                type="text"
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                placeholder="What is this space for?"
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* Save Actions */}
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={handleSaveEdit}
                                disabled={!editName.trim()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Save Identity
                              </button>
                              <button
                                onClick={() => setEditingSpaceId(null)}
                                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Space Card View */
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                style={{
                                  backgroundColor: `${colorCfg.hex}18`,
                                  borderColor: `${colorCfg.hex}40`,
                                  color: colorCfg.hex,
                                }}
                                className="w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 shadow-xs"
                              >
                                <ModernIcon name={icon} className="w-5 h-5" />
                              </div>

                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                  <span className="truncate">{s.space_name}</span>
                                  {isActive && (
                                    <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                                      Active
                                    </span>
                                  )}
                                  <span
                                    style={{
                                      backgroundColor: `${colorCfg.hex}20`,
                                      color: colorCfg.hex,
                                    }}
                                    className="text-[9px] px-1.5 py-0.2 rounded font-semibold capitalize"
                                  >
                                    {colorCfg.name}
                                  </span>
                                </div>

                                {s.description && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    {s.description}
                                  </p>
                                )}

                                <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-1">
                                  <span className="flex items-center gap-1">
                                    <HardDrive className="w-3 h-3" />
                                    {s.storage_provider}
                                  </span>
                                  <span>•</span>
                                  <span className="capitalize">{s.role}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleStartEdit(s)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                                title="Customize space identity (icon, color, description)"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              {!isActive && (
                                <motion.button
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => {
                                    switchSpace(s.space_id);
                                    onClose();
                                  }}
                                  className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer"
                                >
                                  {t('spaces.switchSpace')}
                                </motion.button>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: CREATE NEW SPACE WITH FULL IDENTITY */}
              {activeSubTab === 'create' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('spaces.spaceName')} *
                    </label>
                    <input
                      type="text"
                      value={newSpaceName}
                      onChange={(e) => setNewSpaceName(e.target.value)}
                      placeholder="e.g. Research Lab, Art Studio, Side Project"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Icon Selector */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                      <Smile className="w-3.5 h-3.5 text-blue-500" />
                      Choose Space Icon
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                      {SPACE_ICON_PRESETS.map((ic) => (
                        <button
                          key={ic}
                          type="button"
                          onClick={() => setNewSpaceIcon(ic)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                            newSpaceIcon === ic
                              ? 'bg-white dark:bg-slate-700 shadow-md ring-2 ring-blue-500 scale-110 text-blue-600 dark:text-blue-400'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                          }`}
                        >
                          <ModernIcon name={ic} className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Selector */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-blue-500" />
                      Choose Base Color
                    </label>
                    <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                      {SPACE_COLOR_PRESETS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setNewSpaceColor(c.id)}
                          title={c.name}
                          style={{ backgroundColor: c.hex }}
                          className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center text-white ${
                            newSpaceColor === c.id
                              ? 'ring-2 ring-offset-2 ring-blue-500 scale-110 shadow-sm'
                              : 'hover:scale-105 opacity-85 hover:opacity-100'
                          }`}
                        >
                          {newSpaceColor === c.id && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      {t('spaces.spaceDescription')}
                    </label>
                    <textarea
                      value={newSpaceDesc}
                      onChange={(e) => setNewSpaceDesc(e.target.value)}
                      rows={2}
                      placeholder="e.g. Experiments, scientific papers, and research grant tasks"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreate}
                    disabled={!newSpaceName.trim()}
                    className="w-full mt-2 py-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    {t('spaces.createButton')}
                  </motion.button>
                </div>
              )}

              {/* TAB 3: INVITE COLLABORATORS */}
              {activeSubTab === 'invite' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('peopleView.nameLabel')}
                    </label>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="e.g. Sarah Connor"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('spaces.inviteEmail')} *
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="collaborator@gmail.com"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="editor">{t('peopleView.roleEditor')}</option>
                      <option value="viewer">{t('peopleView.roleViewer')}</option>
                    </select>
                  </div>

                  <motion.button
                    whileHover={!isInviting ? { scale: 1.02 } : undefined}
                    whileTap={!isInviting ? { scale: 0.98 } : undefined}
                    onClick={handleInvite}
                    disabled={!inviteEmail.trim() || isInviting}
                    className="w-full mt-2 py-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isInviting ? (
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
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

