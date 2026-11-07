import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StandardScreenLayout } from '@/components/shared/layout';
import {
  useMedicationsData,
  useMedicationsOperations,
} from '@/hooks/patient/data';
import { MedicationData } from '@/stores/patientStore';
import { useDoctorName } from '@/hooks/doctor';
import { ThreeDotsLoader } from '@/components';

// Modern Medication Card Component
const MedicationCard: React.FC<{
  medication: MedicationData;
  hideStatus?: boolean;
  isSimplified?: boolean;
  isLast?: boolean;
}> = ({
  medication,
  hideStatus = false,
  isSimplified = false,
  isLast = false,
}) => {
    const { doctorName, isLoading: loadingDoctor } = useDoctorName(medication);

    // Get icon based on medication form
    const getFormIcon = (form: string | null | undefined): string => {
      const formLower = form?.toLowerCase() || '';
      if (formLower.includes('tablet') || formLower.includes('pill'))
        return 'pill';
      if (formLower.includes('capsule')) return 'capsule';
      if (
        formLower.includes('liquid') ||
        formLower.includes('syrup') ||
        formLower.includes('solution')
      )
        return 'water';
      if (formLower.includes('injection') || formLower.includes('syringe'))
        return 'needle';
      if (
        formLower.includes('cream') ||
        formLower.includes('ointment') ||
        formLower.includes('gel')
      )
        return 'lotion';
      if (formLower.includes('inhaler') || formLower.includes('spray'))
        return 'spray';
      if (formLower.includes('drop')) return 'eyedropper';
      if (formLower.includes('patch')) return 'bandage';
      return 'pill'; // default
    };

    // Convert medical abbreviations to readable text
    const humanizeFrequency = (frequency: string | null | undefined): string => {
      if (!frequency || frequency.toLowerCase() === 'n/a') return '';

      const freq = frequency.toUpperCase();
      const conversions: Record<string, string> = {
        QD: 'Once daily',
        BID: 'Twice daily',
        TID: 'Three times daily',
        QID: 'Four times daily',
        Q4H: 'Every 4 hours',
        Q6H: 'Every 6 hours',
        Q8H: 'Every 8 hours',
        Q12H: 'Every 12 hours',
        PRN: 'As needed',
        QOD: 'Every other day',
        QHS: 'At bedtime',
        QAM: 'Every morning',
        QPM: 'Every evening',
      };

      // Check for exact match first
      if (conversions[freq]) return conversions[freq];

      // Check if it contains any of the abbreviations
      for (const [abbr, readable] of Object.entries(conversions)) {
        if (freq.includes(abbr)) {
          return freq.replace(abbr, readable);
        }
      }

      return frequency;
    };

    // Get dose times based on frequency
    const getDoseTimes = (frequency: string | null | undefined): string[] => {
      const freq = frequency?.toUpperCase() || '';
      if (freq.includes('BID') || freq.includes('TWICE'))
        return ['8:00 AM', '8:00 PM'];
      if (freq.includes('TID') || freq.includes('THREE'))
        return ['8:00 AM', '2:00 PM', '8:00 PM'];
      if (freq.includes('QID') || freq.includes('FOUR'))
        return ['8:00 AM', '12:00 PM', '4:00 PM', '8:00 PM'];
      if (freq.includes('QD') || freq.includes('ONCE') || freq.includes('DAILY'))
        return ['8:00 AM'];
      if (freq.includes('QHS') || freq.includes('BEDTIME')) return ['10:00 PM'];
      if (freq.includes('QAM') || freq.includes('MORNING')) return ['8:00 AM'];
      if (freq.includes('QPM') || freq.includes('EVENING')) return ['8:00 PM'];
      return [];
    };

    // Calculate duration progress
    // Calculate duration progress
    const getDurationProgress = (medication: MedicationData) => {
      if (
        !medication.duration_days ||
        medication.days_taken === null ||
        medication.days_left === null
      )
        return null;

      const totalDays = medication.duration_days;
      const daysPassed = medication.days_taken;
      const daysRemaining = medication.days_left;

      // Guard against NaN: check for valid numbers and avoid division by zero
      const progress =
        totalDays > 0 && !isNaN(daysPassed) && !isNaN(totalDays)
          ? Math.min(Math.max((daysPassed / totalDays) * 100, 0), 100)
          : 0;

      return { progress, daysRemaining, totalDays };
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'active':
          return {
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            text: 'text-emerald-700',
            icon: '#059669',
          };
        case 'inactive':
          return {
            bg: 'bg-gray-50',
            border: 'border-gray-200',
            text: 'text-gray-600',
            icon: '#6B7280',
          };
        case 'completed':
          return {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            text: 'text-blue-700',
            icon: '#2563EB',
          };
        default:
          return {
            bg: 'bg-gray-50',
            border: 'border-gray-200',
            text: 'text-gray-600',
            icon: '#6B7280',
          };
      }
    };

    const statusColors = getStatusColor(medication.status);
    const formIcon = getFormIcon(medication.form);
    const readableFrequency = humanizeFrequency(medication.frequency);
    const doseTimes = getDoseTimes(medication.frequency);
    const durationProgress = getDurationProgress(medication);

    // Check if timing is redundant with frequency
    const isTimingRedundant =
      medication.timing &&
      (medication.timing.toUpperCase() === medication.frequency?.toUpperCase() ||
        medication.timing.toUpperCase() === readableFrequency.toUpperCase());

    return (
      <View
        className={`mb-4 overflow-hidden ${!isLast ? 'border-b border-gray-200' : ''
          }`}
      >
        {/* Medication Header */}
        <View className="px-5 pt-3 pb-2">
          <View className="flex-row items-center">
            <View className="rounded-full p-2 mr-3">
              <MaterialCommunityIcons
                name={formIcon as any}
                size={26}
                color="#EA580C"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-medium text-gray-900 mb-2.5">
                {medication.medication_name}
              </Text>

              {/* Dosage and Form Pills */}
              <View className="flex-row items-center flex-wrap">
                {medication.dose && medication.dose.toLowerCase() !== 'n/a' && (
                  <View className="bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200 mr-2 mb-2">
                    <Text className="text-sm font-semibold text-orange-700">
                      {medication.dose}
                    </Text>
                  </View>
                )}
                {medication.form && (
                  <View className="bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200 mb-2">
                    <Text className="text-sm font-medium text-gray-700 capitalize">
                      {medication.form}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Card Content */}
        <View className="px-5 py-4">
          {/* Creative Duration Progress - Only for Current medications */}
          {!isSimplified && durationProgress && (
            <View className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 mb-3">
              <View className="flex-row items-center mb-3">
                <View className="rounded-full p-2">
                  <MaterialCommunityIcons
                    name={'calendar-clock' as any}
                    size={18}
                    color="#EA580C"
                  />
                </View>
                <View className="ml-3">
                  <Text className="text-sm text-gray-500">
                    Treatment Duration
                  </Text>
                  <Text className="text-base font-medium text-gray-900">
                    {medication.duration_days} days
                  </Text>
                </View>
              </View>

              {/* Visual Progress with Stats */}
              <View className="flex-row items-center">
                {/* Days Taken */}
                <View className="flex-1 items-center bg-white rounded-xl p-3 border border-gray-200">
                  <Text className="text-2xl font-medium text-gray-900">
                    {durationProgress.totalDays - durationProgress.daysRemaining}
                  </Text>
                  <Text className="text-sm text-gray-500 mt-1">days taken</Text>
                </View>

                {/* Progress Circle or Bar */}
                <View className="items-center px-3">
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={20}
                    color="#9CA3AF"
                  />
                </View>

                {/* Days Remaining */}
                <View className="flex-1 items-center bg-orange-50 rounded-xl p-3 border border-orange-200">
                  <Text className="text-2xl font-medium text-orange-600">
                    {durationProgress.daysRemaining}
                  </Text>
                  <Text className="text-sm text-orange-700 mt-1">days left</Text>
                </View>
              </View>

              {/* Thin Progress Bar */}
              <View className="mt-3 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <LinearGradient
                  colors={['#FB923C', '#EA580C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    width: `${durationProgress.progress}%`,
                    height: '100%',
                    borderRadius: 9999,
                  }}
                />
              </View>
            </View>
          )}

          {/* Daily Schedule Timeline - Only for Current medications */}
          {!isSimplified && doseTimes.length > 0 && (
            <View className="bg-gray-50 rounded-2xl p-3 mb-3 border border-gray-200">
              <View className="flex-row justify-between items-center">
                {doseTimes.map((time, index) => (
                  <View key={index} className="items-center flex-1">
                    <View className="bg-white rounded-full p-2.5 border border-gray-300 mb-1.5">
                      <MaterialCommunityIcons
                        name={formIcon as any}
                        size={18}
                        color="#EA580C"
                      />
                    </View>
                    <Text className="text-sm font-semibold text-gray-900">
                      {time}
                    </Text>
                    {medication.timing &&
                      medication.timing.toLowerCase() !== 'n/a' &&
                      !isTimingRedundant && (
                        <Text className="text-sm text-gray-500 capitalize mt-0.5">
                          {medication.timing}
                        </Text>
                      )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Simple Frequency text for Previous medications */}
          {isSimplified &&
            medication.frequency &&
            medication.frequency.toLowerCase() !== 'n/a' && (
              <View className="rounded-xl px-4 py-3 mb-3">
                <View className="flex-row items-center">
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={16}
                    color="#6B7280"
                  />
                  <Text className="text-md text-gray-900 ml-2">
                    {readableFrequency}
                  </Text>
                  {medication.duration_days && (
                    <Text className="text-sm text-gray-500 ml-2">
                      • {medication.duration_days} days
                    </Text>
                  )}
                </View>
              </View>
            )}

          {/* Prescription Details - Merged Box */}
          <View className="rounded-xl p-4">
            {/* Doctor Info */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center flex-1">
                <MaterialCommunityIcons name="doctor" size={18} color="#EA580C" />
                <View className="flex-1 ml-3">
                  <Text className="text-sm text-gray-500">Prescribed by</Text>
                  <Text className="text-base font-medium text-gray-900 mt-0.5">
                    {loadingDoctor ? 'Loading...' : `Dr. ${doctorName}`}
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-sm text-gray-500">Prescribed on</Text>
                <Text className="text-base font-medium text-gray-900 mt-0.5">
                  {medication.prescribed_at && medication.prescribed_at !== 'N/A'
                    ? (() => {
                      const date = new Date(medication.prescribed_at);
                      return isNaN(date.getTime())
                        ? 'N/A'
                        : date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        });
                    })()
                    : 'N/A'}
                </Text>
              </View>
            </View>

            {/* Purpose */}
            {medication.purpose && medication.purpose.toLowerCase() !== 'n/a' && (
              <View className="flex-row items-start mb-4">
                <MaterialCommunityIcons name="target" size={16} color="#EA580C" />
                <View className="ml-3 flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Purpose</Text>
                  <Text className="text-base text-gray-900 font-medium">
                    {medication.purpose}
                  </Text>
                </View>
              </View>
            )}

            {/* Instructions */}
            {medication.instructions && (
              <View className="flex-row items-start">
                <MaterialCommunityIcons
                  name="information-outline"
                  size={16}
                  color="#EA580C"
                />
                <View className="ml-3 flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Instructions</Text>
                  <Text className="text-base text-gray-900">
                    {medication.instructions}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

// Clean Tab Switcher with Orange Theme
const ModernTabs: React.FC<{
  activeTab: 'current' | 'previous';
  onTabChange: (tab: 'current' | 'previous') => void;
  currentCount: number;
  previousCount: number;
}> = ({ activeTab, onTabChange, currentCount, previousCount }) => {
  return (
    <View className="bg-white border-b border-gray-200">
      <View className="flex-row px-4">
        {/* Current Tab */}
        <TouchableOpacity
          onPress={() => onTabChange('current')}
          className="flex-1 py-4 border-b-2"
          style={{
            borderBottomColor:
              activeTab === 'current' ? '#EA580C' : 'transparent',
          }}
        >
          <View className="flex-row items-center justify-center">
            <Text
              className={`text-base font-semibold ${activeTab === 'current' ? 'text-orange-600' : 'text-gray-500'
                }`}
            >
              Current
            </Text>
            {currentCount > 0 && (
              <View
                className={`ml-2 px-2 py-0.5 rounded-full ${activeTab === 'current' ? 'bg-orange-100' : 'bg-gray-100'
                  }`}
              >
                <Text
                  className={`text-xs font-semibold ${activeTab === 'current'
                      ? 'text-orange-600'
                      : 'text-gray-600'
                    }`}
                >
                  {currentCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Previous Tab */}
        <TouchableOpacity
          onPress={() => onTabChange('previous')}
          className="flex-1 py-4 border-b-2"
          style={{
            borderBottomColor:
              activeTab === 'previous' ? '#EA580C' : 'transparent',
          }}
        >
          <View className="flex-row items-center justify-center">
            <Text
              className={`text-base font-semibold ${activeTab === 'previous' ? 'text-orange-600' : 'text-gray-500'
                }`}
            >
              Previous
            </Text>
            {previousCount > 0 && (
              <View
                className={`ml-2 px-2 py-0.5 rounded-full ${activeTab === 'previous' ? 'bg-orange-100' : 'bg-gray-100'
                  }`}
              >
                <Text
                  className={`text-xs font-semibold ${activeTab === 'previous'
                      ? 'text-orange-600'
                      : 'text-gray-600'
                    }`}
                >
                  {previousCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Empty State Component
const EmptyState: React.FC<{ message: string }> = ({ message }) => {
  return (
    <View className="items-center justify-center py-16 px-6">
      <View className="bg-gray-100 rounded-full p-6 mb-4">
        <MaterialCommunityIcons name="pill-off" size={48} color="#9CA3AF" />
      </View>
      <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">
        No Medications Found
      </Text>
      <Text className="text-sm text-gray-500 text-center">{message}</Text>
    </View>
  );
};

// Main Medications Screen
const MedicationsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'current' | 'previous'>('current');
  const [isRetrying, setIsRetrying] = useState(false);

  // useMedicationsData automatically uses the correct patient ID from PatientViewContext
  const {
    isLoading,
    activeMedications,
    pastMedications,
    inactiveMedications,
    completedMedications,
    error,
    selectedDependent,
  } = useMedicationsData();

  const { refreshMedications, isSaving } = useMedicationsOperations();

  // Current medications are active
  const currentMedications = activeMedications;

  // Previous medications are past + inactive + completed
  const previousMedications = [
    ...pastMedications,
    ...inactiveMedications,
    ...completedMedications,
  ];

  const handleRefresh = async () => {
    await refreshMedications(selectedDependent);
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await refreshMedications(selectedDependent);
    setIsRetrying(false);
  };

  if (isLoading || isRetrying) {
    return (
      <StandardScreenLayout title="Medications" bottomSpacingColor="bg-gray-50">
        <View className="flex-1 items-center justify-center py-20 px-4">
          <ThreeDotsLoader size={24} />
        </View>
      </StandardScreenLayout>
    );
  }

  if (error) {
    return (
      <StandardScreenLayout title="Medications" bottomSpacingColor="bg-gray-50">
        <View className="flex-1 items-center justify-center py-20 px-4">
          <Text className="text-center text-gray-700 font-semibold text-base mb-4">
            An error occurred while fetching your medications.
          </Text>
          <Text
            className="text-center text-orange-600 font-semibold"
            onPress={handleRetry}
          >
            Tap to retry
          </Text>
        </View>
      </StandardScreenLayout>
    );
  }

  return (
    <StandardScreenLayout title="Medications">
      {/* Tabs */}
      <ModernTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentCount={currentMedications.length}
        previousCount={previousMedications.length}
      />

      {/* Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isSaving}
            onRefresh={handleRefresh}
          />
        }
      >
        {isLoading ? (
          <ThreeDotsLoader size={24} />
        ) : (
          <View className="px-4 pt-4 pb-8">
            {/* Current Tab */}
            {activeTab === 'current' && (
              <>
                {currentMedications.length > 0 ? (
                  currentMedications.map((medication, index) => (
                    <MedicationCard
                      key={`${medication.id}-${medication.medication_name}`}
                      medication={medication}
                      isLast={index === currentMedications.length - 1}
                    />
                  ))
                ) : (
                  <EmptyState message="You don't have any active medications at the moment." />
                )}
              </>
            )}

            {/* Previous Tab */}
            {activeTab === 'previous' && (
              <>
                {previousMedications.length > 0 ? (
                  previousMedications.map((medication, index) => (
                    <MedicationCard
                      key={`${medication.id}-${medication.medication_name}`}
                      medication={medication}
                      isSimplified={true}
                      isLast={index === previousMedications.length - 1}
                    />
                  ))
                ) : (
                  <EmptyState message="No previous medications to display." />
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </StandardScreenLayout>
  );
};

export default MedicationsScreen;
