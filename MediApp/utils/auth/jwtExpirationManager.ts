/**
 * JWT Expiration Manager
 *
 * Automatically handles JWT token expiration tracking and refreshing in the background.
 *
 */

import { logger } from '../infrastructure/logger';
import { decodeJwt } from './jwt';
import { tokenStorage } from '../infrastructure/storage';

type TokenRefreshCallback = () => Promise<void>;
type LogoutCallback = () => Promise<void>;

interface JwtExpirationManagerConfig {
  // How many minutes before expiration to refresh the token
  refreshThresholdMinutes?: number;
  // How often to check token expiration (in seconds)
  checkIntervalSeconds?: number;
  // Whether to enable background checking
  enableBackgroundCheck?: boolean;
}

interface TokenInfo {
  token: string;
  payload: any;
  expirationTime: number;
  refreshTime: number;
}

class JwtExpirationManager {
  private config: Required<JwtExpirationManagerConfig>;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private refreshCallback: TokenRefreshCallback | null = null;
  private logoutCallback: LogoutCallback | null = null;
  private isRefreshing = false;
  private lastTokenCheck: string | null = null;

  constructor(config: JwtExpirationManagerConfig = {}) {
    this.config = {
      refreshThresholdMinutes: config.refreshThresholdMinutes ?? 10, // Refresh 10 minutes before expiration
      checkIntervalSeconds: config.checkIntervalSeconds ?? 60, // Check every minute
      enableBackgroundCheck: config.enableBackgroundCheck ?? true,
    };
  }

  /**
   * Initialize the JWT expiration manager
   */
  public initialize(
    refreshCallback: TokenRefreshCallback,
    logoutCallback: LogoutCallback
  ): void {
    // Destroy any existing setup first
    this.destroy();

    this.refreshCallback = refreshCallback;
    this.logoutCallback = logoutCallback;

    // logger.info("JWT Expiration Manager initializing", {
    //   component: "JwtExpirationManager",
    //   refreshThresholdMinutes: this.config.refreshThresholdMinutes,
    //   checkIntervalSeconds: this.config.checkIntervalSeconds,
    //   enableBackgroundCheck: this.config.enableBackgroundCheck,
    //   hasRefreshCallback: !!this.refreshCallback,
    //   hasLogoutCallback: !!this.logoutCallback,
    //   timestamp: new Date().toISOString(),
    // });

    if (this.config.enableBackgroundCheck) {
      this.startBackgroundCheck();
    } else {
      logger.warn('Background checking is disabled', {
        component: 'JwtExpirationManager',
      });
    }

    // logger.info("JWT Expiration Manager initialized", {
    //   component: "JwtExpirationManager",
    //   refreshThresholdMinutes: this.config.refreshThresholdMinutes,
    //   checkIntervalSeconds: this.config.checkIntervalSeconds,
    //   backgroundCheckStarted: !!this.intervalId,
    //   timestamp: new Date().toISOString(),
    // });
  }

  /**
   * Start background token expiration checking
   */
  private startBackgroundCheck(): void {
    if (this.intervalId) {
      this.stopBackgroundCheck();
    }

    this.intervalId = setInterval(async () => {
      await this.checkAndRefreshToken();
    }, this.config.checkIntervalSeconds * 1000);

    // logger.info("Background token checking started", {
    //   component: "JwtExpirationManager",
    //   intervalSeconds: this.config.checkIntervalSeconds,
    // });
  }

  /**
   * Stop background token expiration checking
   */
  private stopBackgroundCheck(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      // logger.info("Background token checking stopped", {
      //   component: "JwtExpirationManager",
      // });
    }
  }

  /**
   * Get token information including expiration details
   */
  private async getTokenInfo(): Promise<TokenInfo | null> {
    try {
      const accessToken = await tokenStorage.getAccessToken();

      if (!accessToken) {
        return null;
      }

      const payload = decodeJwt(accessToken);
      if (!payload || !payload.exp) {
        return null;
      }

      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const refreshTime =
        expirationTime - this.config.refreshThresholdMinutes * 60 * 1000;

      return {
        token: accessToken,
        payload,
        expirationTime,
        refreshTime,
      };
    } catch (error) {
      logger.error('Failed to get token info', error as Error, {
        component: 'JwtExpirationManager',
      });
      return null;
    }
  }

  /**
   * Check if token needs refresh or has expired
   */
  private async checkAndRefreshToken(): Promise<void> {
    try {
      logger.info('JWT expiration manager checking token', {
        component: 'JwtExpirationManager',
        isRefreshing: this.isRefreshing,
        hasRefreshCallback: !!this.refreshCallback,
        hasLogoutCallback: !!this.logoutCallback,
      });

      const tokenInfo = await this.getTokenInfo();

      if (!tokenInfo) {
        // No token available, user is likely not authenticated
        logger.info('No token info available, skipping check', {
          component: 'JwtExpirationManager',
        });
        return;
      }

      // Avoid duplicate checks for the same token, but allow refresh attempts
      if (this.lastTokenCheck === tokenInfo.token && !this.isRefreshing) {
        // Only skip if we're not in the middle of a refresh and token hasn't changed
        const currentTime = Date.now();
        const needsRefresh = currentTime >= tokenInfo.refreshTime;

        if (!needsRefresh) {
          logger.info(
            "Token already checked and doesn't need refresh, skipping duplicate check",
            {
              component: 'JwtExpirationManager',
            }
          );
          return;
        } else {
          logger.info(
            'Token already checked but needs refresh, proceeding with refresh check',
            {
              component: 'JwtExpirationManager',
            }
          );
        }
      }

      this.lastTokenCheck = tokenInfo.token;
      const currentTime = Date.now();

      logger.info('Token check details', {
        component: 'JwtExpirationManager',
        currentTime: new Date(currentTime).toISOString(),
        expirationTime: new Date(tokenInfo.expirationTime).toISOString(),
        refreshTime: new Date(tokenInfo.refreshTime).toISOString(),
        isExpired: currentTime >= tokenInfo.expirationTime,
        needsRefresh: currentTime >= tokenInfo.refreshTime,
        isRefreshing: this.isRefreshing,
      });

      // Check if token is expired
      if (currentTime >= tokenInfo.expirationTime) {
        logger.warn('Access token has expired, logging out user', {
          component: 'JwtExpirationManager',
          expiredAt: new Date(tokenInfo.expirationTime).toISOString(),
          currentTime: new Date(currentTime).toISOString(),
        });

        await this.handleTokenExpiration();
        return;
      }

      // Check if token needs refresh
      if (currentTime >= tokenInfo.refreshTime && !this.isRefreshing) {
        logger.info('Access token needs refresh, triggering refresh', {
          component: 'JwtExpirationManager',
          refreshTime: new Date(tokenInfo.refreshTime).toISOString(),
          expirationTime: new Date(tokenInfo.expirationTime).toISOString(),
          currentTime: new Date(currentTime).toISOString(),
        });

        await this.handleTokenRefresh();
      } else if (currentTime >= tokenInfo.refreshTime && this.isRefreshing) {
        logger.info('Token needs refresh but refresh already in progress', {
          component: 'JwtExpirationManager',
        });
      }
    } catch (error) {
      logger.error('Error during token check', error as Error, {
        component: 'JwtExpirationManager',
      });
    }
  }

  /**
   * Handle token refresh
   */
  private async handleTokenRefresh(): Promise<void> {
    if (this.isRefreshing) {
      logger.info('Token refresh already in progress, skipping', {
        component: 'JwtExpirationManager',
      });
      return;
    }

    this.isRefreshing = true;

    try {
      if (!this.refreshCallback) {
        throw new Error('No refresh callback configured');
      }

      logger.info('Starting automatic token refresh', {
        component: 'JwtExpirationManager',
        hasRefreshCallback: !!this.refreshCallback,
      });

      // Call the refresh callback
      await this.refreshCallback();

      // Clear the last token check so we check the new token
      this.lastTokenCheck = null;

      logger.info('Automatic token refresh completed successfully', {
        component: 'JwtExpirationManager',
      });
    } catch (error) {
      logger.error('Automatic token refresh failed', error as Error, {
        component: 'JwtExpirationManager',
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      // If refresh fails, handle as token expiration
      await this.handleTokenExpiration();
    } finally {
      this.isRefreshing = false;
      logger.info(
        'Token refresh process completed, isRefreshing set to false',
        {
          component: 'JwtExpirationManager',
        }
      );
    }
  }

  /**
   * Handle token expiration by logging out the user
   */
  private async handleTokenExpiration(): Promise<void> {
    try {
      if (!this.logoutCallback) {
        throw new Error('No logout callback configured');
      }

      logger.info('Handling token expiration, logging out user', {
        component: 'JwtExpirationManager',
      });

      // Stop background checking since user will be logged out
      this.stopBackgroundCheck();

      await this.logoutCallback();

      logger.info('User logged out due to token expiration', {
        component: 'JwtExpirationManager',
      });
    } catch (error) {
      logger.error('Failed to handle token expiration', error as Error, {
        component: 'JwtExpirationManager',
      });
    }
  }

  /**
   * Manually trigger a token check (useful for testing or immediate checks)
   */
  public async checkTokenNow(): Promise<void> {
    await this.checkAndRefreshToken();
  }

  /**
   * Get token expiration information
   */
  public async getTokenExpirationInfo(): Promise<{
    isExpired: boolean;
    needsRefresh: boolean;
    expiresAt: string | null;
    refreshAt: string | null;
  }> {
    const tokenInfo = await this.getTokenInfo();

    if (!tokenInfo) {
      return {
        isExpired: true,
        needsRefresh: false,
        expiresAt: null,
        refreshAt: null,
      };
    }

    const currentTime = Date.now();

    return {
      isExpired: currentTime >= tokenInfo.expirationTime,
      needsRefresh: currentTime >= tokenInfo.refreshTime,
      expiresAt: new Date(tokenInfo.expirationTime).toISOString(),
      refreshAt: new Date(tokenInfo.refreshTime).toISOString(),
    };
  }

  /**
   * Get the current status of the JWT expiration manager
   */
  public getManagerStatus(): {
    isInitialized: boolean;
    isBackgroundCheckRunning: boolean;
    isRefreshing: boolean;
    hasRefreshCallback: boolean;
    hasLogoutCallback: boolean;
    config: Required<JwtExpirationManagerConfig>;
  } {
    return {
      isInitialized: !!(this.refreshCallback && this.logoutCallback),
      isBackgroundCheckRunning: !!this.intervalId,
      isRefreshing: this.isRefreshing,
      hasRefreshCallback: !!this.refreshCallback,
      hasLogoutCallback: !!this.logoutCallback,
      config: { ...this.config },
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<JwtExpirationManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart background check if interval changed
    if (newConfig.checkIntervalSeconds !== undefined && this.intervalId) {
      this.stopBackgroundCheck();
      if (this.config.enableBackgroundCheck) {
        this.startBackgroundCheck();
      }
    }

    logger.info('JWT expiration manager configuration updated', {
      component: 'JwtExpirationManager',
      config: this.config,
    });
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.stopBackgroundCheck();
    this.refreshCallback = null;
    this.logoutCallback = null;
    this.lastTokenCheck = null;
    this.isRefreshing = false;

    // logger.info("JWT expiration manager destroyed", {
    //   component: "JwtExpirationManager",
    // });
  }

  /**
   * Pause background checking (useful when app goes to background)
   */
  public pause(): void {
    this.stopBackgroundCheck();
    logger.info('JWT expiration manager paused', {
      component: 'JwtExpirationManager',
    });
  }

  /**
   * Resume background checking (useful when app comes to foreground)
   */
  public resume(): void {
    if (
      this.config.enableBackgroundCheck &&
      this.refreshCallback &&
      this.logoutCallback
    ) {
      this.startBackgroundCheck();
      // Check immediately on resume in case token expired while app was in background
      this.checkTokenNow().catch(error => {
        logger.error('Failed to check token on resume', error as Error, {
          component: 'JwtExpirationManager',
        });
      });
      logger.info('JWT expiration manager resumed', {
        component: 'JwtExpirationManager',
      });
    }
  }
}

// Export singleton instance
export const jwtExpirationManager = new JwtExpirationManager();

// Export the class for testing or custom instances
export { JwtExpirationManager };
export type {
  JwtExpirationManagerConfig,
  LogoutCallback,
  TokenRefreshCallback,
};

/**
 * Utility function to safely initialize JWT expiration manager
 * with error handling and logging
 */
export const initializeJwtManager = async (
  refreshCallback: TokenRefreshCallback,
  logoutCallback: LogoutCallback,
  config?: JwtExpirationManagerConfig
): Promise<void> => {
  try {
    if (config) {
      jwtExpirationManager.updateConfig(config);
    }

    jwtExpirationManager.initialize(refreshCallback, logoutCallback);

    // logger.info("JWT expiration manager initialized successfully", {
    //   component: "initializeJwtManager",
    //   config: jwtExpirationManager["config"], // Access private config for logging
    // });
  } catch (error) {
    logger.error(
      'Failed to initialize JWT expiration manager',
      error as Error,
      {
        component: 'initializeJwtManager',
      }
    );
    throw error;
  }
};
