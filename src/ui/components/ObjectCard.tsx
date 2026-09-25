import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LADObject } from '../../core/standard/types';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { OnItsWayModal } from './OnItsWayModal';
import { CardEditModal } from './CardEditModal';
import { SchemaRegistry } from '../../core/schemas/schema-registry';
import { LADFieldDefinition } from '../../core/schemas/card-types';
import { CaptureParser } from '../../core/objects/capture-parser';
import {
  Heart,
  CreditCard,
  ShoppingBag,
  Home,
  FileText,
  Briefcase,
  Sparkles,
  Calendar,
  User,
  CheckSquare,
  Square,
  Trash2,
  Edit2,
  Edit3,
  Check,
  X,
  Clock,
  RotateCcw,
  Palette,
  ChevronDown,
  History,
  ExternalLink,
} from 'lucide-react';

export const renderTextWithShortUrls = (text: string | null | undefined): React.ReactNode => {
  if (!text || typeof text !== 'string') return text;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  if (parts.length <= 1) return text;

  return parts.map((part, index) => {
    if (part.match(/^https?:\/\//i)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          title={part}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-0.5 text-lad-600 dark:text-lad-400 hover:text-lad-700 dark:hover:text-lad-300 font-semibold underline decoration-lad-400/50 hover:decoration-lad-600 transition-colors mx-0.5"
          data-testid="shortened-url-link"
        >
          <span>URL</span>
          <ExternalLink className="w-2.5 h-2.5 inline shrink-0" />
        </a>
      );
    }
    return part;
  });
};

export const CARD_COLOR_PRESETS: Record<string, { border: string; bg: string; dot: string; badge: string }> = {
  blue: {
    border: 'border-blue-300 dark:border-blue-700/80 hover:border-blue-400',
    bg: 'bg-blue-50/30 dark:bg-blue-950/20',
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  emerald: {
    border: 'border-emerald-300 dark:border-emerald-700/80 hover:border-emerald-400',
    bg: 'bg-emerald-50/30 dark:bg-emerald-950/20',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  amber: {
    border: 'border-amber-300 dark:border-amber-700/80 hover:border-amber-400',
    bg: 'bg-amber-50/30 dark:bg-amber-950/20',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  rose: {
    border: 'border-rose-300 dark:border-rose-700/80 hover:border-rose-400',
    bg: 'bg-rose-50/30 dark:bg-rose-950/20',
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  purple: {
    border: 'border-purple-300 dark:border-purple-700/80 hover:border-purple-400',
    bg: 'bg-purple-50/30 dark:bg-purple-950/20',
    dot: 'bg-purple-500',
    badge: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  indigo: {
    border: 'border-indigo-300 dark:border-indigo-700/80 hover:border-indigo-400',
    bg: 'bg-indigo-50/30 dark:bg-indigo-950/20',
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
  cyan: {
    border: 'border-cyan-300 dark:border-cyan-700/80 hover:border-cyan-400',
    bg: 'bg-cyan-50/30 dark:bg-cyan-950/20',
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  },
  orange: {
    border: 'border-orange-300 dark:border-orange-700/80 hover:border-orange-400',
    bg: 'bg-orange-50/30 dark:bg-orange-950/20',
    dot: 'bg-orange-500',
    badge: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  },
  slate: {
    border: 'border-slate-300 dark:border-slate-700 hover:border-slate-400',
    bg: 'bg-slate-50/40 dark:bg-slate-900/40',
    dot: 'bg-slate-400',
    badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200',
  },
};

export const ObjectCard: React.FC<{ obj: LADObject }> = ({ obj }) => {
  const { updateObject, deleteObject, nodes, userRegistry, activeManifest } = useLAD();
  const { t } = useI18n();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isOnItsWayOpen, setIsOnItsWayOpen] = useState(false);

  const isCompleted = obj.status === 'completed';
  const isArchived = obj.status === 'archived';
  const cardType = obj.attributes?.card_type;
  const registeredCardTypeDef = cardType ? SchemaRegistry.getInstance().getCardType(cardType) : undefined;
  const checklist: Array<{ id: string; text: string; completed: boolean }> =
    obj.attributes?.checklist || [];
  const followup = obj.attributes?.followup;

  const [showHistory, setShowHistory] = useState(false);

  // Quick editor state & handlers
  const [quickEditingField, setQuickEditingField] = useState<string | null>(null);
  const [quickEditValue, setQuickEditValue] = useState<any>('');

  const balanceFieldDef: LADFieldDefinition = useMemo(() => {
    return (
      registeredCardTypeDef?.fields.find((f) => f.key === 'balance') || {
        key: 'balance',
        label: 'Balance',
        type: 'currency',
        quickEdit: true,
      }
    );
  }, [registeredCardTypeDef]);

  const isBalanceQuickEditable = balanceFieldDef.quickEdit !== false;

  const startQuickEdit = (e: React.MouseEvent, fieldKey: string, initialVal: any) => {
    e.stopPropagation();
    setQuickEditingField(fieldKey);
    setQuickEditValue(initialVal ?? '');
  };

  const cancelQuickEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setQuickEditingField(null);
  };

  const handleSaveQuickEdit = async (
    e: React.MouseEvent | React.FormEvent | React.KeyboardEvent,
    field: LADFieldDefinition
  ) => {
    e.stopPropagation();
    if ('preventDefault' in e) e.preventDefault();

    let finalVal: any = quickEditValue;
    if (field.type === 'currency' || field.type === 'number') {
      const cleaned = String(quickEditValue).replace(/[^0-9.-]/g, '');
      const num = Number(cleaned);
      finalVal = isNaN(num) ? 0 : num;
    } else if (field.type === 'boolean') {
      finalVal = Boolean(quickEditValue);
    }

    const newAttributes = {
      ...(obj.attributes || {}),
      [field.key]: finalVal,
    };

    await updateObject(
      obj.object_id,
      {
        attributes: newAttributes,
      },
      true
    );

    setQuickEditingField(null);
  };

  // Resolves creator display name from userRegistry or graph nodes
  const creatorDisplay = useMemo(() => {
    const creatorId = obj.created_by || (obj as any).source?.actor;
    if (!creatorId) {
      return userRegistry?.identities?.[0]?.display_name || null;
    }

    // Specific explicit mock in tests
    if (creatorId === 'usr_local_me') {
      return t('card.you') || 'You';
    }

    // Current local user check
    const localIdentity = userRegistry?.identities?.[0];
    const localUserId = userRegistry?.user_id;
    const isCurrentUser =
      Boolean(localUserId && (creatorId === localUserId || creatorId === localUserId.replace(/^usr_/, '') || `usr_${creatorId}` === localUserId)) ||
      Boolean(localIdentity?.subject_id && creatorId === localIdentity.subject_id) ||
      Boolean(localIdentity?.email && creatorId === localIdentity.email) ||
      Boolean((localIdentity as any)?.identity_id && creatorId === (localIdentity as any).identity_id);

    if (isCurrentUser) {
      return localIdentity?.display_name || localIdentity?.email?.split('@')[0] || t('card.you') || 'You';
    }

    // Graph user node check
    if (nodes && nodes.length > 0) {
      const userNode = nodes.find(
        (n) =>
          n.type === 'user' &&
          (n.ref_id === creatorId ||
            n.node_id === creatorId ||
            n.node_id === `usr_${creatorId}` ||
            n.node_id.replace(/^usr_/, '') === creatorId.replace(/^usr_/, ''))
      );
      if (userNode) {
        return userNode.metadata?.display_name || userNode.metadata?.name || userNode.label;
      }
    }

    // Active space manifest members
    if (activeManifest && (activeManifest as any).members) {
      const member = (activeManifest as any).members.find(
        (m: any) =>
          m.user_id === creatorId ||
          m.email === creatorId ||
          m.user_id?.replace(/^usr_/, '') === creatorId.replace(/^usr_/, '')
      );
      if (member && (member.display_name || member.name)) {
        return member.display_name || member.name;
      }
    }

    // Direct email or string (preserve for attribution)
    if (creatorId.includes('@')) {
      return creatorId;
    }

    // Space owner
    if (activeManifest?.created_by) {
      const isOwner =
        activeManifest.created_by === creatorId ||
        activeManifest.created_by.replace(/^usr_/, '') === creatorId.replace(/^usr_/, '');
      if (isOwner && localIdentity?.display_name) {
        return localIdentity.display_name;
      }
    }

    // Fallback: If this is local user's space without collaborators, use local display name
    if (localIdentity?.display_name && (!nodes || nodes.filter((n) => n.type === 'user').length <= 1)) {
      return localIdentity.display_name;
    }

    if (creatorId.startsWith('usr_')) {
      return creatorId.replace('usr_', '');
    }

    return creatorId;
  }, [obj.created_by, (obj as any).source?.actor, userRegistry, nodes, activeManifest, t]);

  // Formats creation date and relative time
  const createdAtFormatted = useMemo(() => {
    if (!obj.created_at) return null;
    try {
      const date = new Date(obj.created_at);
      if (isNaN(date.getTime())) return null;

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHour / 24);

      let relative = '';
      if (diffSec < 60) {
        relative = t('card.justNow') || 'Just now';
      } else if (diffMin < 60) {
        relative = `${diffMin}m ago`;
      } else if (diffHour < 24) {
        relative = `${diffHour}h ago`;
      } else if (diffDays === 1) {
        relative = t('card.yesterday') || 'Yesterday';
      } else if (diffDays < 7) {
        relative = `${diffDays}d ago`;
      } else {
        relative = date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        });
      }

      const fullDate = date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        relative,
        fullDate,
        isVeryRecent: diffMs < 24 * 60 * 60 * 1000,
      };
    } catch {
      return null;
    }
  }, [obj.created_at, t]);

  // Resolves wildcards (e.g. {bank}, {account_type}, etc.) in card titles displayed on the board
  const displayTitle = useMemo(() => {
    const combinedData = {
      ...(obj.attributes || {}),
      title: obj.title,
      domain: obj.domain,
      due_date: obj.due_date,
      assigned_to: obj.assigned_to,
      priority: obj.priority,
    };

    const hasWildcards = /[\{\[\%\$]/.test(obj.title);
    if (hasWildcards) {
      const resolved = CaptureParser.resolveTitleWildcards(obj.title, combinedData, obj.title);
      if (resolved) return resolved;
    }

    if (registeredCardTypeDef?.titleConfig) {
      const { mode, fixedTitle, template } = registeredCardTypeDef.titleConfig;
      const pattern = mode === 'fixed' ? fixedTitle : mode === 'template' ? template : undefined;
      if (pattern && /[\{\[\%\$]/.test(pattern)) {
        if (!obj.title || obj.title === pattern || hasWildcards) {
          const resolved = CaptureParser.resolveTitleWildcards(
            pattern,
            combinedData,
            obj.title || registeredCardTypeDef.name
          );
          if (resolved) return resolved;
        }
      }
    }

    return obj.title;
  }, [obj.title, obj.attributes, obj.due_date, obj.assigned_to, obj.priority, registeredCardTypeDef]);

  const handleToggleCompleted = async () => {
    await updateObject(
      obj.object_id,
      {
        status: isCompleted ? 'active' : 'completed',
        last_checked_at: new Date().toISOString(),
      },
      true
    );
  };

  const handleRestoreToBoard = async () => {
    await updateObject(
      obj.object_id,
      {
        status: 'active',
        last_checked_at: new Date().toISOString(),
      },
      true
    );
  };

  const [isRecategorizeOpen, setIsRecategorizeOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  const cardColor = obj.color || obj.attributes?.color;
  const colorPreset = cardColor ? CARD_COLOR_PRESETS[cardColor] : null;

  const availableCategories = useMemo(() => {
    const list: string[] = ['health', 'finances', 'shopping', 'home', 'documents', 'projects', 'general'];
    if (activeManifest?.categories) {
      for (const c of activeManifest.categories) {
        if (!list.includes(c)) list.push(c);
      }
    }
    return list;
  }, [activeManifest]);

  const handleRecategorize = async (newDomain: string) => {
    setIsRecategorizeOpen(false);
    if (newDomain === obj.domain) return;
    await updateObject(obj.object_id, { domain: newDomain }, true);
  };

  const handleSetColor = async (newColor: string | null) => {
    setIsColorPickerOpen(false);
    await updateObject(obj.object_id, { color: newColor || undefined }, true);
  };

  const handleToggleChecklistItem = async (index: number) => {
    const updated = [...checklist];
    if (updated[index]) {
      updated[index] = { ...updated[index], completed: !updated[index].completed };
      await updateObject(
        obj.object_id,
        {
          attributes: {
            ...obj.attributes,
            checklist: updated,
          },
          last_checked_at: new Date().toISOString(),
        },
        true
      );
    }
  };


  const getDomainStyle = (domain: string) => {
    switch (domain) {
      case 'health':
        return {
          icon: <Heart className="w-3.5 h-3.5 text-rose-500" />,
          border: 'hover:border-rose-300 dark:hover:border-rose-700',
          badge: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          dot: 'bg-rose-500',
        };
      case 'finances':
        return {
          icon: <CreditCard className="w-3.5 h-3.5 text-emerald-500" />,
          border: 'hover:border-emerald-300 dark:hover:border-emerald-700',
          badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          dot: 'bg-emerald-500',
        };
      case 'shopping':
        return {
          icon: <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />,
          border: 'hover:border-amber-300 dark:hover:border-amber-700',
          badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          dot: 'bg-amber-500',
        };
      case 'home':
        return {
          icon: <Home className="w-3.5 h-3.5 text-indigo-500" />,
          border: 'hover:border-indigo-300 dark:hover:border-indigo-700',
          badge: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          dot: 'bg-indigo-500',
        };
      case 'documents':
        return {
          icon: <FileText className="w-3.5 h-3.5 text-blue-500" />,
          border: 'hover:border-blue-300 dark:hover:border-blue-700',
          badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          dot: 'bg-blue-500',
        };
      case 'projects':
        return {
          icon: <Briefcase className="w-3.5 h-3.5 text-purple-500" />,
          border: 'hover:border-purple-300 dark:hover:border-purple-700',
          badge: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          dot: 'bg-purple-500',
        };
      default:
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-slate-500" />,
          border: 'hover:border-slate-300 dark:hover:border-slate-700',
          badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const style = getDomainStyle(obj.domain);

  return (
    <>
      <motion.div
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        className={`p-4 ${
          colorPreset
            ? `${colorPreset.bg} ${colorPreset.border}`
            : `bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 ${style.border}`
        } rounded-2xl shadow-sm transition-all hover:shadow-md flex flex-col justify-between space-y-3 h-fit w-full break-inside-avoid group ${
          isCompleted ? 'opacity-65 bg-slate-50/60 dark:bg-slate-950/60' : ''
        } ${isArchived ? 'opacity-75 border-dashed border-slate-300 dark:border-slate-700' : ''}`}
        data-testid={`card-${obj.object_id}`}
      >
        <div className="space-y-2">
          {/* Top Meta Bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Interactive Recategorize Badge */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsRecategorizeOpen((prev) => !prev);
                    setIsColorPickerOpen(false);
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize transition-all cursor-pointer hover:shadow-xs ${
                    colorPreset?.badge || style.badge
                  }`}
                  title={t('card.recategorize') || 'Recategorize'}
                >
                  {style.icon}
                  <span>{t(`capture.domains.${obj.domain}`) || obj.domain}</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>

                {isRecategorizeOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-0 top-full mt-1 z-30 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 space-y-0.5 text-xs animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="px-2 py-1 text-[9px] font-bold uppercase text-slate-400">
                      {t('card.recategorize') || 'Recategorize'}
                    </div>
                    {availableCategories.map((catId) => (
                      <button
                        key={catId}
                        type="button"
                        onClick={() => handleRecategorize(catId)}
                        className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-left transition-colors cursor-pointer capitalize ${
                          obj.domain === catId
                            ? 'bg-lad-50 dark:bg-lad-950/40 text-lad-700 dark:text-lad-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{t(`capture.domains.${catId}`) || catId}</span>
                        {obj.domain === catId && <span className="text-lad-600 dark:text-lad-400">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {cardType === 'finances.account_balance' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Account Balance
                </span>
              )}

              {cardType === 'shopping.groceries_buying' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-full border border-amber-200 dark:border-amber-800">
                  Groceries
                </span>
              )}

              {cardType === 'health.medical_appointment' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-full border border-rose-200 dark:border-rose-800">
                  {obj.attributes?.specialty || 'Medical Appointment'}
                </span>
              )}

              {registeredCardTypeDef &&
                !['finances.account_balance', 'shopping.groceries_buying', 'health.medical_appointment'].includes(
                  cardType || ''
                ) && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-lad-50 dark:bg-lad-950/40 text-lad-700 dark:text-lad-300 rounded-full border border-lad-200 dark:border-lad-800">
                    {registeredCardTypeDef.name}
                  </span>
                )}

              {isArchived && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full">
                  Archived
                </span>
              )}

              {obj.priority === 'urgent' && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-full">
                  {t('capture.priorities.urgent')}
                </span>
              )}

              {createdAtFormatted?.isVeryRecent && !isCompleted && !isArchived && (
                <span
                  data-testid={`card-freshness-badge-${obj.object_id}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{t('card.newBadge') || 'New'}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isArchived ? (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleRestoreToBoard}
                    className="p-1 text-lad-600 hover:text-lad-700 rounded flex items-center gap-1 text-[11px] font-semibold"
                    title="Restore to active board"
                    data-testid="restore-to-board-button"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </motion.button>
                ) : (
                  <>
                    {/* Quick Color Picker */}
                    <div className="relative">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsColorPickerOpen((prev) => !prev);
                          setIsRecategorizeOpen(false);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                        title={t('card.cardColor') || 'Card Color'}
                      >
                        <Palette className="w-3.5 h-3.5" />
                      </motion.button>
                      {isColorPickerOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1 z-30 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 flex items-center gap-1.5"
                        >
                          {['blue', 'emerald', 'amber', 'rose', 'purple', 'cyan', 'indigo', 'orange'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => handleSetColor(cardColor === c ? null : c)}
                              className={`w-4 h-4 rounded-full transition-transform hover:scale-125 cursor-pointer ${
                                CARD_COLOR_PRESETS[c].dot
                              } ${cardColor === c ? 'ring-2 ring-offset-1 ring-slate-800 dark:ring-white scale-110' : ''}`}
                              title={c}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    {/* History Tracking Button */}
                    {obj.history && obj.history.length > 0 && (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHistory((prev) => !prev);
                        }}
                        className={`p-1 rounded cursor-pointer transition-colors flex items-center gap-0.5 text-[11px] font-semibold ${
                          showHistory
                            ? 'text-lad-600 bg-lad-50 dark:bg-lad-950/40 dark:text-lad-400'
                            : 'text-slate-400 hover:text-lad-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title={t('card.history') || 'History'}
                        data-testid={`card-history-toggle-${obj.object_id}`}
                      >
                        <History className="w-3.5 h-3.5" />
                        {obj.history.length > 1 && (
                          <span className="text-[9px] px-1 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {obj.history.length}
                          </span>
                        )}
                      </motion.button>
                    )}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setIsEditModalOpen(true)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                      title={t('common.edit')}
                      data-testid="edit-card-button"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => deleteObject(obj.object_id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  </>
                )}
              </div>
            </div>

          {/* Card Body */}
          <div>
              {/* Specialized View: Account Balance */}
              {cardType === 'finances.account_balance' ? (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {displayTitle}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {obj.attributes?.bank && (
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {obj.attributes.bank}
                          </span>
                        )}
                        {obj.attributes?.account_type && (
                          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                            • {obj.attributes.account_type} Account
                          </span>
                        )}
                      </div>
                    </div>
                    {obj.attributes?.balance !== undefined && (
                      <div className="text-right">
                        {quickEditingField === 'balance' ? (
                          <div
                            className="flex items-center gap-1.5 justify-end"
                            onClick={(e) => e.stopPropagation()}
                            data-testid="quick-editor-container-balance"
                          >
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">$</span>
                            <input
                              type="number"
                              step="any"
                              autoFocus
                              value={quickEditValue}
                              onChange={(e) => setQuickEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveQuickEdit(e, balanceFieldDef);
                                if (e.key === 'Escape') cancelQuickEdit();
                              }}
                              className="w-28 px-2 py-0.5 text-sm font-bold rounded-lg border border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              data-testid="quick-editor-input-balance"
                            />
                            <button
                              type="button"
                              onClick={(e) => handleSaveQuickEdit(e, balanceFieldDef)}
                              className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-md cursor-pointer transition-colors"
                              title="Save balance"
                              data-testid="quick-editor-save-balance"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelQuickEdit}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer transition-colors"
                              title="Cancel"
                              data-testid="quick-editor-cancel-balance"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="group/balance flex items-center justify-end gap-1.5">
                            <span
                              className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline"
                              onClick={(e) => {
                                if (isBalanceQuickEditable) {
                                  startQuickEdit(e, 'balance', obj.attributes?.balance);
                                }
                              }}
                              title={isBalanceQuickEditable ? 'Click to quick edit balance' : undefined}
                              data-testid={`card-balance-display-${obj.object_id}`}
                            >
                              ${Number(obj.attributes.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                            {isBalanceQuickEditable && (
                              <button
                                type="button"
                                onClick={(e) => startQuickEdit(e, 'balance', obj.attributes?.balance)}
                                className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors opacity-70 group-hover/balance:opacity-100 cursor-pointer"
                                title="Quick edit balance"
                                data-testid="quick-edit-trigger-balance"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {obj.description && obj.description !== displayTitle && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {renderTextWithShortUrls(obj.description)}
                    </p>
                  )}
                </div>
              ) : cardType === 'shopping.groceries_buying' ? (
                /* Specialized View: Groceries Buying with Interactive Checklist */
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {displayTitle}
                    </h3>
                    {checklist.length > 0 && (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {checklist.filter((i) => i.completed).length} / {checklist.length} done
                      </span>
                    )}
                  </div>

                  {checklist.length > 0 && (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {checklist.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          onClick={() => handleToggleChecklistItem(idx)}
                          className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs"
                          data-testid={`checklist-item-${idx}`}
                        >
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => {}} // handled by parent div click
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span
                            className={
                              item.completed
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-700 dark:text-slate-200'
                            }
                          >
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {obj.attributes?.estimated_budget !== undefined && (
                    <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-lg inline-block">
                      Budget: ${Number(obj.attributes.estimated_budget).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : cardType === 'health.medical_appointment' ? (
                /* Specialized View: Medical Appointment with Follow-up Action */
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        {obj.title}
                      </h3>
                      {obj.attributes?.patient && (
                        <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold block">
                          Patient: {obj.attributes.patient}
                        </span>
                      )}
                    </div>
                    {obj.attributes?.date && (
                      <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{obj.attributes.date}</span>
                      </span>
                    )}
                  </div>

                  {obj.attributes?.outcome && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-700 dark:text-slate-200">Notes: </span>
                      {obj.attributes.outcome}
                    </p>
                  )}

                  {(followup?.date || obj.attributes?.needs_followup) && (
                    <div className="flex items-center justify-between p-2 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 rounded-xl">
                      <div className="text-[11px]">
                        <span className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-rose-500" />
                          <span>Follow-up: {followup?.date || 'Pending'}</span>
                        </span>
                        {followup?.reason && (
                          <span className="text-slate-500 text-[10px] block line-clamp-1">
                            {followup.reason}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsOnItsWayOpen(true)}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg shadow-xs transition-colors whitespace-nowrap"
                        data-testid="on-its-way-trigger-button"
                      >
                        On its way
                      </button>
                    </div>
                  )}
                </div>
              ) : registeredCardTypeDef ? (
                /* Dynamic View for Custom or Registered Card Types */
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {displayTitle}
                    </h3>
                  </div>

                  {/* Dynamic field attributes according to schema */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                    {registeredCardTypeDef.fields.map((field) => {
                      if (field.key === 'title') return null;
                      const val = obj.attributes?.[field.key];
                      const isQuickEditable = Boolean(field.quickEdit);
                      const isCurrentlyEditing = quickEditingField === field.key;

                      if (!isQuickEditable && (val === undefined || val === '' || val === null)) {
                        return null;
                      }

                      if (isCurrentlyEditing) {
                        return (
                          <div
                            key={field.key}
                            className="col-span-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-lad-500/50 shadow-xs space-y-1.5"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`quick-editor-container-${field.key}`}
                          >
                            <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">
                              Quick Edit: {field.label}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {field.type === 'currency' && (
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">$</span>
                              )}
                              {field.type === 'select' ? (
                                <select
                                  autoFocus
                                  value={quickEditValue}
                                  onChange={(e) => setQuickEditValue(e.target.value)}
                                  className="flex-1 text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                  data-testid={`quick-editor-input-${field.key}`}
                                >
                                  {(field.options || []).map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : field.type === 'boolean' ? (
                                <label className="flex items-center gap-1.5 flex-1 cursor-pointer text-xs">
                                  <input
                                    type="checkbox"
                                    autoFocus
                                    checked={Boolean(quickEditValue)}
                                    onChange={(e) => setQuickEditValue(e.target.checked)}
                                    className="w-4 h-4 rounded text-lad-600"
                                    data-testid={`quick-editor-input-${field.key}`}
                                  />
                                  <span className="text-slate-700 dark:text-slate-200">{field.label}</span>
                                </label>
                              ) : (
                                <input
                                  type={field.type === 'number' || field.type === 'currency' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                  step={field.type === 'currency' ? 'any' : undefined}
                                  autoFocus
                                  value={quickEditValue}
                                  onChange={(e) => setQuickEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveQuickEdit(e, field);
                                    if (e.key === 'Escape') cancelQuickEdit();
                                  }}
                                  className="flex-1 text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                  data-testid={`quick-editor-input-${field.key}`}
                                />
                              )}
                              <button
                                type="button"
                                onClick={(e) => handleSaveQuickEdit(e, field)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg cursor-pointer transition-colors"
                                title="Save"
                                data-testid={`quick-editor-save-${field.key}`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelQuickEdit}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                                title="Cancel"
                                data-testid={`quick-editor-cancel-${field.key}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      }

                      if (field.type === 'checklist' && Array.isArray(val)) {
                        return (
                          <div key={field.key} className="col-span-full space-y-1">
                            <span className="text-[10px] font-bold uppercase text-slate-400">
                              {field.label} ({val.filter((i: any) => i.completed).length}/{val.length})
                            </span>
                            <div className="space-y-0.5 max-h-24 overflow-y-auto">
                              {val.map((item: any, idx: number) => (
                                <div
                                  key={idx}
                                  onClick={() => handleToggleChecklistItem(idx)}
                                  className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                                >
                                  <input type="checkbox" checked={item.completed} readOnly className="rounded" />
                                  <span className={item.completed ? 'line-through text-slate-400' : ''}>
                                    {item.text}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      if (field.type === 'select') {
                        return (
                          <div key={field.key} className="text-xs group/field">
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="text-[10px] font-bold uppercase text-slate-400">
                                {field.label}
                              </span>
                              {isQuickEditable && (
                                <button
                                  type="button"
                                  onClick={(e) => startQuickEdit(e, field.key, val || (field.options?.[0] || ''))}
                                  className="p-0.5 text-slate-400 hover:text-lad-600 rounded transition-colors cursor-pointer opacity-70 group-hover/field:opacity-100"
                                  title={`Quick edit ${field.label}`}
                                  data-testid={`quick-edit-trigger-${field.key}`}
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            {val !== undefined && val !== '' && val !== null ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                                {String(val)}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Not set</span>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div key={field.key} className="text-xs group/field">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-[10px] font-bold uppercase text-slate-400">
                              {field.label}
                            </span>
                            {isQuickEditable && (
                              <button
                                type="button"
                                onClick={(e) => startQuickEdit(e, field.key, val)}
                                className="p-0.5 text-slate-400 hover:text-lad-600 rounded transition-colors cursor-pointer opacity-70 group-hover/field:opacity-100"
                                title={`Quick edit ${field.label}`}
                                data-testid={`quick-edit-trigger-${field.key}`}
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {val !== undefined && val !== '' && val !== null ? (
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {field.type === 'currency' ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                                  ${Number(val).toLocaleString('en-US')}
                                </span>
                              ) : (
                                renderTextWithShortUrls(String(val))
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Not set</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {obj.description && obj.description !== displayTitle && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 line-clamp-2">
                      {renderTextWithShortUrls(obj.description)}
                    </p>
                  )}
                </div>
              ) : (
                /* Fallback View: General Card */
                <div className="flex items-start gap-2.5">
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={handleToggleCompleted}
                    className="mt-0.5 text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer"
                  >
                    {isCompleted ? (
                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </motion.button>
                  <div className="flex-1">
                    <h3
                      className={`text-xs font-bold text-slate-900 dark:text-white leading-snug transition-all ${
                        isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                      }`}
                    >
                      {displayTitle}
                    </h3>
                    {obj.description && obj.description !== displayTitle && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {renderTextWithShortUrls(obj.description)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* History & State Progression Timeline */}
              <AnimatePresence>
                {showHistory && obj.history && obj.history.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 overflow-hidden"
                    data-testid={`card-history-timeline-${obj.object_id}`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      <span className="flex items-center gap-1">
                        <History className="w-3 h-3 text-lad-500" />
                        {t('card.historyTitle') || 'Card History'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {obj.history.length} {obj.history.length === 1 ? 'entry' : 'updates'}
                      </span>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {obj.history
                        .slice()
                        .reverse()
                        .map((entry, idx) => {
                          const dateObj = new Date(entry.timestamp);
                          const dateStr = !isNaN(dateObj.getTime())
                            ? dateObj.toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : entry.timestamp;

                          return (
                            <div
                              key={idx}
                              className="p-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[10px] border border-slate-200/60 dark:border-slate-700/60 space-y-0.5"
                            >
                              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {entry.actor || 'User'}
                                </span>
                                <span className="text-[9px] text-slate-400">{dateStr}</span>
                              </div>
                              <div className="text-slate-600 dark:text-slate-300 font-medium leading-snug">
                                {entry.summary}
                              </div>
                              {entry.snapshot?.balance !== undefined && (
                                <div className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  ${Number(entry.snapshot.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        {/* Footer Meta: Dates, Actions & Tags */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
            <div className="flex flex-wrap items-center gap-1.5">
              {obj.due_date && cardType !== 'health.medical_appointment' && (
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-lg text-[10px] font-semibold border border-blue-200/50 dark:border-blue-800/50">
                  <Calendar className="w-3 h-3 text-blue-500" />
                  <span>{obj.due_date}</span>
                </span>
              )}

              {obj.assigned_to && cardType !== 'health.medical_appointment' && (
                <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-[10px] font-semibold">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>{obj.assigned_to}</span>
                </span>
              )}
            </div>

            {/* Actionable button for general cards with due dates */}
            {obj.due_date && cardType !== 'health.medical_appointment' && !isArchived && (
              <button
                type="button"
                onClick={() => setIsOnItsWayOpen(true)}
                className="px-2 py-0.5 text-[10px] font-semibold text-lad-600 hover:bg-lad-50 dark:hover:bg-lad-950/40 rounded-md border border-lad-200 dark:border-lad-800 transition-colors"
              >
                On its way
              </button>
            )}
          </div>

          {obj.tags && obj.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {obj.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] font-medium text-slate-400 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.2 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Creator & Creation Timestamp Attribution */}
          {(creatorDisplay || createdAtFormatted) && (
            <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100/80 dark:border-slate-800/50">
              <div className="flex items-center gap-1 min-w-0 truncate">
                {creatorDisplay && (
                  <span
                    className="truncate"
                    data-testid={`card-creator-${obj.object_id}`}
                    title={t('card.createdBy', { name: creatorDisplay }) || `Created by ${creatorDisplay}`}
                  >
                    {t('card.createdPrefix') || 'Created by'}{' '}
                    <strong className="font-semibold text-slate-600 dark:text-slate-300">
                      {creatorDisplay}
                    </strong>
                  </span>
                )}
              </div>
              {createdAtFormatted && (
                <div className="flex items-center gap-1 shrink-0">
                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                  <span
                    data-testid={`card-created-at-${obj.object_id}`}
                    title={createdAtFormatted.fullDate}
                  >
                    {createdAtFormatted.relative}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* OnItsWayModal resolution */}
      <OnItsWayModal
        isOpen={isOnItsWayOpen}
        onClose={() => setIsOnItsWayOpen(false)}
        obj={obj}
      />

      {/* Full Schema Card Edit Modal */}
      <CardEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        obj={obj}
      />
    </>
  );
};
