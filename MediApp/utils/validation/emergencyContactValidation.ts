import { countryCodes } from '@/components/shared/ui/Form/PhoneInput/countryCodes';

export interface EmergencyContactFormData {
  primaryName: string;
  primaryRelationship: string;
  primaryPhone: string;
  primaryCountryCode: string;
  primaryEmail: string;

  secondaryName: string;
  secondaryRelationship: string;
  secondaryPhone: string;
  secondaryCountryCode: string;
  secondaryEmail: string;
}

export interface EmergencyContactFormErrors {
  primaryName?: string;
  primaryRelationship?: string;
  primaryPhone?: string;
  primaryEmail?: string;
  secondaryName?: string;
  secondaryRelationship?: string;
  secondaryPhone?: string;
  secondaryEmail?: string;
}

export const emergencyContactValidationRules = {
  primaryName: {
    required: 'Primary contact full name is required',
    validate: (value: string) => {
      if (!value || value.trim() === '') {
        return 'Full name is required';
      }
      if (value.length < 2) {
        return 'Full name must be at least 2 characters';
      }
      if (value.length > 100) {
        return 'Full name cannot exceed 100 characters';
      }
      if (!/^[a-zA-Z\s'-]+$/.test(value)) {
        return 'Full name can only contain letters, spaces, hyphens, and apostrophes';
      }
      // Check that it contains at least two words (first and last name)
      if (value.trim().split(/\s+/).length < 2) {
        return 'Please enter both first and last name';
      }
      return true;
    },
  },
  primaryRelationship: {
    required: 'Relationship is required',
  },
  primaryEmail: {
    validate: (value: string) => {
      // Optional field - only validate if provided
      if (!value || value.trim() === '') {
        return true; // Allow empty for optional field
      }
      if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
        return 'Please enter a valid email address';
      }
      return true;
    },
  },

  secondaryName: {
    required: 'Secondary contact full name is required',
    validate: (value: string) => {
      if (!value || value.trim() === '') {
        return 'Full name is required';
      }
      if (value.length < 2) {
        return 'Full name must be at least 2 characters';
      }
      if (value.length > 100) {
        return 'Full name cannot exceed 100 characters';
      }
      if (!/^[a-zA-Z\s'-]+$/.test(value)) {
        return 'Full name can only contain letters, spaces, hyphens, and apostrophes';
      }
      // Check that it contains at least two words (first and last name)
      if (value.trim().split(/\s+/).length < 2) {
        return 'Please enter both first and last name';
      }
      return true;
    },
  },
  secondaryEmail: {
    validate: (value: string) => {
      // Optional field - only validate if provided
      if (!value || value.trim() === '') {
        return true; // Allow empty for optional field
      }
      if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
        return 'Please enter a valid email address';
      }
      return true;
    },
  },
  secondaryRelationship: {
    required: 'Relationship is required',
  },
};

export const defaultEmergencyContactFormValues: EmergencyContactFormData = {
  primaryName: '',
  primaryRelationship: '',
  primaryPhone: '',
  primaryCountryCode: 'US',
  primaryEmail: '',
  secondaryName: '',
  secondaryRelationship: '',
  secondaryPhone: '',
  secondaryCountryCode: 'US',
  secondaryEmail: '',
};

export const getPrimaryPhoneValidation = (countryCode: string) => ({
  required: 'Primary contact phone number is required',
  validate: (value: string) => {
    if (!value || value.trim().length === 0) {
      return 'Phone number is required';
    }
    const cleaned = value.replace(/\D/g, '');
    const selectedCountry =
      countryCodes.find(c => c.code === countryCode) || countryCodes[0];
    const mask = selectedCountry.mask;
    const requiredDigits = mask ? (mask.match(/#/g) || []).length : 10;

    if (cleaned.length < requiredDigits) {
      return `Phone number must be ${requiredDigits} digits for ${selectedCountry.name}`;
    }
    return true;
  },
});

export const getSecondaryPhoneValidation = (countryCode: string) => ({
  required: 'Secondary contact phone number is required',
  validate: (value: string) => {
    if (!value || value.trim().length === 0) {
      return 'Phone number is required';
    }
    const cleaned = value.replace(/\D/g, '');
    const selectedCountry =
      countryCodes.find(c => c.code === countryCode) || countryCodes[0];
    const mask = selectedCountry.mask;
    const requiredDigits = mask ? (mask.match(/#/g) || []).length : 10;

    if (cleaned.length < requiredDigits) {
      return `Phone number must be ${requiredDigits} digits for ${selectedCountry.name}`;
    }
    return true;
  },
});
