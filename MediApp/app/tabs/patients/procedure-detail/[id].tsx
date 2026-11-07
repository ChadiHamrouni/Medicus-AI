import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { StandardScreenLayout } from '@/components/shared/layout';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDependents } from '@/contexts/DependentsContext';
import { getProcedureDetails, type MedicalProcedure } from '@/services';

import SchedulingTab from './tabs/SchedulingTab';
import SummaryTab from './tabs/SummaryTab';
import ClinicalDetailsTab from './tabs/ClinicalDetailsTab';

type TabType = 'scheduling' | 'summary' | 'clinical';

const ProcedureDetailScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const procedureId = parseInt(id || '0', 10);

  const { authState } = useAuthContext();
  const { selectedDependent } = useDependents();

  const [activeTab, setActiveTab] = useState<TabType>('scheduling');

  // Determine patient ID
  const patientId =
    selectedDependent === 'main'
      ? authState.patientProfile?.id || 0
      : typeof selectedDependent === 'number'
        ? selectedDependent
        : 0;

  // Fetch procedure details
  const { data: procedure, isLoading, error } = useQuery({
    queryKey: ['procedure-detail', procedureId, patientId],
    queryFn: () => getProcedureDetails(procedureId, patientId),
    enabled: !!procedureId && !!patientId,
  });

  // Tab configuration
  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'scheduling', label: 'Scheduling', icon: 'calendar-clock' },
    { key: 'summary', label: 'Summary', icon: 'file-document-outline' },
    { key: 'clinical', label: 'Clinical Details', icon: 'clipboard-pulse-outline' },
  ];

  const renderTabContent = () => {
    if (!procedure) return null;

    switch (activeTab) {
      case 'scheduling':
        return <SchedulingTab procedure={procedure} />;
      case 'summary':
        return <SummaryTab procedure={procedure} />;
      case 'clinical':
        return <ClinicalDetailsTab procedure={procedure} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <StandardScreenLayout title="Procedure Details" bottomSpacingColor="bg-gray-50">
        <View className="flex-1 items-center justify-center bg-gray-50">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="text-gray-600 mt-4">Loading procedure details...</Text>
        </View>
      </StandardScreenLayout>
    );
  }

  if (error || !procedure) {
    return (
      <StandardScreenLayout title="Procedure Details" bottomSpacingColor="bg-gray-50">
        <View className="flex-1 items-center justify-center bg-gray-50 px-6">
          <View className="bg-red-50 rounded-full p-4 mb-4">
            <MaterialCommunityIcons name="alert-circle" size={48} color="#EF4444" />
          </View>
          <Text className="text-lg font-semibold text-gray-900 mb-2">
            Failed to Load Procedure
          </Text>
          <Text className="text-sm text-gray-600 text-center mb-6">
            {error?.message || 'Could not retrieve procedure details'}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-blue-600 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </StandardScreenLayout>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: procedure.display_name || 'Procedure Details',
          headerShown: true,
        }}
      />

      <View className="flex-1 bg-white">
        {/* Header with Procedure Name */}
        <View className="bg-white border-b border-gray-200 px-4 py-4">
          <Text className="text-2xl font-bold text-gray-900">
            {procedure.display_name}
          </Text>
          {(procedure as any).procedure_category && (
            <Text className="text-sm text-gray-600 mt-1">
              {(procedure as any).procedure_category}
            </Text>
          )}
        </View>

        {/* Tab Navigation */}
        <View className="bg-white border-b border-gray-200">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-2"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  className={`flex-row items-center px-4 py-3 mr-2 border-b-2 ${
                    isActive ? 'border-blue-600' : 'border-transparent'
                  }`}
                >
                  <MaterialCommunityIcons
                    name={tab.icon as any}
                    size={20}
                    color={isActive ? '#2563EB' : '#6B7280'}
                  />
                  <Text
                    className={`ml-2 font-semibold ${
                      isActive ? 'text-blue-600' : 'text-gray-600'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <ScrollView className="flex-1 bg-gray-50">
          {renderTabContent()}
        </ScrollView>
      </View>
    </>
  );
};

export default ProcedureDetailScreen;