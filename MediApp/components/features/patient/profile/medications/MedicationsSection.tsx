import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MedicationData } from '@/stores/patientStore';
import { useDoctorName } from '@/hooks/doctor';

interface DoctorInfoSectionProps {
  medication: MedicationData;
  formatDate: (_dateString: string) => string;
}

const DoctorInfoSection: React.FC<DoctorInfoSectionProps> = ({
  medication,
  formatDate,
}) => {
  const { doctorName, isLoading } = useDoctorName(medication);

  return (
    <View className="bg-gray-50 rounded-lg p-3 mb-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <MaterialCommunityIcons name="doctor" size={16} color="#6B7280" />
          <Text className="text-sm text-gray-700 font-medium ml-2">
            Prescribed by {doctorName}
            {isLoading && (
              <Text className="text-xs text-gray-400 ml-1">loading...</Text>
            )}
          </Text>
        </View>
        <Text className="text-xs text-gray-500">
          {formatDate(medication.date_prescribed)}
        </Text>
      </View>
    </View>
  );
};

interface MedicationsSectionProps {
  title: string;
  medications: MedicationData[];
  count?: number;
  isLoading: boolean;
  onRefresh: () => void;
  emptyMessage?: string;
  showCount?: boolean;
}

export const MedicationsSection: React.FC<MedicationsSectionProps> = ({
  title,
  medications,
  isLoading,
  onRefresh,
  emptyMessage,
}) => {
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

  const calculateDueDate = (dateString: string, duration: string) => {
    try {
      const startDate = new Date(dateString);
      if (isNaN(startDate.getTime())) return null;

      // Parse duration (e.g., "30 days", "2 weeks", "3 months")
      const durationMatch = duration.match(/(\d+)\s*(day|week|month|year)s?/i);
      if (!durationMatch) return null;

      const amount = parseInt(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();

      const dueDate = new Date(startDate);
      switch (unit) {
        case 'day':
          dueDate.setDate(dueDate.getDate() + amount);
          break;
        case 'week':
          dueDate.setDate(dueDate.getDate() + amount * 7);
          break;
        case 'month':
          dueDate.setMonth(dueDate.getMonth() + amount);
          break;
        case 'year':
          dueDate.setFullYear(dueDate.getFullYear() + amount);
          break;
      }

      return dueDate;
    } catch {
      return null;
    }
  };

  const renderMedicationCard = (medication: MedicationData) => {
    const dueDate = calculateDueDate(
      medication.date_prescribed,
      medication.duration
    );
    const isDueSoon =
      dueDate && dueDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000; // Due within 7 days
    const isOverdue = dueDate && dueDate.getTime() < Date.now();

    return (
      <View
        key={`${medication.prescription_id}-${medication.name}`}
        className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-3"
      >
        {/* Header with medication name and due date */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900 mb-1">
              {medication.name}
            </Text>
            {medication.form && (
              <Text className="text-sm text-gray-500 mb-2 capitalize">
                {medication.form}
              </Text>
            )}
          </View>
          {dueDate && (
            <View
              className={`px-2 py-1 rounded-lg border ${
                isOverdue
                  ? 'bg-red-50 border-red-200'
                  : isDueSoon
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-blue-50 border-blue-200'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  isOverdue
                    ? 'text-red-700'
                    : isDueSoon
                      ? 'text-orange-700'
                      : 'text-blue-700'
                }`}
              >
                {isOverdue ? 'Overdue' : 'Due'}{' '}
                {formatDate(dueDate.toISOString())}
              </Text>
            </View>
          )}
        </View>

        {/* Dosage and timing info */}
        <View className="flex-row flex-wrap mb-3">
          {medication.dosage && medication.dosage.toLowerCase() !== 'n/a' && (
            <View className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-200 mr-2 mb-2">
              <View className="flex-row items-center">
                <MaterialCommunityIcons name="pill" size={14} color="#2563EB" />
                <Text className="text-sm font-semibold text-blue-700 ml-1">
                  {medication.dosage}
                </Text>
              </View>
            </View>
          )}

          {medication.frequency &&
            medication.frequency.toLowerCase() !== 'n/a' && (
              <View className="bg-purple-50 rounded-lg px-3 py-2 border border-purple-200 mr-2 mb-2">
                <View className="flex-row items-center">
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={14}
                    color="#7C3AED"
                  />
                  <Text className="text-sm font-semibold text-purple-700 ml-1">
                    {medication.frequency}
                  </Text>
                </View>
              </View>
            )}

          {medication.duration &&
            medication.duration.toLowerCase() !== 'n/a' && (
              <View className="bg-orange-50 rounded-lg px-3 py-2 border border-orange-200 mb-2">
                <View className="flex-row items-center">
                  <MaterialCommunityIcons
                    name="calendar-clock"
                    size={14}
                    color="#EA580C"
                  />
                  <Text className="text-sm font-semibold text-orange-700 ml-1">
                    {medication.duration}
                  </Text>
                </View>
              </View>
            )}
        </View>

        {/* Doctor and date info */}
        <DoctorInfoSection medication={medication} formatDate={formatDate} />

        {/* Instructions */}
        {(medication.special_instructions || medication.instructions) && (
          <View className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <View className="flex-row items-start">
              <MaterialCommunityIcons
                name="information"
                size={14}
                color="#D97706"
                className="mt-0.5"
              />
              <Text className="text-sm text-yellow-800 ml-2 flex-1">
                {medication.special_instructions || medication.instructions}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (medications.length === 0 && emptyMessage) {
    return null; // Don't render the section if empty and there's an empty message to show
  }

  return (
    <View className="mb-6">
      {title && (
        <View className="mb-4">
          <Text className="text-base font-semibold text-gray-900">{title}</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
      >
        {medications.map(renderMedicationCard)}
      </ScrollView>
    </View>
  );
};
