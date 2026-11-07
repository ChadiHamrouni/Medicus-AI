/**
 * MedicusNotification API client
 * Handles communication with MedicusNotification service
 */

import { logger, env, authenticatedFetch } from '@/utils';

const MEDICUS_NOTIFICATION_API_URL =
  process.env.EXPO_PUBLIC_MEDICUS_NOTIFICATION_API_URL ||
  `${env.medicusApiBaseUrl}/api/MedicusNotification`;

// ============================================================================
// ENUMS - Match backend spec exactly
// ============================================================================

// Patient categories
export type PatientNotificationCategory =
  | 'rx'
  | 'appointment'
  | 'care_plan'
  | 'messages'
  | 'lab_results'
  | 'billing'
  | 'security';

// Doctor categories
export type DoctorNotificationCategory =
  | 'appointment'
  | 'messages'
  | 'schedule_change'
  | 'security';

// Combined type for API compatibility
export type NotificationCategory = PatientNotificationCategory | DoctorNotificationCategory;

export type NotificationChannel = 'push' | 'email' | 'sms';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Single preference row (category + channel combination)
 */
export interface NotificationPreference {
  category: NotificationCategory;
  channel: NotificationChannel;
  enabled: boolean;
  quiet_hours_start?: string; // HH:MM format
  quiet_hours_end?: string; // HH:MM format
  timezone?: string;
}

/**
 * Request to update a preference
 */
export interface UpdatePreferenceRequest {
  category: NotificationCategory;
  channel: NotificationChannel;
  enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone?: string;
}

export interface RegisterDeviceRequest {
  platform: string;
  push_token: string;
}

export interface DeviceInfo {
  id: string;
  platform: string;
  push_token: string;
  is_active: boolean;
  created_at: string;
  last_seen_at?: string;
}

export interface CreateNotificationRequest {
  user_id: string;
  template_key: string;
  category: NotificationCategory;
  channels: NotificationChannel[];
  priority?: NotificationPriority;
  send_after?: string;
  payload?: Record<string, any>;
}

// ============================================================================
// NEW: Simplified settings types
// ============================================================================

export interface ChannelSettings {
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone: string;
}

export interface CategorySetting {
  category: NotificationCategory;
  enabled: boolean;
}

export interface NotificationSettings {
  channels: ChannelSettings;
  categories: CategorySetting[];
}

export interface UpdateChannelSettingsRequest {
  push_enabled?: boolean;
  email_enabled?: boolean;
  sms_enabled?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone?: string;
}

export interface UpdateCategoryRequest {
  category: NotificationCategory;
  enabled: boolean;
}

// ============================================================================
// CATEGORY/CHANNEL METADATA (for UI display)
// ============================================================================

// Patient notification categories
export const PATIENT_NOTIFICATION_CATEGORIES: {
  value: PatientNotificationCategory;
  label: string;
  icon: string;
  canDisable: boolean;
}[] = [
  { value: 'messages', label: 'Messages', icon: 'message-text', canDisable: true },
  { value: 'appointment', label: 'Appointments', icon: 'calendar-clock', canDisable: true },
  { value: 'rx', label: 'Prescriptions', icon: 'pill', canDisable: true },
  { value: 'lab_results', label: 'Lab Results', icon: 'test-tube', canDisable: true },
  { value: 'care_plan', label: 'Care Plans', icon: 'clipboard-text', canDisable: true },
  { value: 'billing', label: 'Billing', icon: 'currency-usd', canDisable: true },
  { value: 'security', label: 'Security Alerts', icon: 'shield-check', canDisable: false },
];

// Doctor notification categories
export const DOCTOR_NOTIFICATION_CATEGORIES: {
  value: DoctorNotificationCategory;
  label: string;
  icon: string;
  canDisable: boolean;
}[] = [
  { value: 'appointment', label: 'New Appointments', icon: 'calendar-plus', canDisable: true },
  { value: 'messages', label: 'Patient Messages', icon: 'message-text', canDisable: true },
  { value: 'schedule_change', label: 'Schedule Changes', icon: 'calendar-edit', canDisable: true },
  { value: 'security', label: 'Security Alerts', icon: 'shield-check', canDisable: false },
];

// Legacy export for backward compatibility
export const NOTIFICATION_CATEGORIES = PATIENT_NOTIFICATION_CATEGORIES;

export const NOTIFICATION_CHANNELS: {
  value: NotificationChannel;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: 'push',
    label: 'Push',
    description: 'Notifications on your device',
    icon: 'cellphone',
  },
  {
    value: 'email',
    label: 'Email',
    description: 'Send to your email address',
    icon: 'email',
  },
  {
    value: 'sms',
    label: 'SMS',
    description: 'Text message (carrier rates apply)',
    icon: 'message-text-outline',
  },
];

// ============================================================================
// API CLIENT
// ============================================================================

class MedicusNotificationAPI {
  private static instance: MedicusNotificationAPI;

  public static getInstance(): MedicusNotificationAPI {
    if (!MedicusNotificationAPI.instance) {
      MedicusNotificationAPI.instance = new MedicusNotificationAPI();
    }
    return MedicusNotificationAPI.instance;
  }

  /**
   * Set authentication token for API requests
   * @deprecated Token management is now handled automatically by authenticatedFetch
   */
  public setAuthToken(_token: string): void {
    // No-op: Token is now handled automatically by authenticatedFetch
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${MEDICUS_NOTIFICATION_API_URL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    try {
      const response = await authenticatedFetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail ||
            errorData.message ||
            `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      logger.error('MedicusNotification API request failed', error as Error, {
        component: 'MedicusNotificationAPI',
        endpoint,
        method: options.method || 'GET',
      });
      throw error;
    }
  }

  // ============================================================================
  // DEVICE MANAGEMENT
  // ============================================================================

  /**
   * Register device for push notifications
   */
  public async registerDevice(deviceInfo: RegisterDeviceRequest): Promise<void> {
    try {
      await this.makeRequest('/devices', {
        method: 'POST',
        body: JSON.stringify(deviceInfo),
      });

      logger.auditLog('device_registered', '', {
        platform: deviceInfo.platform,
      });
    } catch (error) {
      logger.error('Failed to register device', error as Error, {
        component: 'MedicusNotificationAPI',
      });
      throw error;
    }
  }

  /**
   * Deactivate this device's push token (called on logout)
   */
  public async unregisterDevice(pushToken: string): Promise<void> {
    try {
      await this.makeRequest('/devices/unregister', {
        method: 'POST',
        body: JSON.stringify({ push_token: pushToken }),
      });

      logger.auditLog('device_unregistered', '');
    } catch (error) {
      logger.error('Failed to unregister device', error as Error, {
        component: 'MedicusNotificationAPI',
      });
      throw error;
    }
  }

  // ============================================================================
  // NEW: SIMPLIFIED SETTINGS API
  // ============================================================================

  /**
   * Get all notification settings (channels + categories)
   * @param assistant - Current mode: 'mediaid' (patient) or 'medidoc' (doctor)
   */
  public async getSettings(assistant: 'mediaid' | 'medidoc' = 'mediaid'): Promise<NotificationSettings> {
    try {
      const response = await this.makeRequest<NotificationSettings>(`/settings?assistant=${assistant}`);

      logger.info('Retrieved notification settings', {
        component: 'MedicusNotificationAPI',
        assistant,
      });

      return response;
    } catch (error) {
      logger.error('Failed to get settings', error as Error, {
        component: 'MedicusNotificationAPI',
      });
      throw error;
    }
  }

  /**
   * Update global channel settings
   * @param request - Channel settings to update
   * @param assistant - Current mode: 'mediaid' (patient) or 'medidoc' (doctor)
   */
  public async updateChannelSettings(
    request: UpdateChannelSettingsRequest,
    assistant: 'mediaid' | 'medidoc' = 'mediaid'
  ): Promise<ChannelSettings> {
    try {
      const response = await this.makeRequest<ChannelSettings>(
        `/settings/channels?assistant=${assistant}`,
        {
          method: 'PUT',
          body: JSON.stringify(request),
        }
      );

      logger.auditLog('channel_settings_updated', '', { ...request, assistant });

      return response;
    } catch (error) {
      logger.error('Failed to update channel settings', error as Error, {
        component: 'MedicusNotificationAPI',
      });
      throw error;
    }
  }

  /**
   * Update a single category setting
   * @param request - Category setting to update
   * @param assistant - Current mode: 'mediaid' (patient) or 'medidoc' (doctor)
   */
  public async updateCategorySetting(
    request: UpdateCategoryRequest,
    assistant: 'mediaid' | 'medidoc' = 'mediaid'
  ): Promise<CategorySetting> {
    try {
      const response = await this.makeRequest<CategorySetting>(
        `/settings/categories?assistant=${assistant}`,
        {
          method: 'PUT',
          body: JSON.stringify(request),
        }
      );

      logger.auditLog('category_setting_updated', '', { ...request, assistant });

      return response;
    } catch (error) {
      logger.error('Failed to update category setting', error as Error, {
        component: 'MedicusNotificationAPI',
      });
      throw error;
    }
  }
}

// Export singleton instance
export const medicusNotificationAPI = MedicusNotificationAPI.getInstance();

// Export types and API class
export default MedicusNotificationAPI;
