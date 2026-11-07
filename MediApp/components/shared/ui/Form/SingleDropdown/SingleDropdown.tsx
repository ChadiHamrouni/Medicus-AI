import AntDesign from '@expo/vector-icons/AntDesign';
import React, { useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface SingleDropdownProps {
  field: string;
  value: string;
  options?: { key: string; value: string }[];
  // eslint-disable-next-line no-unused-vars
  onValueChange?: (value: string) => void;
  label: string;
  isActive: boolean;
  borderColor: Animated.AnimatedInterpolation<string | number> | string;
  labelStyle: any;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  backgroundColor?: string;
}

export const SingleDropdown: React.FC<SingleDropdownProps> = ({
  // field,
  value,
  options,
  onValueChange,
  label,
  isActive,
  borderColor,
  labelStyle,
  onFocus,
  onBlur,
  placeholder = 'Select an option',
  backgroundColor = '#F9FAFB',
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const filteredOptions = (options || []).filter(option =>
    option.value.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleOptionSelect = (optionKey: string) => {
    onValueChange?.(optionKey);
    handleClose();
  };

  const handleClose = () => {
    setIsDropdownOpen(false);
    setSearchText('');
    onBlur?.();
  };

  const selectedOption = options?.find(option => option.key === value);

  return (
    <View>
      <TouchableOpacity
        onPress={() => {
          setIsDropdownOpen(true);
          onFocus?.();
        }}
      >
        <Animated.View
          style={{
            borderWidth: 1,
            borderColor: isActive ? '#F05C0C' : borderColor,
            borderRadius: 8,
            position: 'relative' as const,
            backgroundColor: isActive ? '#FFF7ED' : backgroundColor,
          }}
        >
          <Animated.Text
            style={[
              labelStyle,
              {
                color: isActive ? '#F05C0C' : '#6B7280',
                backgroundColor: backgroundColor,
              },
            ]}
          >
            {label}
          </Animated.Text>
          <View className="flex-row items-center justify-between px-4 h-12">
            <Text
              className={`text-base ${!value ? 'text-gray-400' : 'text-black'}`}
              numberOfLines={1}
            >
              {selectedOption?.value || placeholder}
            </Text>
            <AntDesign
              name="down"
              size={24}
              color={isActive ? '#F05C0C' : '#6B7280'}
            />
          </View>
        </Animated.View>
      </TouchableOpacity>

      {isDropdownOpen && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={handleClose}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <View className="flex-1 bg-black/50 justify-end">
              <TouchableOpacity
                className="flex-1"
                activeOpacity={1}
                onPress={handleClose}
              />
              <View className="bg-white rounded-t-2xl">
                {/* Header */}
                <View className="px-4 py-3 border-b border-gray-200">
                  <Text className="text-lg font-semibold text-gray-900 text-center">
                    {label}
                  </Text>
                </View>

                {/* Search Input */}
                <View className="p-4 border-b border-gray-200">
                  <TextInput
                    placeholder="Search..."
                    value={searchText}
                    onChangeText={setSearchText}
                    className={`${
                      Platform.OS === 'ios' && 'h-10'
                    } px-3 border border-gray-200 rounded`}
                  />
                </View>

                {/* Options List */}
                <ScrollView className="max-h-[300px]">
                  {filteredOptions.map(option => (
                    <TouchableOpacity
                      key={option.key}
                      className="px-4 py-3 border-b border-gray-200 flex-row items-center"
                      onPress={() => handleOptionSelect(option.key)}
                    >
                      <View className="w-5 h-5 border border-gray-300 rounded-full mr-3 items-center justify-center">
                        {value === option.key && (
                          <View className="w-3 h-3 bg-[#F05C0C] rounded-full" />
                        )}
                      </View>
                      <Text className="text-base flex-1">{option.value}</Text>
                    </TouchableOpacity>
                  ))}
                  {filteredOptions.length === 0 && (
                    <View className="px-4 py-8 items-center">
                      <Text className="text-gray-500">No options found</Text>
                    </View>
                  )}
                </ScrollView>

                {/* Footer */}
                <View className="p-4 pb-8 border-t border-gray-200 flex-row">
                  {value && (
                    <TouchableOpacity
                      className="flex-1 bg-gray-200 py-4 px-4 rounded-lg mr-2"
                      onPress={() => {
                        onValueChange?.('');
                        handleClose();
                      }}
                    >
                      <Text className="text-gray-700 text-center font-semibold text-base">
                        Clear
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    className="flex-1 bg-[#F05C0C] py-4 px-4 rounded-lg"
                    onPress={handleClose}
                  >
                    <Text className="text-white text-center font-semibold text-base">
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
};
