import { UnifiedDropdown, StandardBottomButton, ThreeDotsLoader } from '@/components/shared/ui';
import { useDoctorProfile } from '@/hooks/doctor';
import { useDoctorPublicProfile } from '@/hooks/doctor/useDoctorPublicProfile';
import { useSpecialties } from '@/hooks/reference/useSpecialties';
import { DoctorProfileResponse } from '@/types';
import { logger } from '@/utils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Alert, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

// Types for API data
interface Specialty {
  id: number;
  name: string;
  description?: string;
}

interface OtherSpecialtiesFormProps {
  embedMode?: boolean;
  readOnly?: boolean;
  doctorId?: number; // For viewing another doctor's profile
}

export const OtherSpecialtiesForm: React.FC<OtherSpecialtiesFormProps> = ({
  embedMode = false,
  readOnly = false,
  doctorId,
}) => {
  const [selectedSpecialties, setSelectedSpecialties] = useState<number[]>([]);
  const [initialSpecialties, setInitialSpecialties] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // API state for specialties
  const {
    data: allSpecialties = [],
    isLoading: specialtiesLoading
  } = useSpecialties();

  const [availableSpecialties, setAvailableSpecialties] = useState<Specialty[]>([]);

  // Get profile data
  const { profile: ownProfile, updateProfessionalInfo, refetch } = useDoctorProfile();

  // State for viewing another doctor's profile
  const isViewingOtherDoctor = readOnly && !!doctorId;
  const {
    data: viewedDoctorProfile,
    isLoading: isLoadingViewed
  } = useDoctorPublicProfile(isViewingOtherDoctor ? doctorId : undefined);

  // Determine which profile to use
  const profile = isViewingOtherDoctor ? viewedDoctorProfile || null : ownProfile;
  const isLoading = isViewingOtherDoctor ? isLoadingViewed : false;

  // Fetch detailed profile data if other_specialties is missing
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (!hasFetchedRef.current && profile && !profile.other_specialties) {
      hasFetchedRef.current = true;
      refetch(false, 300000); // 5 minutes stale time
    }
  }, [profile, refetch]);

  // Filter specialties when data or profile changes
  useEffect(() => {
    if (allSpecialties.length > 0) {
      // Filter out doctor's main specialty
      const filtered = allSpecialties.filter(
        specialty => specialty.id !== profile?.specialty_id
      );
      setAvailableSpecialties(filtered);
    }
  }, [allSpecialties, profile?.specialty_id]);

  // Load existing specialties when profile data is available
  useEffect(() => {
    if (profile?.other_specialties) {
      setSelectedSpecialties(profile.other_specialties);
      setInitialSpecialties(profile.other_specialties);
    }
  }, [profile?.other_specialties]);

  // Track changes
  useEffect(() => {
    const hasDataChanged =
      JSON.stringify(selectedSpecialties.sort()) !==
      JSON.stringify(initialSpecialties.sort());
    setHasChanges(hasDataChanged);
  }, [selectedSpecialties, initialSpecialties]);

  const handleSave = useCallback(async () => {
    if (!updateProfessionalInfo || !profile) return;

    setIsSaving(true);
    try {
      await updateProfessionalInfo({
        other_specialties: selectedSpecialties,
        practising_since: profile.practising_since,
        medical_school: profile.medical_school,
        graduation_year: profile.graduation_year,
        residency_program: profile.residency_program,
        residency_year: profile.residency_year,
        language_id: profile.language_id,
      });

      // Update initial data to reflect saved state
      setInitialSpecialties([...selectedSpecialties]);

      Alert.alert(
        'Success',
        'Your specialties have been updated successfully.'
      );
    } catch (error: any) {
      console.error('❌ Error saving specialties:', error);
      const errorMessage =
        error?.message ||
        "We couldn't update your specialties. Please try again later.";
      Alert.alert('Update Failed', errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [selectedSpecialties, updateProfessionalInfo, profile]);

  // Prepared options for UnifiedDropdown
  // Sort: Initially selected first, then Alphabetical
  // We use initialSpecialties instead of selectedSpecialties to prevent items from jumping around
  // while the user is actively selecting/deselecting items in the dropdown.
  const sortedOptions = useMemo(() => {
    return [...availableSpecialties].sort((a, b) => {
      const aSelected = initialSpecialties.includes(a.id);
      const bSelected = initialSpecialties.includes(b.id);

      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;

      return a.name.localeCompare(b.name);
    });
  }, [availableSpecialties, initialSpecialties]);

  const dropdownOptions = useMemo(() => {
    return sortedOptions.map(s => ({
      label: s.name,
      value: s.id.toString(),
      key: s.id.toString(),
    }));
  }, [sortedOptions]);

  // Read-only view - plain text display
  if (readOnly) {
    if (isLoadingViewed || specialtiesLoading) {
      return (
        <View className="flex-1 items-center justify-center py-8">
          <ThreeDotsLoader size={24} />
        </View>
      );
    }

    const selectedSpecialtyNames = selectedSpecialties
      .map(id => availableSpecialties.find(s => s.id === id)?.name)
      .filter(Boolean);

    return (
      <View className={`${embedMode ? '' : 'flex-1'} bg-white`}>
        <View className="p-4">
          <View className="flex-row items-center mb-4">
            <MaterialCommunityIcons name="stethoscope" size={20} color="#F05C0C" />
            <Text className="ml-2 text-base font-semibold text-gray-900">
              Other Specialties
            </Text>
          </View>

          {selectedSpecialtyNames.length > 0 ? (
            <View className="flex-row flex-wrap">
              {selectedSpecialtyNames.map((name, index) => (
                <View
                  key={index}
                  className=" px-4 py-2 rounded-xl mr-2 mb-2 border border-orange-100 flex-row items-center"
                >
                  <Text className="ml-2 text-lg">
                    {name}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View className="items-center justify-center py-8 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <MaterialCommunityIcons name="doctor" size={28} color="#9CA3AF" />
              <Text className="text-gray-400 mt-2 font-medium">No additional specialties</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View className={`${embedMode ? '' : 'flex-1'} bg-white`}>
      {/* Top spacing */}
      <View className="h-6" />

      <View className="px-4">
        <UnifiedDropdown
          label="Select Other Specialties"
          placeholder="Select specialties..."
          options={dropdownOptions}
          value={selectedSpecialties.map(String)}
          onValueChange={values => {
            // UnifiedDropdown in multi-select returns array of strings
            if (Array.isArray(values) && !readOnly) {
              setSelectedSpecialties(values.map(Number));
            }
          }}
          multiSelect={true}
          searchable={!readOnly}
          searchPlaceholder="Search specialties..."
          isLoading={specialtiesLoading}
          backgroundColor="white"
          disabled={readOnly}
        />
      </View>

      {/* Bottom Spacing */}
      <View className="h-6" />

      {!readOnly && (hasChanges || isSaving) &&
        (embedMode ? (
          <Animated.View
            entering={FadeInUp.duration(300)}
            exiting={FadeOutDown.duration(200)}
            className="p-4 border-t border-gray-100 mt-4"
          >
            <StandardBottomButton
              onPress={handleSave}
              label={
                isSaving
                  ? 'Saving...'
                  : `Save ${selectedSpecialties.length > 0
                    ? `(${selectedSpecialties.length}) `
                    : ''
                  }Specialties`
              }
              isLoading={isSaving}
              isDisabled={isSaving}
            />
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInUp.duration(300)}
            exiting={FadeOutDown.duration(200)}
            className="absolute bottom-4 left-4 right-4 mb-4"
          >
            <StandardBottomButton
              onPress={handleSave}
              label={
                isSaving
                  ? 'Saving...'
                  : `Save ${selectedSpecialties.length > 0
                    ? `(${selectedSpecialties.length}) `
                    : ''
                  }Specialties`
              }
              isLoading={isSaving}
              isDisabled={isSaving}
            />
          </Animated.View>
        ))}
    </View>
  );
};
