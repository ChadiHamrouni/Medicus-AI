import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({
  visible,
  title,
  message,
  onClose,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white rounded-xl p-6 m-5 items-center shadow-md w-[85%] max-w-[400px]">
          <View className="flex-row items-center mb-4">
            <Ionicons name="alert-circle" size={28} color="#EF4444" />
            <Text className="text-lg font-semibold ml-2 text-gray-800">
              {title}
            </Text>
          </View>

          <Text className="text-base text-center mb-6 text-gray-600 leading-[22px]">
            {message}
          </Text>

          <TouchableOpacity
            className="bg-[#F05C0C] rounded-lg py-3 px-6 w-full items-center shadow-sm"
            onPress={onClose}
          >
            <Text className="text-white font-semibold text-base">OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ErrorModal;
