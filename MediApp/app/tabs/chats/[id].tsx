import ChatMessages from '@/components/features/chat/ChatMessages';
import MessageInput from '@/components/features/chat/MessageInput/MessageInput';
import { ConversationLoadingScreen } from '@/components/features/chat/ConversationLoadingScreen';
import { useChatScreen } from '@/hooks';
import { useAuth } from '@/hooks/auth/useAuth';
import { socketIOService } from '@/services/realtime/socketio';
import { UserRole } from '@/types/auth';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logger } from '@/utils';
import { getOnlineStatus } from '@/utils/date';
import { usePatientView } from '@/contexts/PatientViewContext';
import { useViewingDoctor } from '@/contexts/ViewingDoctorContext';
import { getPatientById } from '@/services/patient/profile';
import { getDoctorById } from '@/services/doctor/profile';

const ChatScreen: React.FC = () => {
  const router = useRouter();
  const scrollViewRef = useRef<any>(null);
  const { displayName } = useLocalSearchParams();
  const { authState } = useAuth();
  const isDoctor = authState.user?.role === UserRole.DOCTOR;
  const isPatient = authState.user?.role === UserRole.PATIENT;
  const { setViewingPatient } = usePatientView();
  const { setViewingDoctor } = useViewingDoctor();
  const [isNavigatingToPatient, setIsNavigatingToPatient] = useState(false);
  const [isNavigatingToDoctor, setIsNavigatingToDoctor] = useState(false);

  // Track WebSocket connection state - check immediately on mount
  const [isSocketReady, setIsSocketReady] = useState(() => {
    // Check socket status synchronously on initial render
    const ready = socketIOService.isReady();
    logger.info(`[CHAT_SCREEN_INIT] isSocketReady initial state: ${ready}`);
    return ready;
  });
  const [connectionStatus, setConnectionStatus] = useState<
    'creating' | 'connecting' | 'ready'
  >(() => {
    const status = socketIOService.getConnectionStatus();
    logger.info(`[CHAT_SCREEN_INIT] Socket status: ${JSON.stringify(status)}`);
    if (status.ready) return 'ready';
    if (status.connected) return 'connecting';
    return 'creating';
  });

  // Animation values for loading dots (kept for backward compatibility)
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

  // Use the real backend integration
  const {
    messages,
    otherParticipantName,
    handleSendText,
    isSaraConversation,
    isInitialLoading,
    currentUserId,
    loadMore,
    hasMore,
    isFetchingNextPage,
    conversation,
  } = useChatScreen();

  const lastMessageTime = conversation?.lastMessageTimestamp;
  const { text: statusText, color: statusColor } =
    getOnlineStatus(lastMessageTime);

  // Navigate to patient profile with data from conversation (0ms latency when backend returns age/gender)
  const handlePatientClick = async () => {
    if (!isDoctor || isSaraConversation || !conversation?.patient_id) return;
    if (isNavigatingToPatient) return; // Prevent double-tap

    // Check if conversation already has complete patient data (from backend view)
    const hasCompleteData =
      conversation.patient?.age !== undefined &&
      conversation.patient?.gender !== undefined;

    if (hasCompleteData) {
      // Instant navigation - data already in memory from conversation list
      setViewingPatient({
        patientId: conversation.patient_id,
        convoId: conversation.id,
        patientName: conversation.patient?.name || otherParticipantName,
        patientAge: conversation.patient?.age ?? undefined,
        patientGender: conversation.patient?.gender ?? undefined,
      });
      router.push('/tabs/patients' as any);
      return;
    }

    // Fallback: Pre-fetch if conversation doesn't have complete data
    setIsNavigatingToPatient(true);
    try {
      const fullPatient = await getPatientById(conversation.patient_id);

      setViewingPatient({
        patientId: conversation.patient_id,
        convoId: conversation.id,
        patientName:
          fullPatient.display_name ||
          fullPatient.full_name ||
          `${fullPatient.first_name || ''} ${fullPatient.last_name || ''}`.trim() ||
          otherParticipantName,
        patientAge: fullPatient.age,
        patientGender: fullPatient.gender,
      });

      router.push('/tabs/patients' as any);
    } catch (error) {
      logger.error(
        'Failed to fetch patient profile, navigating with partial data',
        error as Error
      );
      setViewingPatient({
        patientId: conversation.patient_id,
        convoId: conversation.id,
        patientName: conversation.patient?.name || otherParticipantName,
      });
      router.push('/tabs/patients' as any);
    } finally {
      setIsNavigatingToPatient(false);
    }
  };

  // Navigate to doctor profile with data from conversation (patient clicking on doctor)
  const handleDoctorClick = async () => {
    if (!isPatient || isSaraConversation || !conversation?.doctor_id) return;
    if (isNavigatingToDoctor) return; // Prevent double-tap

    // Check if conversation already has complete doctor data (from backend view)
    const hasCompleteData = conversation.doctor?.specialty_name !== undefined;

    if (hasCompleteData) {
      // Instant navigation - data already in memory from conversation list
      setViewingDoctor({
        doctorId: conversation.doctor_id,
        convoId: conversation.id,
        doctorName: conversation.doctor?.name || otherParticipantName,
        doctorSpecialty: conversation.doctor?.specialty_name ?? undefined,
      });
      router.push('/tabs/doctor' as any);
      return;
    }

    // Fallback: Pre-fetch if conversation doesn't have complete data
    setIsNavigatingToDoctor(true);
    try {
      const fullDoctor = await getDoctorById(conversation.doctor_id);

      setViewingDoctor({
        doctorId: conversation.doctor_id,
        convoId: conversation.id,
        doctorName:
          fullDoctor.full_name ||
          fullDoctor.name ||
          `${fullDoctor.first_name || ''} ${fullDoctor.last_name || ''}`.trim() ||
          otherParticipantName,
        doctorSpecialty: fullDoctor.specialty_name || fullDoctor.specialty,
      });

      router.push('/tabs/doctor' as any);
    } catch (error) {
      logger.error(
        'Failed to fetch doctor profile, navigating with partial data',
        error as Error
      );
      setViewingDoctor({
        doctorId: conversation.doctor_id,
        convoId: conversation.id,
        doctorName: conversation.doctor?.name || otherParticipantName,
      });
      router.push('/tabs/doctor' as any);
    } finally {
      setIsNavigatingToDoctor(false);
    }
  };

  // Monitor WebSocket connection status continuously
  useEffect(() => {
    // Check immediately
    const status = socketIOService.getConnectionStatus();

    if (status.ready) {
      logger.info('[CHAT_SCREEN_EFFECT] ✅ Already ready');
      setConnectionStatus('ready');
      setIsSocketReady(true);
      return; // No need for interval if already ready
    }

    logger.info('[CHAT_SCREEN_EFFECT] Starting WebSocket monitoring');
    let checkCount = 0;
    const maxChecks = 50; // Max 5 seconds

    const checkInterval = setInterval(() => {
      checkCount++;
      const status = socketIOService.getConnectionStatus();

      if (status.ready) {
        logger.info(
          `[CHAT_SCREEN_EFFECT] ✅ Socket ready after ${checkCount * 100}ms`
        );
        setConnectionStatus('ready');
        setIsSocketReady(true);
        clearInterval(checkInterval);
      } else if (status.connected && !status.authenticated) {
        setConnectionStatus('connecting');
      } else if (
        status.connected &&
        status.authenticated &&
        !status.conversationJoined
      ) {
        setConnectionStatus('connecting');
      } else if (checkCount >= maxChecks) {
        // Timeout after 5 seconds
        logger.warn(
          '[CHAT_SCREEN_EFFECT] ⚠️ Socket connection timeout - proceeding anyway'
        );
        // Force ready so user isn't stuck
        setConnectionStatus('ready');
        setIsSocketReady(true);
        clearInterval(checkInterval);
      }
    }, 100); // Check every 100ms

    // Cleanup
    return () => {
      clearInterval(checkInterval);
    };
  }, []);

  // Set initial status when messages start loading and re-check when loading finishes
  useEffect(() => {
    if (isInitialLoading) {
      setConnectionStatus('creating');
      setIsSocketReady(false);
    } else {
      // When loading finishes, check socket status immediately to prevent sticking
      const status = socketIOService.getConnectionStatus();
      logger.info(
        `[CHAT_SCREEN_LOADING_DONE] Socket status: ${JSON.stringify(status)}`
      );
      if (status.ready) {
        setConnectionStatus('ready');
        setIsSocketReady(true);
      }
    }
  }, [isInitialLoading]);

  // Animate loading dots
  useEffect(() => {
    if (isInitialLoading) {
      const animateDots = () => {
        const duration = 800;

        Animated.sequence([
          Animated.timing(dot1Opacity, {
            toValue: 1,
            duration: duration / 3,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Opacity, {
            toValue: 1,
            duration: duration / 3,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Opacity, {
            toValue: 1,
            duration: duration / 3,
            useNativeDriver: true,
          }),
          Animated.timing(dot1Opacity, {
            toValue: 0.3,
            duration: duration / 3,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Opacity, {
            toValue: 0.3,
            duration: duration / 3,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Opacity, {
            toValue: 0.3,
            duration: duration / 3,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (isInitialLoading) {
            animateDots();
          }
        });
      };

      animateDots();
    }
  }, [isInitialLoading, dot1Opacity, dot2Opacity, dot3Opacity]);

  const handleRealTimePress = () => {
    if (!isDoctor || !conversation) {
      return;
    }

    // WebRTC is doctor-only, always use medidoc
    // - If patient_id is null: docsolo (doctor talking to Sara directly)
    // - If patient_id is set: medidoc (doctor talking to patient through Sara)
    const assistant = 'medidoc';

    const rtcParams = {
      convoId: conversation.id,
      assistant,
      patientId: conversation.patient_id?.toString() || '',
      doctorId: conversation.doctor_id?.toString() || '',
      userId: currentUserId?.toString() || '',
      senderId: currentUserId?.toString() || '',
    };

    console.log('[RTC] Starting WebRTC session with params:', {
      ...rtcParams,
      conversationType: rtcParams.patientId
        ? 'medidoc (doctor-patient)'
        : 'docsolo (doctor-sara)',
    });

    router.push({
      pathname: '/sara-rtc',
      params: rtcParams,
    } as any);
  };

  // Show loading screen until BOTH data is loaded AND WebSocket is ready
  // This prevents showing the chat UI before messages can be sent successfully
  const shouldShowLoading = isInitialLoading || !isSocketReady;

  if (shouldShowLoading) {
    return (
      <ConversationLoadingScreen
        status={connectionStatus}
        participantName={
          displayName
            ? String(displayName)
            : otherParticipantName || 'participant'
        }
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View className="px-4 py-3 bg-white border-b border-gray-200 flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 mr-2 -ml-2"
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color="#F05C0C"
            />
          </TouchableOpacity>

          <TouchableOpacity
            className="w-10 h-10 rounded-full mr-3 overflow-hidden"
            disabled={
              isSaraConversation ||
              (!isDoctor && !isPatient) ||
              isNavigatingToPatient ||
              isNavigatingToDoctor
            }
            onPress={isDoctor ? handlePatientClick : handleDoctorClick}
          >
            {isNavigatingToPatient || isNavigatingToDoctor ? (
              <View className="w-full h-full bg-orange-100 justify-center items-center">
                <ActivityIndicator size="small" color="#F05C0C" />
              </View>
            ) : isSaraConversation ? (
              <Image
                source={require('@/assets/images/Sara.png')}
                className="w-full h-full"
              />
            ) : (
              <View className="w-full h-full bg-gray-200 justify-center items-center">
                <Ionicons name="person" size={20} color="#374151" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1"
            disabled={
              isSaraConversation ||
              (!isDoctor && !isPatient) ||
              isNavigatingToPatient ||
              isNavigatingToDoctor
            }
            onPress={isDoctor ? handlePatientClick : handleDoctorClick}
          >
            <View className="flex-row items-center">
              <Text className="text-xl font-normal text-gray-900">
                {otherParticipantName}
              </Text>
              {(isNavigatingToPatient || isNavigatingToDoctor) && (
                <ActivityIndicator
                  size="small"
                  color="#F05C0C"
                  style={{ marginLeft: 8 }}
                />
              )}
            </View>
            {!isSaraConversation && statusText !== 'Offline' && (
              <View className="flex-row items-center">
                <View
                  className={`w-2 h-2 rounded-full mr-2`}
                  style={{ backgroundColor: statusColor }}
                />
                <Text className="text-sm text-gray-500">{statusText}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* <View className="flex-row">
          <TouchableOpacity className="p-2 mr-1">
            <MaterialCommunityIcons name="phone" size={22} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity className="p-2">
            <MaterialCommunityIcons name="video" size={22} color="#6B7280" />
          </TouchableOpacity>
        </View> */}
        </View>

        {/* Messages and Input */}
        <View className="flex-1">
          <ChatMessages
            messages={messages}
            currentUser={currentUserId}
            otherParticipant={otherParticipantName}
            isOtherParticipantTyping={false}
            scrollViewRef={scrollViewRef}
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoadingMore={isFetchingNextPage}
            isSaraConversation={isSaraConversation}
          />

          <MessageInput
            onSend={handleSendText}
            // Live voice calls use the OpenAI Realtime API; hidden unless the server enables it
            onRealTimePress={process.env.EXPO_PUBLIC_REALTIME_ENABLED === 'true' ? handleRealTimePress : undefined}
            showRTCButton={isDoctor}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;
