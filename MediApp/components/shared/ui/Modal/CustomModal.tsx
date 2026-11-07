import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface CustomModalProps {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  onClose?: () => void;
  onAction?: () => void;
  actionText?: string;
  loading?: boolean;
}

const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  title,
  message,
  type,
  onClose,
  onAction,
  actionText,
  loading = false,
}) => {
  const [internalVisible, setInternalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info',
  });

  // Sync internal visibility and content with external props
  useEffect(() => {
    if (visible && (title || message)) {
      setModalContent({ title, message, type });
      setInternalVisible(true);
    }
  }, [visible, title, message, type]);

  const handleClose = () => {
    setInternalVisible(false);
    setTimeout(() => {
      if (onClose) {
        onClose();
      }
    }, 300); // Match the modal animation duration
  };
  const getIconName = () => {
    switch (modalContent.type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'error';
      case 'info':
        return 'info';
      default:
        return 'info';
    }
  };

  const getIconColor = () => {
    switch (modalContent.type) {
      case 'success':
        return '#10B981'; // green
      case 'error':
        return '#EF4444'; // red
      case 'info':
        return '#F05C0C'; // orange
      default:
        return '#F05C0C';
    }
  };

  const getActionButtonColor = () => {
    switch (modalContent.type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'info':
        return 'bg-orange-500';
      default:
        return 'bg-[#F05C0C]'; // App's primary orange color
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={internalVisible}
      onRequestClose={() => {
        // Modal can only be closed by explicitly clicking the Close button
      }}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white rounded-2xl p-6 w-[85%] max-w-[400px] items-center shadow-lg">
          <View className="mb-4">
            <MaterialIcons
              name={getIconName()}
              size={40}
              color={getIconColor()}
            />
          </View>

          <Text className="text-xl font-bold text-gray-800 mb-2 text-center">
            {modalContent.title}
          </Text>
          <Text className="text-base text-gray-600 mb-6 text-center leading-6">
            {modalContent.message}
          </Text>

          <View className="flex-row justify-center w-full gap-3">
            <TouchableOpacity
              className="bg-gray-100 rounded-lg py-3 px-4 min-w-[100px] items-center"
              onPress={handleClose}
            >
              <Text className="text-gray-700 font-semibold text-base">
                Close
              </Text>
            </TouchableOpacity>

            {onAction && actionText && (
              <TouchableOpacity
                className={`${getActionButtonColor()} rounded-lg py-3 px-4 min-w-[100px] items-center`}
                onPress={() => {
                  if (onAction) {
                    onAction(); // Execute the action directly
                  }
                }}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    {actionText}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CustomModal;
