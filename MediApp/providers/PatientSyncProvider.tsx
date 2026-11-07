/**
 * Component that handles patient sync
 * Must be placed inside the AuthProvider to access auth context
 */

import React from 'react';
import { usePatientSync } from '@/hooks/patient';

interface PatientSyncProviderProps {
  children: React.ReactNode;
}

export const PatientSyncProvider: React.FC<PatientSyncProviderProps> = ({
  children,
}) => {
  // Sync patient store with auth context
  usePatientSync();

  return <>{children}</>;
};
