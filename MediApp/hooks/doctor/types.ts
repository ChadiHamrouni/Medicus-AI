export interface ErrorState {
  type: 'NETWORK' | 'SERVER' | 'VALIDATION' | 'UNKNOWN';
  message: string;
  retryable: boolean;
  timestamp: Date;
  context: string;
}

export interface SuperCategory {
  id: number;
  name: string;
  description: string;
  icon?: string;
}

export interface Specialty {
  id: number;
  name: string;
}

export interface Country {
  id: number;
  name: string;
}

export interface Doctor {
  id: number;
  user_id?: number | null;
  name: string;
  first_name?: string;
  last_name?: string;
  prefix?: string;
  specialty_name?: string;
  specialty_id?: number;
  super_category_id?: number;
  country_name?: string;
  country_id?: number;
  language_id?: number;
  language_name?: string;
  gender?: string;
  email?: string | null;
  in_network: boolean;
  is_same_country?: boolean;
  search_mode?: 'local' | 'foreign';
  rating?: number;
  reviewCount?: number;
  phone?: string;
  address?: string;
}

export interface UseDoctorDiscoveryResult {
  // Category State
  selectedCategoryId: number | null;
  superCategories: SuperCategory[];
  loadingCategories: boolean;

  // Search State
  selectedSpecialty: Specialty | null;
  doctorName: string;
  specialties: Specialty[];
  specialtiesLoading: boolean;

  // International Search State (unused but kept for compatibility)
  selectedCountry: Country | null;
  countries: Country[];
  countriesLoading: boolean;

  // Results State
  inNetworkDoctors: Doctor[];
  outOfNetworkDoctors: Doctor[];
  showOutOfNetwork: boolean;
  hasMoreInNetwork: boolean;
  hasMoreOutOfNetwork: boolean;

  // Loading States
  searching: boolean;
  loadingOutOfNetwork: boolean;

  // Error States
  error: ErrorState | null;

  // UI State
  expandedDoctorId: string | null;

  // User Context
  userCountryName: string | null;

  // Actions
  handleCategorySelect: (categoryId: number) => void;
  handleSpecialtySelect: (specialty: Specialty | null) => void;
  handleDoctorNameChange: (name: string) => void;
  handleSearch: () => void;
  handleInternationalSearch: () => void;
  handleCountrySelect: (country: Country | null) => void;
  toggleOutOfNetwork: () => void;
  handleDoctorSelect: (doctor: Doctor) => void;
  loadMoreInNetwork: () => void;
  loadMoreOutOfNetwork: () => void;
  clearError: () => void;
  retryLastOperation: () => Promise<void>;
}
