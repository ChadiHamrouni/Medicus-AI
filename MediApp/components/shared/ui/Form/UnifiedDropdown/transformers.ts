import { DropdownOption } from './UnifiedDropdown';

// Utility functions to transform data for the Dropdown

/**
 * Transform simple key-value pairs to DropdownOption format
 */
export const transformKeyValueOptions = (
  options: { key: string; value: string }[]
): DropdownOption[] => {
  return options.map(option => ({
    key: option.key,
    value: option.value,
    label: option.value,
  }));
};

/**
 * Transform specialty objects to DropdownOption format
 */
export const transformSpecialtyOptions = (
  specialties: { id: number; name: string; short_name?: string }[]
): DropdownOption[] => {
  return specialties.map(specialty => ({
    key: specialty.id.toString(),
    value: specialty.name,
    label: specialty.name,
    subtitle: specialty.short_name,
    metadata: { id: specialty.id, short_name: specialty.short_name },
  }));
};

/**
 * Transform country objects to DropdownOption format
 */
export const transformCountryOptions = (
  countries: {
    id: number;
    name: string;
    short_name?: string;
    code?: string;
    currency_symbol?: string;
  }[]
): DropdownOption[] => {
  return countries.map(country => ({
    key: country.id.toString(),
    value: country.name,
    label: country.name,
    subtitle: country.code
      ? `${country.code} • ${country.currency_symbol}`
      : undefined,
    metadata: {
      id: country.id,
      short_name: country.short_name,
      code: country.code,
      currency_symbol: country.currency_symbol,
    },
  }));
};

/**
 * Transform simple string arrays to DropdownOption format
 */
export const transformStringArrayOptions = (
  values: string[]
): DropdownOption[] => {
  return values.map(value => ({
    key: value,
    value: value,
    label: value,
  }));
};

/**
 * Transform prefix constants to DropdownOption format
 */
export const transformPrefixOptions = (
  prefixes: { key: string; value: string }[]
): DropdownOption[] => {
  return prefixes.map(prefix => ({
    key: prefix.key,
    value: prefix.value,
    label: prefix.value,
  }));
};

/**
 * Transform medical school objects to DropdownOption format
 */
export const transformMedicalSchoolOptions = (
  schools: { id: number; name: string; location?: string }[]
): DropdownOption[] => {
  return schools.map(school => ({
    key: school.id.toString(),
    value: school.name,
    label: school.name,
    subtitle: school.location,
    metadata: { id: school.id, location: school.location },
  }));
};

/**
 * Transform language objects to DropdownOption format
 */
export const transformLanguageOptions = (
  languages: { id: number; name: string; code?: string }[]
): DropdownOption[] => {
  return languages.map(language => ({
    key: language.id.toString(),
    value: language.name,
    label: language.name,
    subtitle: language.code,
    metadata: { id: language.id, code: language.code },
  }));
};

/**
 * Helper to get selected option metadata
 */
export const getSelectedOptionMetadata = (
  selectedKey: string,
  options: DropdownOption[]
) => {
  const option = options.find(opt => opt.key === selectedKey);
  return option?.metadata;
};

/**
 * Helper to get multiple selected options metadata
 */
export const getSelectedOptionsMetadata = (
  selectedKeys: string[],
  options: DropdownOption[]
) => {
  return selectedKeys.map(key => {
    const option = options.find(opt => opt.key === key);
    return { key, metadata: option?.metadata };
  });
};
