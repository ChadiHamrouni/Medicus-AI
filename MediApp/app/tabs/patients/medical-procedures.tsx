import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Linking, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StandardScreenLayout } from '@/components/shared/layout';
import {
  DetailModal,
  DetailCard,
  DetailCardRow,
} from '@/components/shared/ui/Modal';
import { ThreeDotsLoader } from '@/components/shared/ui';
import { useMedicalProcedures } from '@/hooks/patient/useMedicalProcedures';
import { usePatientView } from '@/contexts/PatientViewContext';
import { MedicalProcedure } from '@/services';
import { addToCalendar } from '@/utils/calendar';
import { openInMaps } from '@/utils/geolocation';

const ProcedureCard: React.FC<{
  procedure: MedicalProcedure;
  onPress: () => void;
  isLast?: boolean;
  disabled?: boolean;
}> = ({ procedure, onPress, isLast, disabled }) => {
  const getProcedureIcon = (): React.ComponentProps<
    typeof MaterialCommunityIcons
  >['name'] => {
    return 'medical-bag';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '#F05C0C';
      case 'active':
        return '#D97706';
      case 'completed':
        return '#059669';
      case 'cancelled':
      case 'missed':
        return '#4B5563';
      default:
        return '#4B5563';
    }
  };

  const statusColor = getStatusColor(procedure.status);
  const procedureIcon = getProcedureIcon();

  const dateObj = new Date(procedure.scheduled_date);
  const dayOfMonth = dateObj.getDate();
  const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  let timeStr = 'TBD';
  if (procedure.scheduled_time) {
    const [hours, minutes] = procedure.scheduled_time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    timeStr = `${hours12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }

  const handleLocationPress = () => {
    const loc =
      (procedure.location?.street
        ? `${procedure.location.street}, ${procedure.location.city || ''}`
        : typeof procedure.location === 'string'
          ? procedure.location
          : JSON.stringify(procedure.location).replace(/[\{\}"]/g, ''));
    if (loc) openInMaps(loc);
  };

  const handleAddToCalendar = () => {
    const eventForCalendar: any = {
      title: procedure.display_name || 'Medical Procedure',
      date: `${procedure.scheduled_date}T${procedure.scheduled_time || '00:00:00'}`,
      type: 'Medical Procedure',
      status: procedure.status,
      doctor_name: procedure.doctor_name,
      location: (typeof procedure.location === 'string' ? procedure.location : ''),
      details: procedure.summary?.notes || procedure.summary?.outcome || '',
    };

    addToCalendar(eventForCalendar);
  };

  const hasNotesOrOutcome = procedure.summary && (procedure.summary.outcome || procedure.summary.notes);

  return (
    <View className={`py-4 ${!isLast ? 'border-b border-gray-200' : ''}`}>
      <View className="flex-row">
        {/* Date Display (Left Column) */}
        <View className="items-center mr-0" style={{ width: 60 }}>
          <Text className="text-2xl font-bold text-orange-600">
            {dayOfMonth}
          </Text>
          <Text className="text-sm text-gray-500 uppercase">{month}</Text>
        </View>

        {/* Content (Right Column) */}
        <View className="flex-1">
          {/* Header: Icon, Title, Chevron */}
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-row items-center flex-1">
              {/* Icon */}
              <View className="w-10 h-10 rounded-full items-center justify-center mr-3">
                <MaterialCommunityIcons
                  name={procedureIcon}
                  size={24}
                  color="#F05C0C"
                />
              </View>

              {/* Title & Status */}
              <View className="flex-1 mr-2">
                <Text className="text-xl font-medium text-gray-900 leading-6 capitalize">
                  {procedure.display_name || 'Procedure'}
                </Text>
              </View>
            </View>

            {/* Chevron */}
            {!disabled && (
              <TouchableOpacity
                onPress={onPress}
                className="w-8 h-8 items-center justify-center -mt-1 -mr-2"
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Calendar Row */}
          <View className="flex-row items-center mb-1.5">
            <MaterialCommunityIcons name="calendar" size={16} color="#6B7280" />
            <Text className="text-md text-gray-700 ml-2">{dateStr}</Text>
          </View>

          {/* Time Row */}
          <View className="flex-row items-center mb-2">
            <MaterialCommunityIcons name="clock-outline" size={16} color="#6B7280" />
            <Text className="text-md text-gray-700 ml-2 font-medium">
              {timeStr}
            </Text>
          </View>

          {/* Doctor Row */}
          {procedure.doctor_name && (
            <View className="flex-row items-center mb-2">
              <MaterialCommunityIcons name="stethoscope" size={16} color="#6B7280" />
              <Text className="text-md text-gray-700 ml-2">
                Dr. {procedure.doctor_name}
              </Text>
            </View>
          )}

          {/* Location Row */}
          {procedure.location && (
            <TouchableOpacity
              className="flex-row items-center mb-2"
              onPress={handleLocationPress}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="map-marker"
                size={16}
                color="#6B7280"
              />
              <Text className="text-md text-gray-700 ml-2 flex-1 underline">
                {procedure.location?.street
                    ? `${procedure.location.street}, ${procedure.location.city || ''}`
                    : 'See details'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Status Row */}
          {/* <View className="flex-row items-center mb-2">
            <MaterialCommunityIcons name="information-outline" size={16} color="#6B7280" />
            <Text className="text-md font-medium ml-2 capitalize" style={{ color: statusColor }}>
              {procedure.status}
            </Text>
          </View> */}

          {/* Notes Preview */}
          {hasNotesOrOutcome && (
            <View className="mt-2 p-3 bg-gray-50 rounded-lg">
              {procedure.summary?.outcome ? (
                <Text className="text-md text-gray-600" numberOfLines={2}>
                  <Text className="font-semibold">Outcome: </Text>{procedure.summary.outcome}
                </Text>
              ) : (
                <Text className="text-md text-gray-600" numberOfLines={2}>
                  {procedure.summary?.notes}
                </Text>
              )}
            </View>
          )}

          {/* Add to Calendar Button */}
          {/* <View className="mt-3 pt-3 flex-row justify-start">
            <TouchableOpacity
              className="flex-row items-center bg-orange-50 px-3 py-1.5 rounded-full"
              onPress={handleAddToCalendar}
            >
              <MaterialCommunityIcons
                name="calendar-plus"
                size={16}
                color="#F05C0C"
              />
              <Text className="text-orange-600 text-sm font-medium ml-1.5">
                Add to Calendar
              </Text>
            </TouchableOpacity>
          </View> */}

        </View>
      </View>
    </View>
  );
};

// Empty State Component
const EmptyState: React.FC<{ message: string }> = ({ message }) => {
  return (
    <View className="items-center justify-center py-16 px-6">
      <View className="bg-gray-100 rounded-full p-6 mb-4">
        <MaterialCommunityIcons name="medical-bag" size={48} color="#9CA3AF" />
      </View>
      <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">
        No Procedures Found
      </Text>
      <Text className="text-sm text-gray-500 text-center">
        {message}
      </Text>
    </View>
  );
};

// Main Procedures Screen
const MedicalProceduresScreen: React.FC = () => {
  // Use centralized patient view context for patient ID
  const { patientId } = usePatientView();
  const [refreshing, setRefreshing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [selectedProcedure, setSelectedProcedure] =
    useState<MedicalProcedure | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const { refetch, procedures, isLoading, error } = useMedicalProcedures(patientId);


  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await refetch();
    setIsRetrying(false);
  };

  const hasDetails = (procedure: MedicalProcedure) => {
    return (
      procedure.summary &&
      (procedure.summary.notes || procedure.summary.outcome)
    );
  };

  // Sort procedures chronologically descending (Newest first)
  const sortedProcedures = [...procedures].sort((a, b) => {
    const dateA = new Date(a.scheduled_date).getTime();
    const dateB = new Date(b.scheduled_date).getTime();
    return dateB - dateA;
  });

  if ((isLoading && !refreshing) || isRetrying) {
    return (
      <StandardScreenLayout
        title="Medical Procedures"
        bottomSpacingColor="bg-gray-50"
      >
        <View className="flex-1 items-center justify-center py-20 px-4">
          <ThreeDotsLoader size={24} />
        </View>
      </StandardScreenLayout>
    );
  }

  if (error) {
    return (
      <StandardScreenLayout
        title="Medical Procedures"
        bottomSpacingColor="bg-gray-50"
      >
        <View className="flex-1 items-center justify-center py-20 px-4">
          <Text className="text-center text-gray-700 font-semibold text-base mb-4">
            An error occurred while fetching your medical procedures.
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
    <>
      <StandardScreenLayout title="Medical Procedures" noScroll>
        {/* Content */}
        <ScrollView
          className="flex-1 bg-white"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#F05C0C"
            />
          }
        >
          <View className="px-4 pt-4 pb-8">
            {sortedProcedures.length > 0 ? (
              sortedProcedures.map((procedure, index) => (
                <ProcedureCard
                  key={procedure.id}
                  procedure={procedure}
                  onPress={() => {
                    if (hasDetails(procedure)) {
                      setSelectedProcedure(procedure);
                      setDetailModalVisible(true);
                    }
                  }}
                  isLast={index === sortedProcedures.length - 1}
                  disabled={!hasDetails(procedure)}
                />
              ))
            ) : (
              <EmptyState
                message="You have no medical procedures on record."
              />
            )}
          </View>
        </ScrollView>
      </StandardScreenLayout>

      {/* Procedure Detail Modal */}
      <DetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        title="Procedure Details"
      >
        {selectedProcedure && (
          <>
            {/* 
                Only show essential ID info if needed, but per request we avoid repetition.
                We largely focus on Summary/Outcome and complex Location here. 
            */}

            {/* If we have a complex location object that was hidden on the main card, show it here */}
            {selectedProcedure.location && (
              <DetailCard>
                <DetailCardRow
                  icon="map-marker"
                  label="Full Location Details"
                  value={
                    <View>
                      <Text className="text-base text-gray-900">
                        {selectedProcedure.location.street
                            ? `${selectedProcedure.location.street}\n${selectedProcedure.location.city}, ${selectedProcedure.location.state} ${selectedProcedure.location.zip_code}`
                            : JSON.stringify(selectedProcedure.location, null, 2).replace(
                              /[\{\}"]/g,
                              ''
                            )}
                      </Text>
                    </View>
                  }
                  onPress={() =>
                    openInMaps(
                      JSON.stringify(selectedProcedure.location).replace(
                        /[\{\}"]/g,
                        ''
                      )
                    )
                  }
                />
              </DetailCard>
            )}




            {/* Application of Summary/Notes */}
            {selectedProcedure.summary && (selectedProcedure.summary.outcome || selectedProcedure.summary.notes) && (
              <DetailCard>
                <View className="mb-1">
                  {/* We can repeat the procedure name very subtly if we want context, 
                      but user asked not to repeat info. So we stick to outcome/notes. */}

                  <View className="flex-row items-center mb-3">
                    <MaterialCommunityIcons
                      name="clipboard-text-outline"
                      size={22}
                      color="#EA580C"
                    />
                    <Text className="text-lg font-bold text-gray-900 ml-2">
                      Summary & Notes
                    </Text>
                  </View>

                  {selectedProcedure.summary.outcome && (
                    <View className="mb-3">
                      <Text className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Outcome</Text>
                      <Text className="text-base text-gray-900 font-medium">
                        {selectedProcedure.summary.outcome}
                      </Text>
                    </View>
                  )}

                  {selectedProcedure.summary.notes && (
                    <View>
                      <Text className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Notes</Text>
                      <Text className="text-base text-gray-700 leading-relaxed">
                        {selectedProcedure.summary.notes}
                      </Text>
                    </View>
                  )}
                </View>
              </DetailCard>
            )}
          </>
        )}
      </DetailModal>
    </>
  );
};

export default MedicalProceduresScreen;