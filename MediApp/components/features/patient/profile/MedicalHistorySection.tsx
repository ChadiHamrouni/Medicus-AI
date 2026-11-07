import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MedicalVisitData } from '@/stores/patientStore';
import { useDoctorName } from '@/hooks/doctor';

interface DoctorInfoSectionProps {
  visit: MedicalVisitData;
  formatDate: (_dateString: string) => string;
}

const DoctorInfoSection: React.FC<DoctorInfoSectionProps> = ({
  visit,
  formatDate,
}) => {
  // Try to extract doctor name from visit_details for Prescription visits
  let doctorNameFromDetails = '';
  if (visit.visit_type === 'Prescription' && visit.visit_details) {
    try {
      const details = JSON.parse(visit.visit_details);
      doctorNameFromDetails = details.prescribed_by || '';
    } catch {
      // Ignore parse errors
    }
  }

  const medicationLikeObject = {
    prescribed_by:
      doctorNameFromDetails ||
      (visit.doctor_id ? `Doctor ${visit.doctor_id}` : 'Unknown Doctor'),
    // Add other required fields with defaults
    prescription_id: visit.visit_id,
    name: 'Visit',
    dosage: '',
    frequency: '',
    duration: '',
    purpose: '',
    category: '',
    timing: '',
    form: '',
    status: 'active' as const,
    date_prescribed: visit.date,
    instructions: '',
    special_instructions: '',
  };

  const { doctorName, isLoading } = useDoctorName(medicationLikeObject);

  return (
    <View className="bg-gray-50 rounded-lg p-3 mb-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <MaterialCommunityIcons name="doctor" size={16} color="#6B7280" />
          <Text className="text-sm text-gray-700 font-medium ml-2">
            {doctorName}
            {isLoading && (
              <Text className="text-xs text-gray-400 ml-1">loading...</Text>
            )}
          </Text>
        </View>
        <Text className="text-xs text-gray-500">
          {visit.end_time ? formatDate(visit.end_time) : formatDate(visit.date)}
        </Text>
      </View>
    </View>
  );
};

interface MedicalHistorySectionProps {
  title: string;
  visits: MedicalVisitData[];
  count: number;
  isLoading: boolean;
  onRefresh: () => void;
  emptyMessage?: string;
  showCount?: boolean;
}

export const MedicalHistorySection: React.FC<MedicalHistorySectionProps> = ({
  title,
  visits,
  count,
  isLoading,
  onRefresh,
  emptyMessage,
  showCount = true,
}) => {
  const getVisitTypeIcon = (visitType: string) => {
    switch (visitType.toLowerCase()) {
      case 'checkup':
      case 'general':
        return (
          <MaterialCommunityIcons
            name="stethoscope"
            size={16}
            color="#10B981"
          />
        );
      case 'emergency':
        return (
          <MaterialCommunityIcons
            name="medical-bag"
            size={16}
            color="#EF4444"
          />
        );
      case 'consultation':
        return (
          <MaterialCommunityIcons
            name="account-voice"
            size={16}
            color="#3B82F6"
          />
        );
      case 'follow-up':
        return (
          <MaterialCommunityIcons
            name="calendar-check"
            size={16}
            color="#8B5CF6"
          />
        );
      case 'surgery':
        return (
          <MaterialCommunityIcons name="hospital" size={16} color="#F59E0B" />
        );
      default:
        return (
          <MaterialCommunityIcons
            name="clipboard-pulse"
            size={16}
            color="#6B7280"
          />
        );
    }
  };

  const getVisitTypeColor = (visitType: string) => {
    switch (visitType.toLowerCase()) {
      case 'checkup':
      case 'general':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'emergency':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'consultation':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'follow-up':
        return 'bg-purple-50 border-purple-200 text-purple-700';
      case 'surgery':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const renderVisitCard = (visit: MedicalVisitData) => (
    <View
      key={`${visit.visit_id}-${visit.date}`}
      className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-3"
    >
      {/* Header with visit type and date */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900 mb-1">
            {visit.visit_type} Visit
          </Text>
          <Text className="text-sm text-gray-500 mb-2">
            {formatDate(visit.date)}
          </Text>
        </View>
        <View
          className={`px-2 py-1 rounded-full border ${getVisitTypeColor(visit.visit_type)}`}
        >
          <View className="flex-row items-center">
            {getVisitTypeIcon(visit.visit_type)}
            <Text className="text-xs font-semibold ml-1 capitalize">
              {visit.visit_type}
            </Text>
          </View>
        </View>
      </View>

      {/* Visit details */}
      {visit.visit_details && (
        <View className="mb-3">
          <Text className="text-sm text-gray-700 leading-5">
            {(() => {
              // For prescription visits, parse and format the details
              if (visit.visit_type === 'Prescription') {
                try {
                  const details = JSON.parse(visit.visit_details);
                  if (details.medications && details.medications.length > 0) {
                    const med = details.medications[0];
                    const parts = [];

                    // Add name
                    if (med.name) parts.push(med.name);

                    // Add dosage if not N/A
                    if (med.dosage && med.dosage.toLowerCase() !== 'n/a') {
                      parts.push(med.dosage);
                    }

                    // Add frequency in parentheses if not N/A
                    if (
                      med.frequency &&
                      med.frequency.toLowerCase() !== 'n/a'
                    ) {
                      const lastPart = parts[parts.length - 1];
                      parts[parts.length - 1] =
                        `${lastPart} (${med.frequency})`;
                    }

                    return parts.join(' - ');
                  }
                } catch {
                  // If parsing fails, just show as-is
                }
              }
              // For completed exams, parse and format the details
              if (visit.visit_type === 'Exam') {
                try {
                  const details = JSON.parse(visit.visit_details);
                  return (
                    details.exam_summary || `${details.exam_type} - Completed`
                  );
                } catch {
                  // If parsing fails, just show as-is
                }
              }
              return visit.visit_details;
            })()}
          </Text>
        </View>
      )}

      {/* Additional information */}
      <View className="flex-row flex-wrap gap-2 mb-3">
        {visit.diagnosis && (
          <View className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name="clipboard-text"
                size={14}
                color="#2563EB"
              />
              <Text className="text-sm font-semibold text-blue-700 ml-1">
                {visit.diagnosis}
              </Text>
            </View>
          </View>
        )}

        {visit.treatment && (
          <View className="bg-green-50 rounded-lg px-3 py-2 border border-green-200">
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name="medical-bag"
                size={14}
                color="#059669"
              />
              <Text className="text-sm font-semibold text-green-700 ml-1">
                {visit.treatment}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Doctor and time info */}
      <DoctorInfoSection visit={visit} formatDate={formatDate} />

      {/* Notes */}
      {visit.notes && (
        <View className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <View className="flex-row items-start">
            <MaterialCommunityIcons
              name="note-text"
              size={14}
              color="#2563EB"
              className="mt-0.5"
            />
            <Text className="text-sm text-blue-800 ml-2 flex-1">
              {visit.notes}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  if (visits.length === 0 && emptyMessage) {
    return null; // Don't render the section if empty and there's an empty message to show
  }

  return (
    <View className="mb-6">
      {showCount && (
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-base font-semibold text-gray-900">{title}</Text>
          <View
            className={`rounded-full px-3 py-1 ${
              title.includes('Recent') ? 'bg-blue-100' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                title.includes('Recent') ? 'text-blue-700' : 'text-gray-700'
              }`}
            >
              {count} visit{count !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
      >
        {visits.map(renderVisitCard)}
      </ScrollView>
    </View>
  );
};
