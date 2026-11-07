import { useConversationScreenContext } from '@/hooks';
import type { Conversation } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Animated,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import ConversationItem from './ConversationItem';

// Animated loading icon component
const AnimatedLoadingIcon = ({
  size,
  color,
}: {
  size: number;
  color: string;
}) => {
  const spinValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();
    return () => spinAnimation.stop();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <MaterialCommunityIcons name="loading" size={size} color={color} />
    </Animated.View>
  );
};

interface ConversationListWithContextProps {
  _onConversationPress?: (_conversation: Conversation) => void;
  onNewConversationPress?: () => void;
  onMenuPress?: () => void;
  showHeader?: boolean;
  showNewConversationButton?: boolean;
  activeFilter?: 'all' | 'doctors' | 'patients';
}

export const ConversationListWithContext: React.FC<
  ConversationListWithContextProps
> = ({
  _onConversationPress,
  onNewConversationPress,
  onMenuPress,
  showHeader = true,
  showNewConversationButton = true,
  activeFilter = 'all',
}) => {
  const {
    conversations,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
    screenTitle,
    emptyStateMessage,
  } = useConversationScreenContext(activeFilter);

  // Debug logging
  // React.useEffect(() => {
  //   console.log("ConversationListWithContext debug:", {
  //     conversationCount: conversations.length,
  //     isLoading,
  //     error,
  //     hasError: !!error
  //   });
  // }, [conversations, isLoading, error]);

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  // Check if a conversation is with Sara
  const isSaraConversation = (conversation: Conversation) => {
    // Check if assistant field contains Sara
    if (
      conversation.assistant &&
      conversation.assistant.toLowerCase().includes('sara')
    ) {
      return true;
    }

    // Check if doctor or patient data is missing (Sara AI)
    if (!conversation.doctor || !conversation.patient) {
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

  // Separate Sara AI from other conversations
  const saraConversations = conversations.filter(conv =>
    isSaraConversation(conv)
  );
  const otherConversations = conversations.filter(
    conv => !isSaraConversation(conv)
  );
  const hasOtherConversations = otherConversations.length > 0;
  const hasSaraConversation = saraConversations.length > 0;

  // Create ordered conversation list: Sara first, then others
  const orderedConversations = [...saraConversations, ...otherConversations];

  const renderConversationItem = ({
    item,
    index,
  }: {
    item: Conversation;
    index: number;
  }) => {
    const currentIsSara = isSaraConversation(item);
    // Show separator after Sara and before first other conversation
    const showSeparator =
      !currentIsSara &&
      index === saraConversations.length &&
      hasSaraConversation &&
      hasOtherConversations;

    return (
      <>
        {showSeparator && (
          <View className="px-4 py-6 bg-gray-50 border-b border-gray-100">
            <View className="flex-row items-center">
              <View className="flex-1 h-1 bg-[#F05C0C] rounded-full" />
              <Text className="mx-4 text-sm text-gray-500 font-medium">
                Other Conversations
              </Text>
              <View className="flex-1 h-1 bg-[#F05C0C] rounded-full" />
            </View>
          </View>
        )}
        <ConversationItem conversation={item} />
      </>
    );
  };

  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <View className="flex-row items-center justify-between px-4 py-5 border-b border-gray-200 bg-white">
        <Text className="text-xl font-bold text-gray-900">{screenTitle}</Text>
        {onMenuPress && (
          <TouchableOpacity
            onPress={onMenuPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="menu" size={24} color="#F05C0C" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderContextBanner = () => {
    // No patient context banner needed
    return null;
  };

  const renderEmptyState = () => {
    if (!emptyStateMessage) return null;

    return (
      <View className="flex-1 justify-center items-center px-6 py-12">
        <View className="bg-gray-50 rounded-full w-20 h-20 items-center justify-center mb-6">
          <MaterialCommunityIcons
            name="message-outline"
            size={40}
            color="#9CA3AF"
          />
        </View>

        <Text className="text-lg font-medium text-gray-600 mb-2">
          {emptyStateMessage || 'No Conversations Yet'}
        </Text>

        {showNewConversationButton && onNewConversationPress && (
          <TouchableOpacity
            onPress={onNewConversationPress}
            className="bg-[#F05C0C] px-6 py-3 rounded-lg flex-row items-center"
          >
            <MaterialCommunityIcons
              name="plus"
              size={20}
              color="white"
              style={{ marginRight: 8 }}
            />
            <Text className="text-white font-semibold">
              Start New Conversation
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderErrorState = () => {
    if (!error) return null;

    return (
      <View className="flex-1 justify-center items-center px-6 py-12">
        <View className="bg-red-50 rounded-full w-20 h-20 items-center justify-center mb-6">
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={40}
            color="#EF4444"
          />
        </View>

        <Text className="text-xl font-semibold text-gray-800 mb-3 text-center">
          Unable to Load Conversations
        </Text>

        <Text className="text-gray-600 text-center mb-6 leading-6">
          {error}
        </Text>

        <TouchableOpacity
          onPress={handleRefresh}
          className="bg-[#F05C0C] px-6 py-3 rounded-lg flex-row items-center"
        >
          <MaterialCommunityIcons
            name="refresh"
            size={20}
            color="white"
            style={{ marginRight: 8 }}
          />
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderLoadingState = () => {
    if (!isLoading) return null;

    return (
      <View className="flex-1 justify-center items-center">
        <AnimatedLoadingIcon size={40} color="#F05C0C" />
        <Text className="text-gray-600 mt-4">Loading conversations...</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;

    return (
      <View className="py-4 items-center">
        <AnimatedLoadingIcon size={24} color="#F05C0C" />
        <Text className="text-gray-600 mt-2 text-sm">
          Loading more conversations...
        </Text>
      </View>
    );
  };

  const renderConversationInfo = () => {
    if (conversations.length === 0) return null;

    return (
      <View className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <Text className="text-sm text-gray-600">
          {conversations.length} conversation
          {conversations.length !== 1 ? 's' : ''}
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white">
      {renderHeader()}
      {renderContextBanner()}
      {renderConversationInfo()}

      {conversations.length > 0 ? (
        <FlatList
          data={orderedConversations}
          renderItem={renderConversationItem}
          keyExtractor={item => item.id}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.1}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              colors={['#F05C0C']}
              tintColor="#F05C0C"
            />
          }
          ListFooterComponent={renderFooter}
          className="flex-1"
          showsVerticalScrollIndicator={false}
        />
      ) : error ? (
        renderErrorState()
      ) : isLoading ? (
        renderLoadingState()
      ) : (
        renderEmptyState()
      )}

      {/* Floating Action Button for New Conversation */}
      {showNewConversationButton && onNewConversationPress && (
        <TouchableOpacity
          onPress={onNewConversationPress}
          className="absolute bottom-6 right-6 bg-[#F05C0C] w-14 h-14 rounded-full items-center justify-center shadow-lg"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <MaterialCommunityIcons name="plus" size={24} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ConversationListWithContext;
