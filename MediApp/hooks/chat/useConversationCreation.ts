/**
 * Conversation creation hook - uses authenticated user ID only
 * No patient context or dependent filtering is applied
 */

import { useAuth } from '../auth/useAuth';
import { createConversation, fetchConversations } from '@/services';
import { UserRole, CreateConversationRequest, User } from '@/types';
import { logger } from '@/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { QUERY_KEYS } from '../shared/useQueryConfig';

export interface UseConversationCreationOptimizedReturn {
  createNewConversation: (_selectedUser: User) => Promise<void>;
  isCreating: boolean;
  error: string | null;
  clearError: () => void;
}

export const useConversationCreation =
  (): UseConversationCreationOptimizedReturn => {
    const router = useRouter();
    const { authState } = useAuth();
    const queryClient = useQueryClient();

    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clearError = useCallback(() => {
      setError(null);
    }, []);

    const findExistingConversation = useCallback(
      async (currentUserId: number, selectedUserId: number) => {
        try {
          // Use user role to determine assistant type
          const assistant =
            authState.user?.role === 'doctor' ? 'medidoc' : 'mediaid';
          const response = await fetchConversations({
            page: 1,
            pageSize: 50,
            assistant,
          });

          return response.results.find(conversation => {
            const doctorId = conversation.doctor_id;
            const patientId = conversation.patient_id;

            // Use authenticated user ID for all conversation lookups
            const effectiveUserId = currentUserId;

            return (
              (doctorId === effectiveUserId && patientId === selectedUserId) ||
              (doctorId === selectedUserId && patientId === effectiveUserId)
            );
          });
        } catch (error) {
          logger.error('Failed to find existing conversation', error as Error, {
            component: 'useConversationCreation',
            currentUserId,
            selectedUserId,
            note: 'Using authenticated user ID only',
          });
          return null;
        }
      },
      []
    );

    const refreshConversationsCache = useCallback(() => {
      // Invalidate conversations cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations.all });
    }, [queryClient]);

    const createNewConversation = useCallback(
      async (selectedUser: User) => {
        if (!authState.user) {
          setError('Authentication required');
          return;
        }

        setIsCreating(true);
        setError(null);

        const currentUser = authState.user;
        const currentUserId = currentUser.id;
        const selectedUserId = parseInt(selectedUser.id);

        if (isNaN(selectedUserId)) {
          setError('Invalid selected user ID');
          setIsCreating(false);
          return;
        }

        try {
          // Use user role to determine assistant type
          // Patients create/view mediaid conversations, doctors view medidoc mirror conversations
          const assistant = currentUser.role === UserRole.DOCTOR ? 'medidoc' : 'mediaid';
          let doctorId: number;
          let patientId: number;

          if (currentUser.role === UserRole.PATIENT) {
            // Get the patient record ID (not user ID) from patientProfile
            if (!authState.patientProfile?.id) {
              setError('Patient profile not found');
              setIsCreating(false);
              return;
            }
            patientId = authState.patientProfile.id; // Use patient record ID
            doctorId = selectedUserId; // This is the doctor RECORD ID from search
          } else {
            // Get the doctor record ID (not user ID) from doctorProfile
            if (!authState.doctorProfile?.id) {
              setError('Doctor profile not found');
              setIsCreating(false);
              return;
            }
            doctorId = authState.doctorProfile.id; // Use doctor record ID
            patientId = selectedUserId; // This is the patient RECORD ID from search
          }

          const request: CreateConversationRequest = {
            assistant,
            doctor_id: doctorId,
            patient_id: patientId,
          };

          logger.info('Creating new conversation', {
            component: 'useConversationCreation',
            request,
            currentUserRole: currentUser.role,
            note: 'Using authenticated user ID only - no patient context',
            currentUserId,
          });

          const newConversation = await createConversation(request);

          // Add the new conversation to the cache immediately (optimistic update)
          // This ensures useChatScreen can find it when we navigate
          queryClient.setQueryData(
            QUERY_KEYS.conversations.infinite(20),
            (oldData: any) => {
              if (!oldData || !oldData.pages) {
                return {
                  pages: [{ results: [newConversation], next: null }],
                  pageParams: [1],
                };
              }

              // Add to the first page (most recent)
              const updatedPages = [...oldData.pages];
              updatedPages[0] = {
                ...updatedPages[0],
                results: [newConversation, ...updatedPages[0].results],
              };

              return {
                ...oldData,
                pages: updatedPages,
              };
            }
          );

          // Also refresh to get the latest data in the background
          refreshConversationsCache();

          router.push({
            pathname: '/tabs/chats/[id]',
            params: {
              id: newConversation.id,
              displayName: selectedUser.displayName,
              isSara: 'false',
            },
          });

          logger.info('Conversation created successfully', {
            component: 'useConversationCreation',
            conversationId: newConversation.id,
          });
        } catch (err) {
          const error = err as Error;

          if (error.message === 'CONVERSATION_EXISTS') {
            try {
              const existingConversation = await findExistingConversation(
                currentUserId,
                selectedUserId
              );

              if (existingConversation) {
                router.push({
                  pathname: '/tabs/chats/[id]',
                  params: {
                    id: existingConversation.id,
                    displayName: selectedUser.displayName,
                    isSara: 'false',
                  },
                });

                logger.info('Navigated to existing conversation', {
                  component: 'useConversationCreation',
                  conversationId: existingConversation.id,
                });

                return;
              } else {
                refreshConversationsCache();
                setError(
                  'A conversation with this user already exists. Please find it in your conversations list.'
                );
              }
            } catch {
              setError(
                "A conversation with this user already exists, but we couldn't refresh your conversations list."
              );
            }
          } else {
            const errorMessage =
              error.message || 'Failed to create conversation';
            setError(errorMessage);

            logger.error('Failed to create conversation', error, {
              component: 'useConversationCreation',
              selectedUserId: selectedUser.id,
            });
          }
        } finally {
          setIsCreating(false);
        }
      },
      [
        authState.user,
        router,
        refreshConversationsCache,
        findExistingConversation,
      ]
    );

    return {
      createNewConversation,
      isCreating,
      error,
      clearError,
    };
  };
