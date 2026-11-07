import { useAuthContext } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';
import { useEffect, useState } from 'react';

export interface TabBadge {
  count: number;
  visible: boolean;
}

export interface TabBadges {
  chats: TabBadge;
  feed: TabBadge;
  documents: TabBadge;
  doctor?: TabBadge;
  patient?: TabBadge;
  practice?: TabBadge; // Legacy support
  settings: TabBadge;
}

export const useTabBadges = (): TabBadges => {
  const { authState } = useAuthContext();
  const [badges, setBadges] = useState<TabBadges>({
    chats: { count: 0, visible: false },
    feed: { count: 0, visible: false },
    documents: { count: 0, visible: false },
    doctor: { count: 0, visible: false },
    patient: { count: 0, visible: false },
    practice: { count: 0, visible: false },
    settings: { count: 0, visible: false },
  });

  useEffect(() => {
    const isDoctor = authState.user?.role === UserRole.DOCTOR;

    // Real badge update logic - replace with actual data fetching
    setBadges({
      chats: { count: 0, visible: false },
      feed: { count: 0, visible: false },
      documents: { count: 0, visible: false },
      doctor: isDoctor ? { count: 0, visible: false } : undefined,
      patient: !isDoctor ? { count: 0, visible: false } : undefined,
      practice: isDoctor
        ? { count: 0, visible: false }
        : { count: 0, visible: false }, // Legacy support
      settings: { count: 0, visible: false },
    });
  }, [authState.user]);

  return badges;
};

export default useTabBadges;
