import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
// import { reportMessage } from '@/services/sentry/sentry';

interface NetworkStatus {
  isConnected: boolean;
  type: string;
  isInternetReachable: boolean | null;
  connectionQuality: 'good' | 'poor' | 'unknown';
}

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true, // Assume connected initially
    type: 'unknown',
    isInternetReachable: null,
    connectionQuality: 'unknown',
  });

  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? false;
      const internetReachable = state.isInternetReachable;

      // Determine connection quality
      let quality: 'good' | 'poor' | 'unknown' = 'unknown';
      if (state.details && 'strength' in state.details) {
        const strength = state.details.strength as number;
        quality = strength > 2 ? 'good' : 'poor';
      }

      const newStatus: NetworkStatus = {
        isConnected: connected,
        type: state.type || 'unknown',
        isInternetReachable: internetReachable,
        connectionQuality: quality,
      };

      setNetworkStatus(newStatus);

      // Track online/offline transitions
      const wasOnline = isOnline;
      const isCurrentlyOnline = connected && internetReachable !== false;

      setIsOnline(isCurrentlyOnline);

      // If coming back online after being offline
      if (!wasOnline && isCurrentlyOnline && wasOffline) {
        // Sentry disabled
        // reportMessage('Network connection restored', 'info', {
        //   networkType: state.type,
        //   connectionQuality: quality,
        // });
        setWasOffline(false);
      }

      // If going offline
      if (wasOnline && !isCurrentlyOnline) {
        // Sentry disabled
        // reportMessage('Network connection lost', 'warning', {
        //   networkType: state.type,
        //   lastKnownConnection: wasOnline,
        // });
        setWasOffline(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOnline, wasOffline]);

  // Method to check current network state
  const refreshNetworkState = async (): Promise<NetworkStatus> => {
    try {
      const state = await NetInfo.fetch();
      const connected = state.isConnected ?? false;
      const internetReachable = state.isInternetReachable;

      let quality: 'good' | 'poor' | 'unknown' = 'unknown';
      if (state.details && 'strength' in state.details) {
        const strength = state.details.strength as number;
        quality = strength > 2 ? 'good' : 'poor';
      }

      const newStatus: NetworkStatus = {
        isConnected: connected,
        type: state.type || 'unknown',
        isInternetReachable: internetReachable,
        connectionQuality: quality,
      };

      setNetworkStatus(newStatus);
      return newStatus;
    } catch (error) {
      console.error('Error fetching network state:', error);
      return networkStatus;
    }
  };

  return {
    ...networkStatus,
    isOnline,
    wasOffline,
    refreshNetworkState,
  };
};
