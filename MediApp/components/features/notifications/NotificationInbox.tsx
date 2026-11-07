import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

import {
  medicusNotificationAPI,
  InAppNotification,
  NotificationInbox as NotificationInboxType,
} from '@/services/notifications/medicusNotification';
import { useAuth } from '@/hooks/auth';
import { logger } from '@/utils';

interface NotificationInboxProps {
  onNotificationPress?: (_notification: InAppNotification) => void;
  category?: string;
  showUnreadOnly?: boolean;
}

const NotificationInbox: React.FC<NotificationInboxProps> = ({
  onNotificationPress,
  category,
  showUnreadOnly = false,
}) => {
  const { authState } = useAuth();
  const authToken = authState.token;
  const [inbox, setInbox] = useState<NotificationInboxType>({
    notifications: [],
    total_count: 0,
    unread_count: 0,
    has_more: false,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadNotifications = useCallback(
    async (offset: number = 0, isRefresh: boolean = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else if (offset === 0) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const response = await medicusNotificationAPI.getNotificationInbox(
          20, // limit
          offset,
          showUnreadOnly,
          category
        );

        if (offset === 0) {
          setInbox(response);
        } else {
          setInbox(prev => ({
            ...response,
            notifications: [...prev.notifications, ...response.notifications],
          }));
        }

        logger.info('Loaded notifications', {
          component: 'NotificationInbox',
          count: response.notifications.length,
          total: response.total_count,
          unread: response.unread_count,
        });
      } catch (error) {
        logger.error('Failed to load notifications', error as Error, {
          component: 'NotificationInbox',
        });

        Alert.alert(
          'Error',
          'Failed to load notifications. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [category, showUnreadOnly]
  );

  useEffect(() => {
    if (authToken) {
      medicusNotificationAPI.setAuthToken(authToken);
      loadNotifications();
    }
  }, [authToken, category, showUnreadOnly, loadNotifications]);

  const markAsRead = async (notification: InAppNotification) => {
    if (notification.read_at) return; // Already read

    try {
      await medicusNotificationAPI.markNotificationRead(notification.id);

      // Update local state
      setInbox(prev => ({
        ...prev,
        notifications: prev.notifications.map(n =>
          n.id === notification.id
            ? { ...n, read_at: new Date().toISOString() }
            : n
        ),
        unread_count: Math.max(0, prev.unread_count - 1),
      }));

      logger.auditLog('notification_marked_read', '', {
        notificationId: notification.id,
        category: notification.category,
      });
    } catch (error) {
      logger.error('Failed to mark notification as read', error as Error, {
        component: 'NotificationInbox',
        notificationId: notification.id,
      });
    }
  };

  const deleteNotification = async (notification: InAppNotification) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await medicusNotificationAPI.deleteNotification(notification.id);

              // Update local state
              setInbox(prev => ({
                ...prev,
                notifications: prev.notifications.filter(
                  n => n.id !== notification.id
                ),
                total_count: prev.total_count - 1,
                unread_count: notification.read_at
                  ? prev.unread_count
                  : prev.unread_count - 1,
              }));

              logger.auditLog('notification_deleted', '', {
                notificationId: notification.id,
                category: notification.category,
              });
            } catch (error) {
              logger.error('Failed to delete notification', error as Error, {
                component: 'NotificationInbox',
                notificationId: notification.id,
              });

              Alert.alert('Error', 'Failed to delete notification');
            }
          },
        },
      ]
    );
  };

  const markAllAsRead = async () => {
    try {
      await medicusNotificationAPI.markAllNotificationsRead(category);

      // Update local state
      setInbox(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({
          ...n,
          read_at: n.read_at || new Date().toISOString(),
        })),
        unread_count: 0,
      }));

      logger.auditLog('all_notifications_marked_read', '', {
        category: category || 'all',
      });
    } catch (error) {
      logger.error('Failed to mark all notifications as read', error as Error, {
        component: 'NotificationInbox',
      });

      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  };

  const onRefresh = useCallback(() => {
    loadNotifications(0, true);
  }, [category, showUnreadOnly]);

  const loadMore = useCallback(() => {
    if (inbox.has_more && !loadingMore) {
      loadNotifications(inbox.notifications.length);
    }
  }, [inbox.has_more, inbox.notifications.length, loadingMore]);

  const handleNotificationPress = (notification: InAppNotification) => {
    // Mark as read when pressed
    markAsRead(notification);

    // Call the callback if provided
    if (onNotificationPress) {
      onNotificationPress(notification);
    }

    // Handle action URL if available
    if (notification.action_url) {
      // TODO: Handle navigation to action URL
      logger.info('Navigating to notification action', {
        component: 'NotificationInbox',
        notificationId: notification.id,
        actionUrl: notification.action_url,
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      appointment_reminder: 'calendar-clock',
      medication_reminder: 'pill',
      lab_results: 'file-document',
      health_insights: 'lightbulb',
      emergency: 'alert-circle',
      communication: 'message',
      system: 'cog',
    };
    return icons[category] || 'bell';
  };

  const getCategoryColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: '#EF4444',
      high: '#F97316',
      normal: '#F05C0C',
      low: '#6B7280',
    };
    return colors[priority] || '#F05C0C';
  };

  const renderNotificationItem = ({ item }: { item: InAppNotification }) => (
    <TouchableOpacity
      className={`mx-4 mb-2 p-4 rounded-lg border ${
        item.read_at ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
      }`}
      onPress={() => handleNotificationPress(item)}
    >
      <View className="flex-row items-start">
        <View className="mr-3 mt-1">
          <MaterialCommunityIcons
            name={getCategoryIcon(item.category) as any}
            size={24}
            color={getCategoryColor(item.priority)}
          />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text
              className={`text-base font-semibold ${
                item.read_at ? 'text-gray-900' : 'text-blue-900'
              }`}
            >
              {item.title}
            </Text>
            {!item.read_at && (
              <View className="w-2 h-2 bg-blue-600 rounded-full ml-2" />
            )}
          </View>

          <Text
            className={`text-sm mb-2 ${
              item.read_at ? 'text-gray-600' : 'text-blue-800'
            }`}
          >
            {item.message}
          </Text>

          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(item.created_at), {
                addSuffix: true,
              })}
            </Text>

            <TouchableOpacity
              onPress={() => deleteNotification(item)}
              className="p-1"
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={16}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
      <View>
        <Text className="text-lg font-semibold text-gray-900">
          Notifications
        </Text>
        <Text className="text-sm text-gray-600">
          {inbox.unread_count > 0
            ? `${inbox.unread_count} unread`
            : 'All caught up!'}
        </Text>
      </View>

      {inbox.unread_count > 0 && (
        <TouchableOpacity
          onPress={markAllAsRead}
          className="px-3 py-2 bg-blue-600 rounded-lg"
        >
          <Text className="text-white text-sm font-medium">Mark All Read</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View className="flex-1 justify-center items-center px-4 py-8">
      <MaterialCommunityIcons
        name="bell-off-outline"
        size={64}
        color="#9CA3AF"
      />
      <Text className="text-lg font-medium text-gray-900 mt-4">
        No notifications
      </Text>
      <Text className="text-gray-600 text-center mt-2">
        {showUnreadOnly
          ? "You don't have any unread notifications"
          : "You don't have any notifications yet"}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore || !inbox.has_more) return null;

    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#F05C0C" />
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#F05C0C" />
        <Text className="text-gray-600 mt-4">Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {renderHeader()}

      <FlatList
        data={inbox.notifications}
        renderItem={renderNotificationItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F05C0C"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: 32,
        }}
      />
    </View>
  );
};

export default NotificationInbox;
