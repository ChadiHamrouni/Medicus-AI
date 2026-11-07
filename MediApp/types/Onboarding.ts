export interface FormFieldProps {
  label: string;
  value: string;
  required?: boolean;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  isDropdown?: boolean;
}

export interface DropdownProps {
  value: string;
  onPress: () => void;
  icon?: React.ReactNode;
}

export type WorkingHours = {
  startTime: string;
  endTime: string;
  locationId?: number; // Changed from locationIndex to locationId to match API
};

export type WeekSchedule = {
  [key: string]: {
    isWorking: boolean;
    hours: WorkingHours[];
  };
};

export type Procedure = {
  id: string;
  procedure_name: string;
  procedure_price: string;
};

export type OnboardingLocation = {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  zip_code: string;
  is_primary: boolean;
  location_name: string;
  latitude?: number;
  longitude?: number;
};

export type SocialLink = {
  id: string;
  platform: string;
  url: string;
};

export type ProfessionalInformationFormFieldKey =
  | 'subSpecialties'
  | 'practisingSince'
  | 'medicalSchool'
  | 'graduationYear'
  | 'fellowshipResidency'
  | 'fellowshipResidencyYear'
  | 'certifications'
  | 'professionalAffiliations';

export type PracticeInformationFormFieldKey =
  | 'first_name'
  | 'last_name'
  | 'prefix'
  | 'specialty'
  | 'country'
  | 'language'
  | 'licenseNumber'
  | 'whatsappNumber'
  | 'addressLine1'
  | 'addressLine2'
  | 'city'
  | 'state'
  | 'zipCode';
