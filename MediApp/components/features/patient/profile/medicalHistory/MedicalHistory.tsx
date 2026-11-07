import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMedicalHistoryData, useMedicalHistoryOperations } from '@/hooks';
import { usePatientStore } from '@/stores/patientStore';
import { MedicalHistoryHeader } from './MedicalHistoryHeader';
import { MedicalHistorySection } from './MedicalHistorySection';
import { MedicalHistoryEmptyState } from './MedicalHistoryEmptyState';
import { MedicalHistoryErrorState } from './MedicalHistoryErrorState';
import {
  InfoNotice,
  HorizontalFilterTabs,
  Card,
  ThreeDotsLoader,
} from '@/components/shared';

export const MedicalHistory: React.FC = () => {
  const {
    medicalHistoryData,
    isLoading,
    error,
    currentPatientName,
    selectedDependent,
    isEmpty,
    hasVisits,
    recentVisits,
  } = useMedicalHistoryData();

  const { refreshMedicalHistory } = useMedicalHistoryOperations();

  const { setError } = usePatientStore();

  // Filter state
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  // Filter options for visit types
  const filterOptions = [
    { key: 'all', label: 'All Visits', icon: 'view-list' },
    { key: 'recent', label: 'Recent', icon: 'clock-outline' },
    { key: 'consultation', label: 'Consultation', icon: 'account-voice' },
    { key: 'procedure', label: 'Procedure', icon: 'medical-bag' },
    { key: 'exam', label: 'Exam', icon: 'stethoscope' },
    { key: 'prescription', label: 'Prescription', icon: 'pill' },
    { key: 'follow-up', label: 'Follow-up', icon: 'calendar-check' },
    { key: 'check-up', label: 'Check-up', icon: 'clipboard-pulse' },
    { key: 'emergency', label: 'Emergency', icon: 'hospital' },
    { key: 'other', label: 'Other', icon: 'file-document' },
  ];

  // Filter visits by type
  const filteredVisits = useMemo(() => {
    if (selectedFilter === 'recent') {
      return recentVisits;
    }

    if (selectedFilter === 'all') {
      return medicalHistoryData.pastVisits;
    }

    return medicalHistoryData.pastVisits.filter(visit => {
      const visitType = visit.visit_type.toLowerCase();

      // Handle variations in visit type naming
      switch (selectedFilter) {
        case 'consultation':
          return (
            visitType.includes('consultation') || visitType.includes('consult')
          );
        case 'procedure':
          return (
            visitType.includes('procedure') ||
            visitType.includes('surgery') ||
            visitType.includes('operation')
          );
        case 'exam':
          return (
            visitType.includes('exam') ||
            visitType.includes('examination') ||
            visitType.includes('test')
          );
        case 'prescription':
          return (
            visitType.includes('prescription') ||
            visitType.includes('medication') ||
            visitType.includes('med')
          );
        case 'follow-up':
          return visitType.includes('follow') || visitType.includes('followup');
        case 'check-up':
          return (
            visitType.includes('check') ||
            visitType.includes('checkup') ||
            visitType.includes('general') ||
            visitType.includes('routine')
          );
        case 'emergency':
          return (
            visitType.includes('emergency') ||
            visitType.includes('urgent') ||
            visitType.includes('er')
          );
        case 'other':
          return (
            !visitType.includes('consultation') &&
            !visitType.includes('consult') &&
            !visitType.includes('procedure') &&
            !visitType.includes('surgery') &&
            !visitType.includes('operation') &&
            !visitType.includes('exam') &&
            !visitType.includes('examination') &&
            !visitType.includes('test') &&
            !visitType.includes('prescription') &&
            !visitType.includes('medication') &&
            !visitType.includes('med') &&
            !visitType.includes('follow') &&
            !visitType.includes('followup') &&
            !visitType.includes('check') &&
            !visitType.includes('checkup') &&
            !visitType.includes('general') &&
            !visitType.includes('routine') &&
            !visitType.includes('emergency') &&
            !visitType.includes('urgent') &&
            !visitType.includes('er')
          );
        default:
          return visitType === selectedFilter;
      }
    });
  }, [medicalHistoryData.pastVisits, selectedFilter, recentVisits]);

  // Count visits by type
  const getVisitCountByType = useCallback(
    (filterKey: string) => {
      if (filterKey === 'recent') {
        return recentVisits.length;
      }

      if (filterKey === 'all') {
        return medicalHistoryData.totalVisitsCount;
      }

      return medicalHistoryData.pastVisits.filter(visit => {
        const visitType = visit.visit_type.toLowerCase();

        switch (filterKey) {
          case 'consultation':
            return (
              visitType.includes('consultation') ||
              visitType.includes('consult')
            );
          case 'procedure':
            return (
              visitType.includes('procedure') ||
              visitType.includes('surgery') ||
              visitType.includes('operation')
            );
          case 'exam':
            return (
              visitType.includes('exam') ||
              visitType.includes('examination') ||
              visitType.includes('test')
            );
          case 'prescription':
            return (
              visitType.includes('prescription') ||
              visitType.includes('medication') ||
              visitType.includes('med')
            );
          case 'follow-up':
            return (
              visitType.includes('follow') || visitType.includes('followup')
            );
          case 'check-up':
            return (
              visitType.includes('check') ||
              visitType.includes('checkup') ||
              visitType.includes('general') ||
              visitType.includes('routine')
            );
          case 'emergency':
            return (
              visitType.includes('emergency') ||
              visitType.includes('urgent') ||
              visitType.includes('er')
            );
          case 'other':
            return (
              !visitType.includes('consultation') &&
              !visitType.includes('consult') &&
              !visitType.includes('procedure') &&
              !visitType.includes('surgery') &&
              !visitType.includes('operation') &&
              !visitType.includes('exam') &&
              !visitType.includes('examination') &&
              !visitType.includes('test') &&
              !visitType.includes('prescription') &&
              !visitType.includes('medication') &&
              !visitType.includes('med') &&
              !visitType.includes('follow') &&
              !visitType.includes('followup') &&
              !visitType.includes('check') &&
              !visitType.includes('checkup') &&
              !visitType.includes('general') &&
              !visitType.includes('routine') &&
              !visitType.includes('emergency') &&
              !visitType.includes('urgent') &&
              !visitType.includes('er')
            );
          default:
            return visitType === filterKey;
        }
      }).length;
    },
    [
      medicalHistoryData.pastVisits,
      medicalHistoryData.totalVisitsCount,
      recentVisits,
    ]
  );

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await refreshMedicalHistory(selectedDependent);
  }, [refreshMedicalHistory, selectedDependent]);

  // Handle clear error
  const handleClearError = useCallback(() => {
    setError(null);
  }, [setError]);

  // Handle filter change
  const handleFilterChange = useCallback((filterKey: string) => {
    setSelectedFilter(filterKey);
  }, []);

  // Show loading skeleton
  if (isLoading) {
    return <ThreeDotsLoader size={24} />;
  }

  // Show error state
  if (error) {
    return (
      <MedicalHistoryErrorState
        error={error}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        onClearError={handleClearError}
      />
    );
  }

  // Show skeleton on initial load (when there's no data yet)
  if (isLoading) {
    return <ThreeDotsLoader size={24} />;
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor="#F05C0C"
            colors={['#F05C0C']}
          />
        }
      >
        <View className="px-4 py-6">
          {/* Header */}
          <MedicalHistoryHeader currentPatientName={currentPatientName} />

          {/* Show empty state if no visits */}
          {isEmpty && (
            <MedicalHistoryEmptyState currentPatientName={currentPatientName} />
          )}

          {/* Show content if there are visits */}
          {hasVisits && (
            <>
              <HorizontalFilterTabs
                options={filterOptions.map(option => ({
                  ...option,
                  count: getVisitCountByType(option.key),
                }))}
                selectedKey={selectedFilter}
                onFilterChange={handleFilterChange}
                variant="enhanced"
                showCount={true}
                title="Filter by Visit Type"
              />
              <Card className="p-4">
                {/* Filtered Visits Count - Enhanced Design */}
                {selectedFilter !== 'all' && selectedFilter !== 'recent' && (
                  <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200 shadow-sm flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="bg-orange-100 rounded-lg p-2 mr-3">
                        <MaterialCommunityIcons
                          name={
                            filterOptions.find(f => f.key === selectedFilter)
                              ?.icon as any
                          }
                          size={20}
                          color="#EA580C"
                        />
                      </View>
                      <Text className="text-base font-bold text-gray-900">
                        {`${filterOptions.find(f => f.key === selectedFilter)?.label} Visits`}
                      </Text>
                    </View>
                    <View className="bg-orange-100 rounded-full px-3.5 py-1.5 border border-orange-200">
                      <Text className="text-orange-800 text-sm font-bold">
                        {filteredVisits.length}{' '}
                        {filteredVisits.length === 1 ? 'visit' : 'visits'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Display Visits Section */}
                {filteredVisits.length > 0 ? (
                  <MedicalHistorySection
                    title={
                      selectedFilter === 'recent'
                        ? 'Recent Visits'
                        : selectedFilter === 'all'
                          ? 'All Visits'
                          : `${filterOptions.find(f => f.key === selectedFilter)?.label} Visits`
                    }
                    visits={filteredVisits}
                    count={filteredVisits.length}
                    isLoading={isLoading}
                    onRefresh={handleRefresh}
                    showCount={false}
                  />
                ) : (
                  <View className="bg-gradient-to-b from-gray-50 to-gray-100 rounded-2xl p-10 items-center border-2 border-dashed border-gray-300">
                    <View className="bg-white rounded-full p-4 mb-4 shadow-sm">
                      <MaterialCommunityIcons
                        name={
                          filterOptions.find(f => f.key === selectedFilter)
                            ?.icon as any
                        }
                        size={48}
                        color="#9CA3AF"
                      />
                    </View>
                    <Text className="text-xl font-bold text-gray-700 mb-2 text-center">
                      No Visits Found
                    </Text>
                    <Text className="text-sm text-gray-500 text-center max-w-xs">
                      {selectedFilter === 'recent'
                        ? 'No recent visits found in your medical history.'
                        : selectedFilter === 'all'
                          ? 'No visits found in your medical history.'
                          : `No ${filterOptions.find(f => f.key === selectedFilter)?.label.toLowerCase()} visits found in your medical history.`}
                    </Text>
                  </View>
                )}
              </Card>
            </>
          )}

          <InfoNotice
            title="Secure Electronic Medical Records"
            message="Your complete medical history is automatically maintained and
                  securely updated by your healthcare providers through our
                  encrypted EMR system."
            iconName="shield-check"
          />
        </View>
      </ScrollView>
    </View>
  );
};
