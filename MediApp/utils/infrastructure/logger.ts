/**
 * Production-ready logging utility for MediApp
 * Integrates with Sentry for error tracking and provides structured logging
 */

// import { reportError } from '@/services/sentry/sentry';
import { env } from './env';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  component?: string;
  userId?: string;
  action?: string;
  metadata?: Record<string, any>;
  [key: string]: any; // Allow additional properties
}

class Logger {
  private isDevelopment: boolean;
  private logLevel: LogLevel;

  constructor() {
    this.isDevelopment = env.isDevelopmentMode();
    // Only show WARN and ERROR logs to reduce noise
    this.logLevel = this.isDevelopment ? LogLevel.WARN : LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(
    level: string,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  private logToConsole(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): void {
    if (!this.shouldLog(level)) return;

    const levelName = LogLevel[level];
    const formattedMessage = this.formatMessage(levelName, message, context);

    // Only log to console in development
    if (this.isDevelopment) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
        case LogLevel.INFO:
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    this.logToConsole(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.logToConsole(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.logToConsole(LogLevel.WARN, message, context);

    // Report warnings to Sentry in production (disabled)
    // if (!this.isDevelopment) {
    //   reportError(new Error(message), {
    //     level: 'warning',
    //     ...context,
    //   });
    // }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.logToConsole(LogLevel.ERROR, message, context);

    // Always report errors to Sentry (disabled)
    // reportError(error || new Error(message), {
    //   level: 'error',
    //   ...context,
    // });
  }

  // Specialized logging methods for medical app
  auditLog(
    action: string,
    userId: string,
    metadata?: Record<string, any>
  ): void {
    this.info(`AUDIT: ${action}`, {
      component: 'audit',
      userId,
      action,
      metadata,
    });
  }

  securityLog(
    event: string,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    this.warn(`SECURITY: ${event}`, {
      component: 'security',
      userId,
      action: event,
      metadata,
    });
  }

  performanceLog(
    operation: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    this.info(`PERFORMANCE: ${operation} took ${duration}ms`, {
      component: 'performance',
      action: operation,
      metadata: { duration, ...metadata },
    });
  }

  hipaaLog(
    action: string,
    userId: string,
    patientId?: string,
    metadata?: Record<string, any>
  ): void {
    this.info(`HIPAA: ${action}`, {
      component: 'hipaa',
      userId,
      action,
      metadata: { patientId, ...metadata },
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience methods for backward compatibility
export const logInfo = (message: string, context?: LogContext) =>
  logger.info(message, context);
export const logError = (
  message: string,
  error?: Error,
  context?: LogContext
) => logger.error(message, error, context);
export const logWarn = (message: string, context?: LogContext) =>
  logger.warn(message, context);
export const logDebug = (message: string, context?: LogContext) =>
  logger.debug(message, context);
