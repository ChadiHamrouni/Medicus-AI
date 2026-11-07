/**
 * Unified storage manager — delegates to hardware-gated secure_storage.
 *
 * All token operations now use react-native-keychain (Secure Enclave /
 * Android Keystore) with biometric gating via the secure_storage module.
 *
 * Non-sensitive data (user profile JSON) remains in expo-secure-store
 * since it doesn't require biometric auth on every read.
 */

import * as SecureStore from 'expo-secure-store';
import {
  saveJwt,
  getJwt,
  clearJwt,
  saveRefreshToken,
  getRefreshToken as getRefreshTokenSecure,
  clearRefreshToken,
  storeTokens as storeTokensSecure,
  clearAllTokens,
} from '@/src/security/secure_storage';
import { UserResponse } from '@/types/auth';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'medicus_access_token',
  REFRESH_TOKEN: 'medicus_refresh_token',
  REFRESH_TOKEN_EXPIRES_AT: 'medicus_refresh_token_expires_at',
  USER_DATA: 'medicus_user_data',
} as const;

/**
 * General-purpose storage for non-sensitive data (expo-secure-store).
 * For tokens, use tokenStorage below which routes through hardware keychain.
 */
export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`Error storing item ${key}:`, error);
      throw error;
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error retrieving item ${key}:`, error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
      throw error;
    }
  },

  async setJson<T>(key: string, value: T): Promise<void> {
    try {
      await this.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error storing JSON ${key}:`, error);
      throw error;
    }
  },

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const json = await this.getItem(key);
      return json ? JSON.parse(json) : null;
    } catch (error) {
      console.error(`Error retrieving JSON ${key}:`, error);
      return null;
    }
  },
};

/**
 * Token storage — hardware-gated via react-native-keychain.
 * Every token read/write triggers a biometric prompt (FaceID/TouchID).
 */
export const tokenStorage = {
  async setAccessToken(token: string): Promise<void> {
    await saveJwt(token);
  },

  async getAccessToken(): Promise<string | null> {
    return await getJwt();
  },

  async removeAccessToken(): Promise<void> {
    await clearJwt();
  },

  async setRefreshToken(token: string): Promise<void> {
    await saveRefreshToken(token);
  },

  async getRefreshToken(): Promise<string | null> {
    return await getRefreshTokenSecure();
  },

  async removeRefreshToken(): Promise<void> {
    await clearRefreshToken();
  },

  async clearTokens(): Promise<void> {
    await clearAllTokens();
  },

  async storeTokens(
    accessToken: string,
    refreshToken: string,
    refreshTokenExpiresInDays?: number
  ): Promise<void> {
    // Store tokens in hardware keychain (biometric-gated)
    await storeTokensSecure(accessToken, refreshToken);

    // Track refresh token expiration in expo-secure-store (non-sensitive metadata)
    const now = Date.now();
    const refreshTokenExpiresAt = refreshTokenExpiresInDays
      ? now + refreshTokenExpiresInDays * 24 * 60 * 60 * 1000
      : now + 7 * 24 * 60 * 60 * 1000; // Default 7 days

    await storage.setItem(
      STORAGE_KEYS.REFRESH_TOKEN_EXPIRES_AT,
      refreshTokenExpiresAt.toString()
    );
  },

  async getRefreshTokenExpiresAt(): Promise<number | null> {
    const value = await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN_EXPIRES_AT);
    return value ? parseInt(value, 10) : null;
  },

  async isRefreshTokenExpired(): Promise<boolean> {
    const expiresAt = await this.getRefreshTokenExpiresAt();
    if (!expiresAt) {
      // No expiration info stored, assume expired for safety
      return true;
    }
    return Date.now() >= expiresAt;
  },
};

/**
 * User data storage — non-sensitive profile JSON in expo-secure-store.
 */
export const userStorage = {
  async setUser(user: UserResponse): Promise<void> {
    await storage.setJson(STORAGE_KEYS.USER_DATA, user);
  },

  async getUser(): Promise<UserResponse | null> {
    return await storage.getJson<UserResponse>(STORAGE_KEYS.USER_DATA);
  },

  async removeUser(): Promise<void> {
    await storage.removeItem(STORAGE_KEYS.USER_DATA);
  },
};