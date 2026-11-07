/**
 * Authentication Context Provider
 * Provides authentication state and functions throughout the app
 */

import { useAuth, UseAuthReturn } from '@/hooks/auth';
import React, { createContext, ReactNode, useContext } from 'react';

type AuthContextType = UseAuthReturn & {};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const authHook = useAuth();

  const contextValue: AuthContextType = {
    ...authHook,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
};

export default AuthProvider;
