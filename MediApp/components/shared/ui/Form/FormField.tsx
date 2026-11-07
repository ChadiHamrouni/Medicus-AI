import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useAnimatedFormField } from '@/hooks/ui/forms';
import { FormFieldWrapper } from './FormFieldWrapper';

interface BaseFormFieldProps {
  field: string;
  label: string;
  value: string | string[];
  error?: string;
  touched?: boolean;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  containerClassName?: string;
  showErrorOnlyWhenTouched?: boolean;
  backgroundColor?: string;
}

interface TextFormFieldProps extends BaseFormFieldProps {
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
  autoComplete?: string;
  textContentType?: string;
  passwordRules?: string;
  autoCorrect?: boolean;
  editable?: boolean;
}

interface PhoneFormFieldProps extends BaseFormFieldProps {
  type: 'phone';
  onChangeText: (_text: string) => void;
  onChangeCountry: (_countryCode: string) => void;
  selectedCountryCode: string;
}

interface DropdownFormFieldProps extends BaseFormFieldProps {
  type: 'dropdown';
  options?: { key: string; value: string }[];
  onValueChange?: (_value: string | string[]) => void;
  placeholder?: string;
  multiSelect?: boolean;
}

interface SingleDropdownFormFieldProps extends BaseFormFieldProps {
  type: 'singleDropdown';
  options?: { key: string; value: string }[];
  onValueChange?: (_value: string) => void;
  searchable?: boolean;
  placeholder?: string;
}

interface DateFormFieldProps extends BaseFormFieldProps {
  type: 'date';
  onChange: (_date: string) => void;
  dateFormat?: 'full' | 'year-month' | 'year';
}

interface TimeFormFieldProps extends BaseFormFieldProps {
  type: 'time';
  onChange: (_time: string) => void;
}

type FormFieldProps =
  | TextFormFieldProps
  | PhoneFormFieldProps
  | DropdownFormFieldProps
  | SingleDropdownFormFieldProps
  | DateFormFieldProps
  | TimeFormFieldProps;

export const FormField: React.FC<FormFieldProps> = props => {
  const {
    field,
    error,
    touched,
    showErrorOnlyWhenTouched = true,
    containerClassName,
    onFocus: externalOnFocus,
    onBlur: externalOnBlur,
    backgroundColor = '#F9FAFB',
    ...restProps
  } = props;

  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus: internalHandleFocus,
    handleBlur: internalHandleBlur,
  } = useAnimatedFormField([field], backgroundColor);

  const handleFocus = useCallback(() => {
    internalHandleFocus(field);
    externalOnFocus?.();
  }, [field, internalHandleFocus, externalOnFocus]);

  const handleBlur = useCallback(() => {
    internalHandleBlur(field);
    externalOnBlur?.();
  }, [field, internalHandleBlur, externalOnBlur]);

  const isActive = selectedInput === field;
  const shouldShowError = showErrorOnlyWhenTouched ? touched && error : error;
  const borderColor = shouldShowError ? '#EF4444' : getBorderColor(field);

  return (
    <View className={containerClassName}>
      <FormFieldWrapper
        {...(restProps as any)}
        field={field}
        isActive={isActive}
        borderColor={borderColor}
        labelStyle={getLabelStyle(field)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        errorMessage={shouldShowError}
        backgroundColor={backgroundColor}
      />
    </View>
  );
};
