import React, { useState } from 'react';
import { TouchableOpacity, View, Text, Modal, Pressable } from 'react-native';
import { Divider } from './Divider';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type InputMode = 'keyboard' | 'location' | 'files' | 'images' | 'camera';

export interface OptionItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/**
 * Individual option item with icon and text
 */
export const OptionItem: React.FC<OptionItemProps> = ({
  icon,
  label,
  onPress,
  disabled = false,
}) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex-row items-center py-3 px-2"
    activeOpacity={disabled ? 1 : 0.7}
  >
    <MaterialCommunityIcons
      name={icon as any}
      size={20}
      color={disabled ? '#9CA3AF' : '#F05C0C'}
    />
    <Text className={`ml-3 ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
      {label}
    </Text>
  </TouchableOpacity>
);

export interface OptionsModalProps {
  visible: boolean;
  onOptionSelect: (mode: InputMode) => void;
  hasAttachments?: boolean;
}

/**
 * Options modal that appears when plus button is pressed
 */
export const OptionsModal: React.FC<OptionsModalProps> = ({
  visible,
  onOptionSelect,
  hasAttachments = false,
}) => {
  if (!visible) return null;

  return (
    <View className="absolute bottom-12 left-0 bg-white rounded-lg shadow-lg p-2 z-10 border border-gray-200 w-48">
      <View className="flex-col">
        <OptionItem
          icon="camera"
          label="Camera"
          onPress={() => onOptionSelect('camera')}
        />

        <Divider />

        <OptionItem
          icon="image"
          label="Images"
          onPress={() => onOptionSelect('images')}
        />

        <Divider />

        <OptionItem
          icon="file-document"
          label="Files"
          onPress={() => onOptionSelect('files')}
        />

        <Divider />

        <OptionItem
          icon="map-marker"
          label="Location"
          onPress={() => onOptionSelect('location')}
        />
      </View>

      {/* Triangle pointer at bottom */}
      <View className="absolute bottom-0 left-4 w-4 h-4 bg-white rotate-45 translate-y-2 border-r border-b border-gray-200" />
    </View>
  );
};
