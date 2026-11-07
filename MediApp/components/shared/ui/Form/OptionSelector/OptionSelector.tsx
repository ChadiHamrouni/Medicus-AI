import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export interface Option {
  key: string;
  value: string;
}

interface OptionSelectorProps {
  selectedOption: string | string[];
  onSelect: (_option: string) => void;
  options: Option[];
  containerClassName?: string;
  buttonClassName?: string;
  textClassName?: string;
  activeButtonClassName?: string;
  inactiveButtonClassName?: string;
  activeTextClassName?: string;
  inactiveTextClassName?: string;
  multiple?: boolean;
  readOnly?: boolean;
}

export const OptionSelector: React.FC<OptionSelectorProps> = ({
  selectedOption,
  onSelect,
  options,
  containerClassName = '',
  buttonClassName = '',
  textClassName = '',
  activeButtonClassName = 'border-2 border-[#F05C0C]',
  inactiveButtonClassName = 'border-2 border-gray-300',
  activeTextClassName = 'text-[#F05C0C]',
  inactiveTextClassName = 'text-gray-700',
  multiple = false,
  readOnly = false,
}) => {
  const isSelected = (key: string) => {
    if (multiple) {
      return (selectedOption as string[]).includes(key);
    }
    return selectedOption === key;
  };

  // In readOnly mode, only show selected options
  const displayOptions = readOnly
    ? options.filter(option => isSelected(option.key))
    : options;

  // Show placeholder if readOnly and nothing selected
  if (readOnly && displayOptions.length === 0) {
    return (
      <View className={`flex-row flex-wrap ${containerClassName}`}>
        <Text className="text-gray-400 text-sm">Not specified</Text>
      </View>
    );
  }

  return (
    <View className={`flex-row flex-wrap ${containerClassName}`}>
      {displayOptions.map(option => (
        readOnly ? (
          // Read-only mode: plain text without borders
          <View
            key={option.key}
            className={`px-3 py-1.5 mr-2 mb-2 ${buttonClassName}`}
          >
            <Text className={`font-medium text-gray-900 ${textClassName}`}>
              {option.value}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            key={option.key}
            onPress={() => onSelect(option.key)}
            className={`px-3 py-1.5 mr-2 mb-2 rounded-full ${
              isSelected(option.key)
                ? activeButtonClassName
                : inactiveButtonClassName
            } ${buttonClassName}`}
            activeOpacity={0.7}
          >
            <Text
              className={`font-medium ${
                isSelected(option.key)
                  ? activeTextClassName
                  : inactiveTextClassName
              } ${textClassName}`}
            >
              {option.value}
            </Text>
          </TouchableOpacity>
        )
      ))}
    </View>
  );
};
