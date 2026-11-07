import type { Language } from '@/types';
import AntDesign from '@expo/vector-icons/AntDesign';
import React, { useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface LanguageDropdownProps {
  value: string;
  languages?: Language[];
  onValueChange?: (_value: string, _languageId: string) => void;
  label: string;
  isActive: boolean;
  borderColor: Animated.AnimatedInterpolation<string | number>;
  labelStyle: any;
  onFocus?: () => void;
  onBlur?: () => void;
  isLoading?: boolean;
}

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  value,
  languages = [],
  onValueChange,
  label,
  isActive,
  borderColor,
  labelStyle,
  onFocus,
  onBlur,
  isLoading = false,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleDropdownPress = () => {
    if (isLoading) return;
    setIsDropdownOpen(true);
    onFocus?.();
  };

  const handleClose = () => {
    setIsDropdownOpen(false);
    onBlur?.();
  };

  const handleOptionSelect = (language: Language) => {
    onValueChange?.(language.name, language.id.toString());
    handleClose();
  };

  return (
    <View>
      <Animated.View
        style={{ borderColor: isActive ? borderColor : '#E5E7EB' }}
        className={`relative border rounded-lg ${
          isLoading ? 'opacity-50' : ''
        }`}
      >
        <TouchableOpacity
          onPress={handleDropdownPress}
          disabled={isLoading}
          className="p-3"
        >
          <Animated.Text
            style={labelStyle}
            className={`absolute left-3 top-0 bg-white px-1 text-sm ${
              isActive ? 'text-[#F05C0C]' : 'text-gray-500'
            }`}
          >
            {label}
          </Animated.Text>

          <View className="flex-row justify-between items-center pt-2">
            <Text
              className={`text-base ${value ? 'text-black' : 'text-gray-400'}`}
            >
              {isLoading ? 'Loading languages...' : value || 'Select language'}
            </Text>
            <AntDesign
              name={isDropdownOpen ? 'up' : 'down'}
              size={16}
              color="#9CA3AF"
            />
          </View>
        </TouchableOpacity>
      </Animated.View>

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
            <View className="flex-1 bg-black/50">
              <TouchableOpacity
                className="flex-1"
                activeOpacity={1}
                onPress={handleClose}
              />
              <View className="bg-white rounded-lg mx-4 mb-4">
                <View className="p-4 border-b border-gray-200">
                  <Text className="text-lg font-semibold text-center">
                    Select Language
                  </Text>
                </View>

                <ScrollView className="max-h-[400px]">
                  {languages.length === 0 ? (
                    <View className="p-4">
                      <Text className="text-center text-gray-500">
                        No languages available
                      </Text>
                    </View>
                  ) : (
                    languages.map(language => (
                      <TouchableOpacity
                        key={language.id}
                        className="px-4 py-3 border-b border-gray-100 flex-row items-center justify-between"
                        onPress={() => handleOptionSelect(language)}
                      >
                        <View className="flex-1">
                          <Text className="text-base font-medium text-gray-900">
                            {language.name}
                          </Text>
                          <Text className="text-sm text-gray-500 mt-1">
                            {language.code}
                          </Text>
                        </View>

                        {value === language.name && (
                          <AntDesign name="check" size={16} color="#F05C0C" />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>

                <View className="p-3 border-t border-gray-200">
                  <TouchableOpacity
                    className="bg-gray-100 py-2 px-4 rounded"
                    onPress={handleClose}
                  >
                    <Text className="text-gray-700 text-center font-medium">
                      Cancel
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
