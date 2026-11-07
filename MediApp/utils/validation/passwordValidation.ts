/**
 * Shared validation utilities for email and password
 * These validators align with their respective UI components
 */

export interface PasswordRequirement {
  label: string;
  met: boolean;
}

/**
 * Validate email and return error message if invalid
 */
export const validateEmail = (email: string): string | null => {
  if (!email) return 'Email is required';
  if (!/\S+@\S+\.\S+/.test(email)) return 'Email is invalid';
  return null;
};

/**
 * Validate optional email and return error message if invalid
 */
export const validateOptionalEmail = (email: string): string | null => {
  if (email && !/\S+@\S+\.\S+/.test(email)) return 'Email is invalid';
  return null;
};

/**
 * Check if a password meets all requirements
 */
export const checkPasswordRequirements = (
  password: string
): PasswordRequirement[] => {
  return [
    {
      label: 'At least 8 characters',
      met: password.length >= 8,
    },
    {
      label: 'Contains a lowercase letter',
      met: /[a-z]/.test(password),
    },
    {
      label: 'Contains an uppercase letter',
      met: /[A-Z]/.test(password),
    },
    {
      label: 'Contains a number',
      met: /\d/.test(password),
    },
    {
      label: 'Contains a special character (!@#$%^&*...)',
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    },
  ];
};

/**
 * Validate password and return error message if invalid
 */
export const validatePassword = (password: string): string | null => {
  if (!password) return 'Password is required';

  const requirements = checkPasswordRequirements(password);
  const unmetRequirement = requirements.find(req => !req.met);

  if (unmetRequirement) {
    return `Password must meet all requirements: ${unmetRequirement.label.toLowerCase()}`;
  }

  return null;
};
