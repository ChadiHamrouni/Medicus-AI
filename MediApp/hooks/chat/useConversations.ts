/**
 * Hook for conversations using authenticated user ID only
 * No patient context or dependent filtering is applied
 */

import { SARA_IDENTITY } from '@/constants/Chat';
import { UserRole } from '@/types/auth';
import { logger } from '@/utils';
import { useAuth } from '../auth/useAuth';
import { useDependents } from '@/contexts/DependentsContext';
import { useAppContext } from '@/contexts/AppContext';
import { useRef } from 'react';
import { useAuthenticatedUserConversations } from '../patient/queries/usePatientContextConversations';

interface UseConversationsOptions {
  pageSize?: number;
  activeFilter?: 'all' | 'doctors' | 'patients';
}

export function useConversations(options: UseConversationsOptions = {}) {
  const { pageSize = 20, activeFilter = 'all' } = options;

  const { authState } = useAuth();
  const { selectedDependent, getDependentById } = useDependents();
  const { userAssistant } = useAppContext();

  // Perfect! Now I can use the reliable indicator: userAssistant
  // - userAssistant = "medidoc" = Doctor mode → no patient context
  // - userAssistant = "mediaid" = Patient/dependent mode → use patient context

  const isActualPatient = authState.user?.role === 'patient';

  // The key fix: use userAssistant to detect the mode
  const isInPatientMode = userAssistant === 'mediaid';

  const currentDependent =
    selectedDependent === 'main' ? null : getDependentById(selectedDependent);
  const isDependentContext = isInPatientMode && selectedDependent !== 'main';

  const rawPatientContextId =
    isActualPatient || isInPatientMode
      ? selectedDependent === 'main'
        ? authState.patientProfile?.id // Get actual patient ID from auth state
        : typeof selectedDependent === 'number'
          ? selectedDependent
          : undefined
      : undefined; // Doctor mode (userAssistant = "medidoc") - no patient context

  const lastValidPatientIdRef = useRef<number | undefined>(undefined);
  if (rawPatientContextId !== undefined) {
    lastValidPatientIdRef.current = rawPatientContextId;
  }

  const patientContextId = rawPatientContextId ?? lastValidPatientIdRef.current;

  // Get conversations for authenticated user with patient context if available
  // Determine assistant type based on user role and mode:
  // - Patient mode (patient or doctor viewing dependent) → use 'mediaid'
  // - Doctor mode (doctor viewing their own conversations) → use 'medidoc'
  const assistantType = isInPatientMode ? 'mediaid' : 'medidoc';

  const conversationsQuery = useAuthenticatedUserConversations(
    pageSize,
    patientContextId,
    undefined, // doctorContextId not used in current implementation
    assistantType
  );

  // Helper function to check if a conversation is with Sara
  const isSaraConversation = (conversation: any) => {
    // Check if assistant field contains Sara AI assistant types
    if (
      conversation.assistant &&
      (conversation.assistant.toLowerCase().includes('mediaid') ||
        conversation.assistant.toLowerCase().includes('medidoc'))
    ) {
      return true;
    }

    // Check if assistant field contains Sara (fallback for old format)
    if (
      conversation.assistant &&
      conversation.assistant.toLowerCase().includes(SARA_IDENTITY.toLowerCase())
    ) {
      return true;
    }

    // Check if patient or doctor name contains Sara (fallback)
    const patientName = conversation.patient?.name || '';
    const doctorName = conversation.doctor?.name || '';

    return (
      patientName.toLowerCase().includes('sara') ||
      doctorName.toLowerCase().includes('sara')
    );
  };

  // Helper function to determine conversation participant type from current user's perspective
  const getConversationParticipantType = (conversation: any) => {
    if (!authState.user) return 'unknown';

    const currentUserId = authState.user.id;
    const isDoctor = authState.user.role === UserRole.DOCTOR;

    // First check if it's a Sara conversation
    if (isSaraConversation(conversation)) {
      return 'sara';
    }

    if (isDoctor) {
      // For doctors: if they're the doctor in the conversation, the other participant is a patient
      if (conversation.doctor_id === currentUserId) {
        return 'patients';
      }
      // If they're not the doctor, then it's probably a conversation with another doctor
      return 'doctors';
    } else {
      // For patients: if they're the patient in the conversation, the other participant is a doctor
      if (conversation.patient_id === currentUserId) {
        return 'doctors';
      }
      // If they're not the patient, could be a conversation with another patient (rare) or doctor
      return 'patients';
    }
  };

  // Apply role-based and patient-specific filtering
  const filteredConversations = conversationsQuery.conversations.filter(
    conversation => {
      if (!authState.user) return true;

      const userRole = authState.user.role;
      const participantType = getConversationParticipantType(conversation);

      // Patient Mode: Show only conversations for the current patient context
      // This applies to:
      // 1. Actual patients
      // 2. Doctors explicitly in "Patient Mode" (mediaid assistant)
      if (
        userRole === UserRole.PATIENT ||
        (userRole === UserRole.DOCTOR && isInPatientMode)
      ) {
        // First filter by participant type (doctors + Sara only)
        const isValidParticipantType =
          participantType === 'doctors' || participantType === 'sara';

        if (!isValidParticipantType) return false;

        // Filter by specific patient ID for ALL conversation types (including Sara)
        if (patientContextId) {
          // Show conversations where the current patient is the patient in the conversation
          return conversation.patient_id === patientContextId;
        }

        // Fallback: if no specific patient context, show conversations where the current user is the patient
        return conversation.patient_id === authState.user.id;
      }

      // Doctor Mode (when not in dependent context): Apply filter-based logic
      if (userRole === UserRole.DOCTOR && !isDependentContext) {
        switch (activeFilter) {
          case 'all':
            return true; // Show all conversations (patients + doctors + Sara)
          case 'doctors':
            return participantType === 'doctors' || participantType === 'sara';
          case 'patients':
            return participantType === 'patients';
          default:
            return true;
        }
      }

      // Default: show all conversations
      return true;
    }
  );

  // Sort conversations to ensure Sara is at the top
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    // Always prioritize Sara conversations at the top for:
    // 1. Patients (all the time)
    // 2. Doctors in dependent context (patient mode)
    // 3. Doctors in doctor mode when viewing doctors/all filters (not when viewing patients only)
    const isPatientMode =
      authState.user?.role === UserRole.PATIENT ||
      (authState.user?.role === UserRole.DOCTOR && isDependentContext);
    const isDoctorModeShowingSara =
      authState.user?.role === UserRole.DOCTOR &&
      !isDependentContext &&
      (activeFilter === 'all' || activeFilter === 'doctors');

    const shouldPrioritizeSara = isPatientMode || isDoctorModeShowingSara;

    if (shouldPrioritizeSara) {
      const aIsSara = isSaraConversation(a);
      const bIsSara = isSaraConversation(b);

      if (aIsSara && !bIsSara) return -1;
      if (!aIsSara && bIsSara) return 1;
    }

    // Default sort by last message timestamp (newest first)
    return (
      new Date(b.lastMessageTimestamp || 0).getTime() -
      new Date(a.lastMessageTimestamp || 0).getTime()
    );
  });

  // Calculate loading state
  const isLoading = conversationsQuery.isLoading;

  // Calculate error state
  const error = conversationsQuery.error;

  // Calculate if we should show empty state
  const showEmptyState =
    !isLoading && !error && sortedConversations.length === 0;

  logger.debug('Conversations state with filtering', {
    component: 'useConversations',
    originalCount: conversationsQuery.conversations.length,
    filteredCount: sortedConversations.length,
    activeFilter,
    userRole: authState.user?.role,
    isDependentContext,
    currentPatientId: patientContextId,
    currentPatientName: currentDependent?.name || 'Me',
    isLoading,
    hasError: !!error,
    errorMessage: error,
    isError: conversationsQuery.isError,
  });

  return {
    // Conversations data (filtered and sorted)
    conversations: sortedConversations,
    totalCount: conversationsQuery.totalCount,

    // Loading states
    isLoading,
    isFetchingNextPage: conversationsQuery.isFetchingNextPage,

    // Error states
    error,
    isError: !!error,

    // Pagination
    hasNextPage: conversationsQuery.hasNextPage,
    fetchNextPage: conversationsQuery.fetchNextPage,

    // Actions
    refetch: conversationsQuery.refetch,

    // UI state helpers
    showEmptyState,
  };
}

/**
 * Hook specifically for conversation screens
 */
export function useConversationScreenContext(
  activeFilter: 'all' | 'doctors' | 'patients' = 'all'
) {
  const { selectedDependent, getDependentById } = useDependents();
  const { authState } = useAuth();
  const currentDependent =
    selectedDependent === 'main' ? null : getDependentById(selectedDependent);
  const isDependentContext = selectedDependent !== 'main';
  const conversationsData = useConversations({ activeFilter });

  // Additional logic specific to conversation screens
  const getEmptyStateMessage = () => {
    if (conversationsData.showEmptyState) {
      const userRole = authState.user?.role;
      const isPatientMode =
        userRole === UserRole.PATIENT ||
        (userRole === UserRole.DOCTOR && isDependentContext);

      if (isPatientMode && currentDependent) {
        // Context-aware message for specific patient/dependent
        return `No doctor conversations found for ${currentDependent.name}. Start a conversation with a doctor to begin.`;
      }

      switch (activeFilter) {
        case 'doctors':
          return 'No doctor conversations found. Start a conversation with a doctor to begin.';
        case 'patients':
          return 'No patient conversations found. Start a conversation with a patient to begin.';
        default:
          return 'No conversations found. Start a new conversation to begin.';
      }
    }

    return null;
  };

  const getScreenTitle = () => {
    return 'Conversations';
  };

  return {
    ...conversationsData,
    emptyStateMessage: getEmptyStateMessage(),
    screenTitle: getScreenTitle(),
  };
}

export default useConversations;
