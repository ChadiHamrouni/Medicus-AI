import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FooterProps {
  className?: string;
  children?: React.ReactNode;
}

export const Footer: React.FC<FooterProps> = ({ className = '', children }) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`py-4 ${className}`}
      style={{ paddingBottom: insets.bottom }}
    >
      {children || (
        <Text className="text-center text-gray-500">© 2025 Medicus</Text>
      )}
    </View>
  );
};
