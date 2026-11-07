import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StandardScreenLayout } from '@/components/shared/layout';
import { TwoRowTabs, type TwoRowTabOption } from '@/components/shared/ui/Tabs';
import { DetailModal } from '@/components/shared/ui/Modal';
import { LoadingSpinner, ThreeDotsLoader } from '@/components/shared/ui';
import { usePatientView } from '@/contexts/PatientViewContext';
import { useVitals } from '@/hooks/patient/useVitals';
import { format } from 'date-fns';
import {
  getVitalLabel,
  type VitalType,
} from '@/components/features/patient/healthProfile';
import { VitalHistoryGraph } from '@/components/features/patient/healthProfile/VitalHistoryGraph';
import { HealthProfileCard } from '@/components/features/patient/healthProfile/HealthProfileCard';
import type { MedicalVitalEntry } from '@/services/patient/vitals';
import { HistoryModal } from '@/components/features/patient/healthProfile';
import { VaccineDetailModal } from '@/components/features/patient/healthProfile';

type TabType =
  | 'vitals'
  | 'lifestyle'
  | 'body_metrics'
  | 'immunizations'
  | 'biological'
  | 'reproductive'
  | 'other';

const HealthProfileScreen: React.FC = () => {
  // Use centralized patient view context for patient ID
  const { patientId } = usePatientView();
  const [refreshing, setRefreshing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [selectedVital, setSelectedVital] = useState<VitalType | null>(null);
  const [selectedVitalEntry, setSelectedVitalEntry] =
    useState<MedicalVitalEntry | null>(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('vitals');
  const [selectedVaccine, setSelectedVaccine] = useState<any>(null);
  const [vaccineModalVisible, setVaccineModalVisible] = useState(false);

  const { vitals, isLoading, refetch, error } = useVitals(patientId);

  const lastRecorded = useMemo(() => {
    if (!vitals) return null;
    const allEntries = [
      ...vitals.vitals,
      ...vitals.lifestyle,
      ...vitals.body_metrics,
      ...vitals.biological,
    ];
    return allEntries[0]?.recorded_at || null;
  }, [vitals]);

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

  const getLatestVitalEntry = (
    type: VitalType
  ): MedicalVitalEntry | undefined => {
    if (!vitals) return undefined;
    const findInArray = (arr: MedicalVitalEntry[], name: string) =>
      arr.find(e => e.vital_name === name);

    switch (type) {
      case 'blood_pressure': return findInArray(vitals.vitals, 'blood_pressure') || findInArray(vitals.other, 'blood_pressure');
      case 'heart_rate': return findInArray(vitals.vitals, 'resting_heart_rate') || findInArray(vitals.vitals, 'heart_rate');
      case 'oxygen': return findInArray(vitals.vitals, 'oxygen_saturation');
      case 'temperature': return findInArray(vitals.vitals, 'temperature_c');
      case 'blood_glucose': return findInArray(vitals.vitals, 'blood_glucose_mg_dl');
      case 'pain_score': return findInArray(vitals.vitals, 'pain_score');
      case 'respiratory_rate': return findInArray(vitals.vitals, 'respiratory_rate');
      case 'weight': return findInArray(vitals.body_metrics, 'weight_kg');
      case 'bmi': return findInArray(vitals.body_metrics, 'bmi');
      case 'height': return findInArray(vitals.body_metrics, 'height_cm');
      case 'body_composition': return findInArray(vitals.body_metrics, 'body_composition');
      case 'blood_type': return findInArray(vitals.biological, 'blood_type');
      case 'steps': return findInArray(vitals.lifestyle, 'steps');
      case 'sleep': return findInArray(vitals.lifestyle, 'sleep_hours') || findInArray(vitals.lifestyle, 'sleep');
      case 'calories': return findInArray(vitals.lifestyle, 'calories_burned');
      case 'hydration': return findInArray(vitals.lifestyle, 'hydration_liters');
      case 'exercise': return findInArray(vitals.lifestyle, 'exercise_frequency');
      case 'smoking': return findInArray(vitals.lifestyle, 'smoking_status');
      case 'alcohol': return findInArray(vitals.lifestyle, 'alcohol_use');
      case 'diet': return findInArray(vitals.lifestyle, 'diet_type');
      case 'stress_level': return findInArray(vitals.lifestyle, 'stress_level');
      case 'diet_notes': return findInArray(vitals.lifestyle, 'diet_notes');
      default:
        return (
          findInArray(vitals.other, type) ||
          findInArray(vitals.vitals, type) ||
          findInArray(vitals.body_metrics, type) ||
          findInArray(vitals.lifestyle, type) ||
          findInArray(vitals.biological, type)
        );
    }
  };

  const getVitalHistory = (type: VitalType) => {
    const entry = getLatestVitalEntry(type);
    if (!entry) return [];
    return [
      {
        date: entry.recorded_at,
        value: entry.vital_value,
        doctor: entry.doctor_name,
      },
    ];
  };

  const handleVitalPress = (entry: MedicalVitalEntry) => {
    setSelectedVitalEntry(entry);
    setHistoryModalVisible(true);
  };

  const mapVaccineToEntry = (vaccine: any): MedicalVitalEntry => ({
    id: vaccine.id || Math.random(),
    patient_id: patientId || 0,
    vital_id: 0,
    vital_text: vaccine.display_name,
    vital_key: 'vaccine',
    vital_value: 'Administered',
    unit: '',
    vital_category: 'immunizations',
    display_name: vaccine.display_name,
    recorded_at: vaccine.recorded_at,
    doctor_name: vaccine.doctor_name,
    healthcare_provider_name: vaccine.healthcare_provider_name,
    originalData: vaccine
  } as any);

  const tabsRow1: TwoRowTabOption[] = [
    { key: 'vitals', label: 'Vitals', icon: 'heart-pulse' },
    { key: 'lifestyle', label: 'Lifestyle', icon: 'run' },
    { key: 'body_metrics', label: 'Body Metrics', icon: 'human-male-height' },
  ];

  const tabsRow2: TwoRowTabOption[] = [
    { key: 'immunizations', label: 'Immunizations', icon: 'needle' },
    { key: 'biological', label: 'Biological', icon: 'dna' },
    { key: 'reproductive', label: 'Reproductive', icon: 'gender-male-female' },
    { key: 'other', label: 'Other', icon: 'clipboard-pulse-outline' },
  ];

  const renderActiveTabContent = () => {
    if (!vitals) return null;

    let items: MedicalVitalEntry[] = [];
    let icon = 'heart-pulse';

    switch (activeTab) {
      case 'vitals':
        items = vitals.vitals;
        icon = 'heart-pulse';
        break;
      case 'lifestyle':
        items = vitals.lifestyle;
        icon = 'run';
        break;
      case 'body_metrics':
        items = vitals.body_metrics;
        icon = 'human-male-height';
        break;
      case 'biological':
        items = vitals.biological;
        icon = 'dna';
        break;
      case 'other':
        items = vitals.other;
        icon = 'clipboard-pulse-outline';
        break;
      case 'immunizations':
        if (vitals.vaccines && Array.isArray(vitals.vaccines)) {
          items = vitals.vaccines.map(mapVaccineToEntry);
        }
        icon = 'needle';
        break;
      case 'reproductive':
        items = [];
        icon = 'gender-male-female';
        break;
    }

    if (items.length === 0) {
      return (
        <View className="items-center justify-center py-16 px-6">
          <View className="bg-gray-100 rounded-full p-6 mb-4">
            <MaterialCommunityIcons name={icon as any} size={48} color="#9CA3AF" />
          </View>
          <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">
            No Data Available
          </Text>
          <Text className="text-sm text-gray-500 text-center">
            No records found for this category.
          </Text>
        </View>
      );
    }

    return (
      <View className="pb-4">
        {items.map((item, index) => (
          <HealthProfileCard
            key={`${activeTab}-${index}`}
            entry={item}
            icon={icon}
            isLast={index === items.length - 1}
            onPress={() => {
              if (activeTab === 'immunizations') {
                const vac = (item as any).originalData;
                setSelectedVaccine({
                  ...vac,
                  vaccine: vac.display_name,
                  date: vac.recorded_at,
                  doctor_name: vac.doctor_name,
                  healthcare_provider_name: vac.healthcare_provider_name,
                  notes: vac.notes,
                });
                setVaccineModalVisible(true);
              } else {
                handleVitalPress(item);
              }
            }}
          />
        ))}
      </View>
    );
  };

  if ((isLoading && !refreshing) || isRetrying) {
    return (
      <StandardScreenLayout
        title="Health Profile"
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
        title="Health Profile"
        bottomSpacingColor="bg-gray-50"
      >
        <View className="flex-1 items-center justify-center py-20 px-4">
          <Text className="text-center text-gray-700 font-semibold text-base mb-4">
            An error occurred while fetching your health profile.
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
    <StandardScreenLayout title="Health Profile" noScroll>
      <TwoRowTabs
        tabsRow1={tabsRow1}
        tabsRow2={tabsRow2}
        activeKey={activeTab}
        onTabChange={key => setActiveTab(key as TabType)}
      />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#F05C0C"
          />
        }
      >
        {/* Last Updated */}
        <View className="px-4 pt-3 pb-2">
          <Text className="text-xs text-gray-500">
            Last updated{' '}
            {lastRecorded && format(new Date(lastRecorded), 'MMM dd, yyyy')}
          </Text>
        </View>

        {/* Content */}
        <View className="px-4">
          {renderActiveTabContent()}
        </View>
      </ScrollView>

      {/* History Modal */}
      <DetailModal
        visible={historyModalVisible}
        onClose={() => {
          setHistoryModalVisible(false);
          setSelectedVitalEntry(null);
        }}
        title={
          selectedVitalEntry?.display_name ||
          (selectedVital ? getVitalLabel(selectedVital) : '')
        }
      >
        {selectedVitalEntry && patientId && selectedVitalEntry.vital_id ? (
          <VitalHistoryGraph
            patientId={patientId}
            vitalId={selectedVitalEntry.vital_id}
            vitalDisplayName={selectedVitalEntry.display_name}
            unit={selectedVitalEntry.unit}
          />
        ) : selectedVital ? (
          <HistoryModal
            vitalType={selectedVital}
            history={getVitalHistory(selectedVital)}
          />
        ) : null}
      </DetailModal>

      {/* Vaccine Details Modal */}
      <DetailModal
        visible={vaccineModalVisible}
        onClose={() => setVaccineModalVisible(false)}
        title={selectedVaccine?.vaccine || ''}
      >
        {selectedVaccine && <VaccineDetailModal vaccine={selectedVaccine} />}
      </DetailModal>
    </StandardScreenLayout>
  );
};

export default HealthProfileScreen;
