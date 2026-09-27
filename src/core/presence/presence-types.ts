/**
 * Types and interfaces for the Serverless Real-Time Presence Engine.
 * Supports BroadcastChannel for multi-tab synchronization and peer coordination.
 */

export interface UserPresence {
  userId: string;
  tabId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  color?: string;
  lastActive: number; // Unix timestamp in ms
  status: 'active' | 'idle' | 'offline';
  activeCardId?: string;
}

export type PresenceMessageType = 'heartbeat' | 'leave' | 'card_focus';

export interface PresenceMessage {
  type: PresenceMessageType;
  spaceId: string;
  presence: UserPresence;
}

export interface PresenceConfig {
  heartbeatIntervalMs?: number;
  idleTimeoutMs?: number;
  offlineTimeoutMs?: number;
}
