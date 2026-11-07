import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MedicalVisitData } from '@/stores/patientStore';
import { getDoctorById } from '@/services/doctor';
import { Card } from '@/components/shared/ui';

// ... (imports and interfaces remain the same)

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const DoctorInfoSection: React.FC<{
  visit: MedicalVisitData;
  formatDate: (_date: string) => string;
}> = ({ visit, formatDate }) => {
  const [doctorName, setDoctorName] = React.useState<string>('');

  React.useEffect(() => {
    let mounted = true;
    const fetchDoctor = async () => {
      try {
        const doctor = await getDoctorById(visit.doctor_id);
        if (mounted && doctor) {
          const name =
            doctor.full_name ||
            (doctor.first_name && doctor.last_name
              ? `${doctor.first_name} ${doctor.last_name}`
              : '') ||
            doctor.name ||
            `Doctor #${visit.doctor_id}`;
          setDoctorName(name);
        }
      } catch {
        // ignore error
      }
    };

    if (visit.doctor_id) {
      fetchDoctor();
    }

    return () => {
      mounted = false;
    };
  }, [visit.doctor_id]);

  return (
    <View className="flex-row items-center justify-between mt-2">
      <View className="flex-row items-center">
        <MaterialCommunityIcons
          name="doctor"
          size={14}
          color="#6B7280"
          className="mr-1"
        />
        <Text className="text-xs text-gray-500">
          {doctorName || `Doctor #${visit.doctor_id}`}
        </Text>
      </View>
      <Text className="text-xs text-gray-400">{formatDate(visit.date)}</Text>
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
  const renderVisitCard = (visit: MedicalVisitData) => (
    <Card
      key={`${visit.visit_id}-${visit.date}`}
      className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-4"
    >
      {/* Header with visit type and date */}
      <View className="flex-row items-start justify-between mb-4">
        {/* ... content ... */}
      </View>

      {/* Visit details */}
      {visit.visit_details && (
        <View className="mb-4">
          <Text className="text-sm text-gray-700 leading-6">
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
      <View className="flex-row flex-wrap mb-4">
        {visit.diagnosis && (
          <View className="bg-blue-50 rounded-xl px-3.5 py-2.5 border border-blue-200 mr-2 mb-2">
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name="clipboard-text"
                size={16}
                color="#2563EB"
              />
              <Text className="text-sm font-semibold text-blue-700 ml-2">
                {visit.diagnosis}
              </Text>
            </View>
          </View>
        )}

        {visit.treatment && (
          <View className="bg-green-50 rounded-xl px-3.5 py-2.5 border border-green-200 mb-2">
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name="medical-bag"
                size={16}
                color="#059669"
              />
              <Text className="text-sm font-semibold text-green-700 ml-2">
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
        <View className="bg-blue-50 rounded-xl p-4 border border-blue-200 mt-4">
          <View className="flex-row items-start">
            <MaterialCommunityIcons
              name="note-text"
              size={16}
              color="#2563EB"
              className="mt-0.5"
            />
            <Text className="text-sm text-blue-800 ml-2.5 flex-1 leading-5">
              {visit.notes}
            </Text>
          </View>
        </View>
      )}
    </Card>
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
