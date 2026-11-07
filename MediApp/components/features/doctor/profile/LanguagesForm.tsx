import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StandardBottomButton } from '@/components/shared/ui';
import { useDoctorProfile } from '@/hooks/doctor';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLanguagesQuery } from '@/hooks/doctor/queries';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export const LanguagesForm: React.FC = () => {
  const { authState } = useAuthContext();
  // Use cached profile data from login instead of separate API call
  const doctorProfile = authState.doctorProfile;
  // Keep mutation operations for updates
  const { updateProfessionalInfo, isUpdating } = useDoctorProfile();
  const {
    data: languagesData,
    isLoading: languagesLoading,
    error: languagesError,
  } = useLanguagesQuery();

  const [selectedLanguageIds, setSelectedLanguageIds] = useState<number[]>([]);
  const [initialLanguageIds, setInitialLanguageIds] = useState<number[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Load existing languages from profile
  useEffect(() => {
    if (doctorProfile?.language_id) {
      // Single language case - convert to array
      const currentLanguages = [doctorProfile.language_id];
      setSelectedLanguageIds(currentLanguages);
      setInitialLanguageIds(currentLanguages);
    } else if (
      doctorProfile?.languages_spoken &&
      Array.isArray(doctorProfile.languages_spoken)
    ) {
      // Multiple languages case - convert language names to IDs
      if (languagesData?.languages) {
        const languageIds = doctorProfile.languages_spoken
          .map(
            languageName =>
              languagesData.languages.find(lang => lang.name === languageName)
                ?.id
          )
          .filter((id): id is number => id !== undefined);
        setSelectedLanguageIds(languageIds);
        setInitialLanguageIds(languageIds);
      } else {
        // Fallback if no languages data available yet
        setSelectedLanguageIds([]);
        setInitialLanguageIds([]);
      }
    } else {
      // No languages selected
      setSelectedLanguageIds([]);
      setInitialLanguageIds([]);
    }
  }, [
    doctorProfile?.language_id,
    doctorProfile?.languages_spoken,
    languagesData?.languages,
  ]);

  // Track changes
  useEffect(() => {
    const hasDataChanged =
      JSON.stringify(selectedLanguageIds.sort()) !==
      JSON.stringify(initialLanguageIds.sort());
    setHasChanges(hasDataChanged);
  }, [selectedLanguageIds, initialLanguageIds]);

  const handleLanguageToggle = useCallback((languageId: number) => {
    setSelectedLanguageIds(prev =>
      prev.includes(languageId)
        ? prev.filter(id => id !== languageId)
        : [...prev, languageId]
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!updateProfessionalInfo) return;

    try {
      await updateProfessionalInfo({
        language_id:
          selectedLanguageIds.length > 0 ? selectedLanguageIds[0] : undefined,
        languages_spoken: selectedLanguageIds,
      });

      // Update initial data to reflect saved state
      setInitialLanguageIds([...selectedLanguageIds]);

      Alert.alert('Success', 'Languages updated successfully!');
    } catch {
      // Error saving languages
      Alert.alert('Error', 'Failed to save languages. Please try again.');
    }
  }, [selectedLanguageIds, updateProfessionalInfo]);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header Section */}
      <View className="mx-4 mt-4">
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-[#F05C0C] rounded-full items-center justify-center mr-3">
              <MaterialCommunityIcons
                name="translate"
                size={22}
                color="white"
              />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">
                Languages Spoken
              </Text>
              <Text className="text-sm text-gray-600">
                Select all languages you can communicate with patients in
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Language Selection */}
      <View className="mx-4 mt-6">
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <View className="px-4 pt-4 pb-2 border-b border-gray-100">
            <Text className="text-base font-semibold text-gray-900">
              Available Languages
            </Text>
          </View>

          {/* Loading state */}
          {languagesLoading && (
            <View className="px-4 py-8 items-center">
              <ActivityIndicator size="small" color="#F05C0C" />
              <Text className="text-sm text-gray-500 mt-2">
                Loading languages...
              </Text>
            </View>
          )}

          {/* Languages list */}
          {!languagesLoading &&
            languagesData?.languages?.map((language, index) => {
              const isSelected = selectedLanguageIds.includes(language.id);

              return (
                <View key={language.id}>
                  <TouchableOpacity
                    onPress={() => handleLanguageToggle(language.id)}
                    className={`flex-row items-center px-4 py-4 ${
                      isSelected ? 'bg-orange-50' : 'bg-white'
                    }`}
                    activeOpacity={0.7}
                  >
                    {/* Language Icon */}
                    <View
                      className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                        isSelected ? 'bg-[#F05C0C]' : 'bg-gray-100'
                      }`}
                    >
                      <MaterialCommunityIcons
                        name="translate"
                        size={20}
                        color={isSelected ? 'white' : '#F05C0C'}
                      />
                    </View>

                    {/* Language Info */}
                    <View className="flex-1">
                      <Text
                        className={`text-base font-medium ${
                          isSelected ? 'text-[#F05C0C]' : 'text-gray-900'
                        }`}
                      >
                        {language.name}
                      </Text>
                      {language.code && (
                        <Text className="text-sm text-gray-500 mt-1">
                          {language.code.toUpperCase()}
                        </Text>
                      )}
                    </View>

                    {/* Selection Indicator */}
                    <View
                      className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                        isSelected
                          ? 'bg-[#F05C0C] border-[#F05C0C]'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSelected && (
                        <MaterialCommunityIcons
                          name="check"
                          size={16}
                          color="white"
                        />
                      )}
                    </View>
                  </TouchableOpacity>

                  {index < (languagesData?.languages?.length || 0) - 1 && (
                    <View className="h-px bg-gray-100 ml-20" />
                  )}
                </View>
              );
            })}

          {/* Error state */}
          {languagesError && (
            <View className="px-4 py-8 items-center">
              <MaterialCommunityIcons
                name="alert-circle"
                size={48}
                color="#EF4444"
              />
              <Text className="text-base text-red-600 mt-2">
                Error loading languages
              </Text>
              <Text className="text-sm text-red-400 text-center mt-1">
                {languagesError?.message ||
                  'Failed to load languages. Please try again.'}
              </Text>
            </View>
          )}

          {/* Empty state */}
          {!languagesLoading &&
            !languagesError &&
            (!languagesData?.languages ||
              languagesData?.languages.length === 0) && (
              <View className="px-4 py-8 items-center">
                <MaterialCommunityIcons
                  name="translate"
                  size={48}
                  color="#9CA3AF"
                />
                <Text className="text-base text-gray-500 mt-2">
                  No languages available
                </Text>
                <Text className="text-sm text-gray-400 text-center mt-1">
                  Please contact support if you need additional languages
                </Text>
              </View>
            )}

          {/* Debug info */}
          {!languagesLoading && !languagesError && languagesData && (
            <View className="px-4 py-2 bg-gray-50">
              <Text className="text-xs text-gray-600">
                Debug: Found {languagesData?.languages?.length || 0} languages
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Selection Summary */}
      {selectedLanguageIds.length > 0 && (
        <View className="mx-4 mt-6">
          <View className="bg-green-50 rounded-xl border border-green-200 p-4">
            <View className="flex-row items-center mb-2">
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color="#10B981"
              />
              <Text className="text-base font-semibold text-green-900 ml-2">
                {selectedLanguageIds.length} Language
                {selectedLanguageIds.length === 1 ? '' : 's'} Selected
              </Text>
            </View>
            <Text className="text-sm text-green-700">
              Patients will be able to find you when searching for doctors who
              speak these languages
            </Text>
          </View>
        </View>
      )}

      {/* Bottom Spacing */}
      <View className="h-6" />

      <View className="p-4 border-t border-gray-200 bg-white">
        <StandardBottomButton
          onPress={handleSave}
          label={
            isUpdating
              ? 'Saving...'
              : hasChanges
                ? `Save ${selectedLanguageIds.length > 0 ? `(${selectedLanguageIds.length}) ` : ''}Languages`
                : 'No Changes to Save'
          }
          isLoading={isUpdating}
          isDisabled={!hasChanges || isUpdating}
        />
      </View>
    </View>
  );
};
