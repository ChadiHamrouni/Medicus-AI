import { User } from '@/types/user';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { UserItem } from './UserItem';

interface UserListProps {
  users: User[];
  selectedUserId: string | null;
  onUserSelect: (_user: User) => void;
  isLoading?: boolean;
  error?: string | null;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRefresh?: () => void;
}

export const UserList: React.FC<UserListProps> = ({
  users,
  selectedUserId,
  onUserSelect,
  isLoading = false,
  error = null,
  hasMore = false,
  onLoadMore,
  onRefresh,
}) => {
  const renderUserItem = ({ item }: { item: User }) => (
    <UserItem
      user={item}
      isSelected={selectedUserId === item.identity}
      onSelect={onUserSelect}
    />
  );

  const renderFooter = () => {
    // Show loader for initial loading or pagination
    if (isLoading || hasMore) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#f97316" />
          {isLoading && users.length === 0 && (
            <Text className="text-gray-500 mt-2">Loading users...</Text>
          )}
        </View>
      );
    }
    return null;
  };

  const renderEmpty = () => {
    if (isLoading) {
      return null; // Don't show anything when loading - footer will handle it
    }

    if (error) {
      return (
        <View className="flex-1 justify-center items-center py-8">
          <Text className="text-red-500 text-center mb-2 text-lg font-semibold">
            Unable to load users
          </Text>
          <Text className="text-gray-500 text-center text-sm px-4 mb-4">
            {error}
          </Text>
          {onRefresh && (
            <TouchableOpacity
              className="bg-orange-500 px-6 py-3 rounded-lg"
              onPress={onRefresh}
            >
              <Text className="text-white font-semibold">Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View className="flex-1 justify-center items-center py-8">
        <Text className="text-gray-500 text-center">No users found</Text>
      </View>
    );
  };

  return (
    <FlatList
      data={users}
      renderItem={renderUserItem}
      keyExtractor={item => item.id}
      contentContainerClassName="px-4 pb-24"
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      onRefresh={onRefresh}
      refreshing={false}
    />
  );
};
