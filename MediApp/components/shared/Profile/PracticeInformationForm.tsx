import { Button } from '@/components/shared/ui';
import { useUpdateDoctorPracticeInfoMutation } from '@/hooks/doctor/mutations';
import {
  useCountriesQuery,
  useLanguagesQuery,
  useSpecialtiesQuery,
} from '@/hooks/doctor/queries';
import { useAnimatedFormField } from '@/hooks/ui/forms';
import { useDoctorProfile } from '@/hooks/doctor';
import { PracticeInformationFormFieldKey as FormFieldKey } from '@/types';
import { logger } from '@/utils';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  FormFields,
  LocationMapModal,
  SelectedAddressType,
} from './PracticeInformation';

export type PracticeInformationFormHandle = {
  submit: () => void;
};
type Props = {
  section?: 'identity' | 'license' | 'address';
  showFloatingSave?: boolean;
};

export const PracticeInformationForm = React.memo(
  forwardRef<PracticeInformationFormHandle, Props>(
    ({ section, showFloatingSave = true }, ref) => {
      const pathname = usePathname();

      // Doctor profile hook for API calls
      const { profile, isLoading: profileLoading } = useDoctorProfile();

      // Practice information mutation hook
      const practiceInfoMutation = useUpdateDoctorPracticeInfoMutation();

      // Reference data queries
      const { data: specialtiesData } = useSpecialtiesQuery();
      const { data: languagesData } = useLanguagesQuery();
      const { data: countriesData } = useCountriesQuery();

      // Check if we're in the DoctorProfileSetupScreen
      const isInDoctorSetup = pathname === '/DoctorProfileSetupScreen';

      const [formData, setFormData] = useState({
        prefix: '',
        first_name: '',
        last_name: '',
        specialty: 'Plastic Surgery',
        specialtyId: '', // Store the ID separately
        country: 'Tunisia',
        countryId: '', // Store the ID separately
        language: 'Language',
        languageId: '', // Store the ID separately
        licenseNumber: 'N01234567',
        whatsappNumber: '29216124',
        addressLine1: 'Av Mongi Slim, Res. Narjes',
        addressLine2: 'C3 333',
        city: 'Tunis',
        state: 'Tunis',
        zipCode: '2045',
      });

      // Memoize form fields to prevent recreation on every render
      const formFields: FormFieldKey[] = useMemo(
        () => [
          'prefix',
          'first_name',
          'last_name',
          'specialty',
          'country',
          'language',
          'licenseNumber',
          'whatsappNumber',
          'addressLine1',
          'addressLine2',
          'city',
          'state',
          'zipCode',
        ],
        []
      );

      // Helper functions to find IDs from names
      const findSpecialtyId = useCallback(
        (specialtyName: string): string => {
          if (!specialtiesData) return '';
          const specialty = specialtiesData.specialties.find(
            s => s.name === specialtyName
          );
          return specialty ? specialty.id.toString() : '';
        },
        [specialtiesData]
      );

      const findLanguageId = useCallback(
        (languageName: string): string => {
          if (!languagesData) return '';
          const language = languagesData.languages.find(
            l => l.name === languageName
          );
          return language ? language.id.toString() : '';
        },
        [languagesData]
      );

      const findCountryId = useCallback(
        (countryName: string): string => {
          if (!countriesData) return '';
          const country = countriesData.countries.find(
            c => c.name === countryName
          );
          return country ? country.id.toString() : '';
        },
        [countriesData]
      );

      // Populate form with existing profile data when editing
      useEffect(() => {
        if (profile && !profileLoading) {
          // Find the language name from the language_id field (not languages_spoken)
          let languageName = 'Language'; // default
          let languageIdValue = '';

          // First try to use the language_id field from profile
          if (profile.language_id && languagesData?.languages) {
            const foundLanguage = languagesData.languages.find(
              lang => lang.id === profile.language_id
            );
            if (foundLanguage) {
              languageName = foundLanguage.name;
              languageIdValue = foundLanguage.id.toString();
            }

            logger.info('Language mapping from language_id:', {
              profileLanguageId: profile.language_id,
              foundLanguage: foundLanguage?.name,
              finalLanguageName: languageName,
              finalLanguageId: languageIdValue,
              availableLanguages: languagesData.languages.map(l => ({
                id: l.id,
                name: l.name,
              })),
            });
          }
          // Fallback to languages_spoken if language_id is not available
          else if (
            profile.languages_spoken &&
            profile.languages_spoken.length > 0 &&
            languagesData?.languages
          ) {
            const spokenLanguage = profile.languages_spoken[0];
            const foundLanguage = languagesData.languages.find(
              lang => lang.name === spokenLanguage
            );
            if (foundLanguage) {
              languageName = foundLanguage.name;
              languageIdValue = foundLanguage.id.toString();
            } else {
              languageName = spokenLanguage;
              languageIdValue = findLanguageId(spokenLanguage);
            }

            logger.info('Language mapping from languages_spoken:', {
              profileLanguages: profile.languages_spoken,
              spokenLanguage,
              foundLanguage: foundLanguage?.name,
              finalLanguageName: languageName,
              finalLanguageId: languageIdValue,
            });
          }

          setFormData(prev => ({
            ...prev,
            first_name:
              profile.first_name || profile.full_name?.split(' ')[0] || '',
            last_name:
              profile.last_name ||
              profile.full_name?.split(' ').slice(1).join(' ') ||
              '',
            specialty: profile.specialty || '',
            specialtyId: findSpecialtyId(profile.specialty || ''),
            licenseNumber: profile.medical_licence || '',
            whatsappNumber: profile.whatsapp_number || '',
            addressLine1: profile.raw_address?.address_line_1 || '',
            addressLine2: profile.raw_address?.address_line_2 || '',
            city: profile.raw_address?.city || '',
            state: profile.raw_address?.state || '',
            zipCode: profile.raw_address?.zip_code || '',
            country: profile.practice_address?.country || 'Tunisia',
            countryId: findCountryId(
              profile.practice_address?.country || 'Tunisia'
            ),
            prefix: profile.prefix || '',
            // Set language from profile with proper mapping
            language: languageName,
            languageId: languageIdValue,
          }));
        }
      }, [
        profile,
        profileLoading,
        findSpecialtyId,
        findCountryId,
        findLanguageId,
        languagesData,
      ]);

      const {
        selectedInput,
        getBorderColor,
        getLabelStyle,
        handleFocus,
        handleBlur,
      } = useAnimatedFormField(formFields);

      const [selectedDropdown, setSelectedDropdown] =
        useState<FormFieldKey | null>(null);
      const [mapModalVisible, setMapModalVisible] = useState(false);
      const [activeLocationField, setActiveLocationField] =
        useState<FormFieldKey | null>(null);

      // Collapsible sections state
      const [openSections, setOpenSections] = useState({
        identity: true,
        license: false,
        address: false,
      });
      const [isDirty, setIsDirty] = useState(false);

      const toggleSection = useCallback((key: keyof typeof openSections) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
      }, []);

      // Memoize callback functions to prevent unnecessary re-renders
      const handleInputChange = useCallback(
        (field: FormFieldKey | 'languageId', value: string) => {
          setIsDirty(true);
          setFormData(prev => {
            const newData = { ...prev, [field]: value };

            // Update corresponding ID when specialty, language, or country name changes
            if (field === 'specialty') {
              newData.specialtyId = findSpecialtyId(value);
            } else if (field === 'language') {
              newData.languageId = findLanguageId(value);
            } else if (field === 'country') {
              newData.countryId = findCountryId(value);
            }

            return newData;
          });
        },
        [findSpecialtyId, findLanguageId, findCountryId]
      );

      const isDropdownField = useCallback((field: FormFieldKey): boolean => {
        return ['specialty', 'country', 'language', 'prefix'].includes(field);
      }, []);

      const isLocationField = useCallback((field: FormFieldKey): boolean => {
        return ['addressLine1', 'city', 'state', 'zipCode'].includes(field);
      }, []);

      const handleMapIconPress = useCallback((field: FormFieldKey) => {
        setActiveLocationField(field);
        setMapModalVisible(true);
      }, []);

      const handleLocationSelected = useCallback(
        (selectedAddress: SelectedAddressType) => {
          // Update the form data with the selected location
          setFormData(prev => ({
            ...prev,
            addressLine1: selectedAddress.address,
            addressLine2: selectedAddress.addressLine2 || '',
            city: selectedAddress.city,
            state: selectedAddress.state,
            zipCode: selectedAddress.zipCode,
          }));
          if (!isDirty) setIsDirty(true);
        },
        [isDirty]
      );

      // Handle update when form is submitted from profile
      const handleUpdateProfile = useCallback(async () => {
        try {
          // Validate that we have the required language ID (specialty and country are read-only)
          const languageId =
            formData.languageId || findLanguageId(formData.language);

          if (!languageId) {
            Alert.alert('Error', 'Please select a valid language.');
            return;
          }

          // Enhanced logging to debug language issue
          logger.info('Pre-submit form state:', {
            languageId,
            language: formData.language,
            formDataLanguageId: formData.languageId,
            allFormData: formData,
            availableLanguages: languagesData?.languages?.map(l => ({
              id: l.id,
              name: l.name,
            })),
          });

          const practiceInfoData = {
            prefix: formData.prefix,
            // Include read-only fields to maintain data integrity
            first_name: formData.first_name,
            last_name: formData.last_name,
            // specialty_id: specialtyId,  // Keep commented as per original
            language_id: parseInt(languageId),
            country_id: 1, // Default to 1 (Tunisia) for now
            medical_licence: formData.licenseNumber,
            wa_number: formData.whatsappNumber,
            address_line_1: formData.addressLine1,
            address_line_2: formData.addressLine2,
            city: formData.city,
            state: formData.state,
            zip_code: formData.zipCode,
          };

          logger.info('Final payload being sent to API:', practiceInfoData);

          await practiceInfoMutation.mutateAsync(practiceInfoData);
          Alert.alert('Success', 'Practice information updated successfully!');
          setIsDirty(false);
        } catch (error) {
          Alert.alert(
            'Error',
            'Failed to update practice information. Please try again.'
          );
          logger.error('Update error:', error as Error, {
            component: 'PracticeInformationForm',
          });
        }
      }, [formData, practiceInfoMutation, findLanguageId, languagesData]);

      // Section field groups
      const identityFields: FormFieldKey[] = useMemo(
        () => [
          'prefix',
          'first_name',
          'last_name',
          'specialty',
          'language',
          'country',
        ],
        []
      );

      const licenseFields: FormFieldKey[] = useMemo(
        () => ['licenseNumber', 'whatsappNumber'],
        []
      );

      const addressFields: FormFieldKey[] = useMemo(
        () => ['addressLine1', 'addressLine2', 'city', 'state', 'zipCode'],
        []
      );

      const SectionHeader: React.FC<{
        title: string;
        open: boolean;
        onPress: () => void;
      }> = ({ title, open, onPress }) => (
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.7}
          className="flex-row items-center justify-between py-3"
        >
          <Text className="text-lg font-semibold text-gray-800">{title}</Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
      );

      // Expose submit() via ref
      useImperativeHandle(
        ref,
        () => ({
          submit: handleUpdateProfile,
        }),
        [handleUpdateProfile]
      );

      const renderIdentity = () => (
        <FormFields
          formFields={identityFields}
          formData={formData}
          selectedInput={selectedInput}
          selectedDropdown={selectedDropdown}
          getBorderColor={getBorderColor}
          getLabelStyle={getLabelStyle}
          handleFocus={handleFocus}
          handleBlur={handleBlur}
          handleInputChange={handleInputChange}
          isDropdownField={isDropdownField}
          isLocationField={isLocationField}
          handleMapIconPress={handleMapIconPress}
          setSelectedDropdown={setSelectedDropdown}
          specialtiesData={specialtiesData?.specialties}
          languagesData={languagesData?.languages}
          countriesData={countriesData?.countries}
          specialtiesLoading={false}
          languagesLoading={false}
          countriesLoading={false}
        />
      );

      const renderLicense = () => (
        <FormFields
          formFields={licenseFields}
          formData={formData}
          selectedInput={selectedInput}
          selectedDropdown={selectedDropdown}
          getBorderColor={getBorderColor}
          getLabelStyle={getLabelStyle}
          handleFocus={handleFocus}
          handleBlur={handleBlur}
          handleInputChange={handleInputChange}
          isDropdownField={isDropdownField}
          isLocationField={isLocationField}
          handleMapIconPress={handleMapIconPress}
          setSelectedDropdown={setSelectedDropdown}
          specialtiesData={specialtiesData?.specialties}
          languagesData={languagesData?.languages}
          countriesData={countriesData?.countries}
          specialtiesLoading={false}
          languagesLoading={false}
          countriesLoading={false}
        />
      );

      const renderAddress = () => (
        <FormFields
          formFields={addressFields}
          formData={formData}
          selectedInput={selectedInput}
          selectedDropdown={selectedDropdown}
          getBorderColor={getBorderColor}
          getLabelStyle={getLabelStyle}
          handleFocus={handleFocus}
          handleBlur={handleBlur}
          handleInputChange={handleInputChange}
          isDropdownField={isDropdownField}
          isLocationField={isLocationField}
          handleMapIconPress={handleMapIconPress}
          setSelectedDropdown={setSelectedDropdown}
          specialtiesData={specialtiesData?.specialties}
          languagesData={languagesData?.languages}
          countriesData={countriesData?.countries}
          specialtiesLoading={false}
          languagesLoading={false}
          countriesLoading={false}
        />
      );

      return (
        <View className="p-4">
          {/* Identity Section */}
          {(!section || section === 'identity') && (
            <>
              {!section && (
                <SectionHeader
                  title="Identity"
                  open={openSections.identity}
                  onPress={() => toggleSection('identity')}
                />
              )}
              {(section === 'identity' || openSections.identity) &&
                renderIdentity()}
            </>
          )}

          {/* License & Contact Section */}
          {(!section || section === 'license') && (
            <View className="mt-2">
              {!section && (
                <SectionHeader
                  title="License & Contact"
                  open={openSections.license}
                  onPress={() => toggleSection('license')}
                />
              )}
              {(section === 'license' || openSections.license) &&
                renderLicense()}
            </View>
          )}

          {/* Address Section */}
          {(!section || section === 'address') && (
            <View className="mt-2">
              {!section && (
                <SectionHeader
                  title="Practice Address"
                  open={openSections.address}
                  onPress={() => toggleSection('address')}
                />
              )}
              {(section === 'address' || openSections.address) &&
                renderAddress()}
            </View>
          )}

          {/* Inline Update button and footer (still available at bottom) */}
          {!isInDoctorSetup && (
            <>
              <Button
                onPress={handleUpdateProfile}
                title={
                  practiceInfoMutation.isPending ? 'Updating...' : 'Update'
                }
                containerClassName="w-full h-14 bg-[#F05C0C] rounded-lg items-center justify-center mb-6 py-4"
                textClassName="text-white font-semibold text-base"
                disabled={practiceInfoMutation.isPending}
              >
                {practiceInfoMutation.isPending && (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                    className="ml-2"
                  />
                )}
              </Button>
            </>
          )}

          {/* Floating Save button to avoid scrolling; appears when form is dirty */}
          {!isInDoctorSetup && isDirty && showFloatingSave && (
            <View
              pointerEvents="box-none"
              className="absolute left-0 right-0 items-center"
              style={{ bottom: 24 + 56 }}
            >
              <TouchableOpacity
                onPress={handleUpdateProfile}
                disabled={practiceInfoMutation.isPending}
                className="bg-[#F05C0C] px-6 py-3 rounded-full shadow-lg"
                accessibilityRole="button"
              >
                <Text className="text-white font-semibold">
                  {practiceInfoMutation.isPending ? 'Saving…' : 'Save changes'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Map Location Selection Modal */}
          <LocationMapModal
            visible={mapModalVisible}
            onClose={() => setMapModalVisible(false)}
            onLocationSelected={handleLocationSelected}
            activeLocationField={activeLocationField}
          />
        </View>
      );
    }
  )
);

PracticeInformationForm.displayName = 'PracticeInformationForm';
