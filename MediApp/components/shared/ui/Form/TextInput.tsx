import React from 'react';
import {
  Platform,
  TextInput as RNTextInput,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface IconProps {
  position: 'left' | 'right';
  component: React.ReactNode;
  onPress?: () => void;
}

interface TextInputProps {
  value: string;
  onChangeText: (_text: string) => void;
  placeholder?: string;
  label: string;
  isActive: boolean;
  labelStyle: any;
  onFocus?: () => void;
  onBlur?: () => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  className?: string;
  icon?: IconProps;
  multiline?: boolean;
  numberOfLines?: number;
  textAlignVertical?: 'auto' | 'top' | 'bottom' | 'center';
  errorMessage?: string;
  disabled?: boolean;
  autoComplete?: string;
  textContentType?: string;
  passwordRules?: string;
  autoCorrect?: boolean;
  editable?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  isActive,
  labelStyle,
  onFocus,
  onBlur,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  className = '',
  icon,
  multiline = false,
  numberOfLines = 1,
  textAlignVertical = 'auto',
  errorMessage,
  disabled = false,
  autoComplete,
  textContentType,
  passwordRules,
  autoCorrect,
}) => {
  const getBorderColor = () => {
    if (errorMessage) return '#EF4444';
    return isActive ? '#F05C0C' : '#D1D5DB';
  };

  const getLabelColor = () => {
    if (errorMessage) return '#EF4444';
    return isActive ? '#F05C0C' : '#6B7280';
  };

  const renderIcon = () => {
    if (!icon) return null;

    const IconWrapper = icon.onPress ? TouchableOpacity : View;
    const iconProps = icon.onPress ? { onPress: icon.onPress } : {};

    return (
      <IconWrapper
        className={`${icon.position === 'left' ? 'pl-4' : 'pr-4'}`}
        {...iconProps}
      >
        {icon.component}
      </IconWrapper>
    );
  };

  return (
    <View>
      <TouchableOpacity
        onPress={disabled ? undefined : onFocus}
        activeOpacity={disabled ? 1 : 0.8}
        disabled={disabled}
      >
        <View
          style={{
            borderWidth: 1,
            borderColor: getBorderColor(),
            borderRadius: 8,
            position: 'relative' as const,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Text
            style={[
              labelStyle,
              {
                color: getLabelColor(),
              },
            ]}
          >
            {label}
          </Text>
          <View className={`flex-row items-${multiline ? 'start' : 'center'}`}>
            {icon?.position === 'left' && renderIcon()}
            <RNTextInput
              value={value}
              onChangeText={disabled ? undefined : onChangeText}
              placeholder={placeholder}
              onFocus={disabled ? undefined : onFocus}
              onBlur={disabled ? undefined : onBlur}
              secureTextEntry={secureTextEntry}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              autoCorrect={autoCorrect}
              multiline={multiline}
              numberOfLines={numberOfLines}
              textAlignVertical={textAlignVertical}
              editable={!disabled}
              selectTextOnFocus={!disabled}
              autoComplete={autoComplete as any}
              textContentType={textContentType as any}
              passwordRules={passwordRules}
              className={`flex-1 text-base 
                                ${icon?.position === 'left' ? 'pl-2' : 'pl-4'}
                                ${icon?.position === 'right' ? 'pr-2' : 'pr-4'}
                                 ${className} ${
                                   Platform.OS === 'ios' &&
                                   (multiline ? 'h-32' : 'h-12') // To fix problem of the text on android
                                 }`}
            />
            {icon?.position === 'right' && renderIcon()}
          </View>
        </View>
      </TouchableOpacity>
      {errorMessage && (
        <Text
          style={{
            color: '#EF4444',
            fontSize: 12,
            marginTop: 4,
            marginLeft: 4,
          }}
        >
          {errorMessage}
        </Text>
      )}
    </View>
  );
};
