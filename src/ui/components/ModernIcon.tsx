import React from 'react';
import {
  Fingerprint,
  Users,
  Briefcase,
  Workflow,
  Microscope,
  Dna,
  Atom,
  Palette,
  Sparkles,
  Compass,
  Boxes,
  Layers,
  Cpu,
  Terminal,
  ShieldCheck,
  Activity,
  Zap,
  Target,
  Flame,
  Gem,
  Wallet,
  ShoppingBag,
  FileText,
  FolderKanban,
  Home,
  Orbit,
  HeartHandshake,
  Lightbulb,
  Wrench,
  BookOpen,
  Send,
  LucideProps,
} from 'lucide-react';

export type ModernIconName =
  | 'fingerprint'
  | 'user'
  | 'users'
  | 'family'
  | 'briefcase'
  | 'workflow'
  | 'microscope'
  | 'dna'
  | 'atom'
  | 'palette'
  | 'sparkles'
  | 'compass'
  | 'boxes'
  | 'layers'
  | 'cpu'
  | 'terminal'
  | 'shield'
  | 'shield-check'
  | 'activity'
  | 'zap'
  | 'target'
  | 'flame'
  | 'gem'
  | 'wallet'
  | 'shopping'
  | 'shopping-bag'
  | 'documents'
  | 'file-text'
  | 'projects'
  | 'folder-kanban'
  | 'home'
  | 'orbit'
  | 'general'
  | 'health'
  | 'finances'
  | string;

const ICON_MAP: Record<string, React.FC<LucideProps>> = {
  fingerprint: Fingerprint,
  user: Fingerprint,
  '👤': Fingerprint,
  users: Users,
  family: Users,
  '👨‍👩‍👧': Users,
  'heart-handshake': HeartHandshake,
  briefcase: Briefcase,
  workflow: Workflow,
  '💼': Workflow,
  microscope: Microscope,
  '🔬': Microscope,
  dna: Dna,
  '🌿': Dna,
  atom: Atom,
  palette: Palette,
  '🎨': Palette,
  sparkles: Sparkles,
  '✨': Sparkles,
  compass: Compass,
  '🧭': Compass,
  boxes: Boxes,
  '📦': Boxes,
  layers: Layers,
  '🪐': Orbit,
  orbit: Orbit,
  cpu: Cpu,
  '⚡': Zap,
  zap: Zap,
  terminal: Terminal,
  shield: ShieldCheck,
  'shield-check': ShieldCheck,
  '🛡️': ShieldCheck,
  activity: Activity,
  health: Activity,
  '🩺': Activity,
  wallet: Wallet,
  finances: Wallet,
  '💳': Wallet,
  '💰': Wallet,
  'shopping-bag': ShoppingBag,
  shopping: ShoppingBag,
  '🛒': ShoppingBag,
  'file-text': FileText,
  documents: FileText,
  '📄': FileText,
  'folder-kanban': FolderKanban,
  projects: FolderKanban,
  home: Home,
  '🏠': Home,
  target: Target,
  '🎯': Target,
  flame: Flame,
  '🔥': Flame,
  gem: Gem,
  '💎': Gem,
  lightbulb: Lightbulb,
  '💡': Lightbulb,
  wrench: Wrench,
  '🛠️': Wrench,
  book: BookOpen,
  '📚': BookOpen,
  '🚀': Send,
  general: Sparkles,
};

interface ModernIconProps extends LucideProps {
  name?: string;
  fallbackText?: string;
}

export const ModernIcon: React.FC<ModernIconProps> = ({
  name = 'orbit',
  className = 'w-5 h-5',
  fallbackText,
  ...props
}) => {
  const normalizedKey = (name || '').trim().toLowerCase();
  const IconComponent = ICON_MAP[normalizedKey] || ICON_MAP[name];

  if (IconComponent) {
    return <IconComponent className={className} {...props} />;
  }

  // If unknown text glyph, render styled badge or fallback
  if (name && name.length <= 4 && !name.startsWith('http')) {
    return <span className="inline-block select-none leading-none">{name}</span>;
  }

  return <Orbit className={className} {...props} />;
};
