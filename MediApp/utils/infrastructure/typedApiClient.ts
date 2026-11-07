import { authenticatedFetch } from './apiClient';
import { env } from './env';
import { logger } from './logger';

/**
 * Type-safe API client that automatically:
 * - Uses correct base URL
 * - Parses JSON response
 * - Handles errors consistently
 * - Provides proper TypeScript types
 */

interface ApiClientConfig {
  baseUrl: string;
  serviceName: string;
}

class TypedApiClient {
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  /**
   * GET request with automatic JSON parsing
   */
  async get<T>(path: string, queryParams?: Record<string, any>): Promise<T> {
    const url = this.buildUrl(path, queryParams);

    logger.info(`API GET request`, {
      component: this.config.serviceName,
      path,
      url,
    });

    const response = await authenticatedFetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(
        `${this.config.serviceName} GET ${path} failed: ${response.status} ${response.statusText}. ${errorText}`
      );
      logger.error('API GET request failed', error, {
        component: this.config.serviceName,
        path,
        status: response.status,
      });
      throw error;
    }

    const data = (await response.json()) as T;

    logger.info(`API GET request successful`, {
      component: this.config.serviceName,
      path,
    });

    return data;
  }

  /**
   * POST request with automatic JSON parsing
   */
  async post<T>(path: string, body?: any): Promise<T> {
    const url = this.buildUrl(path);

    logger.info(`API POST request`, {
      component: this.config.serviceName,
      path,
      url,
    });

    const response = await authenticatedFetch(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(
        `${this.config.serviceName} POST ${path} failed: ${response.status} ${response.statusText}. ${errorText}`
      );
      logger.error('API POST request failed', error, {
        component: this.config.serviceName,
        path,
        status: response.status,
      });
      throw error;
    }

    const data = (await response.json()) as T;

    logger.info(`API POST request successful`, {
      component: this.config.serviceName,
      path,
    });

    return data;
  }

  /**
   * PUT request with automatic JSON parsing
   */
  async put<T>(path: string, body?: any): Promise<T> {
    const url = this.buildUrl(path);

    const response = await authenticatedFetch(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `${this.config.serviceName} PUT ${path} failed: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    return (await response.json()) as T;
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string): Promise<T> {
    const url = this.buildUrl(path);

    const response = await authenticatedFetch(url, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `${this.config.serviceName} DELETE ${path} failed: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    return (await response.json()) as T;
  }

  private buildUrl(path: string, queryParams?: Record<string, any>): string {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    let url = `${this.config.baseUrl}/${cleanPath}`;

    if (queryParams) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  }
}

// Pre-configured API clients for each service
export const medicusUserApi = new TypedApiClient({
  baseUrl: env.medicusUserApiBaseUrl,
  serviceName: 'MedicusUser',
});

export const medicusConvoApi = new TypedApiClient({
  baseUrl: env.medicusConvoApiBaseUrl,
  serviceName: 'MedicusConvo',
});

export const medicusAIApi = new TypedApiClient({
  baseUrl: env.medicusAIApiBaseUrl,
  serviceName: 'MedicusAI',
});
