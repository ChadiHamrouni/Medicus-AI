import {
  COL_ACTIONS,
  COL_DATE,
  COL_NAME,
  COL_SIZE,
  COL_TYPE,
} from '@/constants';
import { DocumentFilterType, SortDirection, SortOption } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export interface DocTableFilterOption {
  label: string;
  value: string;
  icon?: any;
}

export type TableHeaderProps = {
  sortBy: SortOption;
  sortDirection: SortDirection;
  typeFilter: DocTableFilterOption['value'];
  showTypeDropdown: boolean;
  onSort: (_column: SortOption) => void;
  onTypeFilterChange: (_filter: DocTableFilterOption['value']) => void;
  onTypeDropdownToggle: () => void;
  className?: string;
  columnWidths?: {
    name?: number;
    type?: number;
    size?: number;
    date?: number;
    actions?: number;
  };
};

const typeOptions: { key: DocumentFilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pdf', label: 'PDF' },
  { key: 'image', label: 'Images' },
  { key: 'document', label: 'Documents' },
];

export function TableHeader({
  sortBy,
  sortDirection,
  typeFilter,
  showTypeDropdown,
  onSort,
  onTypeFilterChange,
  onTypeDropdownToggle,
  className = 'flex-row px-2 py-2 bg-gray-50 rounded-t-lg border-b border-gray-200 items-center',
  columnWidths = {
    name: COL_NAME,
    type: COL_TYPE,
    size: COL_SIZE,
    date: COL_DATE,
    actions: COL_ACTIONS,
  },
}: TableHeaderProps) {
  const getSortIcon = (column: SortOption) => {
    if (sortBy !== column) return 'swap-vertical';
    return sortDirection === 'asc' ? 'arrow-up' : 'arrow-down';
  };

  const getSortColor = (column: SortOption) =>
    sortBy === column ? '#F05C0C' : '#A0A0A0';

  return (
    <View className={className}>
      {/* Name */}
      <View
        style={{ width: columnWidths.name }}
        className="flex-row items-center"
      >
        <Text
          className="text-xs font-semibold text-gray-500 mr-1"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          Name
        </Text>
        <TouchableOpacity onPress={() => onSort('name')}>
          <Ionicons
            name={getSortIcon('name')}
            size={16}
            color={getSortColor('name')}
          />
        </TouchableOpacity>
      </View>
      {/* Type */}
      <View
        style={{ width: columnWidths.type }}
        className="flex-row items-center"
      >
        <Text
          className="text-xs font-semibold text-gray-500 mr-1"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          Type
        </Text>
        <TouchableOpacity onPress={onTypeDropdownToggle}>
          <Ionicons
            name="filter"
            size={16}
            color={typeFilter !== 'all' ? '#F05C0C' : '#A0A0A0'}
          />
        </TouchableOpacity>
        {/* Dropdown for type filter */}
        {showTypeDropdown && (
          <View className="absolute top-6 left-0 bg-white border border-gray-200 rounded-lg shadow p-2 z-50">
            {typeOptions.map(opt => (
              <TouchableOpacity
                key={opt.key}
                className="px-3 py-1"
                onPress={() => {
                  onTypeFilterChange(opt.key);
                  onTypeDropdownToggle();
                }}
              >
                <Text
                  className={
                    typeFilter === opt.key
                      ? 'text-orange-500 font-semibold'
                      : 'text-gray-700'
                  }
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      {/* Size */}
      <View
        style={{ width: columnWidths.size }}
        className="flex-row items-center"
      >
        <Text
          className="text-xs font-semibold text-gray-500 mr-1"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          Size
        </Text>
        <TouchableOpacity onPress={() => onSort('size')}>
          <Ionicons
            name={getSortIcon('size')}
            size={16}
            color={getSortColor('size')}
          />
        </TouchableOpacity>
      </View>
      {/* Date */}
      <View
        style={{ width: columnWidths.date }}
        className="flex-row items-center"
      >
        <Text
          className="text-xs font-semibold text-gray-500 mr-1"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          Date
        </Text>
        <TouchableOpacity onPress={() => onSort('created')}>
          <Ionicons
            name={getSortIcon('created')}
            size={16}
            color={getSortColor('created')}
          />
        </TouchableOpacity>
      </View>
      <Text
        style={{ width: columnWidths.actions }}
        className="text-xs font-semibold text-gray-500 text-center"
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        Actions
      </Text>
    </View>
  );
}
