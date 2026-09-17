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
  Folder,
  Home,
  Orbit,
  HeartHandshake,
  Lightbulb,
  Wrench,
  BookOpen,
  Send,
  Rocket,
  Coffee,
  Star,
  Heart,
  Sun,
  Moon,
  Cloud,
  Code,
  Music,
  Bell,
  Calendar,
  Database,
  Server,
  Check,
  File,
  Smile,
  Gift,
  Tag,
  Key,
  Lock,
  Globe,
  Flag,
  Tv,
  Anchor,
  Feather,
  Award,
  Crown,
  Camera,
  Video,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Sliders,
  Eye,
  Search,
  TreePine,
  GraduationCap,
  Headphones,
  Radio,
  Smartphone,
  Laptop,
  Monitor,
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
  folder: Folder,
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
  '🚀': Rocket,
  rocket: Rocket,
  general: Sparkles,
  coffee: Coffee,
  '☕': Coffee,
  star: Star,
  '⭐': Star,
  heart: Heart,
  '❤️': Heart,
  sun: Sun,
  '☀️': Sun,
  moon: Moon,
  '🌙': Moon,
  cloud: Cloud,
  '☁️': Cloud,
  code: Code,
  music: Music,
  '🎵': Music,
  bell: Bell,
  '🔔': Bell,
  calendar: Calendar,
  '📅': Calendar,
  database: Database,
  server: Server,
  check: Check,
  file: File,
  smile: Smile,
  '😊': Smile,
  gift: Gift,
  '🎁': Gift,
  tag: Tag,
  key: Key,
  '🔑': Key,
  lock: Lock,
  '🔒': Lock,
  globe: Globe,
  '🌐': Globe,
  flag: Flag,
  '🚩': Flag,
  tv: Tv,
  anchor: Anchor,
  feather: Feather,
  award: Award,
  crown: Crown,
  '👑': Crown,
  camera: Camera,
  '📷': Camera,
  video: Video,
  phone: Phone,
  mail: Mail,
  '✉️': Mail,
  send: Send,
  message: MessageSquare,
  pin: MapPin,
  sliders: Sliders,
  eye: Eye,
  search: Search,
  tree: TreePine,
  '🌲': TreePine,
  education: GraduationCap,
  '🎓': GraduationCap,
  headphones: Headphones,
  '🎧': Headphones,
  radio: Radio,
  smartphone: Smartphone,
  '📱': Smartphone,
  laptop: Laptop,
  '💻': Laptop,
  monitor: Monitor,
  '🖥️': Monitor,
};

function getGraphemeCount(text: string): number {
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    try {
      const segmenter = new (Intl as any).Segmenter();
      return Array.from(segmenter.segment(text)).length;
    } catch {
      // Fallback
    }
  }
  return Array.from(text).length;
}

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
  const trimmed = (name || '').trim();
  const normalizedKey = trimmed.toLowerCase();

  // 1. Direct match in icon map
  const IconComponent = ICON_MAP[normalizedKey] || ICON_MAP[trimmed];
  if (IconComponent) {
    return <IconComponent className={className} {...props} />;
  }

  // 2. Pasted image URL (http, https, or data URL)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
    return (
      <img
        src={trimmed}
        alt="Space Icon"
        className={`${className} object-contain rounded-xs select-none inline-block`}
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLElement).style.display = 'none';
        }}
      />
    );
  }

  // 3. Pasted raw SVG markup
  if (trimmed.startsWith('<svg') && trimmed.endsWith('</svg>')) {
    const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(trimmed)}`;
    return (
      <img
        src={svgDataUrl}
        alt="Space Icon"
        className={`${className} object-contain rounded-xs select-none inline-block`}
      />
    );
  }

  // 4. Pasted Emoji or short monogram/symbol (up to 4 grapheme clusters, e.g. 🚀, 🧪, 👨‍👩‍👧‍👦, "AI", "MED")
  const graphemes = getGraphemeCount(trimmed);
  if (graphemes > 0 && graphemes <= 4 && !trimmed.includes('\n')) {
    return (
      <span
        className={`inline-flex items-center justify-center select-none leading-none shrink-0 font-bold ${className}`}
        style={{ fontSize: graphemes === 1 ? '1.15em' : '0.82em' }}
        role="img"
        aria-label={trimmed}
      >
        {trimmed}
      </span>
    );
  }

  // Fallback icon
  return <Orbit className={className} {...props} />;
};

