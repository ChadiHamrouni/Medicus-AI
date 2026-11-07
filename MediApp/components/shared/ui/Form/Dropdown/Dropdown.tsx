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

interface CustomDropdownProps {
  field: string;
  value: string;
  options?: { key: string; value: string }[];
  // eslint-disable-next-line no-unused-vars
  onValueChange?: (value: string) => void;
  label: string;
  isActive: boolean;
  borderColor: Animated.AnimatedInterpolation<string | number>;
  labelStyle: any;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const Dropdown: React.FC<CustomDropdownProps> = ({
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
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const filteredOptions = (options || []).filter(option =>
    option.value.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleOptionSelect = (optionValue: string) => {
    setSelectedOptions(prev => {
      if (prev.includes(optionValue)) {
        return prev.filter(v => v !== optionValue);
      } else {
        return [...prev, optionValue];
      }
    });
  };

  const handleClose = () => {
    setIsDropdownOpen(false);
    setSearchText('');
    if (selectedOptions.length > 0) {
      onValueChange?.(selectedOptions.join(', '));
    }
    onBlur?.();
  };

  return (
    <View>
      <TouchableOpacity
        onPress={() => {
          setIsDropdownOpen(true);
          setSelectedOptions(value ? value.split(', ').filter(Boolean) : []);
          onFocus?.();
        }}
      >
        <Animated.View
          style={{
            borderWidth: 1,
            borderColor: isActive ? '#F05C0C' : borderColor,
            borderRadius: 8,
            position: 'relative' as const,
          }}
        >
          <Animated.Text
            style={[labelStyle, { color: isActive ? '#F05C0C' : '#6B7280' }]}
          >
            {label}
          </Animated.Text>
          <View className="flex-row items-center justify-between px-4 h-12">
            <Text className="text-base" numberOfLines={1}>
              {value || 'Select options'}
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
              <View className="bg-white rounded-t-2xl max-h-[70%]">
                {/* Header */}
                <View className="px-4 py-3 border-b border-gray-200">
                  <Text className="text-lg font-semibold text-gray-900 text-center">
                    {label}
                  </Text>
                </View>

                {/* Search */}
                <View className="p-4 border-b border-gray-100">
                  <TextInput
                    placeholder="Search options..."
                    value={searchText}
                    onChangeText={setSearchText}
                    className="px-4 py-3 border border-gray-200 rounded-lg bg-gray-50"
                    style={{ fontSize: 16 }}
                  />
                </View>

                {/* Options List */}
                <ScrollView className="flex-1">
                  {filteredOptions.map((option, index) => (
                    <TouchableOpacity
                      key={option.key}
                      className={`px-4 py-4 flex-row items-center ${
                        index !== filteredOptions.length - 1
                          ? 'border-b border-gray-100'
                          : ''
                      }`}
                      onPress={() => handleOptionSelect(option.value)}
                      activeOpacity={0.7}
                    >
                      <View
                        className={`w-6 h-6 border-2 rounded mr-3 items-center justify-center ${
                          selectedOptions.includes(option.value)
                            ? 'bg-[#F05C0C] border-[#F05C0C]'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedOptions.includes(option.value) && (
                          <AntDesign name="check" size={16} color="white" />
                        )}
                      </View>
                      <Text className="text-base flex-1 text-gray-900">
                        {option.value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {filteredOptions.length === 0 && (
                    <View className="px-4 py-8 items-center">
                      <Text className="text-gray-500 text-center">
                        No options found
                      </Text>
                    </View>
                  )}
                </ScrollView>

                {/* Footer */}
                <View className="p-4 pb-8 border-t border-gray-200">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-sm text-gray-600">
                      {selectedOptions.length} selected
                    </Text>
                    {selectedOptions.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setSelectedOptions([])}
                        className="px-3 py-1"
                      >
                        <Text className="text-[#F05C0C] text-sm font-medium">
                          Clear All
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity
                    className="bg-[#F05C0C] py-4 px-4 rounded-lg"
                    onPress={handleClose}
                    activeOpacity={0.8}
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
