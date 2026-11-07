import type { Specialty } from '@/types';
import React, { useMemo } from 'react';
import { DropdownOption, UnifiedDropdown } from '../UnifiedDropdown';

interface SpecialtyDropdownProps {
  value: string;
  selectedId?: string;
  specialties?: Specialty[];
  onValueChange?: (_value: string, _specialtyId: string) => void;
  label: string;
  onFocus?: () => void;
  onBlur?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  error?: string;
  backgroundColor?: string;
}

export const SpecialtyDropdown: React.FC<SpecialtyDropdownProps> = ({
  value,
  selectedId,
  specialties = [],
  onValueChange,
  label,
  onFocus,
  onBlur,
  isLoading = false,
  disabled = false,
  error,
  backgroundColor,
}) => {
  const options: DropdownOption[] = useMemo(() => {
    return specialties.map(specialty => ({
      key: specialty.id.toString(),
      value: specialty.name,
      label: specialty.name,
      description: specialty.short_name,
      metadata: specialty,
    }));
  }, [specialties]);

  const selectedKey = useMemo(() => {
    if (selectedId) return selectedId;
    const option = options.find(opt => opt.value === value);
    return option?.key || '';
  }, [options, value, selectedId]);

  const handleValueChange = (
    selectedKey: string | string[],
    selectedOption?: DropdownOption | DropdownOption[]
  ) => {
    if (!selectedOption || Array.isArray(selectedOption)) return;

    const specialty = selectedOption.metadata as Specialty;
    onValueChange?.(specialty.name, specialty.id.toString());
  };

  return (
    <UnifiedDropdown
      label={label}
      placeholder="Select specialty"
      value={selectedKey}
      options={options}
      onValueChange={handleValueChange}
      searchable={true}
      searchPlaceholder="Search specialties..."
      disabled={disabled}
      isLoading={isLoading}
      error={error}
      onFocus={onFocus}
      onBlur={onBlur}
      primaryColor="#F05C0C"
      backgroundColor={backgroundColor}
    />
  );
};
