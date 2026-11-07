import Constants from 'expo-constants';

// Environment configuration utility
class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private config: Record<string, any>;

  private constructor() {
    this.config = Constants.expoConfig?.extra || {};
  }

  public static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  public get medicusApiBaseUrl(): string {
    const value =
      this.config.EXPO_PUBLIC_MEDICUS_API_BASE_URL ||
      process.env.EXPO_PUBLIC_MEDICUS_API_BASE_URL;
    if (!value && !__DEV__) {
      throw new Error('MEDICUS_API_BASE_URL is required for production');
    }
    return value || 'http://localhost:3000'; // Default for development
  }

  public get medicusConvoApiBaseUrl(): string {
    const directUrl =
      this.config.EXPO_PUBLIC_MEDICUS_CONVO_API_BASE_URL ||
      process.env.EXPO_PUBLIC_MEDICUS_CONVO_API_BASE_URL;

    // If specific service URL is provided, use it
    if (directUrl) {
      return directUrl;
    }

    // Otherwise construct from base URL
    const baseUrl = this.medicusApiBaseUrl;
    if (baseUrl) {
      return `${baseUrl}/api/MedicusConvo`;
    }

    return 'http://localhost:8003/api/MedicusConvo'; // Dev default
  }

  public get medicusUserApiBaseUrl(): string {
    const directUrl =
      this.config.EXPO_PUBLIC_MEDICUS_USER_API_BASE_URL ||
      process.env.EXPO_PUBLIC_MEDICUS_USER_API_BASE_URL;

    // If specific service URL is provided, use it
    if (directUrl) {
      return directUrl;
    }

    // Otherwise construct from base URL
    const baseUrl = this.medicusApiBaseUrl;
    if (baseUrl) {
      return `${baseUrl}/api/MedicusUser`;
    }

    return 'http://localhost:8002/api/MedicusUser'; // Dev default
  }

  public get medicusAIApiBaseUrl(): string {
    const directUrl =
      this.config.EXPO_PUBLIC_MEDICUS_AI_API_BASE_URL ||
      process.env.EXPO_PUBLIC_MEDICUS_AI_API_BASE_URL;

    // If specific service URL is provided, use it
    if (directUrl) {
      return directUrl;
    }

    // Otherwise construct from base URL
    const baseUrl = this.medicusApiBaseUrl;
    if (baseUrl) {
      return `${baseUrl}/api/MedicusAI`;
    }

    return 'http://localhost:8000/api/MedicusAI'; // Dev default
  }

  // Optional environment variables
  public get sentryDsn(): string | undefined {
    return this.config.SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN;
  }

  // Environment detection
  public get isDevelopment(): boolean {
    return __DEV__ || this.nodeEnv === 'development';
  }

  // Development bypass for UI testing (never use in production)
  public get enableDevBypass(): boolean {
    return (
      __DEV__ &&
      (this.config.ENABLE_DEV_BYPASS === 'true' ||
        process.env.EXPO_PUBLIC_ENABLE_DEV_BYPASS === 'true')
    );
  }

  public isDevelopmentMode(): boolean {
    return this.isDevelopment;
  }

  public get isProduction(): boolean {
    return !__DEV__ && this.nodeEnv === 'production';
  }

  public get nodeEnv(): string {
    return this.config.NODE_ENV || process.env.NODE_ENV || 'development';
  }

  // App information
  public get appVersion(): string {
    return this.config.APP_VERSION || Constants.expoConfig?.version || '1.0.0';
  }

  public get appName(): string {
    return this.config.APP_NAME || Constants.expoConfig?.name || 'MediApp';
  }

  // Check if running in ExpoGo
  public get isExpoGo(): boolean {
    return (
      this.config.IS_EXPO_GO === true ||
      Constants.executionEnvironment === 'storeClient'
    );
  }

  // Validation helper (disabled for ExpoGo)
  public validateRequiredEnvVars(): void {
    // Skip validation in ExpoGo to prevent blank screen
    if (this.isExpoGo) {
      return;
    }

    const requiredVars = [
      {
        key: 'EXPO_PUBLIC_MEDICUS_API_BASE_URL',
        value: this.medicusApiBaseUrl,
      },
    ];

    const missingVars = requiredVars.filter(({ value }) => !value);

    if (missingVars.length > 0 && !__DEV__) {
      const missingKeys = missingVars.map(({ key }) => key).join(', ');
      throw new Error(`Missing required environment variables: ${missingKeys}`);
    }

    // Warn in development
    if (missingVars.length > 0 && __DEV__) {
      const missingKeys = missingVars.map(({ key }) => key).join(', ');
      // Use console in development for environment warnings
      // eslint-disable-next-line no-console
      console.warn(`Warning: Missing environment variables: ${missingKeys}`);
    }
  }

  // Debug helper
  public logEnvironmentInfo(): void {
    if (__DEV__) {
      // Use console in development for environment debugging
      // eslint-disable-next-line no-console
    }
  }
}

// Export singleton instance
export const env = EnvironmentConfig.getInstance();

// Export individual getters for convenience
export const {
  medicusApiBaseUrl,
  medicusAIApiBaseUrl,
  sentryDsn,
  isDevelopment,
  isProduction,
  nodeEnv,
  appVersion,
  appName,
} = env;
