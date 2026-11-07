import { SearchUsersParams, UserRole, UsersSearchResponse } from '@/types';
import { logger, authenticatedFetch, env } from '@/utils';

const API_BASE_URL = env.medicusUserApiBaseUrl;

/**
 * Update current user information
 */
export const updateCurrentUser = async (userData: {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}): Promise<void> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/me`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData?.detail ||
          errorData?.message ||
          `Failed to update user: ${response.status}`
      );
    }

    logger.info('User information updated successfully', {
      component: 'MedicusUserService',
      updatedFields: Object.keys(userData),
    });
  } catch (error) {
    logger.error('Failed to update user information', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};

/**
 * Delete (deactivate) current user account
 */
export const deleteCurrentUser = async (): Promise<{ message: string }> => {
  try {
    logger.info('Attempting to delete current user account', {
      component: 'MedicusUserService',
    });

    const response = await authenticatedFetch(`${API_BASE_URL}/me`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const responseText = await response.text();
      let errorMessage = `Failed to delete account: ${response.status}`;

      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData?.detail || errorData?.message || errorMessage;
      } catch {
        // If parsing fails, use the raw text or default message
        errorMessage = responseText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();

    logger.auditLog('user_account_deleted', '', {
      timestamp: new Date().toISOString(),
    });

    logger.info('User account deleted successfully', {
      component: 'MedicusUserService',
    });

    return result;
  } catch (error) {
    logger.error('Failed to delete user account', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};

/**
 * Searches users from the medicus user API
 */
export const searchUsers = async ({
  query = '',
  role = UserRole.DOCTOR,
  page = 1,
  page_size = 20,
}: SearchUsersParams = {}): Promise<UsersSearchResponse> => {
  try {
    const params = new URLSearchParams({
      role,
      page: page.toString(),
      page_size: page_size.toString(),
    });

    if (query.trim()) {
      params.append('query', query.trim());
    }

    const response = await authenticatedFetch(
      `${API_BASE_URL}/users/search?${params.toString()}`
    );

    const data: UsersSearchResponse = await response.json();

    return {
      results: data.results || [],
      count: data.count || 0,
      next: data.next || null,
      previous: data.previous || null,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Update user_assistant field for role switching
 */
export const updateUserAssistant = async (
  userAssistant: 'mediaid' | 'medidoc'
): Promise<void> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/me`, {
      method: 'PUT',
      body: JSON.stringify({
        user_assistant: userAssistant,
      }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Failed to update user_assistant: ${response.status} ${response.statusText}. ${responseText}`
      );
    }

    logger.info('User assistant updated successfully', {
      component: 'MedicusUserService',
      userAssistant,
    });
  } catch (error) {
    logger.error('Failed to update user_assistant', error as Error, {
      component: 'MedicusUserService',
      userAssistant,
    });
    throw error;
  }
};
