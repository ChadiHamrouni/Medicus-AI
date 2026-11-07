import React from 'react';
import { View } from 'react-native';
import { ThreeDotsLoader } from '@/components/shared/ui';

export const LoadingState: React.FC = () => {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <ThreeDotsLoader size={14} />
    </View>
  );
};
