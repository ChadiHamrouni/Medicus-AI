import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DoctorDocumentUpload } from './DoctorDocumentUpload';
import { DoctorDocumentList } from './DoctorDocumentList';
import { DoctorDocumentFilters } from './DoctorDocumentFilters';
import { DoctorDocumentStats } from './DoctorDocumentStats';
import {
  DoctorDocument,
  DocumentFilter,
  DocumentListResponse,
  DoctorDocumentUploadResponse,
  DocumentStatsResponse,
} from '@/types/DoctorDocuments';
import { getDoctorDocuments } from '@/services';
import { parseErrorMessage, showErrorModal } from '@/utils';

export interface DoctorDocumentDashboardProps {
  className?: string;
  initialView?: 'upload' | 'list' | 'stats';
}

type ViewMode = 'upload' | 'list' | 'stats';

export function DoctorDocumentDashboard({
  className = '',
  initialView = 'list',
}: DoctorDocumentDashboardProps) {
  // State management
  const [currentView, setCurrentView] = useState<ViewMode>(initialView);
  const [documents, setDocuments] = useState<DoctorDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Pagination and filtering
  const [filters, setFilters] = useState<DocumentFilter>({
    page: 1,
    page_size: 20,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadDocuments = useCallback(
    async (isRefresh = false, isLoadMore = false) => {
      try {
        if (isRefresh) {
          setIsRefreshing(true);
          setHasError(false);
        } else if (isLoadMore) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
          setHasError(false);
        }

        const response: DocumentListResponse =
          await getDoctorDocuments(filters);

        if (isLoadMore) {
          // Append new documents for pagination
          setDocuments(prev => [...prev, ...response.documents]);
        } else {
          // Replace documents for new search/filter
          setDocuments(response.documents);
        }

        setTotalCount(response.total_count);
        setHasNextPage(response.has_next);
      } catch (error) {
        console.error('Failed to load documents:', error);
        setHasError(true);
        const errorMessage = parseErrorMessage(error);
        if (!isRefresh) {
          showErrorModal('Failed to Load Documents', errorMessage);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [filters]
  );

  // Load documents on mount and filter changes
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleRefresh = useCallback(() => {
    setFilters(prev => ({ ...prev, page: 1 }));
    loadDocuments(true);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isLoadingMore) {
      setFilters(prev => ({
        ...prev,
        page: (prev.page || 1) + 1,
      }));
    }
  }, [hasNextPage, isLoadingMore]);

  const handleFiltersChange = useCallback((newFilters: DocumentFilter) => {
    setFilters({ ...newFilters, page: 1 });
  }, []);

  const handleSearch = useCallback((query: string) => {
    setFilters(prev => ({
      ...prev,
      search_query: query || undefined,
      page: 1,
    }));
  }, []);

  const handleUploadSuccess = useCallback(
    (_uploadResponse: DoctorDocumentUploadResponse) => {
      // Refresh documents list
      handleRefresh();

      // Switch to list view to show the uploaded document
      setCurrentView('list');
    },
    [handleRefresh]
  );

  const handleDocumentUpdate = useCallback(() => {
    // Refresh current page without resetting to page 1
    loadDocuments();
  }, [filters]);

  const getViewTitle = () => {
    switch (currentView) {
      case 'upload':
        return 'Upload Documents';
      case 'list':
        return 'My Documents';
      case 'stats':
        return 'Statistics';
      default:
        return 'Documents';
    }
  };

  const renderTabBar = () => (
    <View className="flex-row bg-white rounded-xl shadow-sm border border-gray-100 mb-4">
      {[
        { key: 'list' as ViewMode, icon: 'list-outline', label: 'Documents' },
        {
          key: 'upload' as ViewMode,
          icon: 'cloud-upload-outline',
          label: 'Upload',
        },
        { key: 'stats' as ViewMode, icon: 'analytics-outline', label: 'Stats' },
      ].map(tab => (
        <TouchableOpacity
          key={tab.key}
          className={`flex-1 flex-row items-center justify-center py-3 px-4 ${
            currentView === tab.key
              ? 'bg-orange-50 border-b-2 border-orange-500'
              : ''
          }`}
          onPress={() => setCurrentView(tab.key)}
        >
          <Ionicons
            name={tab.icon as any}
            size={20}
            color={currentView === tab.key ? '#F05C0C' : '#6B7280'}
          />
          <Text
            className={`ml-2 font-medium ${
              currentView === tab.key ? 'text-orange-600' : 'text-gray-600'
            }`}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'upload':
        return (
          <View>
            <DoctorDocumentUpload
              onUploadSuccess={handleUploadSuccess}
              className="mb-4"
            />

            {/* Recent uploads preview */}
            {documents.length > 0 && (
              <View>
                <Text className="text-lg font-semibold text-gray-900 mb-3">
                  Recent Uploads
                </Text>
                <DoctorDocumentList
                  documents={documents.slice(0, 3)}
                  onDocumentUpdate={handleDocumentUpdate}
                  showActions={false}
                />
                <TouchableOpacity
                  className="mt-3 py-2 px-4 bg-gray-100 rounded-lg"
                  onPress={() => setCurrentView('list')}
                >
                  <Text className="text-center text-sm font-medium text-gray-600">
                    View All Documents
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      case 'stats':
        return (
          <DoctorDocumentStats
            onStatsLoad={(_stats: DocumentStatsResponse) => {
              // Could update some global state or perform actions based on stats
            }}
          />
        );

      case 'list':
      default:
        if (isLoading) {
          return (
            <View className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <View className="items-center">
                <ActivityIndicator size="large" color="#F05C0C" />
                <Text className="mt-3 text-gray-600">Loading documents...</Text>
              </View>
            </View>
          );
        }

        if (hasError) {
          return (
            <View className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <View className="items-center">
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color="#EF4444"
                />
                <Text className="mt-3 text-lg font-medium text-gray-900">
                  Failed to Load Documents
                </Text>
                <Text className="mt-1 text-sm text-gray-500 text-center">
                  Please check your connection and try again
                </Text>
                <TouchableOpacity
                  className="mt-4 py-2 px-4 bg-orange-500 rounded-lg"
                  onPress={() => loadDocuments()}
                >
                  <Text className="text-white font-medium">Retry</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }

        return (
          <View>
            {/* Filters */}
            <DoctorDocumentFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onSearch={handleSearch}
              className="mb-4"
            />

            {/* Document Count */}
            {totalCount > 0 && (
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-sm text-gray-600">
                  {totalCount} document{totalCount !== 1 ? 's' : ''} found
                </Text>
                {filters.search_query && (
                  <Text className="text-sm text-orange-600">
                    Search: "{filters.search_query}"
                  </Text>
                )}
              </View>
            )}

            {/* Documents List */}
            <DoctorDocumentList
              documents={documents}
              onDocumentUpdate={handleDocumentUpdate}
              emptyStateText={
                Object.keys(filters).some(
                  key =>
                    key !== 'page' &&
                    key !== 'page_size' &&
                    filters[key as keyof DocumentFilter]
                )
                  ? 'No documents match your search criteria'
                  : 'No documents uploaded yet'
              }
            />

            {/* Load More Button */}
            {hasNextPage && (
              <TouchableOpacity
                className="mt-4 py-3 px-4 bg-gray-100 rounded-lg"
                onPress={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator size="small" color="#F05C0C" />
                    <Text className="ml-2 text-gray-600">Loading more...</Text>
                  </View>
                ) : (
                  <Text className="text-center font-medium text-gray-700">
                    Load More Documents
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        );
    }
  };

  return (
    <View className={`flex-1 ${className}`}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-2xl font-bold text-gray-900">
          {getViewTitle()}
        </Text>
        <View className="flex-row items-center">
          <Text className="text-sm text-gray-500 mr-2">
            Total: {totalCount}
          </Text>
          <TouchableOpacity onPress={handleRefresh} disabled={isRefreshing}>
            <Ionicons
              name="refresh-outline"
              size={24}
              color={isRefreshing ? '#F05C0C' : '#6B7280'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Bar */}
      {renderTabBar()}

      {/* Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#F05C0C"
          />
        }
      >
        {renderContent()}
      </ScrollView>
    </View>
  );
}
