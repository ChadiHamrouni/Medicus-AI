import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity } from 'react-native';

export interface ActionButtonProps {
  icon: string;
  color?: string;
  onPress?: () => void;
  marginLeft?: boolean;
}

/**
 * Action button component (plus, camera, microphone)
 */
export const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  color = '#6B7280',
  onPress,
  marginLeft = false,
}) => (
  <TouchableOpacity
    onPress={onPress}
    className={`flex items-center justify-center w-10 h-10 ${
      marginLeft ? 'ml-1' : 'mr-2'
    }`}
    activeOpacity={1}
  >
    <MaterialCommunityIcons name={icon as any} size={24} color={color} />
  </TouchableOpacity>
);
