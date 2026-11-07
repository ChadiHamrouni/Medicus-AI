import * as SecureStore from 'expo-secure-store';

const TOKEN_EXPIRES_AT_KEY = 'medicus_token_expires_at';

interface TokenExpirationManager {
  setExpirationTimer: (expiresAt: string, onExpire: () => void) => void;
  clearExpirationTimer: () => void;
  isTokenExpired: (expiresAt: string) => boolean;
  getTimeUntilExpiration: (expiresAt: string) => number;
  persistExpirationTime: (expiresAt: string) => Promise<void>;
  getPersistedExpirationTime: () => Promise<string | null>;
  clearPersistedExpirationTime: () => Promise<void>;
  restoreTimerFromPersistence: (onExpire: () => void) => Promise<boolean>;
}

class TokenExpirationManagerImpl implements TokenExpirationManager {
  private expirationTimer: ReturnType<typeof setTimeout> | null = null;

  setExpirationTimer(expiresAt: string, onExpire: () => void): void {
    // Clear any existing timer
    this.clearExpirationTimer();

    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    const timeUntilExpiration = expirationTime - currentTime;

    if (timeUntilExpiration <= 0) {
      onExpire();
      return;
    }
    this.expirationTimer = setTimeout(() => {
      onExpire();
    }, timeUntilExpiration);

    // Persist the expiration time
    this.persistExpirationTime(expiresAt).catch(error => {
      console.warn('Failed to persist token expiration time:', error);
    });
  }

  clearExpirationTimer(): void {
    if (this.expirationTimer) {
      clearTimeout(this.expirationTimer);
      this.expirationTimer = null;
    }
  }

  isTokenExpired(expiresAt: string): boolean {
    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    return currentTime >= expirationTime;
  }

  getTimeUntilExpiration(expiresAt: string): number {
    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    return Math.max(0, expirationTime - currentTime);
  }

  async persistExpirationTime(expiresAt: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_EXPIRES_AT_KEY, expiresAt);
    } catch (error) {
      console.error('Failed to persist token expiration time:', error);
      throw error;
    }
  }

  async getPersistedExpirationTime(): Promise<string | null> {
    try {
      const persistedTime =
        await SecureStore.getItemAsync(TOKEN_EXPIRES_AT_KEY);
      return persistedTime;
    } catch (error) {
      console.error('Failed to get persisted token expiration time:', error);
      return null;
    }
  }

  async clearPersistedExpirationTime(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_EXPIRES_AT_KEY);
    } catch (error) {
      console.error('Failed to clear persisted token expiration time:', error);
    }
  }

  async restoreTimerFromPersistence(onExpire: () => void): Promise<boolean> {
    try {
      const persistedExpiresAt = await this.getPersistedExpirationTime();

      if (!persistedExpiresAt) {
        return false;
      }

      // Check if the persisted token is still valid
      if (this.isTokenExpired(persistedExpiresAt)) {
        await this.clearPersistedExpirationTime();
        onExpire();
        return false;
      }

      // Token is still valid, restore the timer
      const timeUntilExpiration =
        this.getTimeUntilExpiration(persistedExpiresAt);
      this.setExpirationTimer(persistedExpiresAt, onExpire);
      return true;
    } catch (error) {
      console.error('Failed to restore timer from persistence:', error);
      return false;
    }
  }
}

export const tokenExpirationManager = new TokenExpirationManagerImpl();

export const handleTokenExpiredLogout = async () => {
  // Clear persisted token expiration time
  try {
    await tokenExpirationManager.clearPersistedExpirationTime();
  } catch (error) {
    console.error('Failed to clear persisted token data during logout:', error);
  }

  // TODO: Replace with actual logout logic when available
};
