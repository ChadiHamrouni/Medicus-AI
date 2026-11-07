/**
 * Password strength calculation utility
 */

export interface PasswordStrength {
  score: number;
  text: string;
  color: string;
}

/**
 * Calculate password strength based on common security criteria
 * @param password - The password to evaluate
 * @returns PasswordStrength object with score (1-4), descriptive text, and color
 */
export const getPasswordStrength = (password: string): PasswordStrength => {
  if (!password) return { score: 0, text: '', color: '' };

  let score = 0;
  const checks = [
    password.length >= 8,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ];

  score = checks.filter(check => check).length;

  if (score < 2) return { score: 1, text: 'Weak', color: '#EF4444' };
  if (score < 4) return { score: 2, text: 'Fair', color: '#F59E0B' };
  if (score < 5) return { score: 3, text: 'Good', color: '#10B981' };
  return { score: 4, text: 'Strong', color: '#059669' };
};
