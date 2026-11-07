import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DocumentRecord } from '@/types/documents';
import { getFileIcon, getFileIconColor, formatSize, formatFullDate } from './utils';

interface DocumentGalleryItemProps {
    item: DocumentRecord;
    onPress: (item: DocumentRecord) => void;
    onAction: (item: DocumentRecord) => void;
    deletingDocId: string | null;
    isOpening: boolean;
}

export const DocumentGalleryItem: React.FC<DocumentGalleryItemProps> = ({
    item,
    onPress,
    onAction,
    deletingDocId,
    isOpening,
}) => (
    <View
        className="w-[48%] mb-4 bg-white rounded-2xl overflow-hidden border border-gray-100"
        style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3
        }}
    >
        {/* Header */}
        <View className="flex-row items-center px-3 py-2.5">
            <MaterialCommunityIcons
                name={getFileIcon(item.mime_type) as any}
                size={20}
                color="#6B7280"
            />
            <Text className="flex-1 text-md font-normal text-gray-900 ml-2" numberOfLines={1}>
                {item.original_name}
            </Text>
            <TouchableOpacity
                onPress={() => onAction(item)}
                className="p-1 items-center justify-center w-8 h-8"
                disabled={deletingDocId === item.external_id}
            >
                {deletingDocId === item.external_id ? (
                    <ActivityIndicator size="small" color="#9CA3AF" />
                ) : (
                    <MaterialCommunityIcons name="dots-horizontal" size={20} color="#9CA3AF" />
                )}
            </TouchableOpacity>
        </View>

        {/* Preview area */}
        <TouchableOpacity
            onPress={() => onPress(item)}
            className="h-36 justify-center items-center bg-gray-50"
            activeOpacity={0.7}
            disabled={isOpening}
        >
            {isOpening ? (
                <ActivityIndicator size="large" color="#F05C0C" />
            ) : (
                <>
                    <MaterialCommunityIcons
                        name={getFileIcon(item.mime_type) as any}
                        size={52}
                        color="#F05C0C"
                    />
                    <Text className="text-xs font-medium text-gray-400 mt-2">{formatSize(item.size_bytes)}</Text>
                </>
            )}
        </TouchableOpacity>

        {/* Footer */}
        <View className="flex-row items-center justify-between px-3 py-2.5 flex-wrap gap-y-1">
            <View className="flex-row items-center flex-1 min-w-[100px] mr-2">
                {item.active_shares > 0 ? (
                    <>
                        <MaterialCommunityIcons
                            name="share-variant"
                            size={14}
                            style={{ marginRight: 4, color: '#F05C0C' }}
                        />
                        <Text className="text-xs font-medium" style={{ color: '#F05C0C' }}>
                            {item.active_shares} share{item.active_shares > 1 ? 's' : ''}
                        </Text>
                    </>
                ) : (
                    <Text className="text-xs text-gray-400">Not shared</Text>
                )}
            </View>
            <Text className="text-xs text-gray-400 shrink-0">{formatFullDate(item.created_at)}</Text>
        </View>
    </View>
);
