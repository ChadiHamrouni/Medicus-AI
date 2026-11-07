/**
 * Socket.IO service for MediApp
 * Handles real-time messaging and conversation updates with automatic reconnection
 */

import { io, Socket } from 'socket.io-client';
import { logger, env, isTokenExpired, tokenStorage } from '@/utils';
import { refreshToken } from '@/services/user/authentication';

export interface SocketIOMessage {
  type: 'new_message' | 'typing' | 'presence' | 'conversation_update' | 'error';
  conversationId?: string;
  userId?: string;
  data?: any;
  timestamp?: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'audio';
  timestamp: Date;
  isRead: boolean;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface PresenceUpdate {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
}

type SocketIOEventCallback = (data: any) => void;

class SocketIOService {
  private static instance: SocketIOService;
  private socket: Socket | null = null;
  private isConnecting = false;
  private shouldReconnect = true;
  private currentUserId: string | null = null;
  private currentConversationId: string | null = null;
  private currentAuthToken: string | null = null;
  private isAuthenticated = false;
  private authRetryCount = 0;
  private readonly MAX_AUTH_RETRIES = 3;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  private connectionPromise: Promise<void> | null = null;
  private lastConnectionAttempt: number = 0;
  private readonly CONNECTION_THROTTLE_MS = 1000; // Prevent connection spam

  // Event listeners
  private messageListeners: Map<string, SocketIOEventCallback> = new Map();
  private typingListeners: Map<string, SocketIOEventCallback> = new Map();
  private presenceListeners: Map<string, SocketIOEventCallback> = new Map();
  private conversationUpdateListeners: Map<string, SocketIOEventCallback> =
    new Map();
  private connectionListeners: Map<string, SocketIOEventCallback> = new Map();
  private compactionListeners: Map<string, SocketIOEventCallback> = new Map();

  // Get base URL from medicusConvoApiBaseUrl (strip /api/MedicusConvo path)
  // Example: https://api.medicusai.tech/api/MedicusConvo -> https://api.medicusai.tech
  private readonly SOCKET_URL = env.medicusConvoApiBaseUrl.replace(
    '/api/MedicusConvo',
    ''
  );

  public static getInstance(): SocketIOService {
    if (!SocketIOService.instance) {
      SocketIOService.instance = new SocketIOService();

      // Debug: Log Socket.IO URL configuration
      logger.info('Socket.IO URL configured', {
        component: 'SocketIOService',
        socketUrl: SocketIOService.instance.SOCKET_URL,
        medicusConvoApiBaseUrl: env.medicusConvoApiBaseUrl,
        hasApiBaseUrl: !!process.env.API_BASE_URL,
        hasEnvSocketUrl: !!process.env.EXPO_PUBLIC_SOCKETIO_URL,
        apiBaseUrl: process.env.API_BASE_URL,
        envSocketUrl: process.env.EXPO_PUBLIC_SOCKETIO_URL,
        allEnvVars: {
          API_BASE_URL: process.env.API_BASE_URL,
          EXPO_PUBLIC_SOCKETIO_URL: process.env.EXPO_PUBLIC_SOCKETIO_URL,
          EXPO_PUBLIC_MEDICUS_CONVO_API_BASE_URL:
            process.env.EXPO_PUBLIC_MEDICUS_CONVO_API_BASE_URL,
        },
      });
    }
    return SocketIOService.instance;
  }

  /**
   * Connect to Socket.IO server for a specific conversation
   */
  public async connect(
    userId: string,
    authToken?: string,
    conversationId?: string
  ): Promise<void> {
    // Throttle connection attempts to prevent spam
    const now = Date.now();
    if (now - this.lastConnectionAttempt < this.CONNECTION_THROTTLE_MS) {
      logger.debug('Connection throttled', {
        component: 'SocketIOService',
        timeSinceLastAttempt: now - this.lastConnectionAttempt,
      });
      return this.connectionPromise || Promise.resolve();
    }

    // Reuse existing connection if already connected
    if (this.isSocketConnected()) {
      // If conversation changed, just update and re-authenticate
      if (conversationId && conversationId !== this.currentConversationId) {
        this.currentConversationId = conversationId;
        if (this.socket && this.currentAuthToken) {
          // Check if token is expired before re-using
          if (isTokenExpired(this.currentAuthToken)) {
            try {
              const refreshResponse = await refreshToken();
              this.currentAuthToken = refreshResponse.access_token;
              await tokenStorage.storeTokens(
                refreshResponse.access_token,
                refreshResponse.refresh_token
              );
            } catch (error) {
              logger.error(
                'Failed to refresh token during conversation switch',
                error as Error,
                {
                  component: 'SocketIOService',
                }
              );
            }
          }

          this.socket.emit('authenticate', {
            token: this.currentAuthToken,
            conversation_id: conversationId,
          });

          this.socket.emit('join_conversation', {
            conversation_id: conversationId,
          });
        }
      }
      return Promise.resolve();
    }

    // Reuse pending connection
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;
    this.isAuthenticated = false;
    this.authRetryCount = 0;
    this.lastConnectionAttempt = now;
    this.currentUserId = userId;
    this.currentAuthToken = authToken || null;
    this.currentConversationId = conversationId || null;

    // Check if token is expired before connecting
    if (this.currentAuthToken && isTokenExpired(this.currentAuthToken)) {
      logger.info('Socket.IO connect: Token expired, attempting refresh', {
        component: 'SocketIOService',
      });
      try {
        const refreshResponse = await refreshToken();
        this.currentAuthToken = refreshResponse.access_token;
        await tokenStorage.storeTokens(
          refreshResponse.access_token,
          refreshResponse.refresh_token
        );
        this.notifyTokenRefresh(refreshResponse.access_token);

        logger.info('Socket.IO connect: Token refreshed successfully', {
          component: 'SocketIOService',
        });
      } catch (error) {
        logger.error(
          'Socket.IO connect: Failed to refresh token',
          error as Error,
          {
            component: 'SocketIOService',
          }
        );
        // Continue and let auth_error handle it or fail gracefully
      }
    }

    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.connectionPromise = (async () => {
      try {
        logger.info('🔌 Socket.IO connecting', {
          component: 'SocketIOService',
          userId,
          conversationId: conversationId?.substring(0, 8),
        });

        // Create Socket.IO client
        this.socket = io(this.SOCKET_URL, {
          path: '/api/MedicusConvo/socketio', // Custom path instead of default /socket.io
          transports: ['websocket', 'polling'], // Allow fallback to polling
          upgrade: true,
          rememberUpgrade: true,
          autoConnect: false,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
          timeout: 10000,
          forceNew: false,
        });

        // Set up event handlers
        this.setupEventHandlers();

        this.socket.connect();
      } catch (error) {
        this.isConnecting = false;
        this.connectionPromise = null;
        logger.error('Failed to connect to Socket.IO', error as Error, {
          component: 'SocketIOService',
          userId,
        });
        throw error;
      }
    })();

    return this.connectionPromise;
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnecting = false;

      // Authenticate after connection
      if (this.currentAuthToken && this.currentConversationId) {
        this.socket?.emit('authenticate', {
          token: this.currentAuthToken,
          conversation_id: this.currentConversationId,
        });
      }

      // Notify connection listeners
      this.notifyConnectionListeners({
        type: 'connected',
        userId: this.currentUserId,
      });
    });

    this.socket.on('authenticated', data => {
      this.isAuthenticated = true;
      this.authRetryCount = 0;

      logger.info('Socket.IO authenticated', {
        component: 'SocketIOService',
        convoId: this.currentConversationId?.substring(0, 8),
      });

      // Join conversation room if we have a conversation ID
      if (this.currentConversationId) {
        this.socket?.emit('join_conversation', {
          conversation_id: this.currentConversationId,
        });
      }

      // Notify connection listeners of successful authentication
      this.notifyConnectionListeners({
        type: 'authenticated',
        userId: this.currentUserId,
        conversationId: this.currentConversationId,
      });
    });

    this.socket.on('auth_error', async error => {
      this.isAuthenticated = false;
      this.authRetryCount++;

      logger.error(
        '❌ Socket.IO authentication failed',
        new Error(error.message),
        {
          component: 'SocketIOService',
          error,
          retryAttempt: this.authRetryCount,
          maxRetries: this.MAX_AUTH_RETRIES,
        }
      );

      // Attempt to refresh token if we have a 401/auth error and retries left
      if (
        this.authRetryCount <= this.MAX_AUTH_RETRIES &&
        this.shouldReconnect
      ) {
        // Try to refresh the token
        try {
          logger.info('🔄 Attempting to refresh token for Socket.IO', {
            component: 'SocketIOService',
          });
          const refreshResponse = await refreshToken();
          this.currentAuthToken = refreshResponse.access_token;

          // Perist new tokens
          await tokenStorage.storeTokens(
            refreshResponse.access_token,
            refreshResponse.refresh_token
          );

          this.notifyTokenRefresh(refreshResponse.access_token);

          logger.info('✅ Token refreshed for Socket.IO, retrying auth', {
            component: 'SocketIOService',
          });

          // Retry immediately with new token
          if (
            this.socket?.connected &&
            this.currentAuthToken &&
            this.currentConversationId
          ) {
            this.socket.emit('authenticate', {
              token: this.currentAuthToken,
              conversation_id: this.currentConversationId,
            });
            return;
          }
        } catch (refreshError) {
          logger.error(
            '❌ Socket.IO token refresh failed',
            refreshError as Error,
            {
              component: 'SocketIOService',
            }
          );
          // If refresh fails, fallback to standard retry or give up
        }
      }

      // Standard retry logic if refresh failed or wasn't attempted
      if (this.authRetryCount < this.MAX_AUTH_RETRIES && this.shouldReconnect) {
        const retryDelay = Math.min(
          1000 * Math.pow(2, this.authRetryCount),
          5000
        ); // Exponential backoff

        logger.info('🔄 Retrying Socket.IO authentication (standard backoff)', {
          component: 'SocketIOService',
          retryAttempt: this.authRetryCount,
          retryDelay,
          maxRetries: this.MAX_AUTH_RETRIES,
        });

        setTimeout(() => {
          if (
            this.socket?.connected &&
            this.currentAuthToken &&
            this.currentConversationId
          ) {
            this.socket.emit('authenticate', {
              token: this.currentAuthToken,
              conversation_id: this.currentConversationId,
            });
          }
        }, retryDelay);
      } else {
        // Notify connection listeners of permanent failure
        this.notifyConnectionListeners({
          type: 'auth_failed_permanent',
          error,
          retryAttempt: this.authRetryCount,
        });
      }
    });

    this.socket.on('disconnect', reason => {
      this.isConnecting = false;
      this.isAuthenticated = false;

      // Clear any existing reconnect timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      // Automatic reconnection for certain disconnect reasons
      if (this.shouldReconnect && this.isReconnectableDisconnect(reason)) {
        const reconnectDelay = this.getReconnectDelay();

        this.reconnectTimeout = setTimeout(() => {
          this.attemptReconnection();
        }, reconnectDelay);
      }

      // Notify connection listeners
      this.notifyConnectionListeners({
        type: 'disconnected',
        reason,
      });
    });

    this.socket.on('connect_error', error => {
      this.isConnecting = false;

      // Notify connection listeners
      this.notifyConnectionListeners({ type: 'error', error });
    });

    // Message event handlers
    this.socket.on('new_message', data => {
      logger.info('📨 New message received via Socket.IO', {
        component: 'SocketIOService',
        conversationId: data?.conversation_id || data?.conversationId,
        messageType: data?.type || 'unknown',
      });

      this.notifyMessageListeners(data);
    });

    this.socket.on('typing', data => {
      logger.info('⌨️ Typing indicator received via Socket.IO', {
        component: 'SocketIOService',
        conversationId: data?.conversation_id || data?.conversationId,
      });

      this.notifyTypingListeners(data);
    });

    this.socket.on('presence', data => {
      logger.info('👤 Presence update received via Socket.IO', {
        component: 'SocketIOService',
      });

      this.notifyPresenceListeners(data);
    });

    this.socket.on('conversation_update', data => {
      logger.info('🔄 Conversation update received via Socket.IO', {
        component: 'SocketIOService',
        conversationId: data?.conversation_id || data?.conversationId,
      });

      this.notifyConversationUpdateListeners(data);
    });

    this.socket.on('compaction_complete', data => {
      logger.info('📦 Compaction complete received via Socket.IO', {
        component: 'SocketIOService',
        conversationId: data?.conversation_id || data?.conversationId,
      });

      this.notifyCompactionListeners(data);
    });

    this.socket.on('pong', () => {
      // Pong
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  public disconnect(): void {
    this.shouldReconnect = false;
    this.isAuthenticated = false;

    // Clear any pending reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Reset retry count
    this.authRetryCount = 0;

    logger.info('🔌 Socket.IO disconnected by client', {
      component: 'SocketIOService',
    });
  }

  /**
   * Check if Socket.IO is connected and authenticated
   */
  public isConnected(): boolean {
    return (this.socket?.connected && this.isAuthenticated) || false;
  }

  /**
   * Check if Socket.IO is connected (regardless of authentication)
   */
  public isSocketConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Check if Socket.IO is fully ready (connected, authenticated, and joined conversation)
   */
  public isReady(): boolean {
    return this.isConnected() && this.currentConversationId !== null;
  }

  /**
   * Get current connection status details
   */
  public getConnectionStatus(): {
    connected: boolean;
    authenticated: boolean;
    conversationJoined: boolean;
    ready: boolean;
  } {
    return {
      connected: this.socket?.connected || false,
      authenticated: this.isAuthenticated,
      conversationJoined: this.currentConversationId !== null,
      ready: this.isReady(),
    };
  }

  /**
   * Send a message through Socket.IO
   */
  public sendMessage(event: string, data: any): void {
    if (!this.isConnected()) {
      logger.warn('⚠️ Cannot send message: Socket.IO not connected', {
        component: 'SocketIOService',
        event,
        data,
      });
      return;
    }

    try {
      const messageWithTimestamp = {
        ...data,
        timestamp: new Date().toISOString(),
      };

      this.socket!.emit(event, messageWithTimestamp);

      logger.debug('📤 Socket.IO message sent', {
        component: 'SocketIOService',
        event,
        conversationId: data?.conversation_id || data?.conversationId,
      });
    } catch (error) {
      logger.error('❌ Failed to send Socket.IO message', error as Error, {
        component: 'SocketIOService',
        event,
      });
    }
  }

  // Event listener management
  public onMessage(listenerId: string, callback: SocketIOEventCallback): void {
    this.messageListeners.set(listenerId, callback);
  }

  public onTyping(listenerId: string, callback: SocketIOEventCallback): void {
    this.typingListeners.set(listenerId, callback);
  }

  public onPresence(listenerId: string, callback: SocketIOEventCallback): void {
    this.presenceListeners.set(listenerId, callback);
  }

  public onConversationUpdate(
    listenerId: string,
    callback: SocketIOEventCallback
  ): void {
    this.conversationUpdateListeners.set(listenerId, callback);
  }

  public onConnection(
    listenerId: string,
    callback: SocketIOEventCallback
  ): void {
    this.connectionListeners.set(listenerId, callback);
  }

  public onCompaction(
    listenerId: string,
    callback: SocketIOEventCallback
  ): void {
    this.compactionListeners.set(listenerId, callback);
  }

  public removeListener(listenerId: string): void {
    this.messageListeners.delete(listenerId);
    this.typingListeners.delete(listenerId);
    this.presenceListeners.delete(listenerId);
    this.conversationUpdateListeners.delete(listenerId);
    this.connectionListeners.delete(listenerId);
    this.compactionListeners.delete(listenerId);
  }

  // Notification methods
  private notifyMessageListeners(data: any): void {
    logger.info(
      `🔔 Notifying ${this.messageListeners.size} Socket.IO message listeners`,
      {
        component: 'SocketIOService',
        data: data,
        listenerIds: Array.from(this.messageListeners.keys()),
      }
    );

    this.messageListeners.forEach((callback, listenerId) => {
      try {
        logger.info(`📢 Calling Socket.IO message listener: ${listenerId}`, {
          component: 'SocketIOService',
          listenerId,
          data,
        });
        callback(data);
        logger.info(
          `✅ Socket.IO message listener ${listenerId} executed successfully`,
          {
            component: 'SocketIOService',
            listenerId,
          }
        );
      } catch (error) {
        logger.error(
          `❌ Socket.IO message listener ${listenerId} failed`,
          error as Error,
          {
            component: 'SocketIOService',
            listenerId,
          }
        );
      }
    });
  }

  private notifyTypingListeners(data: any): void {
    this.typingListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error('❌ Socket.IO typing listener error', error as Error, {
          component: 'SocketIOService',
        });
      }
    });
  }

  private notifyPresenceListeners(data: any): void {
    this.presenceListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error('❌ Socket.IO presence listener error', error as Error, {
          component: 'SocketIOService',
        });
      }
    });
  }

  private notifyConversationUpdateListeners(data: any): void {
    this.conversationUpdateListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error(
          '❌ Socket.IO conversation update listener error',
          error as Error,
          {
            component: 'SocketIOService',
          }
        );
      }
    });
  }

  private notifyCompactionListeners(data: any): void {
    this.compactionListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error(
          '❌ Socket.IO compaction listener error',
          error as Error,
          { component: 'SocketIOService' }
        );
      }
    });
  }

  private notifyConnectionListeners(data: any): void {
    this.connectionListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error('❌ Socket.IO connection listener error', error as Error, {
          component: 'SocketIOService',
        });
      }
    });
  }

  private isReconnectableDisconnect(reason: string): boolean {
    // Determine if the disconnect reason warrants automatic reconnection
    const reconnectableReasons = [
      'io server disconnect', // Server disconnected us (like auth failure)
      'transport close', // Network issue
      'transport error', // Network error
      'ping timeout', // Connection timeout
    ];

    return reconnectableReasons.includes(reason);
  }

  private getReconnectDelay(): number {
    // Progressive delay: 1s, 2s, 4s, 8s, max 10s
    const baseDelay = 1000;
    const maxDelay = 10000;
    const delay = Math.min(
      baseDelay * Math.pow(2, this.authRetryCount),
      maxDelay
    );

    // Add some jitter to avoid thundering herd
    const jitter = Math.random() * 1000;
    return delay + jitter;
  }

  private async attemptReconnection(): Promise<void> {
    if (!this.shouldReconnect || this.isConnecting || this.socket?.connected) {
      return;
    }

    logger.info('🔄 Attempting Socket.IO reconnection', {
      component: 'SocketIOService',
      authRetryCount: this.authRetryCount,
    });

    try {
      // Reset the authentication state for new connection
      this.isAuthenticated = false;

      // Reconnect using the same parameters
      if (
        this.currentUserId &&
        this.currentAuthToken &&
        this.currentConversationId
      ) {
        await this.connect(
          this.currentUserId,
          this.currentAuthToken,
          this.currentConversationId
        );
      }
    } catch (error) {
      logger.error('❌ Socket.IO reconnection failed', error as Error, {
        component: 'SocketIOService',
      });
    }
  }

  // Convenience methods for common actions
  public sendChatMessage(
    conversationId: string,
    content: string,
    messageType: string = 'text'
  ): void {
    this.sendMessage('new_message', {
      conversation_id: conversationId,
      content,
      messageType,
    });
  }

  public sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    this.sendMessage('typing', {
      conversation_id: conversationId,
      isTyping,
    });
  }

  public updatePresence(status: 'online' | 'offline' | 'away'): void {
    this.sendMessage('presence', {
      status,
    });
  }

  private tokenRefreshCallback: ((token: string) => void) | null = null;

  public onTokenRefresh(callback: (token: string) => void): void {
    this.tokenRefreshCallback = callback;
  }

  private notifyTokenRefresh(token: string): void {
    if (this.tokenRefreshCallback) {
      try {
        this.tokenRefreshCallback(token);
        logger.info('🔄 Notified app of token refresh', {
          component: 'SocketIOService',
        });
      } catch (error) {
        logger.error('Failed to notify app of token refresh', error as Error, {
          component: 'SocketIOService',
        });
      }
    }
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): {
    isConnected: boolean;
    socketId: string | null;
    messageListeners: number;
  } {
    return {
      isConnected: this.isConnected(),
      socketId: this.socket?.id || null,
      messageListeners: this.messageListeners.size,
    };
  }
}

// Export singleton instance
export const socketIOService = SocketIOService.getInstance();

// Export types and service
export default SocketIOService;
