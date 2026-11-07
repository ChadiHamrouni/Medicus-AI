import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, Text, TouchableOpacity, View } from 'react-native';

interface SimpleDatePickerProps {
  value: string;
  onDateSelect: (date: string) => void;
  isVisible: boolean;
  onClose: () => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

export const SimpleDatePicker: React.FC<SimpleDatePickerProps> = ({
  value,
  onDateSelect,
  isVisible,
  onClose,
  minimumDate,
  maximumDate,
}) => {
  const [tempDate, setTempDate] = useState(() => {
    if (value) {
      const date = new Date(value);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    return new Date();
  });

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
      if (Platform.OS === 'android') {
        // Android automatically closes, so we handle the selection immediately
        onDateSelect(selectedDate.toISOString().split('T')[0]);
        onClose();
      }
    } else if (Platform.OS === 'android') {
      // User cancelled on Android
      onClose();
    }
  };

  const handleConfirm = () => {
    onDateSelect(tempDate.toISOString().split('T')[0]);
    onClose();
  };

  if (!isVisible) return null;

  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        value={tempDate}
        mode="date"
        display="default"
        onChange={handleDateChange}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
      />
    );
  }

  // iOS Modal
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={onClose}
        />
        <View className="bg-white rounded-t-2xl">
          {/* Header */}
          <View className="px-4 py-3 border-b border-gray-200 flex-row justify-between items-center">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-[#F05C0C] text-base font-medium">
                Cancel
              </Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900">
              Date of Birth
            </Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text className="text-[#F05C0C] text-base font-medium">Done</Text>
            </TouchableOpacity>
          </View>

          {/* Date Picker */}
          <View className="p-4">
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              style={{ backgroundColor: 'white' }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SimpleDatePicker;
