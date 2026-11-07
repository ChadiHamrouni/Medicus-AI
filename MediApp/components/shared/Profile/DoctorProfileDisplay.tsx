import { useAuthContext } from '@/contexts/AuthContext';
import React from 'react';
import { Text, View } from 'react-native';

interface DoctorProfileDisplayProps {
  className?: string;
}

interface ProfileSectionProps {
  title: string;
  children: React.ReactNode;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ title, children }) => (
  <View className="mb-6">
    <Text className="text-lg font-semibold text-gray-800 mb-3">{title}</Text>
    <View className="bg-gray-50 rounded-lg p-4">{children}</View>
  </View>
);

interface InfoRowProps {
  label: string;
  value?: string | number | null;
  defaultValue?: string;
}

const InfoRow: React.FC<InfoRowProps> = ({
  label,
  value,
  defaultValue = 'Not provided',
}) => (
  <View className="flex-row justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
    <Text className="text-sm font-medium text-gray-600 flex-1">{label}</Text>
    <Text className="text-sm text-gray-800 flex-2 text-right">
      {value || defaultValue}
    </Text>
  </View>
);

const formatArray = (arr: string[] | undefined): string => {
  if (!arr || arr.length === 0) return 'None';
  return arr.join(', ');
};

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return 'Invalid date';
  }
};

export const DoctorProfileDisplay: React.FC<DoctorProfileDisplayProps> = ({
  className,
}) => {
  // Use cached profile data from login instead of separate API call
  const { authState } = useAuthContext();
  const profile = authState.doctorProfile;

  if (!profile) {
    return (
      <View
        className={`flex-1 justify-center items-center p-6 ${className || ''}`}
      >
        <Text className="text-gray-600 text-center">
          No profile data available
        </Text>
      </View>
    );
  }

  return (
    <View className={`p-4 ${className || ''}`}>
      {/* Basic Information */}
      <ProfileSection title="Basic Information">
        <InfoRow label="Full Name" value={profile.full_name} />
        <InfoRow label="First Name" value={profile.first_name} />
        <InfoRow label="Last Name" value={profile.last_name} />
        <InfoRow label="Prefix" value={profile.prefix} />
        <InfoRow label="Email" value={profile.email} />
        <InfoRow label="WhatsApp" value={profile.whatsapp_number} />
        <InfoRow label="Gender" value={profile.gender} />
        <InfoRow label="Country" value={profile.country_name} />
        <InfoRow label="Verified" value={profile.is_verified ? 'Yes' : 'No'} />
        <InfoRow label="Status" value={profile.status} />
      </ProfileSection>

      {/* Professional Information */}
      <ProfileSection title="Professional Information">
        <InfoRow label="Specialty" value={profile.specialty_name} />
        <InfoRow label="Super Category" value={profile.super_category_name} />
        <InfoRow
          label="Other Specialties"
          value={
            profile.other_specialties_names
              ? formatArray(profile.other_specialties_names)
              : 'None'
          }
        />
        <InfoRow label="Medical License" value={profile.medical_licence} />
        <InfoRow label="Medical School" value={profile.medical_school} />
        <InfoRow
          label="Graduation Year"
          value={profile.graduation_year?.toString()}
        />
        <InfoRow
          label="Practising Since"
          value={profile.practising_since?.toString()}
        />
        <InfoRow label="Language" value={profile.language_name} />
        <InfoRow
          label="Languages Spoken"
          value={
            profile.languages_names
              ? formatArray(profile.languages_names)
              : 'None'
          }
        />
      </ProfileSection>

      {/* Contact Information */}
      <ProfileSection title="Contact Information">
        <InfoRow
          label="Professional Email"
          value={profile.contact?.professional_email}
        />
        <InfoRow
          label="Professional Phone"
          value={profile.contact?.professional_phone}
        />
        <InfoRow label="Office Phone" value={profile.contact?.office_phone} />
        <InfoRow label="Fax Number" value={profile.contact?.fax_number} />
        <InfoRow label="Website" value={profile.contact?.website_url} />
      </ProfileSection>

      {/* Address Information */}
      {(profile.address || profile.clinic_address) && (
        <ProfileSection title="Address">
          <InfoRow
            label="Clinic Address"
            value={profile.clinic_address || profile.address}
          />
        </ProfileSection>
      )}

      {/* Working Hours */}
      {profile.working_hours && profile.working_hours.length > 0 && (
        <ProfileSection title="Working Hours">
          {profile.working_hours.map((hours, index) => {
            const dayName = hours.day_of_week
              ? hours.day_of_week.charAt(0).toUpperCase() +
                hours.day_of_week.slice(1)
              : 'Unknown Day';
            let timeSlotText = 'Closed';

            if (
              hours.is_available &&
              hours.time_slots &&
              hours.time_slots.length > 0
            ) {
              timeSlotText = hours.time_slots
                .map(
                  slot =>
                    `${slot.start_time} - ${slot.end_time}${slot.other_locations_id ? ` (Location ${slot.other_locations_id})` : ''}`
                )
                .join(', ');
            }

            return (
              <InfoRow
                key={index}
                label={dayName || 'Unknown Day'}
                value={timeSlotText}
              />
            );
          })}
        </ProfileSection>
      )}

      {/* Other Locations */}
      {profile.other_locations && profile.other_locations.length > 0 && (
        <ProfileSection title="Other Locations">
          {profile.other_locations.map((location, index) => (
            <View key={index} className="mb-4 last:mb-0">
              <InfoRow label="Location Name" value={location.location_name} />
              <InfoRow
                label="Address"
                value={`${location.address_line_1}${location.address_line_2 ? ', ' + location.address_line_2 : ''}`}
              />
              <InfoRow
                label="City, State"
                value={`${location.city}, ${location.state} ${location.zip_code}`}
              />
              <InfoRow
                label="Primary Location"
                value={location.is_primary ? 'Yes' : 'No'}
              />
              {index < profile.other_locations!.length - 1 && (
                <View className="h-px bg-gray-300 my-2" />
              )}
            </View>
          ))}
        </ProfileSection>
      )}

      {/* Medical Procedures */}
      {profile.medical_procedures && (
        <ProfileSection title="Medical Procedures">
          <InfoRow
            label="Currency"
            value={profile.medical_procedures.currency}
          />
          {profile.medical_procedures.medical_procedures &&
            profile.medical_procedures.medical_procedures.map(
              (procedure, index) => (
                <InfoRow
                  key={index}
                  label={procedure.procedure_name}
                  value={`${profile.medical_procedures!.currency || '$'} ${procedure.procedure_price}`}
                />
              )
            )}
          <InfoRow
            label="Consultation Types"
            value={
              profile.medical_procedures.consultation_types
                ? formatArray(profile.medical_procedures.consultation_types)
                : 'None'
            }
          />
          <InfoRow
            label="Insurance Accepted"
            value={
              profile.medical_procedures.insurance_accepted
                ? formatArray(profile.medical_procedures.insurance_accepted)
                : 'None'
            }
          />
        </ProfileSection>
      )}

      {/* Certifications */}
      {profile.certifications && profile.certifications.length > 0 && (
        <ProfileSection title="Certifications">
          {profile.certifications.map((cert, index) => (
            <View key={index} className="mb-3 last:mb-0">
              <InfoRow label="Title" value={cert.title} />
              <InfoRow label="Issuing Body" value={cert.issuing_body} />
              <InfoRow label="Date" value={formatDate(cert.certif_date)} />
              {index < profile.certifications!.length - 1 && (
                <View className="h-px bg-gray-300 my-2" />
              )}
            </View>
          ))}
        </ProfileSection>
      )}

      {/* Additional Information */}
      <ProfileSection title="Additional Information">
        <InfoRow label="About" value={profile.metadata?.about_you} />
        <InfoRow
          label="Additional Links"
          value={
            profile.metadata?.additional_links?.length
              ? `${profile.metadata.additional_links.length} links`
              : 'None'
          }
        />
        <InfoRow label="In Network" value={profile.in_network ? 'Yes' : 'No'} />
        <InfoRow
          label="Active Conversations"
          value={profile.active_patient_convos?.toString()}
        />
        <InfoRow
          label="Total Conversations"
          value={profile.total_patient_convos?.toString()}
        />
        <InfoRow
          label="Last Conversation"
          value={formatDate(profile.last_patient_convo)}
        />
      </ProfileSection>

      {/* Status Information */}
      <ProfileSection title="Status">
        <InfoRow label="Active" value={profile.is_active ? 'Yes' : 'No'} />
        <InfoRow label="Data Source" value={profile.data_source} />
        <InfoRow
          label="Test Data"
          value={profile.is_test_data ? 'Yes' : 'No'}
        />
        <InfoRow label="Created" value={formatDate(profile.created_at)} />
        <InfoRow label="Last Updated" value={formatDate(profile.updated_at)} />
      </ProfileSection>
    </View>
  );
};
