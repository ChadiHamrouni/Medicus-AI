import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  DocumentStatsResponse,
  DoctorDocumentCategory,
} from '@/types/DoctorDocuments';
import { getDoctorDocumentStats } from '@/services';
import { parseErrorMessage, showErrorModal } from '@/utils';

export interface DoctorDocumentStatsProps {
  className?: string;
  onStatsLoad?: (stats: DocumentStatsResponse) => void;
}

export function DoctorDocumentStats({
  className = '',
  onStatsLoad,
}: DoctorDocumentStatsProps) {
  const [stats, setStats] = useState<DocumentStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const statsData = await getDoctorDocumentStats();
      setStats(statsData);
      onStatsLoad?.(statsData);
    } catch (error) {
      console.error('Failed to load document statistics:', error);
      const errorMessage = parseErrorMessage(error);
      showErrorModal('Statistics Error', errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadStats(true);
  };

  const formatFileSize = (mb: number) => {
    if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'practice-docs':
        return 'document-text-outline';
      case 'before-after-photos':
        return 'camera-outline';
      case 'case-studies':
        return 'library-outline';
      default:
        return 'document-outline';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'practice-docs':
        return 'Practice Documents';
      case 'before-after-photos':
        return 'Before/After Photos';
      case 'case-studies':
        return 'Case Studies';
      default:
        return category
          .replace('-', ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'indexed':
        return '#10B981';
      case 'processing':
        return '#F59E0B';
      case 'uploading':
        return '#3B82F6';
      case 'failed':
        return '#EF4444';
      case 'archived':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const calculateProcessingProgress = () => {
    if (!stats) return 0;
    const total = stats.total_documents;
    if (total === 0) return 100;
    return (stats.indexed_documents / total) * 100;
  };

  if (isLoading) {
    return (
      <View
        className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${className}`}
      >
        <View className="items-center justify-center py-8">
          <ActivityIndicator size="large" color="#F05C0C" />
          <Text className="mt-3 text-gray-600">Loading statistics...</Text>
        </View>
      </View>
    );
  }

  if (!stats) {
    return (
      <View
        className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${className}`}
      >
        <Text className="text-center text-gray-500">
          Failed to load statistics
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#F05C0C"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View className="p-6">
        {/* Header */}
        <Text className="text-xl font-semibold text-gray-900 mb-6">
          Document Statistics
        </Text>

        {/* Overview Cards */}
        <View className="flex-row flex-wrap -mx-2 mb-6">
          {/* Total Documents */}
          <View className="w-1/2 px-2 mb-4">
            <View className="bg-orange-50 rounded-xl p-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-2xl font-bold text-orange-600">
                    {stats.total_documents}
                  </Text>
                  <Text className="text-sm text-orange-600 font-medium">
                    Total Documents
                  </Text>
                </View>
                <Ionicons name="document-outline" size={24} color="#F05C0C" />
              </View>
            </View>
          </View>

          {/* Storage Used */}
          <View className="w-1/2 px-2 mb-4">
            <View className="bg-blue-50 rounded-xl p-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-2xl font-bold text-blue-600">
                    {formatFileSize(stats.total_file_size_mb)}
                  </Text>
                  <Text className="text-sm text-blue-600 font-medium">
                    Storage Used
                  </Text>
                </View>
                <Ionicons name="server-outline" size={24} color="#3B82F6" />
              </View>
            </View>
          </View>

          {/* Indexed Documents */}
          <View className="w-1/2 px-2 mb-4">
            <View className="bg-green-50 rounded-xl p-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-2xl font-bold text-green-600">
                    {stats.indexed_documents}
                  </Text>
                  <Text className="text-sm text-green-600 font-medium">
                    Searchable
                  </Text>
                </View>
                <Ionicons name="search-outline" size={24} color="#10B981" />
              </View>
            </View>
          </View>

          {/* Pending Processing */}
          <View className="w-1/2 px-2 mb-4">
            <View className="bg-amber-50 rounded-xl p-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-2xl font-bold text-amber-600">
                    {stats.pending_indexing}
                  </Text>
                  <Text className="text-sm text-amber-600 font-medium">
                    Processing
                  </Text>
                </View>
                <Ionicons name="time-outline" size={24} color="#F59E0B" />
              </View>
            </View>
          </View>
        </View>

        {/* Processing Progress */}
        {stats.total_documents > 0 && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-medium text-gray-700">
                Processing Progress
              </Text>
              <Text className="text-sm text-gray-500">
                {calculateProcessingProgress().toFixed(0)}%
              </Text>
            </View>
            <View className="h-2 bg-gray-200 rounded-full">
              <View
                className="h-2 bg-green-500 rounded-full"
                style={{ width: `${calculateProcessingProgress()}%` }}
              />
            </View>
          </View>
        )}

        {/* Documents by Category */}
        {Object.keys(stats.documents_by_category).length > 0 && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Documents by Category
            </Text>
            {Object.entries(stats.documents_by_category).map(
              ([category, count]) => (
                <View
                  key={category}
                  className="flex-row items-center justify-between py-2"
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name={getCategoryIcon(category)}
                      size={18}
                      color="#F05C0C"
                    />
                    <Text className="ml-3 text-gray-700">
                      {getCategoryLabel(category)}
                    </Text>
                  </View>
                  <Text className="text-gray-900 font-medium">{count}</Text>
                </View>
              )
            )}
          </View>
        )}

        {/* Documents by Status */}
        {Object.keys(stats.documents_by_status).length > 0 && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Documents by Status
            </Text>
            {Object.entries(stats.documents_by_status).map(
              ([status, count]) => (
                <View
                  key={status}
                  className="flex-row items-center justify-between py-2"
                >
                  <View className="flex-row items-center">
                    <View
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ backgroundColor: getStatusColor(status) }}
                    />
                    <Text className="text-gray-700 capitalize">
                      {status.replace('_', ' ')}
                    </Text>
                  </View>
                  <Text className="text-gray-900 font-medium">{count}</Text>
                </View>
              )
            )}
          </View>
        )}

        {/* Documents by Specialty */}
        {Object.keys(stats.documents_by_specialty).length > 0 && (
          <View>
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Documents by Specialty
            </Text>
            {Object.entries(stats.documents_by_specialty)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([specialty, count]) => (
                <View
                  key={specialty}
                  className="flex-row items-center justify-between py-2"
                >
                  <Text className="text-gray-700">{specialty}</Text>
                  <Text className="text-gray-900 font-medium">{count}</Text>
                </View>
              ))}
          </View>
        )}

        {/* Empty State */}
        {stats.total_documents === 0 && (
          <View className="items-center py-8">
            <Ionicons name="document-outline" size={48} color="#D1D5DB" />
            <Text className="mt-3 text-lg font-medium text-gray-500">
              No Documents Yet
            </Text>
            <Text className="mt-1 text-sm text-gray-400 text-center">
              Upload your first medical document to see statistics here
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
