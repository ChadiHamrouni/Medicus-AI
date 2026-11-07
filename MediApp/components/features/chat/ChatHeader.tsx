import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

interface ChatHeaderProps {
  title: string;
  onMenuPress?: () => void;
  onCallPress?: () => void;
  onVideoPress?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  onMenuPress,
  onCallPress,
  onVideoPress,
}) => {
  const router = useRouter();

  const handleBackPress = () => {
    // Always navigate to the conversations screen
    router.push('/tabs/chats');
  };

  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-white shadow-sm">
      <View className="flex-row items-center flex-1">
        <View className="mr-3 p-2 -ml-2 rounded-full active:bg-gray-100">
          <TouchableOpacity onPress={handleBackPress}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color="#F05C0C"
            />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center flex-1">
          {/* Always show Sara avatar for Sara AI Assistant */}
          {title &&
            (title.toLowerCase().includes('sara') ||
              title.toLowerCase().includes('ai assistant')) && (
              <View className="w-10 h-10 rounded-full mr-3 overflow-hidden">
                <Image
                  source={require('@/assets/images/Sara.png')}
                  className="w-full h-full"
                />
              </View>
            )}
          <Text
            className="text-2xl font-bold text-gray-900 flex-1"
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center space-x-2">
        <View className="p-2 rounded-full active:bg-gray-100">
          <TouchableOpacity onPress={onCallPress}>
            <MaterialCommunityIcons name="phone" size={24} color="#F05C0C" />
          </TouchableOpacity>
        </View>
        <View className="p-2 rounded-full active:bg-gray-100">
          <TouchableOpacity onPress={onVideoPress}>
            <MaterialCommunityIcons name="video" size={24} color="#F05C0C" />
          </TouchableOpacity>
        </View>
        <View className="p-2 rounded-full active:bg-gray-100">
          <TouchableOpacity onPress={onMenuPress}>
            <MaterialCommunityIcons
              name="dots-vertical"
              size={24}
              color="#F05C0C"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default ChatHeader;
