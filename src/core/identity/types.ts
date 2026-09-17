/**
 * Identity Types for LAD Board
 */

export interface AuthUser {
  userId: string; // "usr_..."
  email: string;
  name: string;
  picture?: string;
  provider: 'google' | 'local';
  accessToken?: string;
  expiresAt?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  isLoading: boolean;
  error?: string | null;
}
