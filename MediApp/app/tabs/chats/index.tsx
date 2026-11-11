import { useConversations } from '@/hooks/chat';
import { useConversationSearch, SearchMode } from '@/hooks/chat/useConversationSearch';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDependents } from '@/contexts/DependentsContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SaraBadge from '@/components/features/conversation/SaraBadge';
import { Button } from '@/components/shared';
import { getOnlineStatus, formatConversationTimestamp } from '@/utils/date';

// The preview is plain text: drop Markdown markers (**bold**, `code`, # headings, list bullets, links).
const stripMarkdown = (text?: string) =>
  (text || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`~]+/g, '')
    .replace(/^\s*(#{1,6}|[-+]|\d+\.)\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

const ConversationsScreen: React.FC = () => {
  const router = useRouter();
  const { authState } = useAuthContext();
  const { selectedDependent, getCurrentDependentName } = useDependents();
  const { conversations, isLoading, error, refetch } = useConversations({
    activeFilter: 'all',
  });
  const search = useConversationSearch();
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  const currentDependentName = getCurrentDependentName();

  // Simple conversation processing - just sort with Sara first
  const processedConversations = useMemo(() => {
    if (!conversations?.length) return [];

    return [...conversations].sort((a, b) => {
      // Check if conversation is with Sara (assistant conversation)
      const isSaraA =
        (a.assistant === 'medidoc' || a.assistant === 'mediaid') &&
        ((a.doctor_id && !a.patient_id) || (a.patient_id && !a.doctor_id));
      const isSaraB =
        (b.assistant === 'medidoc' || b.assistant === 'mediaid') &&
        ((b.doctor_id && !b.patient_id) || (b.patient_id && !b.doctor_id));

      // Sara always comes first
      if (isSaraA && !isSaraB) return -1;
      if (!isSaraA && isSaraB) return 1;

      // For others, sort by timestamp (newest first)
      const timeA = new Date(a.lastMessageTimestamp || 0).getTime();
      const timeB = new Date(b.lastMessageTimestamp || 0).getTime();
      return timeB - timeA;
    });
  }, [conversations]);

  const handleConversationPress = (conversation: any) => {
    if (!conversation) return;

    // Check if it's Sara
    const isSara =
      (conversation.assistant === 'medidoc' ||
        conversation.assistant === 'mediaid') &&
      ((conversation.doctor_id && !conversation.patient_id) ||
        (conversation.patient_id && !conversation.doctor_id));

    // Get display name - show the OTHER person's name
    let displayName = 'Unknown';
    if (isSara) {
      displayName = 'Sara - your Health Assistant';
    } else {
      // Show doctor name if current user is patient, show patient name if current user is doctor
      const userRole = authState.user?.role;
      if (userRole === 'patient') {
        displayName = conversation.doctor?.name
          ? `Dr. ${conversation.doctor.name}`
          : 'Unknown';
      } else if (userRole === 'doctor') {
        displayName = conversation.patient?.name || 'Unknown';
      }
    }

    const safeDisplayName = displayName || 'Unknown';

    // Navigate to conversation
    router.push(
      `/tabs/chats/${conversation.id}?chatId=${conversation.id}&displayName=${encodeURIComponent(safeDisplayName)}&isSara=${isSara ? 'true' : 'false'}`
    );
  };

  const handleNewConversation = () => {
    router.push('/tabs/chats/discovery');
  };

  const handleRefresh = () => {
    refetch();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTimestamp = (timestamp: string | Date) => {
    return formatConversationTimestamp(timestamp);
  };

  const renderConversationItem = (conversation: any) => {
    // Check if it's Sara
    const isSara =
      (conversation.assistant === 'medidoc' ||
        conversation.assistant === 'mediaid') &&
      ((conversation.doctor_id && !conversation.patient_id) ||
        (conversation.patient_id && !conversation.doctor_id));

    // Get display info - show the OTHER person's name
    let displayName = 'Unknown';
    let avatarUri = null;

    if (isSara) {
      displayName = 'Sara - your Health Assistant';
    } else {
      // Show doctor name/image if current user is patient, show patient name/image if current user is doctor
      const userRole = authState.user?.role;
      if (userRole === 'patient') {
        displayName = conversation.doctor?.name
          ? `Dr. ${conversation.doctor.name}`
          : 'Unknown';
        avatarUri = conversation.doctor?.image;
      } else if (userRole === 'doctor') {
        displayName = conversation.patient?.name || 'Unknown';
        avatarUri = conversation.patient?.image;
      }
    }

    const lastMessage = isSara
      ? 'I can help you with health questions, appointments, and more.'
      : stripMarkdown(conversation.lastMessage) || 'No messages yet';

    return (
      <TouchableOpacity
        key={conversation.id}
        onPress={() => handleConversationPress(conversation)}
        className={`flex-row items-center px-4 py-4 border-b border-gray-100 ${isSara ? 'bg-orange-50' : 'bg-white'
          }`}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View className="w-14 h-14 rounded-full mr-4 overflow-hidden bg-gray-100">
          {isSara ? (
            <Image
              source={require('@/assets/images/Sara.png')}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full bg-gray-200 justify-center items-center">
              <Ionicons name="person" size={20} color="#374151" />
            </View>
          )}
        </View>

        {/* Content */}
        <View className="flex-1">
          <View className="flex-row justify-between items-start mb-1">
            <View className="flex-1 mr-2">
              <View className="flex-row items-center">
                <Text
                  className="text-xl font-normal text-gray-900"
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
                {/* Sara Badge - next to name */}
                {!isSara && conversation.has_unsummarized_messages && (
                    <View className="ml-2">
                      <SaraBadge visible={true} />
                    </View>
                  )}
              </View>

              {/* Specialty or role for non-Sara conversations */}
              {!isSara &&
                (conversation.doctor?.specialty ||
                  conversation.patient?.role) && (
                  <Text className="text-xs text-gray-500 mt-1">
                    {conversation.doctor?.specialty || 'Patient'}
                  </Text>
                )}
            </View>

            <View className="flex-row items-center">
              <Text className="text-sm text-gray-500">
                {formatTimestamp(conversation.lastMessageTimestamp)}
              </Text>
              {conversation.state === 'active' &&
                !isSara &&
                getOnlineStatus(conversation.lastMessageTimestamp).isOnline && (
                  <View className="w-2 h-2 bg-green-500 rounded-full ml-2" />
                )}
            </View>
          </View>

          <View className="flex-row justify-between items-center">
            <Text
              className="text-sm text-gray-600 flex-1 mr-2"
              numberOfLines={2}
            >
              {lastMessage}
            </Text>

            {conversation.unreadCount > 0 && (
              <View className="bg-orange-500 rounded-full min-w-5 h-5 items-center justify-center">
                <Text className="text-white text-xs font-bold">
                  {conversation.unreadCount > 99
                    ? '99+'
                    : conversation.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1 bg-gray-50">
        {/* Search Bar */}
        <View className="px-4 pt-3 pb-3 bg-white">
          <View className="flex-row items-center bg-gray-50 rounded-xl px-1 py-1 border border-gray-200">
            {/* Mode Dropdown */}
            <TouchableOpacity
              onPress={() => setShowModeDropdown(!showModeDropdown)}
              className="flex-row items-center rounded-lg px-3 py-2 bg-white border border-gray-200"
            >
              <Text className="text-sm font-semibold text-gray-700">
                {search.searchMode === 'content' ? 'Content' : search.participantLabel}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>

            {/* Search Input */}
            <TextInput
              className="flex-1 ml-3 text-sm text-gray-900"
              placeholder="Search conversations..."
              placeholderTextColor="#9CA3AF"
              value={search.query}
              onChangeText={search.setQuery}
              returnKeyType="search"
              autoCorrect={false}
            />

            {search.query.length > 0 ? (
              <TouchableOpacity onPress={search.clear} className="p-2">
                <MaterialCommunityIcons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ) : (
              <View className="p-2">
                <MaterialCommunityIcons name="magnify" size={22} color="#9CA3AF" />
              </View>
            )}
          </View>
        </View>

        {/* Mode Dropdown */}
        {showModeDropdown && (
          <View className="absolute left-4 top-16 bg-white rounded-xl shadow-lg z-20 py-2" style={{ elevation: 8, minWidth: 120 }}>
            <TouchableOpacity
              onPress={() => {
                search.setSearchMode('participant');
                setShowModeDropdown(false);
              }}
              className="px-4 py-3"
            >
              <Text className={`text-md ${search.searchMode === 'participant' ? 'font-normal' : 'text-gray-600'}`} style={search.searchMode === 'participant' ? { color: '#F05C0C' } : {}}>
                {search.participantLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                search.setSearchMode('content');
                setShowModeDropdown(false);
              }}
              className="px-4 py-3"
            >
              <Text className={`text-sm ${search.searchMode === 'content' ? 'font-bold' : 'text-gray-600'}`} style={search.searchMode === 'content' ? { color: '#F05C0C' } : {}}>
                Content
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        <View className="flex-1">
          {isLoading && !search.isActive ? (
            <View className="flex-1 justify-center items-center">
              <View className="bg-gray-100 rounded-full w-16 h-16 items-center justify-center mb-4">
                <MaterialCommunityIcons
                  name="chat-processing"
                  size={32}
                  color="#9CA3AF"
                />
              </View>
              <Text className="text-lg font-medium text-gray-600 mb-2">
                Loading conversations...
              </Text>
              <Text className="text-sm text-gray-500">
                Please wait while we fetch your messages
              </Text>
            </View>
          ) : error ? (
            <View className="flex-1 justify-center items-center px-8">
              <View className="bg-red-100 rounded-full w-16 h-16 items-center justify-center mb-4">
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={32}
                  color="#EF4444"
                />
              </View>
              <Text className="text-lg font-medium text-gray-900 mb-2 text-center">
                Unable to load conversations
              </Text>
              <Text className="text-sm text-gray-500 text-center mb-4">
                {error}
              </Text>
              <Button
                onPress={handleRefresh}
                title="Try Again"
                containerClassName="bg-orange-500 px-6 py-3 rounded-lg"
                textClassName="text-white font-medium"
              />
            </View>
          ) : (search.isActive ? search.results.length > 0 : processedConversations.length > 0) ? (
            <>
              {/* Dependent Indicator */}
              {selectedDependent !== 'main' &&
                authState.user?.role === 'patient' && (
                  <View className="px-4 py-3 bg-white border-b border-gray-200">
                    <View className="flex-row items-center">
                      <>
                        <View
                          className="bg-teal-500 rounded-full items-center justify-center mr-2"
                          style={{ width: 28, height: 28 }}
                        >
                          <MaterialCommunityIcons
                            name="account-child"
                            size={14}
                            color="white"
                          />
                        </View>
                        <Text className="text-sm text-gray-600">
                          Conversations for{' '}
                          <Text className="font-semibold text-gray-900">
                            {currentDependentName}
                          </Text>
                        </Text>
                      </>
                    </View>
                  </View>
                )}

              {/* Conversation List */}
              <ScrollView
                className="flex-1 bg-white"
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={isLoading}
                    onRefresh={handleRefresh}
                    tintColor="#F05C0C"
                  />
                }
              >
                {(search.isActive ? search.results : processedConversations).map(renderConversationItem)}

                {/* Bottom padding for floating button */}
                <View className="h-20" />
              </ScrollView>
            </>
          ) : (
            <View className="flex-1 justify-center items-center px-8">
              <View className="bg-gray-100 rounded-full w-16 h-16 items-center justify-center mb-4">
                <MaterialCommunityIcons
                  name={search.isActive ? 'magnify' : 'chat-outline'}
                  size={32}
                  color="#9CA3AF"
                />
              </View>
              <Text className="text-lg font-medium text-gray-600 mb-2">
                {search.isActive
                  ? search.isSearching
                    ? 'Searching...'
                    : `No results for "${search.query}"`
                  : 'No conversations yet'}
              </Text>
            </View>
          )}

          {/* Floating New Conversation Button */}
          {processedConversations.length > 0 &&
            (authState.user?.role !== 'doctor' || !authState.doctorProfile) && (
              <Pressable
                onPress={handleNewConversation}
                className="absolute bottom-6 right-6 bg-orange-500 w-14 h-14 rounded-full items-center justify-center shadow-lg"
                style={({ pressed }) => [
                  {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <MaterialCommunityIcons name="plus" size={24} color="white" />
              </Pressable>
            )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ConversationsScreen;
