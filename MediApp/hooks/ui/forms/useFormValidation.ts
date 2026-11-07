import { useCallback, useState } from 'react';
import {
  validateEmail,
  validateOptionalEmail,
  validatePassword,
} from '@/utils/validation';

interface ValidationRules<T extends string> {
  [key: string]: (value: string, formData?: Record<T, string>) => string | null;
}

export interface FormValidationReturn<T extends string> {
  formData: Record<T, string>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  setFormData: React.Dispatch<React.SetStateAction<Record<T, string>>>;
  handleInputChange: (field: T, value: string) => void;
  handleBlur: (field: T) => void;
  validateForm: () => boolean;
  validateField: (field: T) => string | null;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  resetForm: (data?: Record<T, string>) => void;
  isValid: boolean;
  isDirty: boolean;
}

export const useFormValidation = <T extends string>(
  initialData: Record<T, string>,
  validationRules: ValidationRules<T>
): FormValidationReturn<T> => {
  const [formData, setFormData] = useState<Record<T, string>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleInputChange = useCallback(
    (field: T, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      // Clear error when user types
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    },
    [errors]
  );

  const handleBlur = useCallback(
    (field: T) => {
      setTouched(prev => ({ ...prev, [field]: true }));

      // Validate field on blur if it has been touched
      if (validationRules[field]) {
        const errorMessage = validationRules[field](formData[field], formData);
        if (errorMessage) {
          setErrors(prev => ({ ...prev, [field]: errorMessage }));
        }
      }
    },
    [formData, validationRules]
  );

  const validateField = useCallback(
    (field: T): string | null => {
      if (!validationRules[field]) return null;

      const errorMessage = validationRules[field](formData[field], formData);
      return errorMessage;
    },
    [formData, validationRules]
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    Object.keys(validationRules).forEach(field => {
      newTouched[field] = true;
      const error = validateField(field as T);
      if (error) {
        newErrors[field] = error;
      }
    });

    setTouched(newTouched);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [validateField, validationRules]);

  const resetForm = useCallback(
    (data?: Record<T, string>) => {
      setFormData(data || initialData);
      setErrors({});
      setTouched({});
    },
    [initialData]
  );

  const isValid = Object.keys(errors).length === 0;
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  return {
    formData,
    errors,
    touched,
    setFormData,
    handleInputChange,
    handleBlur,
    validateForm,
    validateField,
    setErrors,
    setTouched,
    resetForm,
    isValid,
    isDirty,
  };
};

// Phone validation patterns for different countries
const phonePatterns: Record<string, { pattern: RegExp; example: string }> = {
  // North America
  US: {
    pattern: /^[2-9]\d{2}[2-9]\d{2}\d{4}$/,
    example: '10-digit number (e.g., 2125551234)',
  },
  CA: {
    pattern: /^[2-9]\d{2}[2-9]\d{2}\d{4}$/,
    example: '10-digit number (e.g., 4165551234)',
  },

  // Europe
  GB: {
    pattern: /^(0?7\d{9}|[1-6]\d{9})$/,
    example: '10-11 digits (e.g., 7911123456)',
  },
  DE: {
    pattern: /^(1[567]\d{8}|[2-9]\d{10})$/,
    example: '10-11 digits (e.g., 15123456789)',
  },
  FR: {
    pattern: /^(0?[67]\d{8})$/,
    example: '9-10 digits (e.g., 612345678)',
  },
  IT: {
    pattern: /^(3\d{8,9})$/,
    example: '9-10 digits (e.g., 3123456789)',
  },
  ES: {
    pattern: /^(6\d{8}|7[1-9]\d{7})$/,
    example: '9 digits (e.g., 612345678)',
  },

  // Asia
  IN: {
    pattern: /^[6-9]\d{9}$/,
    example: '10 digits (e.g., 9123456789)',
  },
  CN: {
    pattern: /^1[3-9]\d{9}$/,
    example: '11 digits (e.g., 13123456789)',
  },
  JP: {
    pattern: /^(070|080|090)\d{8}$/,
    example: '11 digits (e.g., 07012345678)',
  },

  // Default pattern for other countries
  DEFAULT: {
    pattern: /^\d{7,15}$/,
    example: '7-15 digits',
  },
};

// Function to validate phone number based on country code
const validatePhoneForCountry = (
  phoneNumber: string,
  countryCode: string
): string | null => {
  if (!phoneNumber) return 'Phone number is required';

  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');

  // Get the validation pattern for the country or use default
  const validation = phonePatterns[countryCode] || phonePatterns.DEFAULT;

  if (!validation.pattern.test(digitsOnly)) {
    return `Please enter a valid phone number: ${validation.example}`;
  }

  return null;
};

// Common validation rules
export const commonValidationRules = {
  email: validateEmail,

  // Phone validation that takes country code into account
  phone: (value: string, formData?: Record<string, string>) => {
    const countryCode = formData?.countryCode || 'US'; // Default to US if not specified
    return validatePhoneForCountry(value, countryCode);
  },

  password: validatePassword,

  confirmPassword: (value: string, formData?: Record<string, string>) => {
    if (!value) return 'Confirm password is required';
    if (formData && value !== formData.password)
      return 'Passwords do not match';
    return null;
  },

  optionalEmail: validateOptionalEmail,

  optionalPhone: (value: string, formData?: Record<string, string>) => {
    if (value) {
      const countryCode = formData?.countryCode || 'US'; // Default to US if not specified
      return validatePhoneForCountry(value, countryCode);
    }
    return null;
  },
};
