import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '@/components/shared/ui/SearchBar/SearchBar';
import { FormFieldWrapper } from '@/components/shared/ui/Form/FormFieldWrapper';
import {
  DocumentFilter,
  DoctorDocumentCategory,
  DocumentStatus,
  DocumentVisibility,
  CategoryOption,
  SpecialtyOption,
} from '@/types/DoctorDocuments';
import { getDocumentCategories } from '@/services';

export interface DoctorDocumentFiltersProps {
  filters: DocumentFilter;
  onFiltersChange: (_filters: DocumentFilter) => void;
  onSearch: (_query: string) => void;
  className?: string;
  showAdvancedFilters?: boolean;
}

export function DoctorDocumentFilters({
  filters,
  onFiltersChange,
  onSearch,
  className = '',
  showAdvancedFilters = false,
}: DoctorDocumentFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(showAdvancedFilters);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyOption[]>([]);

  // Load options
  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const data = await getDocumentCategories();
      setCategories(data.categories);
      setSpecialties(data.specialties);
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  };

  const handleFilterChange = (key: keyof DocumentFilter, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === '' ? undefined : value,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      page: 1,
      page_size: filters.page_size || 20,
    });
    onSearch('');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.specialty) count++;
    if (filters.status) count++;
    if (filters.visibility) count++;
    if (filters.search_query) count++;
    return count;
  };

  const getSpecialtyOptions = () =>
    specialties.map(spec => ({
      key: spec.id.toString(),
      value: spec.label,
    }));

  const getStatusOptions = () => [
    { key: DocumentStatus.INDEXED, value: 'Indexed' },
    { key: DocumentStatus.PROCESSING, value: 'Processing' },
    { key: DocumentStatus.UPLOADING, value: 'Uploading' },
    { key: DocumentStatus.FAILED, value: 'Failed' },
    { key: DocumentStatus.ARCHIVED, value: 'Archived' },
  ];

  const getVisibilityOptions = () => [
    { key: DocumentVisibility.PRIVATE, value: 'Private' },
    { key: DocumentVisibility.SHAREABLE, value: 'Shareable' },
    { key: DocumentVisibility.PUBLIC, value: 'Public' },
  ];

  return (
    <View
      className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}
    >
      {/* Search Bar */}
      <View className="p-4 border-b border-gray-100">
        <SearchBar
          placeholder="Search documents by title, description, or tags..."
          onSearch={onSearch}
          value={filters.search_query || ''}
          onChangeText={onSearch}
        />
      </View>

      {/* Quick Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
      >
        <TouchableOpacity
          className={`mr-3 px-4 py-2 rounded-full border ${
            !filters.category
              ? 'bg-orange-50 border-orange-200'
              : 'bg-gray-50 border-gray-200'
          }`}
          onPress={() => handleFilterChange('category', '')}
        >
          <Text
            className={`text-sm font-medium ${
              !filters.category ? 'text-orange-600' : 'text-gray-600'
            }`}
          >
            All Categories
          </Text>
        </TouchableOpacity>

        {categories.map(category => (
          <TouchableOpacity
            key={category.value}
            className={`mr-3 px-4 py-2 rounded-full border ${
              filters.category === category.value
                ? 'bg-orange-50 border-orange-200'
                : 'bg-gray-50 border-gray-200'
            }`}
            onPress={() => handleFilterChange('category', category.value)}
          >
            <Text
              className={`text-sm font-medium ${
                filters.category === category.value
                  ? 'text-orange-600'
                  : 'text-gray-600'
              }`}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Advanced Filters Toggle */}
      <View className="px-4 pb-2">
        <TouchableOpacity
          className="flex-row items-center justify-between py-2"
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <View className="flex-row items-center">
            <Text className="text-sm font-medium text-gray-700">
              Advanced Filters
            </Text>
            {getActiveFilterCount() > 0 && (
              <View className="ml-2 bg-orange-100 rounded-full px-2 py-1">
                <Text className="text-xs font-semibold text-orange-600">
                  {getActiveFilterCount()}
                </Text>
              </View>
            )}
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>

      {/* Advanced Filters */}
      {isExpanded && (
        <View className="px-4 pb-4 border-t border-gray-100">
          <View className="mt-4 space-y-4">
            {/* Specialty Filter */}
            <FormFieldWrapper
              type="singleDropdown"
              field="specialty"
              value={filters.specialty || ''}
              label="Filter by Specialty"
              options={[
                { key: '', value: 'All Specialties' },
                ...getSpecialtyOptions(),
              ]}
              onValueChange={value => handleFilterChange('specialty', value)}
              isActive={!!filters.specialty}
              borderColor="#F05C0C"
              labelStyle={{ color: '#F05C0C' }}
              onFocus={() => {}}
              onBlur={() => {}}
            />

            {/* Status Filter */}
            <FormFieldWrapper
              type="singleDropdown"
              field="status"
              value={filters.status || ''}
              label="Filter by Status"
              options={[
                { key: '', value: 'All Statuses' },
                ...getStatusOptions(),
              ]}
              onValueChange={value => handleFilterChange('status', value)}
              isActive={!!filters.status}
              borderColor="#F05C0C"
              labelStyle={{ color: '#F05C0C' }}
              onFocus={() => {}}
              onBlur={() => {}}
            />

            {/* Visibility Filter */}
            <FormFieldWrapper
              type="singleDropdown"
              field="visibility"
              value={filters.visibility || ''}
              label="Filter by Visibility"
              options={[
                { key: '', value: 'All Visibility Levels' },
                ...getVisibilityOptions(),
              ]}
              onValueChange={value => handleFilterChange('visibility', value)}
              isActive={!!filters.visibility}
              borderColor="#F05C0C"
              labelStyle={{ color: '#F05C0C' }}
              onFocus={() => {}}
              onBlur={() => {}}
            />
          </View>

          {/* Clear Filters */}
          {getActiveFilterCount() > 0 && (
            <TouchableOpacity
              className="mt-4 py-2 px-4 bg-gray-100 rounded-lg"
              onPress={clearAllFilters}
            >
              <Text className="text-center text-sm font-medium text-gray-600">
                Clear All Filters
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
