/**
 * Emergency escalation service for MediApp
 * Handles urgent medical situations, emergency contacts, and rapid response protocols
 */

import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import { Alert, Platform } from 'react-native';

import { logger } from '@/utils';
import { notificationService } from '@/services/notifications/notifications';

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  isPrimary: boolean;
  canReceiveUrgentAlerts: boolean;
}

export interface EmergencyAlert {
  id: string;
  patientId: string;
  type: EmergencyType;
  severity: EmergencySeverity;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  message: string;
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  escalationLevel: number;
  contacts: string[]; // Contact IDs
}

export type EmergencyType =
  | 'medical_emergency'
  | 'medication_reaction'
  | 'fall_detected'
  | 'chest_pain'
  | 'breathing_difficulty'
  | 'severe_pain'
  | 'mental_health_crisis'
  | 'other';

export type EmergencySeverity = 'low' | 'medium' | 'high' | 'critical';

class EmergencyEscalationService {
  private static instance: EmergencyEscalationService;
  private activeAlerts: Map<string, EmergencyAlert> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  // Emergency escalation timeouts (in milliseconds)
  private readonly ESCALATION_TIMEOUTS = {
    critical: 2 * 60 * 1000, // 2 minutes
    high: 5 * 60 * 1000, // 5 minutes
    medium: 15 * 60 * 1000, // 15 minutes
    low: 30 * 60 * 1000, // 30 minutes
  };

  public static getInstance(): EmergencyEscalationService {
    if (!EmergencyEscalationService.instance) {
      EmergencyEscalationService.instance = new EmergencyEscalationService();
    }
    return EmergencyEscalationService.instance;
  }

  /**
   * Trigger an emergency alert
   */
  public async triggerEmergencyAlert(
    patientId: string,
    type: EmergencyType,
    severity: EmergencySeverity,
    message: string,
    contactIds?: string[]
  ): Promise<EmergencyAlert> {
    const alertId = `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.securityLog('emergency_alert_triggered', patientId, {
        alertId,
        type,
        severity,
        escalationLevel: 1,
      });

      // Get current location if permissions allow
      const location = await this.getCurrentLocation();

      // Create emergency alert
      const alert: EmergencyAlert = {
        id: alertId,
        patientId,
        type,
        severity,
        location,
        message,
        timestamp: new Date(),
        status: 'active',
        escalationLevel: 1,
        contacts: contactIds || [],
      };

      this.activeAlerts.set(alertId, alert);

      // Immediately notify emergency contacts
      await this.notifyEmergencyContacts(alert);

      // Start escalation timer based on severity
      this.startEscalationTimer(alert);

      // For critical alerts, also trigger system-level notifications
      if (severity === 'critical') {
        await this.triggerCriticalAlertProtocol(alert);
      }

      logger.auditLog('emergency_alert_created', patientId, {
        alertId,
        type,
        severity,
        contactsNotified: alert.contacts.length,
      });

      return alert;
    } catch (error) {
      logger.error('Failed to trigger emergency alert', error as Error, {
        component: 'EmergencyEscalationService',
        patientId,
        type,
        severity,
      });
      throw error;
    }
  }

  /**
   * Get current location for emergency services
   */
  private async getCurrentLocation(): Promise<
    EmergencyAlert['location'] | undefined
  > {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        logger.warn('Location permission not granted for emergency', {
          component: 'EmergencyEscalationService',
        });
        return undefined;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
      });

      // Reverse geocode to get address
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const formattedAddress = address[0]
        ? `${address[0].street} ${address[0].city}, ${address[0].region} ${address[0].postalCode}`
        : undefined;

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: formattedAddress,
      };
    } catch (error) {
      logger.error('Failed to get location for emergency', error as Error, {
        component: 'EmergencyEscalationService',
      });
      return undefined;
    }
  }

  /**
   * Notify emergency contacts
   */
  private async notifyEmergencyContacts(alert: EmergencyAlert): Promise<void> {
    try {
      // TODO: Get emergency contacts from storage/API
      const emergencyContacts = await this.getEmergencyContacts(
        alert.patientId
      );

      const contactsToNotify =
        alert.contacts.length > 0
          ? emergencyContacts.filter(contact =>
              alert.contacts.includes(contact.id)
            )
          : emergencyContacts.filter(contact => contact.canReceiveUrgentAlerts);

      const notificationPromises = contactsToNotify.map(async contact => {
        try {
          // Send push notification if available
          await notificationService.scheduleLocalNotification(
            `🚨 EMERGENCY ALERT`,
            `${alert.message}\n\nPatient needs immediate assistance.`,
            {
              conversationId: alert.patientId,
              messageType: 'urgent',
              isUrgent: true,
            }
          );

          // Log contact notification
          logger.auditLog('emergency_contact_notified', alert.patientId, {
            alertId: alert.id,
            contactId: contact.id,
            contactName: contact.name,
            relationship: contact.relationship,
          });
        } catch (error) {
          logger.error('Failed to notify emergency contact', error as Error, {
            component: 'EmergencyEscalationService',
            contactId: contact.id,
            alertId: alert.id,
          });
        }
      });

      await Promise.allSettled(notificationPromises);

      logger.info('Emergency contacts notified', {
        component: 'EmergencyEscalationService',
        alertId: alert.id,
        contactsNotified: contactsToNotify.length,
      });
    } catch (error) {
      logger.error('Failed to notify emergency contacts', error as Error, {
        component: 'EmergencyEscalationService',
        alertId: alert.id,
      });
    }
  }

  /**
   * Start escalation timer for unacknowledged alerts
   */
  private startEscalationTimer(alert: EmergencyAlert): void {
    const timeout = this.ESCALATION_TIMEOUTS[alert.severity];

    const timer = setTimeout(async () => {
      if (this.activeAlerts.get(alert.id)?.status === 'active') {
        await this.escalateAlert(alert.id);
      }
    }, timeout);

    this.escalationTimers.set(alert.id, timer as any);

    logger.info('Escalation timer started', {
      component: 'EmergencyEscalationService',
      alertId: alert.id,
      timeoutMinutes: timeout / (60 * 1000),
      severity: alert.severity,
    });
  }

  /**
   * Escalate an unacknowledged alert
   */
  private async escalateAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert || alert.status !== 'active') {
      return;
    }

    try {
      alert.escalationLevel++;

      logger.securityLog('emergency_alert_escalated', alert.patientId, {
        alertId,
        escalationLevel: alert.escalationLevel,
        timeSinceOriginal: Date.now() - alert.timestamp.getTime(),
      });

      // Escalation actions based on level
      switch (alert.escalationLevel) {
        case 2:
          // Notify additional contacts
          await this.notifySecondaryContacts(alert);
          break;
        case 3:
          // Notify healthcare providers
          await this.notifyHealthcareProviders(alert);
          break;
        case 4:
          // Consider emergency services notification
          await this.considerEmergencyServices(alert);
          break;
        default:
          // Maximum escalation reached
          logger.warn('Maximum escalation level reached', {
            component: 'EmergencyEscalationService',
            alertId,
            escalationLevel: alert.escalationLevel,
          });
      }

      // Continue escalation timer if still unacknowledged
      if (alert.escalationLevel < 4) {
        this.startEscalationTimer(alert);
      }
    } catch (error) {
      logger.error('Failed to escalate alert', error as Error, {
        component: 'EmergencyEscalationService',
        alertId,
      });
    }
  }

  /**
   * Trigger critical alert protocol
   */
  private async triggerCriticalAlertProtocol(
    alert: EmergencyAlert
  ): Promise<void> {
    try {
      // Show system alert
      Alert.alert(
        '🚨 CRITICAL EMERGENCY',
        `${alert.message}\n\nEmergency contacts have been notified.`,
        [
          { text: 'Call 911', onPress: () => this.callEmergencyServices() },
          {
            text: 'Acknowledge',
            onPress: () => this.acknowledgeAlert(alert.id),
          },
        ],
        { cancelable: false }
      );

      // Send urgent push notification
      await notificationService.scheduleLocalNotification(
        '🚨 CRITICAL EMERGENCY',
        alert.message,
        {
          conversationId: alert.patientId,
          messageType: 'urgent',
          isUrgent: true,
        }
      );

      logger.securityLog('critical_alert_protocol_triggered', alert.patientId, {
        alertId: alert.id,
        type: alert.type,
      });
    } catch (error) {
      logger.error(
        'Failed to trigger critical alert protocol',
        error as Error,
        {
          component: 'EmergencyEscalationService',
          alertId: alert.id,
        }
      );
    }
  }

  /**
   * Call emergency services
   */
  private async callEmergencyServices(): Promise<void> {
    try {
      const emergencyNumber =
        Platform.OS === 'ios' ? 'telprompt:911' : 'tel:911';

      const supported = await Linking.canOpenURL(emergencyNumber);
      if (supported) {
        await Linking.openURL(emergencyNumber);

        logger.auditLog('emergency_services_called', '', {
          method: 'direct_dial',
          timestamp: new Date().toISOString(),
        });
      } else {
        Alert.alert('Unable to Call', 'Please dial 911 manually');
      }
    } catch (error) {
      logger.error('Failed to call emergency services', error as Error, {
        component: 'EmergencyEscalationService',
      });
      Alert.alert('Call Failed', 'Please dial 911 manually');
    }
  }

  /**
   * Acknowledge an alert
   */
  public async acknowledgeAlert(
    alertId: string,
    acknowledgedBy?: string
  ): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return;
    }

    try {
      alert.status = 'acknowledged';

      // Clear escalation timer
      const timer = this.escalationTimers.get(alertId);
      if (timer) {
        clearTimeout(timer);
        this.escalationTimers.delete(alertId);
      }

      logger.auditLog('emergency_alert_acknowledged', alert.patientId, {
        alertId,
        acknowledgedBy: acknowledgedBy || 'user',
        escalationLevel: alert.escalationLevel,
        timeToAcknowledge: Date.now() - alert.timestamp.getTime(),
      });
    } catch (error) {
      logger.error('Failed to acknowledge alert', error as Error, {
        component: 'EmergencyEscalationService',
        alertId,
      });
    }
  }

  /**
   * Resolve an alert
   */
  public async resolveAlert(
    alertId: string,
    resolvedBy?: string
  ): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return;
    }

    try {
      alert.status = 'resolved';

      // Clear escalation timer
      const timer = this.escalationTimers.get(alertId);
      if (timer) {
        clearTimeout(timer);
        this.escalationTimers.delete(alertId);
      }

      // Remove from active alerts
      this.activeAlerts.delete(alertId);

      logger.auditLog('emergency_alert_resolved', alert.patientId, {
        alertId,
        resolvedBy: resolvedBy || 'user',
        escalationLevel: alert.escalationLevel,
        timeToResolve: Date.now() - alert.timestamp.getTime(),
      });
    } catch (error) {
      logger.error('Failed to resolve alert', error as Error, {
        component: 'EmergencyEscalationService',
        alertId,
      });
    }
  }

  /**
   * Get emergency contacts for a patient (placeholder implementation)
   */
  private async getEmergencyContacts(
    patientId: string
  ): Promise<EmergencyContact[]> {
    // TODO: Implement actual storage/API call
    return [];
  }

  /**
   * Notify secondary contacts (escalation level 2)
   */
  private async notifySecondaryContacts(alert: EmergencyAlert): Promise<void> {
    logger.info('Notifying secondary contacts', {
      component: 'EmergencyEscalationService',
      alertId: alert.id,
    });
    // TODO: Implement secondary contact notification
  }

  /**
   * Notify healthcare providers (escalation level 3)
   */
  private async notifyHealthcareProviders(
    alert: EmergencyAlert
  ): Promise<void> {
    logger.info('Notifying healthcare providers', {
      component: 'EmergencyEscalationService',
      alertId: alert.id,
    });
    // TODO: Implement healthcare provider notification
  }

  /**
   * Consider emergency services notification (escalation level 4)
   */
  private async considerEmergencyServices(
    alert: EmergencyAlert
  ): Promise<void> {
    logger.securityLog(
      'considering_emergency_services_notification',
      alert.patientId,
      {
        alertId: alert.id,
        escalationLevel: alert.escalationLevel,
      }
    );

    Alert.alert(
      'Emergency Services',
      'This alert has reached maximum escalation. Consider contacting emergency services.',
      [
        { text: 'Call 911', onPress: () => this.callEmergencyServices() },
        { text: 'Not Now', style: 'cancel' },
      ]
    );
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): EmergencyAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alerts for a specific patient
   */
  public getPatientAlerts(patientId: string): EmergencyAlert[] {
    return Array.from(this.activeAlerts.values()).filter(
      alert => alert.patientId === patientId
    );
  }

  /**
   * Cleanup service
   */
  public cleanup(): void {
    // Clear all escalation timers
    this.escalationTimers.forEach(timer => clearTimeout(timer));
    this.escalationTimers.clear();

    // Clear active alerts
    this.activeAlerts.clear();

    logger.info('Emergency escalation service cleaned up', {
      component: 'EmergencyEscalationService',
    });
  }
}

// Export singleton instance
export const emergencyEscalationService =
  EmergencyEscalationService.getInstance();

// Export types and service
export default EmergencyEscalationService;
