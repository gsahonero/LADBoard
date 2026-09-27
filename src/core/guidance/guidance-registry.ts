/**
 * LAD Guidance Registry — Modular and Scalable Help System
 * Allows components, spaces, and future extensions to dynamically register
 * contextual topics, cheat-sheets, and interactive guidance.
 */

import { GuidanceTopic, GuidanceShortcut, GuidanceCategory } from './guidance-types';

export class GuidanceRegistry {
  private static instance: GuidanceRegistry;
  private topics: Map<string, GuidanceTopic> = new Map();
  private shortcuts: Map<string, GuidanceShortcut> = new Map();

  private constructor() {
    this.registerDefaultTopics();
    this.registerDefaultShortcuts();
  }

  static getInstance(): GuidanceRegistry {
    if (!GuidanceRegistry.instance) {
      GuidanceRegistry.instance = new GuidanceRegistry();
    }
    return GuidanceRegistry.instance;
  }

  registerTopic(topic: GuidanceTopic): void {
    this.topics.set(topic.id, topic);
  }

  getTopic(id: string): GuidanceTopic | undefined {
    return this.topics.get(id);
  }

  getAllTopics(): GuidanceTopic[] {
    return Array.from(this.topics.values());
  }

  getTopicsByCategory(category: GuidanceCategory): GuidanceTopic[] {
    return this.getAllTopics().filter((t) => t.category === category);
  }

  searchTopics(query: string): GuidanceTopic[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.getAllTopics();

    return this.getAllTopics().filter((topic) => {
      const matchTitle = topic.title.toLowerCase().includes(q);
      const matchSummary = topic.summary.toLowerCase().includes(q);
      const matchKeywords = topic.keywords.some((k) => k.toLowerCase().includes(q));
      const matchSections = topic.sections.some(
        (s) => s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q)
      );
      return matchTitle || matchSummary || matchKeywords || matchSections;
    });
  }

  registerShortcut(shortcut: GuidanceShortcut): void {
    this.shortcuts.set(shortcut.id, shortcut);
  }

  getAllShortcuts(): GuidanceShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  private registerDefaultTopics(): void {
    this.registerTopic({
      id: 'living-memory',
      category: 'concepts',
      title: 'Living Memory & Continuous States',
      summary: 'Learn why LAD Board items evolve naturally over time instead of duplicating.',
      icon: 'Activity',
      badge: 'Core Concept',
      keywords: ['living', 'memory', 'unique', 'state', 'balance', 'history', 'snapshots', 'evolution'],
      sections: [
        {
          title: 'Continuous State Entities (No Duplicate Clutter)',
          body: 'In traditional apps, writing "Bank balance $4,500" creates a new card every time, leaving old cards behind. In LAD Board, continuous entities (like bank accounts or credit limits) automatically update their existing card while archiving historical snapshots.',
          tip: 'When you update your checking balance, the card updates in-place and appends a timestamped diff entry to its History tab.',
        },
        {
          title: 'Full Provenance & History',
          body: 'Every card maintains an auditable history of previous states. Click "History" in any card modal to review past numbers, who made the edit, and exact property modifications.',
        },
        {
          title: 'Customizable Card Types',
          body: 'Space owners can define bespoke card schemas with custom fields, or remove default types from a Space without deleting existing notes.',
        },
      ],
    });

    this.registerTopic({
      id: 'active-engine',
      category: 'concepts',
      title: 'The Active Engine & Monitoring',
      summary: 'How LAD Board watches over deadlines, stale balances, and important tasks.',
      icon: 'Clock',
      badge: 'Active Layer',
      keywords: ['active', 'reminders', 'staleness', 'attention', 'notifications', 'triggers', 'approvals'],
      sections: [
        {
          title: 'Automated Staleness Checks',
          body: 'LAD checks how recently your financial and essential items were touched. If a checking or credit balance has not been verified for 7 days, it surfaces as an attention alert.',
        },
        {
          title: 'Temporal Due Dates & Deadlines',
          body: 'Cards with upcoming dates (medical appointments, bill payments, deliverables) automatically trigger focus notifications within 48 hours of their deadline.',
        },
        {
          title: 'Attention Cockpit (/attention)',
          body: 'The Attention view is your quiet command center. It gathers items requiring human action: confirm, update balance, snooze until tomorrow, or approve pending agent suggestions.',
        },
      ],
    });

    this.registerTopic({
      id: 'fast-capture',
      category: 'capture',
      title: 'Fast Capture & Quick Starters',
      summary: 'Use natural speech and 1-click wizard starters to record thoughts instantly.',
      icon: 'Sparkles',
      badge: 'Capture',
      keywords: ['capture', 'nlp', 'starters', 'wizard', 'templates', 'speech', 'speed'],
      sections: [
        {
          title: 'Natural Language Slot Parsing',
          body: 'Type naturally in the Smart Capture bar, like "Dentist appointment tomorrow 3pm with Dr. Smith #health". LAD automatically extracts dates, contacts, monetary values, and tags.',
        },
        {
          title: 'Custom Quick Starters & Wizard',
          body: 'Click the "+" button next to the quick starter chips or visit Space Settings to open the 4-Step Quick Starter Wizard. Configure custom prompt templates with field wildcards like {bank} or {amount} for any card type.',
          tip: 'Quick Starters can be color-coded and assigned custom icons to fit your exact routine.',
        },
      ],
    });

    this.registerTopic({
      id: 'relational-graph',
      category: 'concepts',
      title: 'Connecting Items (Entity Weaving)',
      summary: 'Link expenses to visits, tasks to projects, and discover hidden relationships.',
      icon: 'Share2',
      badge: 'Living Graph',
      keywords: ['graph', 'links', 'relationships', 'edges', 'nodes', 'network', 'relates'],
      sections: [
        {
          title: 'Bidirectional Card Relationships',
          body: 'Life domains do not exist in isolation. You can link an expense card directly to a medical checkup, or subtasks to a broader household project.',
        },
        {
          title: 'The Network Graph View (/graph)',
          body: 'Switch to the Graph view to explore your knowledge visually. Nodes represent your cards, contacts, and agents, while colored links depict active relationships and ownership.',
        },
      ],
    });

    this.registerTopic({
      id: 'collaboration-privacy',
      category: 'collaboration',
      title: 'Collaboration, Privacy & Sync',
      summary: 'Understand Google Drive cloud sync, offline reliability, and live collaborator presence.',
      icon: 'ShieldCheck',
      badge: 'Privacy First',
      keywords: ['sync', 'offline', 'drive', 'presence', 'collaborators', 'privacy', 'webrtc', 'p2p'],
      sections: [
        {
          title: 'Offline-First by Design',
          body: 'LAD Board never leaves you stranded. All data is cached in IndexedDB on your device. You can capture, browse, and edit completely offline; changes sync automatically when back online.',
        },
        {
          title: 'Private & Secure Cloud Sync',
          body: 'LAD uses the strict Google Drive "drive.file" scope. It only accesses files created by LAD Board in your own Drive. Zero user data is sent to central servers.',
        },
        {
          title: 'Peer Presence & Collaborator Transparency',
          body: 'In shared spaces, live collaborator presence can be enabled by the space owner. Peers communicate directly over encrypted P2P channels with zero relay servers. When joining a space, presence policies are disclosed upfront.',
        },
      ],
    });
  }

  private registerDefaultShortcuts(): void {
    this.registerShortcut({
      id: 'open-capture',
      keyCombo: 'C or N',
      description: 'Open Quick Capture modal from anywhere',
      category: 'capture',
    });
    this.registerShortcut({
      id: 'open-search',
      keyCombo: 'Cmd+K or /',
      description: 'Focus board search filter',
      category: 'navigation',
    });
    this.registerShortcut({
      id: 'close-modal',
      keyCombo: 'Escape',
      description: 'Dismiss any open modal, dialog, or drawer',
      category: 'general',
    });
    this.registerShortcut({
      id: 'open-help',
      keyCombo: '?',
      description: 'Open the Guide & Help Drawer',
      category: 'general',
    });
    this.registerShortcut({
      id: 'sync-now',
      keyCombo: 'Ctrl+S (in Settings)',
      description: 'Save Space or Global settings',
      category: 'editing',
    });
  }
}
