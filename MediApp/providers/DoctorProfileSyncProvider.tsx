/**
 * Component that handles doctor profile sync
 * Must be placed inside the AuthProvider to access auth context
 */

import React from 'react';
import { useDoctorProfileSync } from '@/hooks/doctor';

interface DoctorProfileSyncProviderProps {
  children: React.ReactNode;
}

export const DoctorProfileSyncProvider: React.FC<
  DoctorProfileSyncProviderProps
> = ({ children }) => {
  // Sync doctor profile store with auth context
  useDoctorProfileSync();

  return <>{children}</>;
};
