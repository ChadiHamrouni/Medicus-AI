import React, { useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';

interface SimpleFormFieldProps {
  label: string;
  value: string;
  onChangeText: (_text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
  disabled?: boolean;
  noMargin?: boolean; // For flex-row layouts
}

export const SimpleFormField: React.FC<SimpleFormFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  multiline = false,
  numberOfLines = 1,
  disabled = false,
  noMargin = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={`relative ${noMargin ? '' : 'mb-4'}`}>
      <View
        className={`border rounded-lg bg-white ${
          isFocused ? 'border-[#F05C0C]' : 'border-gray-300'
        } ${disabled ? 'opacity-50' : ''}`}
        style={{
          borderWidth: 1,
          borderRadius: 8,
        }}
      >
        {/* Contour Label */}
        <Text
          className={`absolute -top-2 left-4 px-1 text-xs bg-white ${
            isFocused ? 'text-[#F05C0C]' : 'text-gray-600'
          }`}
          style={{
            position: 'absolute',
            top: -8,
            left: 16,
            paddingHorizontal: 4,
            fontSize: 12,
            backgroundColor: 'white',
          }}
        >
          {label}
        </Text>

        {/* Input */}
        <TextInput
          value={value}
          onChangeText={disabled ? undefined : onChangeText}
          placeholder={placeholder}
          onFocus={disabled ? undefined : () => setIsFocused(true)}
          onBlur={disabled ? undefined : () => setIsFocused(false)}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={!disabled}
          selectTextOnFocus={!disabled}
          className={`text-base px-4 ${
            multiline ? 'py-4' : Platform.OS === 'ios' ? 'py-3' : 'py-2'
          }`}
          style={{
            minHeight: multiline ? 80 : Platform.OS === 'ios' ? 44 : 40,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
        />
      </View>
    </View>
  );
};
