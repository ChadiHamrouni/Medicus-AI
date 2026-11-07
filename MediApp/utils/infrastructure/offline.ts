/**
 * Offline support utilities for MediApp
 * Handles offline detection, message queuing, and data synchronization
 */

import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from './logger';

export interface OfflineAction {
  id: string;
  type: 'send_message' | 'update_profile' | 'api_call';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  isWifiEnabled?: boolean;
}

class OfflineManager {
  private static instance: OfflineManager;
  private networkState: NetworkState | null = null;
  private networkSubscription: any = null;
  private syncInProgress = false;
  private listeners: Set<(state: NetworkState) => void> = new Set();

  // Storage keys
  private readonly OFFLINE_ACTIONS_KEY = '@offline_actions';
  private readonly CACHED_DATA_KEY = '@cached_data';
  private readonly LAST_SYNC_KEY = '@last_sync';

  public static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  /**
   * Initialize offline manager
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing offline manager', {
        component: 'OfflineManager',
      });

      // Get initial network state
      const state = await NetInfo.fetch();
      this.networkState = this.parseNetworkState(state);

      // Subscribe to network changes
      this.networkSubscription = NetInfo.addEventListener(state => {
        const newState = this.parseNetworkState(state);
        this.handleNetworkStateChange(newState);
      });

      // Attempt to sync queued actions if online
      if (this.networkState.isConnected) {
        await this.syncOfflineActions();
      }

      logger.info('Offline manager initialized', {
        component: 'OfflineManager',
        isConnected: this.networkState.isConnected,
        networkType: this.networkState.type,
      });
    } catch (error) {
      logger.error('Failed to initialize offline manager', error as Error, {
        component: 'OfflineManager',
      });
    }
  }

  /**
   * Parse NetInfo state into our format
   */
  private parseNetworkState(state: any): NetworkState {
    return {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      type: state.type || 'unknown',
      isWifiEnabled: state.details?.isConnectionExpensive === false,
    };
  }

  /**
   * Handle network state changes
   */
  private async handleNetworkStateChange(
    newState: NetworkState
  ): Promise<void> {
    const wasOffline = !this.networkState?.isConnected;
    const isNowOnline = newState.isConnected;

    this.networkState = newState;

    logger.info('Network state changed', {
      component: 'OfflineManager',
      wasOffline,
      isNowOnline,
      networkType: newState.type,
    });

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(newState);
      } catch (error) {
        logger.error('Error in network state listener', error as Error, {
          component: 'OfflineManager',
        });
      }
    });

    // If we just came online, sync queued actions
    if (wasOffline && isNowOnline) {
      logger.info('Device came back online, syncing queued actions', {
        component: 'OfflineManager',
      });
      await this.syncOfflineActions();
    }

    // If we went offline, log it
    if (!wasOffline && !isNowOnline) {
      logger.warn('Device went offline', {
        component: 'OfflineManager',
      });
    }
  }

  /**
   * Add listener for network state changes
   */
  public addNetworkStateListener(
    listener: (state: NetworkState) => void
  ): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current network state
   */
  public getNetworkState(): NetworkState | null {
    return this.networkState;
  }

  /**
   * Check if device is online
   */
  public isOnline(): boolean {
    return this.networkState?.isConnected ?? false;
  }

  /**
   * Queue an action for offline execution
   */
  public async queueOfflineAction(
    action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>
  ): Promise<void> {
    try {
      const offlineAction: OfflineAction = {
        ...action,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
      };

      const existingActions = await this.getOfflineActions();
      existingActions.push(offlineAction);

      await AsyncStorage.setItem(
        this.OFFLINE_ACTIONS_KEY,
        JSON.stringify(existingActions)
      );

      logger.info('Action queued for offline execution', {
        component: 'OfflineManager',
        actionType: action.type,
        actionId: offlineAction.id,
      });
    } catch (error) {
      logger.error('Failed to queue offline action', error as Error, {
        component: 'OfflineManager',
        actionType: action.type,
      });
    }
  }

  /**
   * Get queued offline actions
   */
  private async getOfflineActions(): Promise<OfflineAction[]> {
    try {
      const actionsJson = await AsyncStorage.getItem(this.OFFLINE_ACTIONS_KEY);
      return actionsJson ? JSON.parse(actionsJson) : [];
    } catch (error) {
      logger.error('Failed to get offline actions', error as Error, {
        component: 'OfflineManager',
      });
      return [];
    }
  }

  /**
   * Sync queued offline actions
   */
  private async syncOfflineActions(): Promise<void> {
    if (this.syncInProgress || !this.isOnline()) {
      return;
    }

    this.syncInProgress = true;

    try {
      const actions = await this.getOfflineActions();

      if (actions.length === 0) {
        logger.info('No offline actions to sync', {
          component: 'OfflineManager',
        });
        return;
      }

      logger.info('Starting offline actions sync', {
        component: 'OfflineManager',
        actionsCount: actions.length,
      });

      const successfulActions: string[] = [];
      const failedActions: OfflineAction[] = [];

      for (const action of actions) {
        try {
          await this.executeOfflineAction(action);
          successfulActions.push(action.id);

          logger.info('Offline action executed successfully', {
            component: 'OfflineManager',
            actionId: action.id,
            actionType: action.type,
          });
        } catch (error) {
          action.retryCount++;

          if (action.retryCount < action.maxRetries) {
            failedActions.push(action);
            logger.warn('Offline action failed, will retry', {
              component: 'OfflineManager',
              actionId: action.id,
              retryCount: action.retryCount,
              maxRetries: action.maxRetries,
              error: error,
            });
          } else {
            logger.error('Offline action failed permanently', error as Error, {
              component: 'OfflineManager',
              actionId: action.id,
              finalRetryCount: action.retryCount,
            });
          }
        }
      }

      // Update stored actions (remove successful, keep failed for retry)
      await AsyncStorage.setItem(
        this.OFFLINE_ACTIONS_KEY,
        JSON.stringify(failedActions)
      );

      // Update last sync timestamp
      await AsyncStorage.setItem(this.LAST_SYNC_KEY, Date.now().toString());

      logger.info('Offline actions sync completed', {
        component: 'OfflineManager',
        successful: successfulActions.length,
        failed: failedActions.length,
        remaining: failedActions.length,
      });
    } catch (error) {
      logger.error('Failed to sync offline actions', error as Error, {
        component: 'OfflineManager',
      });
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Execute a single offline action
   */
  private async executeOfflineAction(action: OfflineAction): Promise<void> {
    // TODO: Implement actual API calls based on action type
    // This would integrate with your existing API services

    switch (action.type) {
      case 'send_message':
        // await messageService.sendMessage(action.data);
        break;
      case 'update_profile':
        // await userService.updateProfile(action.data);
        break;
      case 'api_call':
        // await apiService.makeRequest(action.endpoint, action.method, action.data);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Cache data for offline access
   */
  public async cacheData(key: string, data: any, ttl?: number): Promise<void> {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        ttl: ttl || 24 * 60 * 60 * 1000, // Default 24 hours
      };

      const cachedData = await this.getCachedData();
      cachedData[key] = cacheEntry;

      await AsyncStorage.setItem(
        this.CACHED_DATA_KEY,
        JSON.stringify(cachedData)
      );

      logger.debug('Data cached for offline access', {
        component: 'OfflineManager',
        key,
        ttl,
      });
    } catch (error) {
      logger.error('Failed to cache data', error as Error, {
        component: 'OfflineManager',
        key,
      });
    }
  }

  /**
   * Retrieve cached data
   */
  public async getCachedData(key?: string): Promise<any> {
    try {
      const cachedDataJson = await AsyncStorage.getItem(this.CACHED_DATA_KEY);
      const cachedData = cachedDataJson ? JSON.parse(cachedDataJson) : {};

      if (key) {
        const entry = cachedData[key];
        if (!entry) return null;

        // Check if data has expired
        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
          // Remove expired entry
          delete cachedData[key];
          await AsyncStorage.setItem(
            this.CACHED_DATA_KEY,
            JSON.stringify(cachedData)
          );
          return null;
        }

        return entry.data;
      }

      return cachedData;
    } catch (error) {
      logger.error('Failed to get cached data', error as Error, {
        component: 'OfflineManager',
        key,
      });
      return key ? null : {};
    }
  }

  /**
   * Clear all cached data
   */
  public async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CACHED_DATA_KEY);

      logger.info('Cache cleared', {
        component: 'OfflineManager',
      });
    } catch (error) {
      logger.error('Failed to clear cache', error as Error, {
        component: 'OfflineManager',
      });
    }
  }

  /**
   * Get sync statistics
   */
  public async getSyncStats(): Promise<{
    queuedActions: number;
    lastSync: Date | null;
    cacheSize: number;
  }> {
    try {
      const actions = await this.getOfflineActions();
      const cachedData = await this.getCachedData();
      const lastSyncStr = await AsyncStorage.getItem(this.LAST_SYNC_KEY);

      return {
        queuedActions: actions.length,
        lastSync: lastSyncStr ? new Date(parseInt(lastSyncStr)) : null,
        cacheSize: Object.keys(cachedData).length,
      };
    } catch (error) {
      logger.error('Failed to get sync stats', error as Error, {
        component: 'OfflineManager',
      });

      return {
        queuedActions: 0,
        lastSync: null,
        cacheSize: 0,
      };
    }
  }

  /**
   * Cleanup and dispose
   */
  public cleanup(): void {
    if (this.networkSubscription) {
      this.networkSubscription();
      this.networkSubscription = null;
    }

    this.listeners.clear();

    logger.info('Offline manager cleaned up', {
      component: 'OfflineManager',
    });
  }
}

// Export singleton instance
export const offlineManager = OfflineManager.getInstance();

// Export types
export default OfflineManager;
