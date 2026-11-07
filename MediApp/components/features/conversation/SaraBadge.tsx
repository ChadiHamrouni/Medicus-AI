import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';

interface SaraBadgeProps {
  visible: boolean;
  count?: number;
}

const SaraBadge: React.FC<SaraBadgeProps> = ({ visible, count }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!visible) return null;

  // Display count if available and greater than 0
  const showCount = count && count > 0;

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowTooltip(true)}
        activeOpacity={0.7}
        className="ml-2"
      >
        {showCount ? (
          <View
            className="min-w-5 h-5 px-1.5 rounded-full justify-center items-center"
            style={{ backgroundColor: '#FF6F00' }}
          >
            <Text className="text-white text-xs font-semibold">
              {count > 99 ? '99+' : count}
            </Text>
          </View>
        ) : (
          <View
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: '#FF6F00' }}
          />
        )}
      </TouchableOpacity>

      <Modal
        visible={showTooltip}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTooltip(false)}
      >
        <Pressable
          className="flex-1 justify-center items-center bg-black/50"
          onPress={() => setShowTooltip(false)}
        >
          <View className="bg-white rounded-lg p-4 mx-8 shadow-lg">
            <Text className="text-gray-800 text-sm font-medium">
              {showCount
                ? `${count} unsummarized message${count === 1 ? '' : 's'}`
                : 'Active via Sara'}
            </Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

export default SaraBadge;
