import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

export interface MedicalCondition {
  id: number;
  condition_id?: number | null;
  display_name: string;
  icd10?: string;
  category?: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'critical' | string;
  is_chronic: boolean;
  diagnosis_date?: string;
  resolved_date?: string;
  is_active: boolean;
  doctor_name?: string;
  clinician_raw_input?: string;
  clinical_notes?: string;
  notes?: string;
  duration_years?: number;
  status_label?: string;
  severity_color?: string;
}

interface ConditionCardProps {
  condition: MedicalCondition;
  onPress: () => void;
  showChevron?: boolean;
}

export const getCategoryIcon = (category?: string) => {
  const categoryLower = category?.toLowerCase() || '';
  if (categoryLower.includes('cardio')) return 'heart';
  if (categoryLower.includes('respiratory')) return 'lungs';
  if (categoryLower.includes('endocrine')) return 'diabetes';
  if (categoryLower.includes('neurological')) return 'brain';
  if (categoryLower.includes('digestive')) return 'stomach';
  if (categoryLower.includes('musculoskeletal')) return 'bone';
  return 'medical-bag';
};

export const ConditionCard: React.FC<ConditionCardProps> = ({
  condition,
  onPress,
  showChevron = true,
}) => {
  const severityColor = condition.severity_color || '#6B7280';
  const categoryIcon = getCategoryIcon(condition.category);

  const dateObj = condition.diagnosis_date ? new Date(condition.diagnosis_date) : null;
  const dayOfMonth = dateObj ? format(dateObj, 'dd') : '--';
  const month = dateObj ? format(dateObj, 'MMM').toUpperCase() : '';
  const dateStr = dateObj ? format(dateObj, 'EEEE, MMMM dd, yyyy') : '';

  const hasStatusInfo = condition.severity || condition.is_chronic || condition.category;

  return (
    <TouchableOpacity
      className="bg-white mb-4 overflow-hidden rounded-2xl border-b border-gray-100"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="pb-4">
        <View className="flex-row">
          {/* Date Column */}
          <View className="items-center mr-3" style={{ width: 60 }}>
            <Text className="text-2xl font-bold text-orange-600">
              {dayOfMonth}
            </Text>
            <Text className="text-sm text-gray-500 uppercase">{month}</Text>
          </View>

          {/* Right Column */}
          <View className="flex-1">

            {/* Header: Icon + Title + Chevron */}
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3">
                  <MaterialCommunityIcons
                    name={categoryIcon as any}
                    size={24}
                    color="#F05C0C"
                  />
                </View>
                <View className="flex-1 mr-2">
                  <Text className="text-xl font-medium text-gray-900 leading-6 capitalize">
                    {condition.display_name}
                  </Text>
                </View>
              </View>

              {showChevron && (
                <View className="-mt-1 -mr-2">
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color="#9CA3AF"
                  />
                </View>
              )}
            </View>

            {/* Calendar Row */}
            {dateStr ? (
              <View className="flex-row items-center mb-2">
                <MaterialCommunityIcons name="calendar" size={16} color="#6B7280" />
                <Text className="text-md text-gray-700 ml-2">{dateStr}</Text>
              </View>
            ) : null}

            {/* Doctor Row */}
            {condition.doctor_name && (
              <View className="flex-row items-center mb-2">
                <MaterialCommunityIcons name="stethoscope" size={16} color="#6B7280" />
                <Text className="text-md text-gray-700 ml-2">
                  Dr. {condition.doctor_name}
                </Text>
              </View>
            )}

            {/* Status Row - Bottom */}
            {hasStatusInfo && (
              <View className="flex-row items-center mb-2">
                <MaterialCommunityIcons name="information-outline" size={16} color="#6B7280" />
                <View className="flex-row flex-wrap ml-2">
                  {condition.severity && (
                    <Text className="text-md font-medium capitalize mr-2" style={{ color: severityColor }}>
                      {condition.severity}
                    </Text>
                  )}
                  {condition.is_chronic && (
                    <Text className="text-md font-medium text-blue-600 mr-2">
                      Chronic
                    </Text>
                  )}
                  {condition.category && (
                    <Text className="text-md text-gray-500">
                      {condition.category}
                    </Text>
                  )}
                </View>
              </View>
            )}

          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
