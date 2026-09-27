/**
 * LAD Guidance System — Modular Types & Contracts
 * Defines extensible interfaces for contextual help, core concept guides,
 * keyboard shortcuts, and interactive feature tutorials.
 */

export type GuidanceCategory =
  | 'concepts'
  | 'capture'
  | 'collaboration'
  | 'shortcuts'
  | 'faq';

export interface GuidanceSection {
  title: string;
  body: string;
  tip?: string;
  highlight?: string;
}

export interface GuidanceTopic {
  id: string;
  category: GuidanceCategory;
  title: string;
  summary: string;
  icon: string; // ModernIcon name or Lucide icon identifier
  badge?: string;
  keywords: string[];
  sections: GuidanceSection[];
  relatedRoute?: string;
}

export interface GuidanceShortcut {
  id: string;
  keyCombo: string;
  description: string;
  context?: string;
  category?: 'navigation' | 'capture' | 'editing' | 'general';
}
