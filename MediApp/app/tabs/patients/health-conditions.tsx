import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StandardScreenLayout } from '@/components/shared/layout';
import { TabBar, TabOption } from '@/components/shared/ui/Tabs/TabBar';
import {
  DetailModal,
  DetailCard,
  DetailCardRow,
} from '@/components/shared/ui/Modal';
import { usePatientView } from '@/contexts/PatientViewContext';
import { useConditions } from '@/hooks/patient/useConditions';
import {
  ConditionCard,
  getCategoryIcon,
} from '@/components/features/patient/healthConditions';
import { ThreeDotsLoader } from '@/components';
import { MedicalCondition as ServiceMedicalCondition } from '@/services/patient/conditions';
interface MedicalCondition extends ServiceMedicalCondition {
  is_active: boolean;
  severity_color?: string;
  status_label?: string;
  duration_years?: number;
  notes?: string;
}

const HealthConditionsScreen: React.FC = () => {
  // Use centralized patient view context for patient ID
  const { patientId } = usePatientView();
  const [refreshing, setRefreshing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'chronic' | 'resolved'>(
    'active'
  );
  const [selectedCondition, setSelectedCondition] =
    useState<MedicalCondition | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const {
    conditions: conditionsData,
    isLoading,
    error,
    refetch,
  } = useConditions(patientId);

  const mapCondition = (
    c: ServiceMedicalCondition,
    overrideStatus?: 'active' | 'chronic' | 'resolved'
  ): MedicalCondition => {
    const is_active = overrideStatus
      ? overrideStatus !== 'resolved'
      : c.status !== 'resolved';

    return {
      ...c,
      is_active,
      notes: c.clinical_notes,
    };
  };

  const activeConditions =
    conditionsData?.active.map(c => mapCondition(c, 'active')) || [];
  const chronicConditions =
    conditionsData?.chronic.map(c => mapCondition(c, 'chronic')) || [];
  const resolvedConditions =
    conditionsData?.resolved.map(c => mapCondition(c, 'resolved')) || [];

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

  const displayConditions =
    activeTab === 'active'
      ? activeConditions
      : activeTab === 'chronic'
        ? chronicConditions
        : resolvedConditions;

  const tabOptions: TabOption[] = [
    { key: 'active', label: 'Active', count: activeConditions.length },
    { key: 'chronic', label: 'Chronic', count: chronicConditions.length },
    { key: 'resolved', label: 'Resolved', count: resolvedConditions.length },
  ];

  if ((isLoading && !refreshing) || isRetrying) {
    return (
      <StandardScreenLayout
        title="Health Conditions"
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
        title="Health Conditions"
        bottomSpacingColor="bg-gray-50"
      >
        <View className="flex-1 items-center justify-center py-20 px-4">
          <Text className="text-center text-gray-700 font-semibold text-base mb-4">
            An error occurred while fetching your health conditions.
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
      <StandardScreenLayout title="Health Conditions" noScroll>
        {/* Tabs */}
        <TabBar
          options={tabOptions}
          activeKey={activeTab}
          onTabChange={key =>
            setActiveTab(key as 'active' | 'chronic' | 'resolved')
          }
        />

        {/* Conditions List */}
        <ScrollView
          className="flex-1 mt-5"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#F05C0C"
            />
          }
        >
          <View className="p-3">
            {displayConditions.length > 0 ? (
              displayConditions.map(condition => {
                // Ensure we use the correct type compatible with ConditionCard
                const hasAdditionalInfo = !!(
                  condition.icd10 ||
                  condition.clinician_raw_input ||
                  condition.clinical_notes ||
                  condition.notes
                );

                return (
                  <ConditionCard
                    key={condition.id} // Use PK id
                    condition={condition}
                    showChevron={hasAdditionalInfo}
                    onPress={() => {
                      if (hasAdditionalInfo) {
                        setSelectedCondition(condition);
                        setDetailModalVisible(true);
                      }
                    }}
                  />
                );
              })
            ) : (
              <View className="items-center justify-center py-16">
                <View className="bg-gray-100 rounded-full p-4 mb-3">
                  <MaterialCommunityIcons
                    name={
                      activeTab === 'active'
                        ? 'check-circle-outline'
                        : activeTab === 'chronic'
                          ? 'calendar-blank'
                          : 'history'
                    }
                    size={40}
                    color="#9CA3AF"
                  />
                </View>
                <Text className="text-center text-gray-700 font-semibold text-base">
                  {activeTab === 'active'
                    ? 'No active health conditions'
                    : activeTab === 'chronic'
                      ? 'No chronic conditions'
                      : 'No resolved conditions'}
                </Text>
                <Text className="text-center text-gray-500 mt-1.5 text-sm px-8">
                  {activeTab === 'active'
                    ? 'Your active diagnoses will appear here'
                    : activeTab === 'chronic'
                      ? 'Chronic conditions will be listed here'
                      : 'Previously resolved conditions will show here'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </StandardScreenLayout>

      {/* Condition Detail Modal */}
      <DetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        title="Condition Details"
      >
        {selectedCondition && (
          <>
            {/* Main Details Card */}
            {selectedCondition.icd10 && (

              <DetailCard>
                {/* <DetailCardRow
                icon={getCategoryIcon(selectedCondition.category)}
                label="Condition"
                value={
                  <Text className="text-lg font-bold text-gray-900">
                    {selectedCondition.display_name}
                  </Text>
                }
                showDivider={false}
              /> */}

                <DetailCardRow
                  icon="barcode"
                  label="ICD-10 Code"
                  value={selectedCondition.icd10}
                />
              </DetailCard>
            )}

            {/* Clinician's Original Input (Raw Text) */}
            {selectedCondition.clinician_raw_input && (
              <DetailCard>
                <View className="flex-row items-center mb-3">
                  <MaterialCommunityIcons
                    name="text-box-outline"
                    size={20}
                    color="#3B82F6"
                  />
                  <Text className="text-base font-semibold text-gray-900 ml-2">
                    Original Diagnosis Text
                  </Text>
                </View>
                <Text className="text-md text-gray-700 leading-6">
                  {selectedCondition.clinician_raw_input}
                </Text>
              </DetailCard>
            )}

            {/* Doctor's Clinical Notes */}
            {(selectedCondition.clinical_notes || selectedCondition.notes) && (
              <DetailCard>
                <View className="flex-row items-center mb-3">
                  <MaterialCommunityIcons
                    name="note-text-outline"
                    size={20}
                    color="#F05C0C"
                  />
                  <Text className="text-base font-semibold text-gray-900 ml-2">
                    Doctor's Notes
                  </Text>
                </View>
                <Text className="text-md text-gray-700 leading-6">
                  {selectedCondition.clinical_notes || selectedCondition.notes}
                </Text>
              </DetailCard>
            )}
          </>
        )}
      </DetailModal>
    </>
  );
};

export default HealthConditionsScreen;
