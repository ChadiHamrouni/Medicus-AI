import Constants from 'expo-constants';

/**
 * The app's runtime configuration: the ONLY place that reads environment variables.
 *
 * Values come from EXPO_PUBLIC_* variables, which Expo inlines into the bundle at build time
 * (https://docs.expo.dev/guides/environment-variables/). Set them in MediApp/.env.local for
 * development (see .env.example) and as EAS environment variables for builds. Each variable
 * must be written out literally as `process.env.EXPO_PUBLIC_NAME` for Expo to inline it.
 *
 * No server address or website is hard-coded in the app: everything derives from
 * EXPO_PUBLIC_MEDICUS_API_BASE_URL (the API gateway) unless overridden below.
 *
 * Never put secrets here: EXPO_PUBLIC_* values are visible to anyone with the app.
 */

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

const clean = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const v = value.trim().replace(/\/+$/, '');
  return v || undefined;
};

class EnvironmentConfig {
  private static instance: EnvironmentConfig;

  public static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) EnvironmentConfig.instance = new EnvironmentConfig();
    return EnvironmentConfig.instance;
  }

  // ---------------------------------------------------------------------------
  // Backend (required): the API gateway, e.g. http://10.0.2.2:8088 on the Android emulator
  // ---------------------------------------------------------------------------
  public get medicusApiBaseUrl(): string {
    const value =
      clean(process.env.EXPO_PUBLIC_MEDICUS_API_BASE_URL) ??
      clean(extra.EXPO_PUBLIC_MEDICUS_API_BASE_URL);
    if (!value) {
      const message =
        'EXPO_PUBLIC_MEDICUS_API_BASE_URL is not set. Copy MediApp/.env.example to .env.local and set the API gateway address.';
      if (!__DEV__) throw new Error(message);
      // eslint-disable-next-line no-console
      console.error(message);
      return '';
    }
    return value;
  }

  // Optional per-service overrides (only when a service is not behind the gateway).
  public get medicusUserApiBaseUrl(): string {
    return clean(process.env.EXPO_PUBLIC_MEDICUS_USER_API_BASE_URL) ?? `${this.medicusApiBaseUrl}/api/MedicusUser`;
  }

  public get medicusConvoApiBaseUrl(): string {
    return clean(process.env.EXPO_PUBLIC_MEDICUS_CONVO_API_BASE_URL) ?? `${this.medicusApiBaseUrl}/api/MedicusConvo`;
  }

  public get medicusAIApiBaseUrl(): string {
    return clean(process.env.EXPO_PUBLIC_MEDICUS_AI_API_BASE_URL) ?? `${this.medicusApiBaseUrl}/api/MedicusAI`;
  }

  public get medicusNotificationApiBaseUrl(): string {
    return clean(process.env.EXPO_PUBLIC_MEDICUS_NOTIFICATION_API_URL) ?? `${this.medicusApiBaseUrl}/api/MedicusNotification`;
  }

  /** Socket.IO server (real-time messages). Defaults to the gateway. */
  public get socketUrl(): string {
    return clean(process.env.EXPO_PUBLIC_SOCKETIO_URL) ?? this.medicusApiBaseUrl;
  }

  // ---------------------------------------------------------------------------
  // Public links (optional): screens hide the matching entry when a value is not set
  // ---------------------------------------------------------------------------
  public get websiteUrl(): string | undefined {
    return clean(process.env.EXPO_PUBLIC_WEBSITE_URL);
  }

  public get termsUrl(): string | undefined {
    return clean(process.env.EXPO_PUBLIC_TERMS_URL);
  }

  public get privacyUrl(): string | undefined {
    return clean(process.env.EXPO_PUBLIC_PRIVACY_URL);
  }

  public get appStoreUrl(): string | undefined {
    return clean(process.env.EXPO_PUBLIC_APP_STORE_URL);
  }

  public get playStoreUrl(): string | undefined {
    return clean(process.env.EXPO_PUBLIC_PLAY_STORE_URL);
  }

  public get supportEmail(): string | undefined {
    return clean(process.env.EXPO_PUBLIC_SUPPORT_EMAIL);
  }

  // ---------------------------------------------------------------------------
  // Observability and flags
  // ---------------------------------------------------------------------------
  public get sentryDsn(): string | undefined {
    return clean(process.env.EXPO_PUBLIC_SENTRY_DSN) ?? clean(extra.SENTRY_DSN);
  }

  /** Development bypass for UI testing (never active in production builds). */
  public get enableDevBypass(): boolean {
    return __DEV__ && process.env.EXPO_PUBLIC_ENABLE_DEV_BYPASS === 'true';
  }

  public get nodeEnv(): string {
    return (extra.NODE_ENV as string) || process.env.NODE_ENV || 'development';
  }

  public get isDevelopment(): boolean {
    return __DEV__ || this.nodeEnv === 'development';
  }

  public isDevelopmentMode(): boolean {
    return this.isDevelopment;
  }

  public get isProduction(): boolean {
    return !__DEV__ && this.nodeEnv === 'production';
  }

  // ---------------------------------------------------------------------------
  // App information (from app.json / app.config.js)
  // ---------------------------------------------------------------------------
  public get appVersion(): string {
    return Constants.expoConfig?.version || (extra.APP_VERSION as string) || '1.0.0';
  }

  public get appName(): string {
    return Constants.expoConfig?.name || (extra.APP_NAME as string) || 'Medicus';
  }

  public get isExpoGo(): boolean {
    return Constants.executionEnvironment === 'storeClient';
  }

  /** Called once at startup: fails fast in production when required configuration is missing. */
  public validateRequiredEnvVars(): void {
    void this.medicusApiBaseUrl;
  }

  public logEnvironmentInfo(): void {}
}

export const env = EnvironmentConfig.getInstance();

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
