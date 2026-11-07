// Form field management
import { useSpecialtiesQuery } from '@/hooks/doctor/queries';
import { useAnimatedFormField } from '@/hooks/ui/forms';
import { useDoctorProfile } from '@/hooks/doctor';
import {
  Certification,
  ProfessionalInformationFormFieldKey as FormFieldKey,
} from '@/types';
import { logger } from '@/utils';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import {
  Button,
  Footer,
  FormFieldWrapper,
  UnifiedDropdown,
  DropdownOption,
} from '../ui';
import CertificationModal from './CertificationModal';
import { ClickableCertificationsField } from './ClickableCertificationsField';

interface ProfessionalInformationFormProps {
  fromProfile?: boolean;
}

const MEDICAL_SCHOOLS = [
  {
    key: '1',
    value: 'Harvard Medical School',
    label: 'Harvard Medical School',
  },
  {
    key: '2',
    value: 'Johns Hopkins School of Medicine',
    label: 'Johns Hopkins School of Medicine',
  },
  {
    key: '3',
    value: 'Stanford University School of Medicine',
    label: 'Stanford University School of Medicine',
  },
  {
    key: '4',
    value: 'University of California, San Francisco',
    label: 'University of California, San Francisco',
  },
  {
    key: '5',
    value: 'Mayo Clinic Alix School of Medicine',
    label: 'Mayo Clinic Alix School of Medicine',
  },
  {
    key: '6',
    value: 'Washington University School of Medicine',
    label: 'Washington University School of Medicine',
  },
  {
    key: '7',
    value: 'University of Pennsylvania Perelman School of Medicine',
    label: 'University of Pennsylvania Perelman School of Medicine',
  },
  {
    key: '8',
    value: 'Columbia University Vagelos College of Physicians and Surgeons',
    label: 'Columbia University Vagelos College of Physicians and Surgeons',
  },
  {
    key: '9',
    value: 'Yale School of Medicine',
    label: 'Yale School of Medicine',
  },
  {
    key: '10',
    value: 'University of Michigan Medical School',
    label: 'University of Michigan Medical School',
  },
  {
    key: '11',
    value: 'Duke University School of Medicine',
    label: 'Duke University School of Medicine',
  },
  {
    key: '12',
    value: 'Northwestern University Feinberg School of Medicine',
    label: 'Northwestern University Feinberg School of Medicine',
  },
  {
    key: '13',
    value: 'Vanderbilt University School of Medicine',
    label: 'Vanderbilt University School of Medicine',
  },
  {
    key: '14',
    value: 'University of Chicago Pritzker School of Medicine',
    label: 'University of Chicago Pritzker School of Medicine',
  },
  { key: '15', value: 'Other', label: 'Other' },
];

const PROFESSIONAL_AFFILIATIONS = [
  {
    key: '1',
    value: 'American Medical Association (AMA)',
    label: 'American Medical Association (AMA)',
  },
  {
    key: '2',
    value: 'American College of Physicians (ACP)',
    label: 'American College of Physicians (ACP)',
  },
  {
    key: '3',
    value: 'American Academy of Family Physicians (AAFP)',
    label: 'American Academy of Family Physicians (AAFP)',
  },
  {
    key: '4',
    value: 'American College of Surgeons (ACS)',
    label: 'American College of Surgeons (ACS)',
  },
  {
    key: '5',
    value: 'American Heart Association (AHA)',
    label: 'American Heart Association (AHA)',
  },
  {
    key: '6',
    value: 'American Cancer Society (ACS)',
    label: 'American Cancer Society (ACS)',
  },
  {
    key: '7',
    value: 'American Academy of Pediatrics (AAP)',
    label: 'American Academy of Pediatrics (AAP)',
  },
  {
    key: '8',
    value: 'American College of Cardiology (ACC)',
    label: 'American College of Cardiology (ACC)',
  },
  {
    key: '9',
    value: 'American Psychiatric Association (APA)',
    label: 'American Psychiatric Association (APA)',
  },
  {
    key: '10',
    value: 'American Academy of Dermatology (AAD)',
    label: 'American Academy of Dermatology (AAD)',
  },
  {
    key: '11',
    value: 'American College of Emergency Physicians (ACEP)',
    label: 'American College of Emergency Physicians (ACEP)',
  },
  {
    key: '12',
    value: 'American Academy of Neurology (AAN)',
    label: 'American Academy of Neurology (AAN)',
  },
  {
    key: '13',
    value: 'American College of Obstetricians and Gynecologists (ACOG)',
    label: 'American College of Obstetricians and Gynecologists (ACOG)',
  },
  {
    key: '14',
    value: 'American Urological Association (AUA)',
    label: 'American Urological Association (AUA)',
  },
  {
    key: '15',
    value: 'American Academy of Ophthalmology (AAO)',
    label: 'American Academy of Ophthalmology (AAO)',
  },
  {
    key: '16',
    value: 'Healthcare Information and Management Systems Society (HIMSS)',
    label: 'Healthcare Information and Management Systems Society (HIMSS)',
  },
  {
    key: '17',
    value: 'American Organization for Nursing Leadership (AONL)',
    label: 'American Organization for Nursing Leadership (AONL)',
  },
  { key: '18', value: 'Other', label: 'Other' },
];

export const ProfessionalInformationForm: React.FC<ProfessionalInformationFormProps> =
  React.memo(({ fromProfile = true }) => {
    // Doctor profile hook for API calls
    const { profile, updateProfessionalInfo, isUpdatingProfessionalInfo } =
      useDoctorProfile();

    // Get specialties data to map IDs to names
    const { data: specialtiesData, isLoading: isLoadingSpecialties } =
      useSpecialtiesQuery();
    // const { authState } = useAuthContext(); // Removed unused
    // If useAuthContext is not available here, we might need to import it or get profile from props/store
    // Based on previous file content, it was imported from '@/contexts/AuthContext' in OtherSpecialtiesDropdown
    // But here we are in ProfessionalInformationForm. Let's check imports.
    // It seems useAuthContext was NOT imported in the original file.
    // However, useDoctorProfile is used.

    // Form field management

    const [formData, setFormData] = useState({
      subSpecialties: '',
      practisingSince: '',
      medicalSchool: '',
      graduationYear: '',
      fellowshipResidency: '',
      fellowshipResidencyYear: '',
      certifications: '',
      professionalAffiliations: '',
    });

    // Separate state for managing certifications as array
    const [certificationsArray, setCertificationsArray] = useState<
      Certification[]
    >([]);
    const [showCertificationModal, setShowCertificationModal] = useState(false);

    // Store selected specialty IDs separately
    const [selectedSpecialtyIds, setSelectedSpecialtyIds] = useState<number[]>(
      []
    );

    // Certification management functions
    const addCertification = useCallback((certification: Certification) => {
      setCertificationsArray(prev => [...prev, certification]);
    }, []);

    const updateCertification = useCallback(
      (index: number, certification: Certification) => {
        setCertificationsArray(prev => {
          const newArray = [...prev];
          newArray[index] = certification;
          return newArray;
        });
      },
      []
    );

    const deleteCertification = useCallback((index: number) => {
      setCertificationsArray(prev => prev.filter((_, i) => i !== index));
    }, []);

    // Helper function to map specialty IDs to names
    const getSpecialtyNamesFromIds = useCallback(
      (specialtyIds: number[]): string => {
        if (!specialtiesData?.specialties || !specialtyIds?.length) return '';

        const specialtyNames = specialtyIds
          .map(
            id =>
              specialtiesData.specialties.find(specialty => specialty.id === id)
                ?.name
          )
          .filter(name => name) // Remove undefined values
          .join(', ');

        return specialtyNames;
      },
      [specialtiesData]
    );

    // Populate form with existing profile data when editing
    useEffect(() => {
      if (fromProfile && profile) {
        setFormData(prev => ({
          ...prev,
          subSpecialties: getSpecialtyNamesFromIds(
            profile.other_specialties || []
          ),
          practisingSince: profile.practising_since?.toString() || '',
          medicalSchool: profile.medical_school_metadata || '',
          graduationYear:
            profile.graduation_year_metadata?.toString() ||
            profile.graduation_year?.toString() ||
            '',
          fellowshipResidency: profile.residency_program || '',
          fellowshipResidencyYear: profile.residency_year?.toString() || '',
          certifications:
            profile.certifications?.map(cert => cert.title).join(', ') || '',
          professionalAffiliations:
            profile.professional_affiliations?.join(', ') || '',
        }));

        // Set specialty IDs
        if (profile.other_specialties) {
          setSelectedSpecialtyIds(profile.other_specialties);
        }

        // Set certifications array separately
        if (profile.certifications) {
          setCertificationsArray(profile.certifications);
        }
      }
    }, [fromProfile, profile, getSpecialtyNamesFromIds]);

    // Sync certifications display field when certificationsArray changes
    useEffect(() => {
      setFormData(prev => ({
        ...prev,
        certifications: certificationsArray.map(cert => cert.title).join(', '),
      }));
    }, [certificationsArray]);

    // Handle certifications field special behavior
    const handleCertificationsPress = useCallback(() => {
      setShowCertificationModal(true);
    }, []);

    // Helper function to get field labels
    const getFieldLabel = useCallback((field: FormFieldKey): string => {
      const labels: Record<FormFieldKey, string> = {
        subSpecialties: 'Other Specialties',
        practisingSince: 'Practising Since',
        medicalSchool: 'Medical School',
        graduationYear: 'Graduation Year',
        fellowshipResidency: 'Fellowship/Residency',
        fellowshipResidencyYear: 'Fellowship/Residency Year',
        certifications: 'Certifications',
        professionalAffiliations: 'Professional Affiliations',
      };
      return labels[field] || field;
    }, []);

    // Memoize callback functions to prevent unnecessary re-renders
    const handleInputChange = useCallback(
      (field: FormFieldKey, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
      },
      []
    );

    // Handle update when form is submitted from profile
    const handleUpdateProfile = useCallback(async () => {
      try {
        const updateData = {
          // Use specialty IDs collected from dropdown
          other_specialties:
            selectedSpecialtyIds.length > 0 ? selectedSpecialtyIds : undefined,
          practising_since: formData.practisingSince
            ? parseInt(formData.practisingSince)
            : undefined,
          medical_school: formData.medicalSchool || undefined,
          graduation_year: formData.graduationYear
            ? parseInt(formData.graduationYear)
            : undefined,
          residency_program: formData.fellowshipResidency || undefined,
          residency_year: formData.fellowshipResidencyYear
            ? parseInt(formData.fellowshipResidencyYear)
            : undefined,
          fellowship_program: formData.fellowshipResidency || undefined,
          fellowship_year: formData.fellowshipResidencyYear
            ? parseInt(formData.fellowshipResidencyYear)
            : undefined,
          certifications:
            certificationsArray.length > 0 ? certificationsArray : undefined,
          professional_affiliations: formData.professionalAffiliations
            ? formData.professionalAffiliations
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0)
            : [],
        };

        await updateProfessionalInfo(updateData);
        Alert.alert(
          'Success',
          'Professional information updated successfully!'
        );
      } catch (error) {
        Alert.alert(
          'Error',
          'Failed to update professional information. Please try again.'
        );
        logger.error('Update error:', error as Error, {
          component: 'ProfessionalInformationForm',
        });
      }
    }, [
      selectedSpecialtyIds,
      formData,
      certificationsArray,
      updateProfessionalInfo,
    ]);

    const formFields: FormFieldKey[] = [
      'subSpecialties',
      'practisingSince',
      'medicalSchool',
      'graduationYear',
      'fellowshipResidency',
      'fellowshipResidencyYear',
      'certifications',
      'professionalAffiliations',
    ];

    const {
      selectedInput,
      getBorderColor,
      getLabelStyle,
      handleFocus,
      handleBlur,
      clearSelection,
    } = useAnimatedFormField(formFields);

    const isDateField = useCallback((field: FormFieldKey): boolean => {
      return [
        'graduationYear',
        'fellowshipResidencyYear',
        'practisingSince',
      ].includes(field);
    }, []);

    // We'll now use the date picker with year format instead of text input for year fields
    const isYearField = (field: FormFieldKey): boolean => {
      return [
        'graduationYear',
        'fellowshipResidencyYear',
        'practisingSince',
      ].includes(field);
    };

    // Prepare specialty options
    const specialtyOptions = useMemo(() => {
      if (!specialtiesData?.specialties) return [];
      const mainSpecialty = profile?.specialty;
      return specialtiesData.specialties
        .filter(specialty => specialty.name !== mainSpecialty)
        .map(specialty => ({
          key: specialty.id.toString(),
          value: specialty.name,
          label: specialty.name,
        }));
    }, [specialtiesData, profile?.specialty]);

    // Handle specialty selection
    const handleSpecialtyChange = (
      values: string[],
      options: DropdownOption[]
    ) => {
      // Update IDs
      const ids = options.map(opt => parseInt(opt.key));
      setSelectedSpecialtyIds(ids);

      // Update display text
      const names = options.map(opt => opt.label).join(', ');
      handleInputChange('subSpecialties', names);
    };

    return (
      <View className="p-4">
        {formFields.map(field => (
          <View key={field} className="mb-6">
            {field === 'certifications' ? (
              // Custom clickable component for certifications
              <ClickableCertificationsField
                value={formData[field]}
                label={getFieldLabel(field)}
                isActive={selectedInput === field}
                borderColor={getBorderColor(field)}
                labelStyle={getLabelStyle(field)}
                onPress={() => {
                  handleFocus(field);
                  handleCertificationsPress();
                }}
                certificationsCount={certificationsArray.length}
              />
            ) : field === 'subSpecialties' ? (
              // Other Specialties dropdown
              <UnifiedDropdown
                label={getFieldLabel(field)}
                placeholder="Select other specialties"
                value={selectedSpecialtyIds.map(id => id.toString())}
                options={specialtyOptions}
                onValueChange={(val, opts) =>
                  handleSpecialtyChange(
                    val as string[],
                    opts as DropdownOption[]
                  )
                }
                multiSelect
                searchable
                searchPlaceholder="Search specialties..."
                isLoading={isLoadingSpecialties}
                onFocus={() => {
                  clearSelection();
                }}
                onBlur={() => {}}
                primaryColor="#F05C0C"
              />
            ) : field === 'medicalSchool' ? (
              // Medical School dropdown
              <UnifiedDropdown
                label={getFieldLabel(field)}
                placeholder="Select medical school"
                value={
                  MEDICAL_SCHOOLS.find(s => s.value === formData[field])?.key ||
                  formData[field]
                }
                options={MEDICAL_SCHOOLS}
                onValueChange={(_val, opt) => {
                  const option = opt as DropdownOption;
                  handleInputChange(field, option?.value || '');
                }}
                searchable
                searchPlaceholder="Search medical schools..."
                onFocus={() => {
                  clearSelection();
                }}
                onBlur={() => {}}
                primaryColor="#F05C0C"
              />
            ) : field === 'professionalAffiliations' ? (
              // Professional Affiliations dropdown
              <UnifiedDropdown
                label={getFieldLabel(field)}
                placeholder="Select professional affiliations"
                value={
                  formData[field]
                    ? formData[field].split(', ').map(name => {
                        const found = PROFESSIONAL_AFFILIATIONS.find(
                          p => p.value === name
                        );
                        return found ? found.key : name;
                      })
                    : []
                }
                options={PROFESSIONAL_AFFILIATIONS}
                onValueChange={(_val, opts) => {
                  const options = opts as DropdownOption[];
                  const names = options.map(opt => opt.value).join(', ');
                  handleInputChange(field, names);
                }}
                multiSelect
                searchable
                searchPlaceholder="Search affiliations..."
                onFocus={() => {
                  clearSelection();
                }}
                onBlur={() => {}}
                primaryColor="#F05C0C"
              />
            ) : (
              // Regular form fields
              <FormFieldWrapper
                type={
                  isDateField(field) || isYearField(field) ? 'date' : 'text'
                }
                field={field}
                value={formData[field]}
                label={getFieldLabel(field)}
                isActive={selectedInput === field}
                borderColor={getBorderColor(field)}
                labelStyle={getLabelStyle(field)}
                onFocus={() => {
                  handleFocus(field);
                }}
                onBlur={() => handleBlur(field)}
                onChangeText={text => handleInputChange(field, text)}
                onChange={date =>
                  isDateField(field) || isYearField(field)
                    ? handleInputChange(field, date)
                    : undefined
                }
                dateFormat={isYearField(field) ? 'year' : 'full'}
              />
            )}
          </View>
        ))}

        <Button
          onPress={handleUpdateProfile}
          title={isUpdatingProfessionalInfo ? 'Updating...' : 'Update'}
          containerClassName="w-full h-14 bg-[#F05C0C] rounded-lg items-center justify-center mb-6 py-4"
          textClassName="text-white font-semibold text-base"
          disabled={isUpdatingProfessionalInfo}
        >
          {isUpdatingProfessionalInfo && (
            <ActivityIndicator size="small" color="#FFFFFF" className="ml-2" />
          )}
        </Button>

        <Footer />

        {/* Certification Modal */}
        <CertificationModal
          visible={showCertificationModal}
          certifications={certificationsArray}
          onClose={() => setShowCertificationModal(false)}
          onAdd={addCertification}
          onUpdate={updateCertification}
          onDelete={deleteCertification}
        />
      </View>
    );
  });

ProfessionalInformationForm.displayName = 'ProfessionalInformationForm';
