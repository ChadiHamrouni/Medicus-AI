/**
 * HIPAA compliance service for MediApp
 * Ensures proper handling, storage, and transmission of protected health information (PHI)
 */

import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

import { logger } from '@/utils';

export interface PHIAccess {
  id: string;
  userId: string;
  patientId: string;
  dataType: PHIDataType;
  action: PHIAction;
  timestamp: Date;
  purpose: string;
  ipAddress?: string;
  deviceInfo?: string;
  authorized: boolean;
}

export type PHIDataType =
  | 'medical_record'
  | 'conversation'
  | 'document'
  | 'image'
  | 'audio'
  | 'personal_info'
  | 'insurance_info'
  | 'payment_info';

export type PHIAction =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'share'
  | 'export'
  | 'print';

export interface DataRetentionPolicy {
  dataType: PHIDataType;
  retentionPeriodDays: number;
  autoDelete: boolean;
  requiresManualReview: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure' | 'denied';
  details?: Record<string, any>;
}

class HIPAAComplianceService {
  private static instance: HIPAAComplianceService;
  private readonly AUDIT_LOG_KEY = '@hipaa_audit_log';
  private readonly PHI_ACCESS_KEY = '@phi_access_log';
  private readonly CONSENT_KEY = '@patient_consent';

  // Default data retention policies (in days)
  private readonly DEFAULT_RETENTION_POLICIES: DataRetentionPolicy[] = [
    {
      dataType: 'medical_record',
      retentionPeriodDays: 2555,
      autoDelete: false,
      requiresManualReview: true,
    }, // 7 years
    {
      dataType: 'conversation',
      retentionPeriodDays: 1825,
      autoDelete: false,
      requiresManualReview: true,
    }, // 5 years
    {
      dataType: 'document',
      retentionPeriodDays: 2555,
      autoDelete: false,
      requiresManualReview: true,
    }, // 7 years
    {
      dataType: 'image',
      retentionPeriodDays: 2555,
      autoDelete: false,
      requiresManualReview: true,
    }, // 7 years
    {
      dataType: 'audio',
      retentionPeriodDays: 1095,
      autoDelete: false,
      requiresManualReview: true,
    }, // 3 years
    {
      dataType: 'personal_info',
      retentionPeriodDays: 2555,
      autoDelete: false,
      requiresManualReview: true,
    }, // 7 years
    {
      dataType: 'insurance_info',
      retentionPeriodDays: 2555,
      autoDelete: false,
      requiresManualReview: true,
    }, // 7 years
    {
      dataType: 'payment_info',
      retentionPeriodDays: 2555,
      autoDelete: false,
      requiresManualReview: true,
    }, // 7 years
  ];

  public static getInstance(): HIPAAComplianceService {
    if (!HIPAAComplianceService.instance) {
      HIPAAComplianceService.instance = new HIPAAComplianceService();
    }
    return HIPAAComplianceService.instance;
  }

  /**
   * Log PHI access for audit purposes
   */
  public async logPHIAccess(
    userId: string,
    patientId: string,
    dataType: PHIDataType,
    action: PHIAction,
    purpose: string,
    authorized: boolean = true,
    additionalInfo?: Record<string, any>
  ): Promise<void> {
    const accessId = `phi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const access: PHIAccess = {
        id: accessId,
        userId,
        patientId,
        dataType,
        action,
        timestamp: new Date(),
        purpose,
        authorized,
        deviceInfo: additionalInfo?.deviceInfo,
        ipAddress: additionalInfo?.ipAddress,
      };

      // Store PHI access log
      const existingAccess = await this.getPHIAccessLogs();
      existingAccess.push(access);

      await SecureStore.setItemAsync(
        this.PHI_ACCESS_KEY,
        JSON.stringify(existingAccess)
      );

      // Create audit log entry
      await this.createAuditLogEntry(
        userId,
        `phi_${action}`,
        `${dataType}:${patientId}`,
        authorized ? 'success' : 'denied',
        {
          purpose,
          dataType,
          action,
          patientId,
          ...additionalInfo,
        }
      );

      // Use specialized HIPAA logging
      logger.hipaaLog(`phi_${action}`, userId, patientId, {
        dataType,
        purpose,
        authorized,
        accessId,
      });
    } catch (error) {
      logger.error('Failed to log PHI access', error as Error, {
        component: 'HIPAAComplianceService',
        userId,
        patientId,
        dataType,
        action,
      });
    }
  }

  /**
   * Validate user authorization for PHI access
   */
  public async validatePHIAccess(
    userId: string,
    patientId: string,
    dataType: PHIDataType,
    action: PHIAction,
    purpose: string
  ): Promise<boolean> {
    try {
      // Check if user has consent to access this patient's data
      const hasConsent = await this.checkPatientConsent(userId, patientId);
      if (!hasConsent) {
        await this.logPHIAccess(
          userId,
          patientId,
          dataType,
          action,
          purpose,
          false
        );
        return false;
      }

      // Check role-based access controls (simplified implementation)
      const hasPermission = await this.checkRolePermissions(
        userId,
        dataType,
        action
      );
      if (!hasPermission) {
        await this.logPHIAccess(
          userId,
          patientId,
          dataType,
          action,
          purpose,
          false
        );
        return false;
      }

      // Log successful validation
      await this.logPHIAccess(
        userId,
        patientId,
        dataType,
        action,
        purpose,
        true
      );
      return true;
    } catch (error) {
      logger.error('Failed to validate PHI access', error as Error, {
        component: 'HIPAAComplianceService',
        userId,
        patientId,
        dataType,
        action,
      });

      // Deny access on error for security
      await this.logPHIAccess(
        userId,
        patientId,
        dataType,
        action,
        purpose,
        false
      );
      return false;
    }
  }

  /**
   * Check patient consent for data access
   */
  private async checkPatientConsent(
    userId: string,
    patientId: string
  ): Promise<boolean> {
    try {
      const consentData = await SecureStore.getItemAsync(this.CONSENT_KEY);
      if (!consentData) {
        return false;
      }

      const consents = JSON.parse(consentData);
      const consent = consents.find(
        (c: any) =>
          c.patientId === patientId && c.authorizedUsers.includes(userId)
      );

      return (
        consent && consent.isActive && new Date(consent.expiryDate) > new Date()
      );
    } catch (error) {
      logger.error('Failed to check patient consent', error as Error, {
        component: 'HIPAAComplianceService',
        userId,
        patientId,
      });
      return false;
    }
  }

  /**
   * Check role-based permissions (simplified implementation)
   */
  private async checkRolePermissions(
    userId: string,
    dataType: PHIDataType,
    action: PHIAction
  ): Promise<boolean> {
    // TODO: Implement actual role-based access control
    // This is a simplified implementation

    // For now, allow all actions for authenticated users
    // In production, this would check against user roles and permissions
    return true;
  }

  /**
   * Create audit log entry
   */
  private async createAuditLogEntry(
    userId: string,
    action: string,
    resource: string,
    outcome: 'success' | 'failure' | 'denied',
    details?: Record<string, any>
  ): Promise<void> {
    try {
      const logEntry: AuditLogEntry = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        userId,
        action,
        resource,
        outcome,
        details,
      };

      const existingLogs = await this.getAuditLogs();
      existingLogs.push(logEntry);

      await SecureStore.setItemAsync(
        this.AUDIT_LOG_KEY,
        JSON.stringify(existingLogs)
      );
    } catch (error) {
      logger.error('Failed to create audit log entry', error as Error, {
        component: 'HIPAAComplianceService',
      });
    }
  }

  /**
   * Get PHI access logs
   */
  public async getPHIAccessLogs(): Promise<PHIAccess[]> {
    try {
      const logsJson = await SecureStore.getItemAsync(this.PHI_ACCESS_KEY);
      return logsJson ? JSON.parse(logsJson) : [];
    } catch (error) {
      logger.error('Failed to get PHI access logs', error as Error, {
        component: 'HIPAAComplianceService',
      });
      return [];
    }
  }

  /**
   * Get audit logs
   */
  public async getAuditLogs(): Promise<AuditLogEntry[]> {
    try {
      const logsJson = await SecureStore.getItemAsync(this.AUDIT_LOG_KEY);
      return logsJson ? JSON.parse(logsJson) : [];
    } catch (error) {
      logger.error('Failed to get audit logs', error as Error, {
        component: 'HIPAAComplianceService',
      });
      return [];
    }
  }

  /**
   * Generate compliance report
   */
  public async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalAccesses: number;
    unauthorizedAttempts: number;
    dataTypes: Record<PHIDataType, number>;
    actions: Record<PHIAction, number>;
    userActivity: Record<string, number>;
  }> {
    try {
      const accessLogs = await this.getPHIAccessLogs();

      const filteredLogs = accessLogs.filter(
        log => log.timestamp >= startDate && log.timestamp <= endDate
      );

      const report = {
        totalAccesses: filteredLogs.length,
        unauthorizedAttempts: filteredLogs.filter(log => !log.authorized)
          .length,
        dataTypes: {} as Record<PHIDataType, number>,
        actions: {} as Record<PHIAction, number>,
        userActivity: {} as Record<string, number>,
      };

      filteredLogs.forEach(log => {
        // Count by data type
        report.dataTypes[log.dataType] =
          (report.dataTypes[log.dataType] || 0) + 1;

        // Count by action
        report.actions[log.action] = (report.actions[log.action] || 0) + 1;

        // Count by user
        report.userActivity[log.userId] =
          (report.userActivity[log.userId] || 0) + 1;
      });

      logger.auditLog('compliance_report_generated', '', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalRecords: report.totalAccesses,
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate compliance report', error as Error, {
        component: 'HIPAAComplianceService',
      });

      return {
        totalAccesses: 0,
        unauthorizedAttempts: 0,
        dataTypes: {} as Record<PHIDataType, number>,
        actions: {} as Record<PHIAction, number>,
        userActivity: {} as Record<string, number>,
      };
    }
  }

  /**
   * Check data retention compliance
   */
  public async checkDataRetentionCompliance(): Promise<{
    expiredData: {
      dataType: PHIDataType;
      patientId: string;
      createdDate: Date;
      expiryDate: Date;
      requiresManualReview: boolean;
    }[];
    totalExpired: number;
  }> {
    try {
      const result = {
        expiredData: [] as any[],
        totalExpired: 0,
      };

      // TODO: Implement actual data scanning for retention compliance
      // This would scan all PHI data and check against retention policies

      logger.info('Data retention compliance check completed', {
        component: 'HIPAAComplianceService',
        expiredItems: result.totalExpired,
      });

      return result;
    } catch (error) {
      logger.error(
        'Failed to check data retention compliance',
        error as Error,
        {
          component: 'HIPAAComplianceService',
        }
      );

      return {
        expiredData: [],
        totalExpired: 0,
      };
    }
  }

  /**
   * Handle potential HIPAA violation
   */
  public async handlePotentialViolation(
    violationType: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      const violationId = `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Log the potential violation
      logger.securityLog('potential_hipaa_violation', details.userId || '', {
        violationId,
        type: violationType,
        details,
        timestamp: new Date().toISOString(),
      });

      // Create audit log entry
      await this.createAuditLogEntry(
        details.userId || 'system',
        'hipaa_violation_detected',
        violationType,
        'failure',
        {
          violationId,
          details,
        }
      );

      // Alert administrators (in production, this would be sent to compliance team)
      logger.error(
        'HIPAA compliance violation detected',
        new Error(violationType),
        {
          component: 'HIPAAComplianceService',
          violationId,
          details,
        }
      );
    } catch (error) {
      logger.error(
        'Failed to handle potential HIPAA violation',
        error as Error,
        {
          component: 'HIPAAComplianceService',
          violationType,
        }
      );
    }
  }

  /**
   * Validate minimum necessary standard
   */
  public validateMinimumNecessary(
    requestedData: PHIDataType[],
    purpose: string,
    userRole: string
  ): {
    allowed: PHIDataType[];
    denied: PHIDataType[];
    warnings: string[];
  } {
    const result = {
      allowed: [] as PHIDataType[],
      denied: [] as PHIDataType[],
      warnings: [] as string[],
    };

    // TODO: Implement actual minimum necessary validation logic
    // For now, allow all requested data with warnings for sensitive types

    requestedData.forEach(dataType => {
      if (
        ['payment_info', 'insurance_info'].includes(dataType) &&
        purpose !== 'billing'
      ) {
        result.denied.push(dataType);
        result.warnings.push(`${dataType} not necessary for ${purpose}`);
      } else {
        result.allowed.push(dataType);
      }
    });

    logger.auditLog('minimum_necessary_validation', '', {
      purpose,
      userRole,
      requestedData,
      allowed: result.allowed,
      denied: result.denied,
    });

    return result;
  }

  /**
   * Get data retention policy for a data type
   */
  public getRetentionPolicy(dataType: PHIDataType): DataRetentionPolicy {
    return (
      this.DEFAULT_RETENTION_POLICIES.find(
        policy => policy.dataType === dataType
      ) || this.DEFAULT_RETENTION_POLICIES[0]
    ); // Default to medical_record policy
  }

  /**
   * Clear expired audit logs (for storage management)
   */
  public async clearExpiredAuditLogs(
    retentionDays: number = 2555
  ): Promise<void> {
    try {
      const auditLogs = await this.getAuditLogs();
      const cutoffDate = new Date(
        Date.now() - retentionDays * 24 * 60 * 60 * 1000
      );

      const activeAuditLogs = auditLogs.filter(
        log => log.timestamp > cutoffDate
      );
      const expiredCount = auditLogs.length - activeAuditLogs.length;

      if (expiredCount > 0) {
        await SecureStore.setItemAsync(
          this.AUDIT_LOG_KEY,
          JSON.stringify(activeAuditLogs)
        );

        logger.auditLog('expired_audit_logs_cleared', '', {
          clearedCount: expiredCount,
          retentionDays,
          remainingCount: activeAuditLogs.length,
        });
      }
    } catch (error) {
      logger.error('Failed to clear expired audit logs', error as Error, {
        component: 'HIPAAComplianceService',
      });
    }
  }
}

// Export singleton instance
export const hipaaComplianceService = HIPAAComplianceService.getInstance();

// Export types and service
export default HIPAAComplianceService;
