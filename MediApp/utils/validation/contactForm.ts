export interface ContactFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  country_name?: string; // Denormalized for immediate display
}

export interface ContactFormErrors {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country: string;
}

export const validationRules = {
  firstName: {
    required: 'First name is required',
    minLength: {
      value: 2,
      message: 'First name must be at least 2 characters',
    },
    maxLength: {
      value: 50,
      message: 'First name cannot exceed 50 characters',
    },
    pattern: {
      value: /^[a-zA-Z\s'-]+$/,
      message:
        'First name can only contain letters, spaces, hyphens, and apostrophes',
    },
  },
  lastName: {
    required: 'Last name is required',
    minLength: {
      value: 2,
      message: 'Last name must be at least 2 characters',
    },
    maxLength: {
      value: 50,
      message: 'Last name cannot exceed 50 characters',
    },
    pattern: {
      value: /^[a-zA-Z\s'-]+$/,
      message:
        'Last name can only contain letters, spaces, hyphens, and apostrophes',
    },
  },
  dateOfBirth: {
    required: 'Date of birth is required',
    validate: {
      isValidDate: (value: string) => {
        if (!value) return true;
        const date = new Date(value);
        const now = new Date();
        const minAge = new Date(
          now.getFullYear() - 120,
          now.getMonth(),
          now.getDate()
        );

        if (isNaN(date.getTime())) {
          return 'Please enter a valid date';
        }
        if (date > now) {
          return 'Date of birth cannot be in the future';
        }
        if (date < minAge) {
          return 'Please enter a valid date of birth';
        }
        return true;
      },
    },
  },
  gender: {
    required: 'Gender is required',
  },
  address: {
    required: 'Street address is required',
    minLength: {
      value: 5,
      message: 'Address must be at least 5 characters',
    },
    maxLength: {
      value: 100,
      message: 'Address cannot exceed 100 characters',
    },
  },
  city: {
    required: 'City is required',
    minLength: {
      value: 2,
      message: 'City must be at least 2 characters',
    },
    maxLength: {
      value: 50,
      message: 'City cannot exceed 50 characters',
    },
    pattern: {
      value: /^[a-zA-Z\s'-]+$/,
      message:
        'City can only contain letters, spaces, hyphens, and apostrophes',
    },
  },
  state: {
    required: 'State is required',
    minLength: {
      value: 2,
      message: 'State must be at least 2 characters',
    },
    maxLength: {
      value: 50,
      message: 'State cannot exceed 50 characters',
    },
  },
   zipCode: {
     required: 'ZIP code is required',
     pattern: {
       value: /^\d{5}(-\d{4})?$/,
       message: 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)',
     },
   },
   country: {
     required: 'Country is required',
   },
 };

export const defaultContactFormValues: ContactFormData = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
};

// Gender options based on the enum - matching PersonalDetailsForm format
export const genderOptions = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'UNDISCLOSED', label: 'Prefer not to say' },
];

export const getGenderLabel = (value: string) => {
  const option = genderOptions.find(opt => opt.value === value);
  return option ? option.label : value;
};

export const formatDateDisplay = (dateString: string) => {
  if (!dateString) return 'Not provided';
  return new Date(dateString).toLocaleDateString();
};
