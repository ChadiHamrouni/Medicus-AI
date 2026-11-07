import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

type EventFilterType = 'visit' | 'exam' | 'exam_order' | 'procedure';

interface EventFilterPillsProps {
  selectedFilters: EventFilterType[];
  onToggleFilter: (_filter: EventFilterType) => void;
}

export const EventFilterPills: React.FC<EventFilterPillsProps> = ({
  selectedFilters,
  onToggleFilter,
}) => {
  const filters: { key: EventFilterType; label: string }[] = [
    { key: 'visit', label: 'Visits' },
    { key: 'exam', label: 'Exams' },
    { key: 'exam_order', label: 'Orders' },
    { key: 'procedure', label: 'Procedures' },
  ];

  return (
    <View className="px-4 py-3 bg-white border-t border-gray-200">
      <View className="flex-row flex-wrap">
        {filters.map(filter => (
          <TouchableOpacity
            key={filter.key}
            className={`px-4 py-2 rounded-full border mr-2 mb-2 ${
              selectedFilters.includes(filter.key)
                ? 'border-orange-600'
                : 'border-gray-300'
            }`}
            onPress={() => onToggleFilter(filter.key)}
            activeOpacity={0.8}
          >
            <Text
              className={`text-sm font-semibold ${
                selectedFilters.includes(filter.key)
                  ? 'text-gray-900'
                  : 'text-gray-600'
              }`}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};
