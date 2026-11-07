import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DetailModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-gray-50 rounded-t-3xl max-h-[85%]">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-5 py-4 bg-white rounded-t-3xl border-b border-gray-100">
            <View>
              <Text className="text-xl font-bold text-gray-900">{title}</Text>
              {subtitle && (
                <Text className="text-xs text-gray-500 mt-0.5">{subtitle}</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 items-center justify-center bg-gray-100 rounded-xl"
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <ScrollView
            className="px-4 py-4"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
