import React, { useState } from 'react';
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  DoctorDocument,
  DocumentStatus,
  DocumentVisibility,
  DoctorDocumentCategory,
} from '@/types/DoctorDocuments';
import { deleteDoctorDocument, getDocumentDownloadUrl } from '@/services';
import { parseErrorMessage, showErrorModal } from '@/utils';

export interface DoctorDocumentListProps {
  documents: DoctorDocument[];
  onDocumentUpdate?: () => void;
  onDocumentEdit?: (document: DoctorDocument) => void;
  className?: string;
  emptyStateText?: string;
  showActions?: boolean;
}

export function DoctorDocumentList({
  documents,
  onDocumentUpdate,
  onDocumentEdit,
  className = 'flex-1',
  emptyStateText = 'No documents found.',
  showActions = true,
}: DoctorDocumentListProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  );

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCategoryIcon = (category: DoctorDocumentCategory) => {
    switch (category) {
      case DoctorDocumentCategory.PRACTICE_DOCS:
        return 'document-text-outline';
      case DoctorDocumentCategory.BEFORE_AFTER_PHOTOS:
        return 'camera-outline';
      case DoctorDocumentCategory.CASE_STUDIES:
        return 'library-outline';
      default:
        return 'document-outline';
    }
  };

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.INDEXED:
        return '#10B981'; // green
      case DocumentStatus.PROCESSING:
        return '#F59E0B'; // amber
      case DocumentStatus.UPLOADING:
        return '#3B82F6'; // blue
      case DocumentStatus.FAILED:
        return '#EF4444'; // red
      case DocumentStatus.ARCHIVED:
        return '#6B7280'; // gray
      default:
        return '#6B7280';
    }
  };

  const getVisibilityIcon = (visibility: DocumentVisibility) => {
    switch (visibility) {
      case DocumentVisibility.PUBLIC:
        return 'globe-outline';
      case DocumentVisibility.SHAREABLE:
        return 'people-outline';
      case DocumentVisibility.PRIVATE:
        return 'lock-closed-outline';
      default:
        return 'lock-closed-outline';
    }
  };

  const setDocumentLoading = (documentId: string, isLoading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [documentId]: isLoading,
    }));
  };

  const handleDownload = async (document: DoctorDocument) => {
    try {
      setDocumentLoading(document.document_id, true);

      const downloadData = await getDocumentDownloadUrl(document.document_id);

      // Open download URL in browser/default app
      const supported = await Linking.canOpenURL(downloadData.download_url);
      if (supported) {
        await Linking.openURL(downloadData.download_url);
      } else {
        Alert.alert('Download Error', 'Unable to open download link');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      const errorMessage = parseErrorMessage(error);
      showErrorModal('Download Failed', errorMessage);
    } finally {
      setDocumentLoading(document.document_id, false);
    }
  };

  const handleDelete = async (document: DoctorDocument) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${document.title || document.filename}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDocumentLoading(document.document_id, true);
              await deleteDoctorDocument(document.document_id);
              onDocumentUpdate?.();
              Alert.alert('Success', 'Document deleted successfully');
            } catch (error) {
              console.error('Error deleting document:', error);
              const errorMessage = parseErrorMessage(error);
              showErrorModal('Delete Failed', errorMessage);
            } finally {
              setDocumentLoading(document.document_id, false);
            }
          },
        },
      ]
    );
  };

  const renderDocumentItem = ({ item }: { item: DoctorDocument }) => {
    const isLoading = loadingStates[item.document_id];

    return (
      <View className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100">
        {/* Header Row */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-1">
              <Ionicons
                name={getCategoryIcon(item.category)}
                size={18}
                color="#F05C0C"
              />
              <Text
                className="ml-2 font-semibold text-gray-900 flex-1"
                numberOfLines={2}
              >
                {item.title || item.filename}
              </Text>
            </View>
            {item.title && (
              <Text className="text-sm text-gray-500 ml-6" numberOfLines={1}>
                {item.filename}
              </Text>
            )}
          </View>

          {/* Status Indicator */}
          <View className="flex-row items-center">
            <View
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: getStatusColor(item.status) }}
            />
            <Text className="text-xs text-gray-500 capitalize">
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* Description */}
        {item.description && (
          <Text className="text-sm text-gray-600 mb-3" numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <View className="flex-row flex-wrap mb-3">
            {item.tags.slice(0, 3).map((tag, index) => (
              <View
                key={index}
                className="bg-gray-100 rounded-full px-2 py-1 mr-2 mb-1"
              >
                <Text className="text-xs text-gray-600">{tag}</Text>
              </View>
            ))}
            {item.tags.length > 3 && (
              <View className="bg-gray-100 rounded-full px-2 py-1 mr-2 mb-1">
                <Text className="text-xs text-gray-600">
                  +{item.tags.length - 3} more
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Metadata Row */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center space-x-4">
            {/* File Size */}
            <Text className="text-xs text-gray-500">
              {formatFileSize(item.file_size)}
            </Text>

            {/* Specialty */}
            {item.specialty && (
              <Text className="text-xs text-gray-500">{item.specialty}</Text>
            )}

            {/* Visibility */}
            <View className="flex-row items-center">
              <Ionicons
                name={getVisibilityIcon(item.visibility)}
                size={12}
                color="#6B7280"
              />
              <Text className="ml-1 text-xs text-gray-500 capitalize">
                {item.visibility}
              </Text>
            </View>

            {/* Date */}
            <Text className="text-xs text-gray-500">
              {formatDate(item.created_at)}
            </Text>
          </View>

          {/* Actions */}
          {showActions && (
            <View className="flex-row items-center space-x-2">
              {isLoading ? (
                <ActivityIndicator size="small" color="#F05C0C" />
              ) : (
                <>
                  {/* Download Button */}
                  {item.status === DocumentStatus.INDEXED && (
                    <TouchableOpacity
                      className="p-2 rounded-full bg-blue-50"
                      onPress={() => handleDownload(item)}
                      disabled={isLoading}
                    >
                      <Ionicons
                        name="download-outline"
                        size={16}
                        color="#3B82F6"
                      />
                    </TouchableOpacity>
                  )}

                  {/* Edit Button */}
                  {onDocumentEdit && (
                    <TouchableOpacity
                      className="p-2 rounded-full bg-gray-50"
                      onPress={() => onDocumentEdit(item)}
                      disabled={isLoading}
                    >
                      <Ionicons
                        name="create-outline"
                        size={16}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  )}

                  {/* Delete Button */}
                  <TouchableOpacity
                    className="p-2 rounded-full bg-red-50"
                    onPress={() => handleDelete(item)}
                    disabled={isLoading}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        {/* Processing Status Message */}
        {item.status === DocumentStatus.PROCESSING && (
          <View className="mt-3 p-2 bg-amber-50 rounded-lg">
            <Text className="text-xs text-amber-700">
              Document is being processed for search indexing...
            </Text>
          </View>
        )}

        {item.status === DocumentStatus.FAILED && (
          <View className="mt-3 p-2 bg-red-50 rounded-lg">
            <Text className="text-xs text-red-700">
              Document processing failed. Please try uploading again.
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View className={className}>
      <FlatList
        data={documents}
        keyExtractor={item => item.document_id}
        renderItem={renderDocumentItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Ionicons name="document-outline" size={48} color="#D1D5DB" />
            <Text className="text-center text-gray-400 mt-4 text-lg">
              {emptyStateText}
            </Text>
            <Text className="text-center text-gray-400 mt-2 text-sm">
              Upload your first medical document to get started
            </Text>
          </View>
        }
      />
    </View>
  );
}
