/**
 * Decode JWT token payload without verification
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export const decodeJwt = (token: string): any | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

/**
 * Check if JWT token is expired
 * @param token - JWT token string
 * @returns true if expired, false if valid
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = decodeJwt(token);
    if (!payload || !payload.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch {
    return true;
  }
};
