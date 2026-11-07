import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

interface TypingIndicatorProps {
  senderName?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  senderName = 'Sara',
}) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <View className="flex flex-row mb-4 p-4 justify-start">
      <View className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center mr-2">
        <MaterialCommunityIcons name="account" size={20} color="#6B7280" />
      </View>
      <View className="flex max-w-[70%] items-start">
        <Text className="text-sm text-gray-700 mb-1">{senderName}</Text>
        <View className="bg-gray-100 rounded-2xl p-3">
          <Text className="text-sm text-gray-800">Typing{dots}</Text>
        </View>
      </View>
    </View>
  );
};

export default TypingIndicator;
