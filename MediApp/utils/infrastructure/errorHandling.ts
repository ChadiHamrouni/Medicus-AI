// Global state to manage error modal visibility and content
let errorModalCallback:
  | ((visible: boolean, title: string, message: string) => void)
  | null = null;

/**
 * Register a callback function to show/hide the error modal
 * @param callback Function to call when showing/hiding the error modal
 */
export const registerErrorModalCallback = (
  callback: (visible: boolean, title: string, message: string) => void
) => {
  errorModalCallback = callback;
};

/**
 * Unregister the error modal callback
 */
export const unregisterErrorModalCallback = () => {
  errorModalCallback = null;
};

/**
 * Show the error modal with the given title and message
 * @param title Title of the error modal
 * @param message Message to display in the error modal
 */
export const showErrorModal = (title: string, message: string) => {
  if (errorModalCallback) {
    errorModalCallback(true, title, message);
  } else {
    console.warn('Error modal callback not registered:', { title, message });
  }
};

/**
 * Parse an error response and extract the error message
 * @param error The error object to parse
 * @returns A user-friendly error message
 */
export const parseErrorMessage = (error: any): string => {
  if (
    error &&
    typeof error.message === 'string' &&
    error.message.includes('Upload failed')
  ) {
    try {
      const jsonMatch = error.message.match(/\{.*\}/);
      if (jsonMatch) {
        const errorJson = JSON.parse(jsonMatch[0]);
        if (errorJson.error) {
          return errorJson.error;
        }
      }

      return error.message;
    } catch (e) {
      // If parsing fails, return the original message
      return error.message;
    }
  }

  // Handle other types of errors
  if (error && typeof error.message === 'string') {
    return error.message;
  }

  return 'An unknown error occurred';
};
