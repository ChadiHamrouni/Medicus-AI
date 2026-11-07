/**
 * Push notification service for MediApp
 * Handles notification registration, permissions, and message handling
 */

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { logger } from '@/utils';
import {
  RegisterDeviceRequest,
  medicusNotificationAPI,
} from './medicusNotification';
import {
  navigateFromNotification,
  handleColdStartNotification as coldStartHandler,
} from './notificationDeepLink';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  conversationId?: string;
  messageId?: string;
  senderId?: string;
  senderName?: string;
  messageType?: 'text' | 'media' | 'file' | 'urgent';
  isUrgent?: boolean;
  appointmentId?: number;
  appointment_date?: string;
  start_time?: string;
  new_start_time?: string;
  category?: string;
  deepLink?: string;
  role?: 'patient' | 'doctor';
}

export interface PushToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId: string;
}

class NotificationService {
  private static instance: NotificationService;
  private pushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize notification service - call this on app startup
   */
  public async initialize(): Promise<void> {
    logger.info('Initializing notification service', {
      component: 'NotificationService',
      isDevice: Device.isDevice,
    });

    // Request permissions (works on simulator too for local notifications)
    await this.requestPermissions();

    // Register for push notifications (gracefully skips on simulator)
    await this.registerForPushNotifications();

    // Set up listeners (works for local notifications too)
    this.setupNotificationListeners();

    // Automatically register token
    if (this.pushToken) {
      this.registerTokenWithBackend().catch(() => {
        logger.warn('Failed to register push token - will retry later', {
          component: 'NotificationService',
        });
      });
    }

    logger.info('Notification service initialized', {
      component: 'NotificationService',
      hasToken: !!this.pushToken,
      isDevice: Device.isDevice,
    });
  }

  /**
   * Request notification permissions from user
   */
  private async requestPermissions(): Promise<boolean> {
    // if (!Device.isDevice) {
    //   logger.warn('Notifications not supported on simulator/emulator', {
    //     component: 'NotificationService',
    //   });
    //   return false;
    // }

    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.warn('Notification permissions not granted', {
          component: 'NotificationService',
          status: finalStatus,
        });
        return false;
      }

      logger.info('Notification permissions granted', {
        component: 'NotificationService',
      });

      return true;
    } catch (error) {
      logger.error(
        'Error requesting notification permissions',
        error as Error,
        {
          component: 'NotificationService',
        }
      );
      return false;
    }
  }

  /**
   * Register device for push notifications and get token
   */
  private async registerForPushNotifications(): Promise<void> {
    // Skip on simulator/emulator - push tokens require physical device
    if (!Device.isDevice) {
      logger.info('Skipping push registration - simulator/emulator detected', {
        component: 'NotificationService',
      });
      return;
    }

    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId:
          Constants.expoConfig?.extra?.eas?.projectId || 'your-project-id',
      });

      this.pushToken = token.data;

      logger.info('Successfully registered for push notifications', {
        component: 'NotificationService',
        tokenLength: token.data.length,
      });

      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }
    } catch (error) {
      // Don't throw - push registration failure shouldn't break the app
      logger.warn('Push registration unavailable', {
        component: 'NotificationService',
        reason: (error as Error).message,
      });
    }
  }

  /**
   * Setup Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      description: 'New message notifications',
    });

    await Notifications.setNotificationChannelAsync('urgent', {
      name: 'Urgent Messages',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lightColor: '#FF0000',
      sound: 'default',
      description: 'Urgent medical message notifications',
    });

    logger.info('Android notification channels configured', {
      component: 'NotificationService',
    });
  }

  /**
   * Setup notification listeners
   */
  private setupNotificationListeners(): void {
    // Listen for notifications received while app is running
    this.notificationListener = Notifications.addNotificationReceivedListener(
      notification => {
        const data = notification.request.content.data as NotificationData;

        logger.info('Notification received while app active', {
          component: 'NotificationService',
          conversationId: data.conversationId,
          isUrgent: data.isUrgent,
        });

        this.handleNotificationReceived(notification);
      }
    );

    // Listen for notification responses (user tapped notification)
    logger.info('Setting up addNotificationResponseReceivedListener', { component: 'NotificationService' });
    this.responseListener =
      Notifications.addNotificationResponseReceivedListener(response => {
        logger.info('addNotificationResponseReceivedListener triggered!', { 
          component: 'NotificationService',
          actionIdentifier: response.actionIdentifier
        });
        const data = response.notification.request.content
          .data as NotificationData;

        logger.auditLog('notification_tapped', '', {
          conversationId: data.conversationId,
          messageId: data.messageId,
        });

        this.handleNotificationResponse(response);
      });
  }

  /**
   * Handle notification received while app is active
   */
  private handleNotificationReceived(
    notification: Notifications.Notification
  ): void {
    const data = notification.request.content.data as NotificationData;

    // For urgent notifications, show additional UI feedback
    if (data.isUrgent) {
      // TODO: Show urgent notification overlay
      logger.securityLog('urgent_notification_received', '', {
        conversationId: data.conversationId,
        senderId: data.senderId,
      });
    }
  }

  /**
   * Handle user tapping on notification
   */
  private handleNotificationResponse(
    response: Notifications.NotificationResponse
  ): void {
    logger.info('Delegating notification tap to navigateFromNotification', { component: 'NotificationService' });
    navigateFromNotification(response);
  }

  /**
   * Get current push token
   */
  public getPushToken(): PushToken | null {
    if (!this.pushToken) return null;

    return {
      token: this.pushToken,
      platform: Platform.OS as 'ios' | 'android',
      deviceId: Constants.installationId || 'unknown',
    };
  }

  /**
   * Send push token to backend for user registration
   * Automatically handles auth check and registration
   */
  public async registerTokenWithBackend(): Promise<void> {
    const tokenData = this.getPushToken();
    if (!tokenData) {
      logger.info('No push token available for registration', {
        component: 'NotificationService',
      });
      return;
    }

    try {
      const { userStorage } = await import('@/utils');
      const user = await userStorage.getUser();

      if (!user) {
        logger.info('User not authenticated, skipping device registration', {
          component: 'NotificationService',
        });
        return;
      }

      // Register device with MedicusNotification service
      const deviceRegistration: RegisterDeviceRequest = {
        platform: tokenData.platform,
        push_token: tokenData.token,
      };

      await medicusNotificationAPI.registerDevice(deviceRegistration);

      logger.auditLog('push_token_registered', String(user.id), {
        platform: tokenData.platform,
      });
    } catch (error) {
      logger.error('Failed to register push token with backend', error as Error, {
        component: 'NotificationService',
      });
      throw error;
    }
  }

  /**
   * Unregister device from backend
   * Called on logout
   */
  public async unregisterFromBackend(): Promise<void> {
    try {
      if (!this.pushToken) {
        return;
      }

      await medicusNotificationAPI.unregisterDevice(this.pushToken);

      logger.auditLog('device_unregistered', '', {
        component: 'NotificationService',
      });
    } catch (error) {
      logger.warn('Failed to unregister device during logout', {
        component: 'NotificationService',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Schedule a local notification (for testing or offline scenarios)
   */
  public async scheduleLocalNotification(
    title: string,
    body: string,
    data?: NotificationData
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: (data || {}) as Record<string, unknown>,
          sound: data?.isUrgent ? 'default' : 'default',
        },
        trigger: null, // Immediate notification
      });

      logger.info('Local notification scheduled', {
        component: 'NotificationService',
        notificationId,
        isUrgent: data?.isUrgent,
      });

      return notificationId;
    } catch (error) {
      logger.error('Failed to schedule local notification', error as Error, {
        component: 'NotificationService',
      });
      throw error;
    }
  }

  /**
   * Clear all notifications
   */
  public async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();

      logger.info('All notifications cleared', {
        component: 'NotificationService',
      });
    } catch (error) {
      logger.error('Failed to clear notifications', error as Error, {
        component: 'NotificationService',
      });
    }
  }

  /**
   * Get notification permissions status
   */
  public async getPermissionStatus(): Promise<Notifications.PermissionStatus> {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  /**
   * Handle cold-start deep link (app was killed, user tapped notification to open).
   * Call once from root _layout after navigator mounts.
   */
  public async handleColdStartNotification(): Promise<void> {
    await coldStartHandler();
  }

  /**
   * Cleanup notification listeners
   */
  public cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }

    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }

    logger.info('Notification service cleaned up', {
      component: 'NotificationService',
    });
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Export types and service
export default NotificationService;
