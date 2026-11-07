import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { goToDoctorProfile } from '@/utils';
// Removed patient switching imports - patient switching only in Settings

interface ProfileScreenHeaderProps {
  title: string;
  showRightAction?: boolean;
  rightActionLabel?: string;
  onRightActionPress?: () => void;
  rightActionDisabled?: boolean;
}

const ProfileScreenHeader: React.FC<ProfileScreenHeaderProps> = ({
  title,
  showRightAction = false,
  rightActionLabel = 'Save',
  onRightActionPress,
  rightActionDisabled = false,
}) => {
  const handleBackPress = () => {
    goToDoctorProfile();
  };

  return (
    <View
      className="flex-row items-center justify-between px-4 bg-white shadow-sm"
      style={{ paddingVertical: Platform.OS === 'android' ? 12 : 16 }}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
        translucent={false}
      />
      <View className="flex-row items-center flex-1">
        <View className="mr-3 p-2 -ml-2 rounded-full active:bg-gray-100">
          <TouchableOpacity
            onPress={handleBackPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color="#F05C0C"
            />
          </TouchableOpacity>
        </View>
        <Text
          className="text-2xl font-bold text-gray-900 flex-1"
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {/* Right Side Controls */}
      <View className="flex-row items-center space-x-3">
        {showRightAction && (
          <View className="px-3 py-2 rounded-lg active:bg-gray-100">
            <TouchableOpacity
              disabled={rightActionDisabled}
              onPress={onRightActionPress}
              accessibilityRole="button"
            >
              <Text
                className="text-base font-semibold"
                style={{ color: rightActionDisabled ? '#FBBF95' : '#F05C0C' }}
              >
                {rightActionLabel}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default ProfileScreenHeader;
