import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import type {
  MedicalVitalEntry,
  VitalThresholdConfig,
  TrendIndicator,
} from '@/services/patient/vitals';

interface VitalCardProps {
  entry: MedicalVitalEntry;
  icon: string;
  onPress: () => void;
}

/**
 * VitalCard Component (NEW ARCHITECTURE)
 *
 * CHANGES:
 * - Removed hardcoded threshold bars and colors
 * - Now data-driven: renders threshold bar ONLY if entry.threshold_config exists
 * - Simplified to work with new API structure
 * - Supports optional trend indicator
 *
 * FUTURE: When AI tools provide enriched vitals with threshold_config,
 * this component will automatically render data-driven threshold bars.
 */
export const VitalCard: React.FC<VitalCardProps> = ({
  entry,
  icon,
  onPress,
}) => {
  const getTrendIcon = (trend: TrendIndicator): string | null => {
    if (trend === 'H') return 'arrow-up';
    if (trend === 'L') return 'arrow-down';
    if (trend === 'S') return 'minus';
    return null;
  };

  const getTrendColor = (trend: TrendIndicator): string => {
    if (trend === 'H') return '#EF4444'; // Red
    if (trend === 'L') return '#3B82F6'; // Blue
    if (trend === 'S') return '#6B7280'; // Gray
    return '#6B7280';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="w-full p-1.5"
    >
      <View className="bg-white rounded-xl p-3.5 border-b border-gray-100">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-2.5">
          <MaterialCommunityIcons
            name={icon as any}
            size={22}
            color="#F05C0C"
          />
          <MaterialCommunityIcons
            name="chevron-right"
            size={16}
            color="#D1D5DB"
          />
        </View>

        {/* Label */}
        <Text className="text-md text-gray-500 mb-1" numberOfLines={1}>
          {entry.display_name}
        </Text>

        {/* Value with Optional Trend Indicator */}
        <View className="flex-row items-baseline mb-1.5">
          <Text className="text-xl font-bold text-gray-900">
            {entry.vital_value}
          </Text>
          <Text className="text-base text-gray-400 ml-1.5">{entry.unit}</Text>

          {/* Optional Trend Indicator */}
          {entry.trend && getTrendIcon(entry.trend) && (
            <View className="ml-2">
              <MaterialCommunityIcons
                name={getTrendIcon(entry.trend) as any}
                size={18}
                color={getTrendColor(entry.trend)}
              />
            </View>
          )}
        </View>

        {/* Data-Driven Threshold Bar (only if threshold_config exists) */}
        {entry.threshold_config && entry.threshold_config.zones.length > 0 && (
          <View className="pt-2 pb-6 px-1">
            <View className="relative">
              {/* Dynamic Threshold Zones */}
              <View className="h-2.5 w-full flex-row rounded-full overflow-hidden">
                {entry.threshold_config.zones.map((zone, index) => (
                  <View
                    key={index}
                    style={{
                      flex: 1,
                      backgroundColor: zone.color,
                      opacity: 0.8,
                    }}
                  />
                ))}
              </View>

              {/* Zone Labels */}
              <View className="flex-row justify-between mt-2">
                {entry.threshold_config.zones.map((zone, index) => {
                  // Only show labels for first and last zones
                  if (index === 0 || index === entry.threshold_config!.zones.length - 1) {
                    return (
                      <Text key={index} className="text-xs text-gray-500">
                        {zone.min !== null ? zone.min : ''}{' '}
                        {zone.max !== null ? `- ${zone.max}` : ''}
                      </Text>
                    );
                  }
                  return null;
                })}
              </View>
            </View>
          </View>
        )}

        {/* Metadata */}
        <View className="pt-2">
          {entry.doctor_name && (
            <View className="flex-row items-center mb-1">
              <MaterialCommunityIcons name="doctor" size={12} color="#6B7280" />
              <Text className="text-xs text-gray-600 ml-1.5" numberOfLines={1}>
                {entry.doctor_name}
              </Text>
            </View>
          )}

          {entry.healthcare_provider_name && (
            <View className="flex-row items-center mb-1">
              <MaterialCommunityIcons
                name="hospital-building"
                size={12}
                color="#6B7280"
              />
              <Text className="text-xs text-gray-600 ml-1.5" numberOfLines={1}>
                {entry.healthcare_provider_name}
              </Text>
            </View>
          )}

          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name="clock-outline"
              size={12}
              color="#6B7280"
            />
            <Text className="text-xs text-gray-500 ml-1.5">
              {format(new Date(entry.recorded_at), 'MMM dd, yyyy h:mm a')}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity >
  );
};