import { useAuth } from '@/hooks/auth';
import { usePatient } from '@/contexts/PatientContext';
import { logger } from '@/utils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { COMMON_CONDITIONS } from '@/constants/Patient';
import { Text, View, ScrollView } from 'react-native';
import { Card, ThreeDotsLoader } from '@/components/shared/ui';

export const HealthConditionsForm: React.FC = () => {
  const { authState } = useAuth();
  const { mainPatient } = usePatient();
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [otherConditions, setOtherConditions] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load existing health conditions from patient profile
  useEffect(() => {
    const loadData = async () => {
      try {
        const patientProfile = mainPatient || authState.patientProfile;

        logger.info('Loading health conditions data', {
          component: 'HealthConditionsForm',
          hasMainPatient: !!mainPatient,
          hasPatientProfile: !!authState.patientProfile,
          patientProfileId: patientProfile?.id,
          hasMedicalData: !!patientProfile?.medical_data,
          hasUser: !!authState.user,
          userId: authState.user?.id ? String(authState.user.id) : undefined,
        });

        if (patientProfile) {
          // Load existing medical data if available
          const medicalData = patientProfile.medical_data;
          if (medicalData) {
            logger.info('Found existing medical data', {
              component: 'HealthConditionsForm',
              medicalDataKeys: Object.keys(medicalData),
            });

            const conditions =
              medicalData.medical_conditions ||
              (medicalData as any).chronic_conditions;
            if (conditions) {
              setSelectedConditions(
                Array.isArray(conditions) ? conditions : []
              );
            }
            if (medicalData.allergies) {
              setAllergies(medicalData.allergies);
            }
            if (medicalData.blood_type) {
              setBloodType(medicalData.blood_type);
            }
            if (medicalData.other_conditions) {
              setOtherConditions(medicalData.other_conditions);
            }
            const familyHist =
              medicalData.family_history ||
              (medicalData as any).family_medical_history;
            if (familyHist) {
              setFamilyHistory(familyHist);
            }
          }
          setIsLoading(false);
        } else {
          logger.warn('Patient profile still not available', {
            component: 'HealthConditionsForm',
            hasUser: !!authState.user,
            userId: authState.user?.id ? String(authState.user.id) : undefined,
          });
          setIsLoading(false);
        }
      } catch (error) {
        logger.error('Failed to load health conditions', error as Error, {
          component: 'HealthConditionsForm',
        });
        setIsLoading(false);
      }
    };
    loadData();

    // Timeout to stop loading after 5 seconds regardless
    const timeout = setTimeout(() => {
      logger.warn('Health conditions form loading timeout', {
        component: 'HealthConditionsForm',
        hasPatientProfile: !!authState.patientProfile,
      });
      setIsLoading(false);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [mainPatient, authState.patientProfile, authState.user]);

  // Show skeleton on initial load
  if (isLoading) {
    return <ThreeDotsLoader size={24} />;
  }

  // Get selected condition details
  const activeConditions = COMMON_CONDITIONS.filter(condition =>
    selectedConditions.includes(condition.id)
  );

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-6">
        {/* Medical Conditions Card */}
        {activeConditions.length > 0 && (
          <View className="mb-6">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Your Medical Conditions
            </Text>
            <Card className="p-4">
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                {activeConditions.map(condition => (
                  <View
                    key={condition.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 20,
                      backgroundColor: '#FFF7ED',
                      borderWidth: 1,
                      borderColor: '#FFEDD5',
                    }}
                  >
                    <MaterialCommunityIcons
                      name={condition.icon as any}
                      size={18}
                      color="#F05C0C"
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        color: '#7C2D12',
                        fontWeight: '500',
                      }}
                    >
                      {condition.label}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        )}

        {/* Blood Type */}
        {bloodType && (
          <View className="mb-6">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Blood Type
            </Text>
            <Card className="p-4">
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    marginRight: 12,
                    padding: 10,
                    borderRadius: 12,
                    backgroundColor: '#FFF7ED',
                  }}
                >
                  <MaterialCommunityIcons
                    name="water"
                    size={20}
                    color="#F05C0C"
                  />
                </View>
                <Text
                  style={{
                    fontSize: 16,
                    color: '#111827',
                    fontWeight: '600',
                  }}
                >
                  {bloodType}
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* Allergies & Sensitivities */}
        {allergies && (
          <View className="mb-6">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Allergies & Sensitivities
            </Text>
            <Card className="p-4">
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View
                  style={{
                    marginRight: 12,
                    padding: 10,
                    borderRadius: 12,
                    backgroundColor: '#FFF7ED',
                  }}
                >
                  <MaterialCommunityIcons
                    name="alert-circle"
                    size={20}
                    color="#F05C0C"
                  />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: '#374151',
                    lineHeight: 22,
                  }}
                >
                  {allergies}
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* Additional Medical Conditions */}
        {otherConditions && (
          <View className="mb-6">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Additional Medical Conditions
            </Text>
            <Card className="p-4">
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View
                  style={{
                    marginRight: 12,
                    padding: 10,
                    borderRadius: 12,
                    backgroundColor: '#FFF7ED',
                  }}
                >
                  <MaterialCommunityIcons
                    name="file-document"
                    size={20}
                    color="#F05C0C"
                  />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: '#374151',
                    lineHeight: 22,
                  }}
                >
                  {otherConditions}
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* Family Medical History */}
        {familyHistory && (
          <View className="mb-6">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Family Medical History
            </Text>
            <Card className="p-4">
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View
                  style={{
                    marginRight: 12,
                    padding: 10,
                    borderRadius: 12,
                    backgroundColor: '#FFF7ED',
                  }}
                >
                  <MaterialCommunityIcons
                    name="account-group"
                    size={20}
                    color="#F05C0C"
                  />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: '#374151',
                    lineHeight: 22,
                  }}
                >
                  {familyHistory}
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* Empty state if no data */}
        {!activeConditions.length &&
          !bloodType &&
          !allergies &&
          !otherConditions &&
          !familyHistory && (
            <Card className="p-8 items-center">
              <View
                style={{
                  marginBottom: 16,
                  padding: 16,
                  borderRadius: 50,
                  backgroundColor: '#FFF7ED',
                }}
              >
                <MaterialCommunityIcons
                  name="heart-pulse"
                  size={32}
                  color="#F05C0C"
                />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  color: '#6B7280',
                  textAlign: 'center',
                  fontWeight: '500',
                }}
              >
                No health conditions recorded yet
              </Text>
            </Card>
          )}
      </View>
    </ScrollView>
  );
};
