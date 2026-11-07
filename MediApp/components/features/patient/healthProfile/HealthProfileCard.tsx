import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import type { MedicalVitalEntry, TrendIndicator } from '@/services/patient/vitals';

interface HealthProfileCardProps {
    entry: MedicalVitalEntry;
    icon: string;
    onPress: () => void;
    isLast?: boolean;
}

export const HealthProfileCard: React.FC<HealthProfileCardProps> = ({
    entry,
    icon,
    onPress,
    isLast,
}) => {
    const getTrendIcon = (trend: TrendIndicator): string | null => {
        if (trend === 'H') return 'arrow-up';
        if (trend === 'L') return 'arrow-down';
        if (trend === 'S') return 'minus';
        return null;
    };

    const getTrendColor = (trend: TrendIndicator): string => {
        if (trend === 'H') return '#EF4444';
        if (trend === 'L') return '#3B82F6';
        if (trend === 'S') return '#6B7280';
        return '#6B7280';
    };

    const dateObj = new Date(entry.recorded_at);
    const dayOfMonth = dateObj.getDate();
    const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const dateStr = format(dateObj, 'EEEE, MMMM d, yyyy');
    const timeStr = format(dateObj, 'h:mm a');

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            className={`py-4 ${!isLast ? 'border-b border-gray-200' : ''}`}
        >
            <View className="flex-row">
                {/* Date Display (Left Column) */}
                <View className="items-center mr-2" style={{ width: 60 }}>
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
                                    name={icon as any}
                                    size={24}
                                    color="#F05C0C"
                                />
                            </View>

                            {/* Title & Value */}
                            <View className="flex-1 mr-2">
                                <View className="flex-row items-baseline mb-0.5">
                                    <Text className="text-xl font-bold text-gray-900">
                                        {entry.vital_value}
                                    </Text>
                                    <Text className="text-sm text-gray-700 ml-1">{entry.unit}</Text>
                                    {/* Optional Trend Indicator */}
                                    {entry.trend && getTrendIcon(entry.trend) && (
                                        <View className="ml-2 flex-row items-center">
                                            <MaterialCommunityIcons
                                                name={getTrendIcon(entry.trend) as any}
                                                size={16}
                                                color={getTrendColor(entry.trend)}
                                            />
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>

                        {/* Chevron */}
                        <View className="w-8 h-8 items-center justify-center -mt-1 -mr-2">
                            <MaterialCommunityIcons
                                name="chevron-right"
                                size={24}
                                color="#9CA3AF"
                            />
                        </View>
                    </View>

                    {/* Display Name Row */}
                    <View className="flex-row items-center mb-2.5">
                        <Text className="text-lg font-medium text-gray-900 capitalize">
                            {entry.display_name}
                        </Text>
                    </View>

                    {/* Time Row */}
                    <View className="flex-row items-center mb-1.5">
                        <MaterialCommunityIcons name="clock-outline" size={16} color="#6B7280" />
                        <Text className="text-md text-gray-700 ml-2 font-medium">
                            {timeStr}
                        </Text>
                    </View>

                    {/* Doctor Row */}
                    {entry.doctor_name && (
                        <View className="flex-row items-center mb-1.5">
                            <MaterialCommunityIcons name="stethoscope" size={16} color="#6B7280" />
                            <Text className="text-md text-gray-700 ml-2">
                                Dr. {entry.doctor_name}
                            </Text>
                        </View>
                    )}

                    {/* Provider/Location Row */}
                    {entry.healthcare_provider_name && (
                        <View className="flex-row items-center mb-1.5">
                            <MaterialCommunityIcons name="hospital-building" size={16} color="#6B7280" />
                            <Text className="text-md text-gray-700 ml-2">
                                {entry.healthcare_provider_name}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};
