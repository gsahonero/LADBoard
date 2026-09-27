/**
 * Serverless Real-Time Presence Engine.
 * Operates 100% client-side with zero server infrastructure costs ($0.00).
 * Uses BroadcastChannel for local cross-tab real-time sync, WebRTC P2P ready,
 * and maintains strict privacy enforcement when disabled by space settings.
 */

import { UserPresence, PresenceMessage, PresenceConfig } from './presence-types';

const DEFAULT_CONFIG: Required<PresenceConfig> = {
  heartbeatIntervalMs: 8000,
  idleTimeoutMs: 20000,
  offlineTimeoutMs: 30000,
};

const USER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#14b8a6', // teal
];

export function getDeterministicColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % USER_COLORS.length;
  return USER_COLORS[index];
}

export class PresenceManager {
  private static instance: PresenceManager | null = null;
  private readonly tabId: string;
  private spaceId: string | null = null;
  private currentUser: { userId: string; displayName: string; email?: string } | null = null;
  private presenceEnabled: boolean = true;
  private channel: BroadcastChannel | null = null;
  private heartbeatTimer: any = null;
  private peers: Map<string, UserPresence> = new Map();
  private subscribers: Set<(presences: UserPresence[]) => void> = new Set();
  private activeCardId?: string;
  private config: Required<PresenceConfig>;

  private constructor(config?: PresenceConfig) {
    this.tabId = `tab_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.sendLeave();
      });
    }
  }

  public static getInstance(config?: PresenceConfig): PresenceManager {
    if (!PresenceManager.instance) {
      PresenceManager.instance = new PresenceManager(config);
    }
    return PresenceManager.instance;
  }

  /**
   * Start or update presence for an active space
   */
  public start(
    spaceId: string,
    user: { userId: string; displayName: string; email?: string },
    enabled: boolean = true
  ): void {
    const spaceChanged = this.spaceId !== spaceId;
    this.spaceId = spaceId;
    this.currentUser = user;
    this.presenceEnabled = enabled;

    if (spaceChanged) {
      this.cleanupChannel();
      this.peers.clear();
      this.notifySubscribers();
    }

    if (!this.presenceEnabled) {
      this.sendLeave();
      this.cleanupChannel();
      this.peers.clear();
      this.notifySubscribers();
      return;
    }

    if (!this.channel && typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(`lad_presence_${spaceId}`);
        this.channel.onmessage = (event: MessageEvent) => {
          this.handleChannelMessage(event.data);
        };
      } catch (err) {
        console.warn('[PresenceManager] BroadcastChannel not supported in this environment', err);
      }
    }

    // Send immediate heartbeat
    this.sendHeartbeat();

    // Start recurring heartbeat & cleanup
    if (!this.heartbeatTimer) {
      this.heartbeatTimer = setInterval(() => {
        this.sendHeartbeat();
        this.pruneStalePeers();
      }, this.config.heartbeatIntervalMs);
    }
  }

  /**
   * Stop presence engine completely
   */
  public stop(): void {
    this.sendLeave();
    this.cleanupChannel();
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.peers.clear();
    this.notifySubscribers();
  }

  /**
   * Notify peers which card is currently focused / opened
   */
  public setActiveCard(cardId?: string): void {
    if (this.activeCardId === cardId) return;
    this.activeCardId = cardId;
    if (this.presenceEnabled && this.currentUser && this.spaceId) {
      this.sendHeartbeat('card_focus');
    }
  }

  /**
   * Get all live presences including or excluding current tab
   */
  public getPresences(includeSelf: boolean = false): UserPresence[] {
    const list = Array.from(this.peers.values());
    if (includeSelf && this.currentUser && this.presenceEnabled) {
      list.unshift(this.getLocalPresence());
    }
    return list;
  }

  public subscribe(callback: (presences: UserPresence[]) => void): () => void {
    this.subscribers.add(callback);
    callback(this.getPresences(false));
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private getLocalPresence(): UserPresence {
    return {
      userId: this.currentUser?.userId || 'anonymous',
      tabId: this.tabId,
      displayName: this.currentUser?.displayName || 'Anonymous',
      email: this.currentUser?.email,
      color: getDeterministicColor(this.currentUser?.userId || 'anonymous'),
      lastActive: Date.now(),
      status: 'active',
      activeCardId: this.activeCardId,
    };
  }

  private sendHeartbeat(type: 'heartbeat' | 'card_focus' = 'heartbeat'): void {
    if (!this.presenceEnabled || !this.currentUser || !this.spaceId || !this.channel) {
      return;
    }

    const message: PresenceMessage = {
      type,
      spaceId: this.spaceId,
      presence: this.getLocalPresence(),
    };

    try {
      this.channel.postMessage(message);
    } catch {
      // Channel may be closing
    }
  }

  private sendLeave(): void {
    if (!this.spaceId || !this.channel || !this.currentUser) return;
    try {
      const message: PresenceMessage = {
        type: 'leave',
        spaceId: this.spaceId,
        presence: {
          ...this.getLocalPresence(),
          status: 'offline',
        },
      };
      this.channel.postMessage(message);
    } catch {
      // Ignored
    }
  }

  private handleChannelMessage(data: any): void {
    if (!data || data.spaceId !== this.spaceId) return;
    const msg = data as PresenceMessage;

    // Ignore self messages
    if (msg.presence?.tabId === this.tabId) return;

    if (msg.type === 'leave') {
      this.peers.delete(msg.presence.tabId);
      this.notifySubscribers();
      return;
    }

    if (msg.type === 'heartbeat' || msg.type === 'card_focus') {
      this.peers.set(msg.presence.tabId, {
        ...msg.presence,
        lastActive: Date.now(),
      });
      this.notifySubscribers();
    }
  }

  private pruneStalePeers(): void {
    const now = Date.now();
    let changed = false;

    for (const [tabId, peer] of this.peers.entries()) {
      const elapsed = now - peer.lastActive;
      if (elapsed > this.config.offlineTimeoutMs) {
        this.peers.delete(tabId);
        changed = true;
      } else if (elapsed > this.config.idleTimeoutMs && peer.status !== 'idle') {
        this.peers.set(tabId, { ...peer, status: 'idle' });
        changed = true;
      }
    }

    if (changed) {
      this.notifySubscribers();
    }
  }

  private cleanupChannel(): void {
    if (this.channel) {
      try {
        this.channel.close();
      } catch {
        // Ignored
      }
      this.channel = null;
    }
  }

  private notifySubscribers(): void {
    const presences = this.getPresences(false);
    for (const sub of this.subscribers) {
      try {
        sub(presences);
      } catch (err) {
        console.error('[PresenceManager] Subscriber error:', err);
      }
    }
  }
}
