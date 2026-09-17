/**
 * LAD Standard 1.0 & LAD Board Constants
 */

export const LAD_STANDARD_VERSION = '1.0';
export const LAD_BOARD_VERSION = '0.1.0';

export const DEFAULT_COMMIT_THRESHOLD_MS = 5000; // 5-second change aggregation window
export const DEFAULT_ACTIVE_EVAL_INTERVAL_MS = 30000; // 30-second active evaluation interval

export const DEFAULT_STORAGE_PROVIDER = 'local_indexeddb';

// Configured Google OAuth2 Client ID
export const DEFAULT_GDRIVE_CLIENT_ID = '631483684036-2ismtqicfm72b241ksfr2uu30m4e1uqv.apps.googleusercontent.com';

export const DEFAULT_DOMAINS = [
  'health',
  'finances',
  'documents',
  'home',
  'shopping',
  'projects',
  'general',
] as const;

export type DomainType = typeof DEFAULT_DOMAINS[number] | string;
