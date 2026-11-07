import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '@/hooks';
import DateTimePicker from '@react-native-community/datetimepicker';

interface TimePickerProps {
  value: string;
  label: string;
  isActive: boolean;
  borderColor: any;
  labelStyle: any;
  onFocus: () => void;
  onBlur: () => void;
  onChange: (_time: string) => void;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  label,
  isActive,
  borderColor,
  labelStyle,
  onFocus,
  onBlur,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();
  const screenHeight = Dimensions.get('window').height;

  // Helper to convert time string to Date object (using today's date)
  const getDateFromTime = (
    timeStr: string | undefined,
    defaultDate: Date = new Date()
  ) => {
    if (!timeStr) return undefined;
    const [hours, minutes] = timeStr.split(':');
    const date = new Date(defaultDate);
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
  };

  // Initial date for picker
  const initialDate = useMemo(() => {
    if (value) {
      return getDateFromTime(value) || new Date();
    }
    // Default to a common time or current time?
    // Usually current time or 09:00
    const date = new Date();
    date.setHours(9);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
  }, [value]);

  const [tempDate, setTempDate] = useState(initialDate);

  const maxModalHeight = useMemo(() => {
    if (isKeyboardVisible) {
      return screenHeight - keyboardHeight - 50;
    }
    return screenHeight * 0.8;
  }, [isKeyboardVisible, keyboardHeight, screenHeight]);

  const handleCloseModal = () => {
    setIsOpen(false);
    onBlur?.();
  };

  const handleConfirm = () => {
    const hours = tempDate.getHours().toString().padStart(2, '0');
    const minutes = tempDate.getMinutes().toString().padStart(2, '0');
    onChange(`${hours}:${minutes}`);
    handleCloseModal();
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const primaryColor = '#F05C0C';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => {
          setTempDate(initialDate); // Reset temp date to current value on open
          setIsOpen(true);
          onFocus?.();
        }}
        activeOpacity={1}
        style={[styles.triggerButton]}
      >
        <View
          style={[
            styles.animatedContainer,
            { borderColor: isActive ? '#F05C0C' : '#E5E7EB' },
          ]}
        >
          <Text
            style={[styles.label, { color: isActive ? '#F05C0C' : '#6B7280' }]}
          >
            {label}
          </Text>

          <View style={styles.triggerContent}>
            <Text
              style={[
                styles.displayText,
                { color: value ? '#111827' : '#9CA3AF' },
              ]}
            >
              {value || 'Select time'}
            </Text>
            <Ionicons
              name="time-outline"
              size={20}
              color={isActive ? primaryColor : '#9CA3AF'}
            />
          </View>
        </View>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleCloseModal}
          />

          <SafeAreaView
            style={[
              styles.dropdownModal,
              {
                maxHeight: maxModalHeight,
                marginBottom: isKeyboardVisible ? keyboardHeight : 0,
              },
            ]}
            edges={['bottom']}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || 'Select Time'}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseModal}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={tempDate}
                  mode="time"
                  display="spinner"
                  onChange={onDateChange}
                  textColor="#000000"
                  style={{ width: '100%', height: 200 }}
                  is24Hour={true}
                />
              ) : (
                // Fallback for Android within the modal?
                // Android native picker (display="spinner") *might* work embedded, or "clock".
                // "default" opens a dialog which is not what we want inside a modal view.
                // "spinner" on Android is also valid.
                <DateTimePicker
                  value={tempDate}
                  mode="time"
                  display="spinner"
                  onChange={onDateChange}
                  is24Hour={true}
                  style={{ height: 200 }}
                />
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.doneButton, { backgroundColor: primaryColor }]}
                onPress={handleConfirm}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  triggerButton: {},
  animatedContainer: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 56,
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  label: {
    position: 'absolute',
    top: -10,
    left: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
  },
  displayText: {
    fontSize: 16,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dropdownModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 16,
    flexShrink: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  pickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    // marginBottom: 1,
  },
  doneButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});
