import { FormField } from '@/components/shared/ui/Form/FormField';
import { FormFieldWrapper } from '@/components/shared/ui/Form/FormFieldWrapper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';

interface NewPasswordFieldProps {
  field: string;
  value: string;
  label: string;
  placeholder?: string;
  onChangeText: (_text: string) => void;
  error?: string;
  touched?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  containerClassName?: string;
  backgroundColor?: string;
}

interface LegacyPasswordFieldProps {
  field: string;
  value: string;
  label: string;
  placeholder?: string;
  isActive: boolean;
  borderColor: any;
  labelStyle: any;
  onFocus: () => void;
  onBlur: () => void;
  onChangeText: (_text: string) => void;
  errorMessage?: string;
}

type PasswordFieldProps = NewPasswordFieldProps | LegacyPasswordFieldProps;

function isLegacyProps(
  props: PasswordFieldProps
): props is LegacyPasswordFieldProps {
  return 'isActive' in props && 'borderColor' in props && 'labelStyle' in props;
}

export const PasswordField: React.FC<PasswordFieldProps> = props => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const passwordIcon = {
    position: 'right' as const,
    component: (
      <MaterialCommunityIcons
        name={showPassword ? 'eye-off' : 'eye'}
        size={24}
        color="#6B7280"
      />
    ),
    onPress: togglePasswordVisibility,
  };

  if (isLegacyProps(props)) {
    return (
      <FormFieldWrapper
        type="text"
        field={props.field}
        value={props.value}
        label={props.label}
        placeholder={props.placeholder}
        isActive={props.isActive}
        borderColor={props.borderColor}
        labelStyle={props.labelStyle}
        onFocus={props.onFocus}
        onBlur={props.onBlur}
        onChangeText={props.onChangeText}
        icon={passwordIcon}
        secureTextEntry={!showPassword}
        errorMessage={props.errorMessage}
        autoComplete="off"
        textContentType="none"
        passwordRules=""
      />
    );
  }

  // New mode - use FormField
  return (
    <FormField
      type="text"
      field={props.field}
      value={props.value}
      label={props.label}
      placeholder={props.placeholder}
      onChangeText={props.onChangeText}
      error={props.error}
      touched={props.touched}
      onBlur={props.onBlur}
      onFocus={props.onFocus}
      icon={passwordIcon}
      secureTextEntry={!showPassword}
      autoComplete="off"
      textContentType="none"
      passwordRules=""
      containerClassName={props.containerClassName}
      backgroundColor={props.backgroundColor}
    />
  );
};
