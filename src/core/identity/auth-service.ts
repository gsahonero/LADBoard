/**
 * Authentication Service supporting Google Identity Services (GIS) and Local Offline Auth
 */

import { AuthUser, AuthState } from './types';

declare global {
  interface Window {
    google?: any;
  }
}

export class AuthService {
  private state: AuthState = {
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null,
  };

  private listeners: Array<(state: AuthState) => void> = [];
  private tokenClient: any = null;

  constructor() {
    this.restoreSession();
  }

  private restoreSession() {
    try {
      const stored = localStorage.getItem('lad_auth_user');
      if (stored) {
        const user = JSON.parse(stored) as AuthUser;
        const isExpired = Boolean(
          user.provider === 'google' && user.expiresAt && Date.now() > user.expiresAt
        );

        if (isExpired) {
          user.accessToken = undefined;
        }

        this.state = {
          isAuthenticated: Boolean(user.provider === 'local' || user.accessToken),
          user,
          isLoading: false,
          error: null,
        };
      }
    } catch {
      // Ignore
    }
  }

  isTokenExpired(): boolean {
    if (!this.state.user) return true;
    if (this.state.user.provider === 'local') return false;
    if (!this.state.user.accessToken) return true;
    if (this.state.user.expiresAt && Date.now() > this.state.user.expiresAt) return true;
    return false;
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  getState(): AuthState {
    return this.state;
  }

  /**
   * Ensures Google Identity Services (GIS) library is loaded in window
   */
  private async ensureGisScriptLoaded(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (window.google?.accounts?.oauth2) return;

    return new Promise((resolve) => {
      let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]') as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      const checkInterval = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      script.onload = () => {
        clearInterval(checkInterval);
        resolve();
      };

      // Fallback timeout after 4s
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 4000);
    });
  }

  /**
   * Initializes or signs in with Google using GIS token client
   */
  async signInWithGoogle(clientId: string): Promise<AuthUser> {
    if (!clientId) {
      throw new Error('Google OAuth2 Client ID is required');
    }

    this.state.isLoading = true;
    this.notify();

    await this.ensureGisScriptLoaded();

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
        this.state = {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: 'Google Identity Services library not available. Please check internet connection.',
        };
        this.notify();
        reject(new Error(this.state.error!));
        return;
      }

      try {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope:
            'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar.events email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              this.state = {
                isAuthenticated: false,
                user: null,
                isLoading: false,
                error: tokenResponse.error,
              };
              this.notify();
              reject(new Error(tokenResponse.error));
              return;
            }

            try {
              // Fetch Google User Profile info with access token
              const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });
              const profile = await userRes.json();

              const expiresIn = tokenResponse.expires_in
                ? parseInt(tokenResponse.expires_in, 10)
                : 3600;
              const expiresAt = Date.now() + (expiresIn - 60) * 1000;

              const user: AuthUser = {
                userId: `usr_g_${profile.sub?.substring(0, 10) || Math.random().toString(36).substring(2, 8)}`,
                email: profile.email || 'google_user@gmail.com',
                name: profile.name || profile.email?.split('@')[0] || 'Google User',
                picture: profile.picture,
                provider: 'google',
                accessToken: tokenResponse.access_token,
                expiresAt,
              };

              this.state = {
                isAuthenticated: true,
                user,
                isLoading: false,
                error: null,
              };

              localStorage.setItem('lad_auth_user', JSON.stringify(user));
              this.notify();
              resolve(user);
            } catch (err: any) {
              this.state = {
                isAuthenticated: false,
                user: null,
                isLoading: false,
                error: err.message,
              };
              this.notify();
              reject(err);
            }
          },
          error_callback: (err: any) => {
            const isPopupClosed = err?.type === 'popup_closed' || err?.message?.includes('closed');
            this.state = {
              isAuthenticated: false,
              user: null,
              isLoading: false,
              error: isPopupClosed ? 'Google Sign-In prompt was closed.' : (err?.message || 'Google OAuth prompt was cancelled'),
            };
            this.notify();
            reject(new Error(this.state.error!));
          },
        });

        // Trigger Google OAuth dialog
        this.tokenClient.requestAccessToken({ prompt: '' });
      } catch (err: any) {
        this.state = {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: err.message,
        };
        this.notify();
        reject(err);
      }
    });
  }

  /**
   * Signs in with local / offline identity
   */
  signInDemo(email: string = 'demo@ladboard.local', name: string = 'Local User'): AuthUser {
    const user: AuthUser = {
      userId: `usr_local_${Math.random().toString(36).substring(2, 8)}`,
      email,
      name,
      provider: 'local',
    };

    this.state = {
      isAuthenticated: true,
      user,
      isLoading: false,
      error: null,
    };

    localStorage.setItem('lad_auth_user', JSON.stringify(user));
    this.notify();
    return user;
  }

  signOut() {
    this.state = {
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
    };
    localStorage.removeItem('lad_auth_user');
    this.notify();
  }
}
