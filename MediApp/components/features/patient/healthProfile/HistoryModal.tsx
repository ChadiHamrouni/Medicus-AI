import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { VitalChart } from './VitalChart';
import { formatHistoryValue, type VitalType } from './utils';

interface HistoryModalProps {
  vitalType: VitalType;
  history: {
    date: string;
    value: any;
    doctor?: string;
    notes?: string;
  }[];
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  vitalType,
  history,
}) => {
  const showChart =
    !['blood_type', 'exercise', 'smoking', 'alcohol', 'diet'].includes(
      vitalType
    ) && history.length > 1;

  return (
    <>
      {/* Chart */}
      {showChart && <VitalChart data={history} vitalType={vitalType} />}

      {/* History List */}
      <View className={showChart ? 'mt-3' : ''}>
        {history.map((item, index, array) => (
          <View
            key={index}
            className={`bg-white p-3 ${index < array.length - 1 ? 'border-b border-gray-200' : ''}`}
          >
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-lg font-semibold text-gray-900">
                {formatHistoryValue(vitalType, item.value)}
              </Text>
              <Text className="text-sm text-gray-500">
                {format(new Date(item.date), 'MMM dd, yyyy')}
              </Text>
            </View>
            {item.doctor && (
              <View className="flex-row items-center mb-1">
                <MaterialCommunityIcons
                  name="doctor"
                  size={14}
                  color="#F05C0C"
                />
                <Text className="text-sm text-gray-600 ml-1.5">
                  Dr. {item.doctor}
                </Text>
              </View>
            )}
            {item.notes && (
              <View className="mt-1.5">
                <Text className="text-sm text-gray-500 leading-4">
                  {item.notes}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </>
  );
};
