import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { format } from 'date-fns';
import {
  getVitalHistory,
  type VitalHistoryResponse,
} from '@/services/patient/vitals';
import { ThreeDotsLoader } from '@/components/shared/ui';

interface VitalHistoryGraphProps {
  patientId: number;
  vitalId: number;
  vitalDisplayName: string;
  unit: string;
}

export const VitalHistoryGraph: React.FC<VitalHistoryGraphProps> = ({
  patientId,
  vitalId,
  vitalDisplayName,
  unit,
}) => {
  const [historyData, setHistoryData] = useState<VitalHistoryResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await getVitalHistory(patientId, vitalId, 500);
        setHistoryData(data);
        setError(null);
      } catch (err) {
        setError('Failed to load history data');
        console.error('Error fetching vital history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [patientId, vitalId]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <ThreeDotsLoader size={18} />
      </View>
    );
  }

  if (error || !historyData || historyData.history.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-12 px-4">
        <Text className="text-gray-500 text-center">
          {error || 'No historical data available'}
        </Text>
      </View>
    );
  }

  // Parse values and prepare data for chart
  const chartData = historyData.history.map(point => {
    const numericValue = parseFloat(point.value);
    return {
      value: isNaN(numericValue) ? 0 : numericValue,
      date: new Date(point.recorded_at),
      rawValue: point.value,
      doctor: point.doctor_name,
      provider: point.healthcare_provider_name,
    };
  });

  const values = chartData.map(d => d.value);
  const labels = chartData.map(d => format(d.date, 'MM/dd'));

  // Calculate chart dimensions
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.max(screenWidth - 32, chartData.length * 50);

  return (
    <ScrollView className="flex-1">
      {/* Title */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-lg font-bold text-gray-900">
          {vitalDisplayName} History
        </Text>
        <Text className="text-sm text-gray-500">
          {historyData.total_count} data points
        </Text>
      </View>

      {/* Chart */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        className="mb-4"
      >
        <LineChart
          data={{
            labels: labels,
            datasets: [
              {
                data: values,
              },
            ],
          }}
          width={chartWidth}
          height={220}
          yAxisSuffix=""
          fromZero={true}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(240, 92, 12, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#F05C0C',
            },
            propsForBackgroundLines: {
              strokeDasharray: '',
              stroke: '#E5E7EB',
            },
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16,
            paddingRight: 64,
            paddingLeft: 8,
          }}
        />
      </ScrollView>

      {/* Data Points List */}
      <View className="px-4 pb-4">
        <Text className="text-sm font-semibold text-gray-700 mb-3">
          Recent Readings
        </Text>
        {chartData
          .slice()
          .reverse()
          .map((point, index) => (
            <View
              key={index}
              className={`py-3 ${index < chartData.length - 1 ? 'border-b border-gray-200' : ''}`}
            >
              <View className="flex-row justify-between items-start mb-1">
                <Text className="text-base font-semibold text-gray-900">
                  {point.rawValue} {unit}
                </Text>
                <Text className="text-xs text-gray-500">
                  {format(point.date, 'MMM dd, yyyy h:mm a')}
                </Text>
              </View>
              {point.doctor && (
                <Text className="text-xs text-gray-600">
                  Dr. {point.doctor}
                </Text>
              )}
              {point.provider && (
                <Text className="text-xs text-gray-500">{point.provider}</Text>
              )}
            </View>
          ))}
      </View>
    </ScrollView>
  );
};
