import { useAuthContext } from '@/contexts/AuthContext';
import { useDoctorView } from '@/contexts/DoctorViewContext';
import { Conversation } from '@/types';
import { UserRole } from '@/types/auth';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import SaraBadge from './SaraBadge';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/hooks/shared/useQueryConfig';
import { fetchConversationMessages } from '@/services';
import { LazyImage } from '@/components/common/LazyImage';

interface ConversationItemProps {
  conversation: Conversation;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authState } = useAuthContext();
  const { viewingAsPatient } = useDoctorView();

  const prefetchMessages = useCallback(() => {
    const currentUserId = authState.user?.id?.toString() || '';
    if (conversation.id && currentUserId) {
      queryClient.prefetchInfiniteQuery({
        queryKey: QUERY_KEYS.messages.infinite(conversation.id, 50),
        queryFn: async ({
          pageParam,
        }: {
          pageParam: { page: number; timestamp?: string };
        }) => {
          const { page, timestamp } = pageParam;
          const response = await fetchConversationMessages(
            conversation.id,
            timestamp,
            page,
            50
          );
          return {
            ...response,
            page,
            timestamp,
          };
        },
        initialPageParam: {
          page: 1,
          timestamp: undefined,
        },
        getNextPageParam: (lastPage: any) => {
          if (!lastPage.next) return undefined;
          return {
            page: lastPage.page + 1,
            timestamp: undefined,
          };
        },
      });
    }
  }, [conversation.id, authState.user?.id, queryClient]);

  const handlePress = () => {
    // Prefetch messages before navigation
    prefetchMessages();

    // Navigate to the chat screen with conversation ID and display name
    const conversationTitle = getConversationTitle();
    const isSaraAI = !conversation.doctor || !conversation.patient;

    router.push({
      pathname: '/tabs/chats/[id]',
      params: {
        id: conversation.id,
        displayName: conversationTitle,
        isSara: isSaraAI ? 'true' : 'false',
      },
    });
  };

  const getConversationTitle = () => {
    // Check if doctor or patient data is missing, treat as Sara AI
    if (!conversation.doctor || !conversation.patient) {
      return 'Sara';
    }

    // Show patient names when current user is a doctor
    const currentUserRole = authState.user?.role;
    if (currentUserRole === UserRole.DOCTOR) {
      // Use random patient names for doctor mode
      const patientNames = [
        'Bob Dole',
        'Brandon Bruxel',
        'Dakota Johnson',
        'Elena Martinez',
        'Frank Wilson',
        'Grace Chen',
        'Henry Parker',
        'Isabella Davis',
      ];
      const index = parseInt(conversation.id) % patientNames.length;
      return patientNames[index];
    }

    // For patients, show doctor names
    if (conversation.assistant === 'mediaid') {
      // Use doctor names for patient mode
      const doctorNames = [
        'Unknown Doctor',
        'Unknown Doctor',
        'Unknown Doctor',
        'Unknown Doctor',
        'Unknown Doctor',
        'Unknown Doctor',
        'Unknown Doctor',
      ];
      const index = parseInt(conversation.id) % doctorNames.length;
      return doctorNames[index];
    }
    return conversation.patient.name;
  };

  const getConversationImage = () => {
    // Check if doctor or patient data is missing, return null for Sara AI
    if (!conversation.doctor || !conversation.patient) {
      return null;
    }

    // Show patient images when current user is a doctor
    const currentUserRole = authState.user?.role;
    if (currentUserRole === UserRole.DOCTOR) {
      return conversation.patient.image;
    }

    // For patients, show doctor images
    if (conversation.assistant === 'mediaid') {
      return conversation.doctor.image;
    }
    return conversation.patient.image;
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'UN';

    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const conversationTitle = getConversationTitle();
  const conversationImage = getConversationImage();
  const isSaraAI = !conversation.doctor || !conversation.patient;

  // Derive assistant mode from Doctor tab toggle
  const userAssistant = viewingAsPatient ? 'medicaid' : 'medidoc';

  // Detect if this is a professional consultation (doctor-to-doctor)
  const isProfessional =
    !viewingAsPatient && conversation.assistant === 'medidoc';

  // Get participant role for badge display
  const getParticipantRole = () => {
    const currentUserRole = authState.user?.role;
    if (currentUserRole === UserRole.DOCTOR && !viewingAsPatient) {
      // In doctor mode, show patient role
      return 'patient';
    } else if (viewingAsPatient || currentUserRole === UserRole.PATIENT) {
      // In patient mode, show doctor/hc_provider role
      const doctorNames = conversationTitle.toLowerCase();
      if (doctorNames.includes('nurse') || doctorNames.includes('jennifer')) {
        return 'hc_provider';
      }
      return 'doctor';
    }
    return null;
  };

  // Dynamic Sara styling based on assistant type
  const getSaraBackgroundColor = () => {
    if (userAssistant === 'medidoc') {
      return 'bg-sky-50'; // Light blue for doctors
    } else {
      return 'bg-green-50'; // Light green for patients
    }
  };

  // Get Sara's placeholder text based on assistant type
  const getSaraPlaceholderText = () => {
    if (userAssistant === 'medidoc') {
      return 'I can help with patient consultations, medical references, and professional communications.';
    } else {
      return 'I can help you schedule appointments, track symptoms, and answer health questions.';
    }
  };

  const participantRole = getParticipantRole();

  return (
    <TouchableOpacity
      onPress={handlePress}
      className={`flex-row items-center px-4 py-4 border-b ${
        isSaraAI
          ? `${getSaraBackgroundColor()} border-b-orange-100 border-l-2 border-l-orange-300`
          : `bg-white border-gray-100 ${isProfessional ? 'border-l-2 border-l-blue-300' : ''}`
      }`}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View className="w-12 h-12 rounded-full mr-3 overflow-hidden">
        {conversationImage ? (
          <LazyImage
            source={{ uri: conversationImage }}
            fallbackSource={require('@/assets/images/user.svg')}
            className="w-full h-full"
            loadingSize="small"
            loadingColor="#F05C0C"
          />
        ) : isSaraAI ? (
          <Image
            source={require('@/assets/images/Sara.png')}
            className="w-full h-full"
          />
        ) : (
          <View className="w-full h-full bg-gray-100 justify-center items-center">
            <Text className="text-gray-600 font-semibold text-sm">
              {getInitials(conversationTitle)}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View className="flex-1">
        <View className="flex-row justify-between items-center mb-1">
          <View className="flex-row items-center flex-1">
            <Text
              className="font-semibold text-gray-900 text-base"
              numberOfLines={1}
            >
              {conversationTitle}
            </Text>

            {/* Badges */}
            <View className="flex-row items-center ml-2">
              {isSaraAI && (
                <View className="px-2 py-1 bg-orange-200 rounded-full mr-1">
                  <Text className="text-[#F05C0C] text-xs font-medium">
                    {userAssistant === 'medidoc' ? 'Medidoc' : 'Medicaid'}
                  </Text>
                </View>
              )}

              {isProfessional && (
                <View className="px-2 py-1 bg-blue-100 rounded-full mr-1">
                  <Text className="text-blue-600 text-xs font-medium">
                    Professional
                  </Text>
                </View>
              )}

              {participantRole && !isSaraAI && (
                <View
                  className={`px-2 py-1 rounded-full ${
                    participantRole === 'doctor'
                      ? 'bg-blue-50'
                      : participantRole === 'hc_provider'
                        ? 'bg-purple-50'
                        : 'bg-gray-50'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      participantRole === 'doctor'
                        ? 'text-blue-600'
                        : participantRole === 'hc_provider'
                          ? 'text-purple-600'
                          : 'text-gray-600'
                    }`}
                  >
                    {participantRole === 'hc_provider'
                      ? 'HC'
                      : participantRole.charAt(0).toUpperCase() +
                        participantRole.slice(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <Text className="text-gray-500 text-sm ml-2">
            {conversation.lastMessageTimestamp
              ? formatDate(conversation.lastMessageTimestamp)
              : ''}
          </Text>
        </View>

        <View className="flex-row justify-between items-center">
          <Text className="text-gray-600 text-sm flex-1" numberOfLines={2}>
            {isSaraAI
              ? getSaraPlaceholderText()
              : conversation.lastMessage || 'No messages yet'}
          </Text>
          {conversation.state === 'active' && (
            <View className="w-3 h-3 bg-green-500 rounded-full ml-2" />
          )}
        </View>
      </View>

      {/* Sara Badge - Shows unsummarized messages status */}
      {!isSaraAI && (
        <SaraBadge
          visible={conversation.has_unsummarized_messages === true}
        />
      )}
    </TouchableOpacity>
  );
};

export default ConversationItem;
