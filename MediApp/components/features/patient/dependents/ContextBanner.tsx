import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface ContextBannerProps {
  currentPatient: {
    id: number;
    full_name: string;
    relationship: string;
    age: number;
  };
  onSwitchContext?: () => void;
  className?: string;
}

const ContextBanner: React.FC<ContextBannerProps> = ({
  currentPatient,
  onSwitchContext,
  className = '',
}) => {
  const isMainPatient = currentPatient.relationship === 'main';

  const formatRelationship = (relationship: string) => {
    return relationship.charAt(0).toUpperCase() + relationship.slice(1);
  };

  const getBannerColor = () => {
    if (isMainPatient) {
      return 'bg-blue-50 border-blue-200';
    }
    return 'bg-orange-50 border-orange-200';
  };

  const getTextColor = () => {
    if (isMainPatient) {
      return 'text-blue-800';
    }
    return 'text-orange-800';
  };

  if (isMainPatient) {
    // Don't show banner for main patient - this is the default view
    return null;
  }

  return (
    <View className={`border-b ${getBannerColor()} ${className}`}>
      <TouchableOpacity
        onPress={onSwitchContext}
        className="flex-row items-center justify-between px-4 py-3"
        disabled={!onSwitchContext}
      >
        <View className="flex-row items-center flex-1">
          <View className="mr-3">
            <Text className="text-2xl">👤</Text>
          </View>

          <View className="flex-1">
            <Text className={`font-semibold ${getTextColor()}`}>
              Viewing as {currentPatient.full_name}
            </Text>
            <Text className={`text-sm opacity-75 ${getTextColor()}`}>
              {formatRelationship(currentPatient.relationship)} • Age{' '}
              {currentPatient.age}
            </Text>
          </View>
        </View>

        {onSwitchContext && (
          <View className="flex-row items-center">
            <Text className={`text-sm mr-2 ${getTextColor()}`}>Switch</Text>
            <Text className={`text-lg ${getTextColor()}`}>⇄</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default ContextBanner;
