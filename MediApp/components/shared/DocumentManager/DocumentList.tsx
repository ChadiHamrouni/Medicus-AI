import {
  COL_ACTIONS,
  COL_DATE,
  COL_NAME,
  COL_SIZE,
  COL_TYPE,
} from '@/constants';
import { Document } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';

export type DocumentListProps = {
  documents: Document[];
  onDelete: (_id: string) => void;
  className?: string;
  columnWidths?: {
    name?: number;
    type?: number;
    size?: number;
    date?: number;
    actions?: number;
  };
  emptyStateText?: string;
};

export function DocumentList({
  documents,
  onDelete,
  className = 'flex-1',
  columnWidths = {
    name: COL_NAME,
    type: COL_TYPE,
    size: COL_SIZE,
    date: COL_DATE,
    actions: COL_ACTIONS,
  },
  emptyStateText = 'No documents found.',
}: DocumentListProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <View className={className}>
      <FlatList
        data={documents}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <Text className="text-center text-gray-400 mt-8">
            {emptyStateText}
          </Text>
        }
        renderItem={({ item }) => (
          <View className="flex-row items-center px-2 py-3 bg-white border-b border-gray-50">
            <Text
              style={{ width: columnWidths.name }}
              className="text-sm font-semibold text-gray-900"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.name}
            </Text>
            <Text
              style={{ width: columnWidths.type }}
              className="text-xs text-gray-500 uppercase"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.type}
            </Text>
            <Text
              style={{ width: columnWidths.size }}
              className="text-xs text-gray-500"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {formatFileSize(item.size)}
            </Text>
            <Text
              style={{ width: columnWidths.date }}
              className="text-xs text-gray-500"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.createdAt.toLocaleDateString()}
            </Text>
            <View
              style={{ width: columnWidths.actions }}
              className="items-center"
            >
              <TouchableOpacity
                className="p-2 rounded-full bg-red-50"
                onPress={() => onDelete(item.id)}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}
