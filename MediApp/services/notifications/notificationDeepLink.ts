/**
 * Notification Deep Link Handler
 *
 * Resolves push notification payloads into Expo Router paths
 * and navigates safely, guarding against premature navigation
 * before the root navigator is mounted.
 */

import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { logger } from '@/utils';
import type { NotificationData } from './notifications';

// ============================================================================
// Route resolver — maps notification category + IDs to Expo Router paths
// ============================================================================

/**
 * Given a notification payload, return the Expo Router path to navigate to.
 * Returns null if no meaningful route can be determined.
 */
export function resolveDeepLinkRoute(data: NotificationData): string | null {
  // Explicit deep link always wins
  if (data.deepLink) {
    return data.deepLink;
  }

  // Explicitly ignore cancelled appointments for deep linking for patients
  if (data.category === 'appointment_cancelled' && data.role !== 'doctor') {
    return null;
  }

  switch (data.category) {
    // ---------- Patient categories ----------
    case 'messages':
      return data.conversationId
        ? `/tabs/chats/${data.conversationId}`
        : '/tabs/chats';

    case 'appointment':
    case 'appointment_reminder':
    case 'appointment_rescheduled': {
      // Extract date if available to pre-select it in the calendar
      // Prefer start_time (ISO string) over new_start_time or appointment_date (localized string)
      const appointmentDate = data.start_time || data.new_start_time || data.appointment_date;
      let dateParam = '';
      if (appointmentDate) {
        try {
          // Extract YYYY-MM-DD using local time to avoid UTC offset issues
          const parsed = new Date(String(appointmentDate));
          if (!isNaN(parsed.getTime())) {
            const year = parsed.getFullYear();
            const month = String(parsed.getMonth() + 1).padStart(2, '0');
            const day = String(parsed.getDate()).padStart(2, '0');
            dateParam = `?date=${year}-${month}-${day}`;
          }
        } catch {
          logger.warn('Failed to parse appointment date for deep link', {
            component: 'NotificationDeepLink',
            appointmentDate,
          });
        }
      }
      
      logger.info('Resolving appointment deep link route', {
        component: 'NotificationDeepLink',
        extractedAppointmentDate: appointmentDate,
        finalDateParam: dateParam,
        rawPayloadData: JSON.stringify(data)
      });
      
      if (data.role === 'doctor') {
        return `/tabs/doctor/calendar${dateParam}`;
      }
      return `/tabs/patients/medical-events${dateParam}`;
    }

    case 'rx':
      return '/tabs/patients/prescriptions';

    case 'lab_results':
    case 'care_plan':
    case 'billing':
      return '/tabs/patients';

    case 'security':
      return '/tabs/settings/security';

    // ---------- Doctor categories ----------
    case 'schedule_change':
      return '/tabs/doctor/calendar';

    default:
      break;
  }

  // Legacy fallback: use individual ID fields if no category was set
  if (data.conversationId) {
    return `/tabs/chats/${data.conversationId}`;
  }

  if (data.appointmentId) {
    return '/tabs/patients';
  }

  return null;
}

// ============================================================================
// Safe navigator — waits for root layout before pushing
// ============================================================================

/** Whether the Expo Router root layout has finished mounting. */
let _navigationReady = false;

/** Queue of routes that arrived before the navigator was ready. */
let _pendingRoute: string | null = null;

/**
 * Call this once from the root _layout after the navigator mounts.
 * Flushes any route that was queued during cold-start.
 */
export function markNavigationReady(): void {
  _navigationReady = true;
  logger.info('markNavigationReady called', { component: 'NotificationDeepLink', pendingRoute: _pendingRoute });

  if (_pendingRoute) {
    const route = _pendingRoute;
    _pendingRoute = null;
    logger.info('Flushing pending route', { component: 'NotificationDeepLink', route });
    navigateTo(route);
  }
}

/**
 * Navigate to a path. If the navigator isn't ready yet (cold-start),
 * the route is queued and will be flushed by `markNavigationReady`.
 */
function navigateTo(path: string): void {
  if (!_navigationReady) {
    logger.info('Navigator not ready — queuing deep link', {
      component: 'NotificationDeepLink',
      path,
    });
    _pendingRoute = path;
    return;
  }

  try {
    logger.info('Navigating from notification', {
      component: 'NotificationDeepLink',
      path,
    });
    router.push(path as any);
  } catch (error) {
    logger.error('Deep link navigation failed', error as Error, {
      component: 'NotificationDeepLink',
      path,
    });
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Process a notification response (user tapped a notification) and navigate.
 * Works for both foreground/background taps (listener) and cold-start.
 */
export function navigateFromNotification(
  response: Notifications.NotificationResponse
): void {
  // Add robust logging for the entire response to understand what data we get
  logger.info('Processing notification tap', {
    component: 'NotificationDeepLink',
    action: response.actionIdentifier,
    content: JSON.stringify(response.notification.request.content),
  });

  const data = response.notification.request.content.data as NotificationData;

  const route = resolveDeepLinkRoute(data);

  if (!route) {
    logger.warn('No deep link route for notification, payload dumped', {
      component: 'NotificationDeepLink',
      data: JSON.stringify(data),
      category: data.category,
      conversationId: data.conversationId,
    });
    return;
  }

  logger.info('Resolved deep link route', {
    component: 'NotificationDeepLink',
    route,
    data: JSON.stringify(data),
  });

  navigateTo(route);
}

/**
 * Check if the app was cold-started by tapping a notification.
 * If so, queue navigation. Call this once from root _layout on mount.
 */
export async function handleColdStartNotification(): Promise<void> {
  logger.info('handleColdStartNotification started', { component: 'NotificationDeepLink' });
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    
    logger.info('getLastNotificationResponseAsync result', { 
      component: 'NotificationDeepLink', 
      hasResponse: !!response 
    });

    if (response) {
      logger.info('Cold-start notification detected', {
        component: 'NotificationDeepLink',
        action: response.actionIdentifier,
      });
      navigateFromNotification(response);
    }
  } catch (error) {
    logger.error('Failed to check cold-start notification', error as Error, {
      component: 'NotificationDeepLink',
    });
  }
}
