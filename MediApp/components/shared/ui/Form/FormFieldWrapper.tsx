import React from 'react';
import { DatePicker } from './DatePicker/DatePicker';
import { TextInput } from './TextInput';
import { PhoneInput } from './PhoneInput/PhoneInput';
import { TimePicker } from './TimePicker/TimePicker';
import { transformKeyValueOptions, UnifiedDropdown } from './UnifiedDropdown';

interface BaseFieldProps {
  field: string;
  value: string | string[];
  label: string;
  isActive: boolean;
  borderColor: any;
  labelStyle: any;
  onFocus: () => void;
  onBlur: () => void;
  errorMessage?: string;
  backgroundColor?: string;
}

interface TextFieldProps extends BaseFieldProps {
  type: 'text';
  onChangeText: (_text: string) => void;
  placeholder?: string;
  icon?: {
    position: 'left' | 'right';
    component: React.ReactNode;
    onPress?: () => void;
  };
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
  textAlignVertical?: 'auto' | 'top' | 'bottom' | 'center';
  disabled?: boolean;
  autoComplete?: string;
  textContentType?: string;
  passwordRules?: string;
  autoCorrect?: boolean;
  editable?: boolean;
}

interface PhoneFieldProps extends BaseFieldProps {
  type: 'phone';
  onChangeText: (_text: string) => void;
  onChangeCountry: (_countryCode: string) => void;
  selectedCountryCode: string;
}

interface DropdownFieldProps extends BaseFieldProps {
  type: 'dropdown';
  options?: { key: string; value: string }[];
  onValueChange?: (_value: string | string[]) => void;
  placeholder?: string;
  multiSelect?: boolean;
}
interface SingleDropdownFieldProps extends BaseFieldProps {
  type: 'singleDropdown';
  options?: { key: string; value: string }[];
  onValueChange?: (_value: string) => void;
  searchable?: boolean;
  placeholder?: string;
}

interface DateFieldProps extends BaseFieldProps {
  type: 'date';
  onChange: (_date: string) => void;
  dateFormat?: 'full' | 'year-month' | 'year';
}

interface TimeFieldProps extends BaseFieldProps {
  type: 'time';
  onChange: (_time: string) => void;
}

type FormFieldProps =
  | DropdownFieldProps
  | DateFieldProps
  | TimeFieldProps
  | TextFieldProps
  | PhoneFieldProps
  | SingleDropdownFieldProps;

const FormFieldWrapper: React.FC<FormFieldProps> = props => {
  const {
    value,
    label,
    isActive,
    borderColor,
    labelStyle,
    onFocus,
    onBlur,
    errorMessage,
    backgroundColor = '#F9FAFB',
  } = props;

  if (props.type === 'dropdown') {
    return (
      <UnifiedDropdown
        value={value}
        onValueChange={newValue => {
          // For multiselect dropdowns, pass the array directly
          if (Array.isArray(newValue)) {
            props.onValueChange?.(newValue);
          } else if (typeof newValue === 'string') {
            props.onValueChange?.(newValue);
          }
        }}
        options={transformKeyValueOptions(props.options || [])}
        label={label}
        placeholder={props.placeholder}
        primaryColor={isActive ? '#F05C0C' : '#6B7280'}
        backgroundColor={backgroundColor}
        onFocus={onFocus}
        onBlur={onBlur}
        multiSelect={props.multiSelect ?? true}
        searchable={true}
        clearable={true}
        modalType="bottom-sheet"
      />
    );
  }

  if (props.type === 'singleDropdown') {
    return (
      <UnifiedDropdown
        value={value}
        onValueChange={newValue => {
          if (typeof newValue === 'string') {
            props.onValueChange?.(newValue);
          }
        }}
        options={transformKeyValueOptions(props.options || [])}
        label={label}
        placeholder={props.placeholder}
        primaryColor={isActive ? '#F05C0C' : '#6B7280'}
        backgroundColor={backgroundColor}
        onFocus={onFocus}
        onBlur={onBlur}
        multiSelect={false}
        searchable={props.searchable ?? true}
        clearable={true}
        modalType="bottom-sheet"
        error={errorMessage}
      />
    );
  }

  if (props.type === 'date') {
    return (
      <DatePicker
        value={Array.isArray(value) ? '' : value}
        label={label}
        isActive={isActive}
        borderColor={borderColor}
        labelStyle={labelStyle}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={props.onChange}
        dateFormat={props.dateFormat}
        errorMessage={errorMessage}
      />
    );
  }

  if (props.type === 'time') {
    return (
      <TimePicker
        value={Array.isArray(value) ? '' : value}
        label={label}
        isActive={isActive}
        borderColor={borderColor}
        labelStyle={labelStyle}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={props.onChange}
      />
    );
  }

  if (props.type === 'phone') {
    return (
      <PhoneInput
        value={Array.isArray(value) ? '' : value}
        onChangeText={props.onChangeText}
        onChangeCountry={props.onChangeCountry}
        label={label}
        isActive={isActive}
        borderColor={borderColor}
        labelStyle={labelStyle}
        onFocus={onFocus}
        onBlur={onBlur}
        errorMessage={errorMessage}
        selectedCountryCode={props.selectedCountryCode}
      />
    );
  }

  return (
    <TextInput
      value={Array.isArray(value) ? '' : value}
      onChangeText={props.onChangeText}
      placeholder={props.placeholder}
      label={label}
      isActive={isActive}
      labelStyle={labelStyle}
      onFocus={onFocus}
      onBlur={onBlur}
      icon={props.icon}
      secureTextEntry={props.secureTextEntry}
      keyboardType={props.keyboardType}
      autoCapitalize={props.autoCapitalize}
      multiline={props.multiline}
      numberOfLines={props.numberOfLines}
      textAlignVertical={props.textAlignVertical}
      errorMessage={errorMessage}
      disabled={props.disabled}
      autoComplete={props.autoComplete}
      textContentType={props.textContentType}
      passwordRules={props.passwordRules}
      autoCorrect={props.autoCorrect}
      editable={props.editable}
    />
  );
};

export { FormFieldWrapper };
