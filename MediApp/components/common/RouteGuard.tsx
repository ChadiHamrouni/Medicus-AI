/**
 * Route Guard Component
 * Handles protected routing based on authentication status
 */

import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useAuthContext } from '@/contexts/AuthContext';
import { env, logger } from '@/utils';
import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';

interface RouteGuardProps {
  children: React.ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const { authState, isAuthenticated } = useAuthContext();
  const [isInitializing, setIsInitializing] = useState(true);
  const [showLoading, setShowLoading] = useState(true);
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);

  // Minimum loading time of 2.5 seconds for app initialization
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadingComplete(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if we already have auth state from context initialization
        if (authState.isAuthenticated !== undefined) {
          setIsInitializing(false);
          return;
        }

        // Force an authentication check if state is not ready
        await isAuthenticated();
      } catch (error) {
        logger.error('Error checking authentication status', error as Error, {
          component: 'RouteGuard',
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, [authState.isAuthenticated, isAuthenticated]);

  // Update showLoading based on initialization state and minimum time
  useEffect(() => {
    if (!isInitializing && !authState.isLoading && minLoadingComplete) {
      setShowLoading(false);
    }
  }, [isInitializing, authState.isLoading, minLoadingComplete]);

  // Show loading screen while initializing authentication or minimum time hasn't passed
  if (showLoading) {
    return <LoadingScreen backgroundColor="#FFFFFF" />;
  }

  // Development bypass for UI testing - only works in DEV mode with env variable
  if (env.enableDevBypass) {
    logger.info(
      'Development bypass enabled - redirecting to doctor profile for UI testing'
    );
    return <Redirect href="/tabs/doctor" />;
  }

  // If authenticated, go to main app entry; otherwise go to sign-in
  if (authState.isAuthenticated && authState.user) {
    return <Redirect href="/tabs/chats" />;
  }

  // If not authenticated, go directly to sign-in screen (not role selection)
  return <Redirect href="/(SignIn)/SignInScreen" />;
};
