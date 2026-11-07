import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DocumentRecord } from '@/types/documents';
import { getFileIcon, getFileIconColor, formatFullDate } from './utils';

interface DocumentListItemProps {
    item: DocumentRecord;
    onPress: (item: DocumentRecord) => void;
    onAction: (item: DocumentRecord) => void;
    deletingDocId: string | null;
    isOpening: boolean;
}

export const DocumentListItem: React.FC<DocumentListItemProps> = ({
    item,
    onPress,
    onAction,
    deletingDocId,
    isOpening,
}) => (
    <TouchableOpacity
        onPress={() => onPress(item)}
        className="flex-row items-center px-4 py-3.5 border-b border-gray-100 bg-white"
        activeOpacity={0.7}
        disabled={isOpening}
    >
        <View className="w-12 h-12 rounded-xl bg-gray-50 justify-center items-center mr-3">
            {isOpening ? (
                <ActivityIndicator size="small" color="#F05C0C" />
            ) : (
                <MaterialCommunityIcons
                    name={getFileIcon(item.mime_type) as any}
                    size={28}
                    color="#F05C0C"
                />
            )}
        </View>
        <View className="flex-1">
            <Text className="text-base font-normal text-gray-900" numberOfLines={1}>
                {item.original_name}
            </Text>
            <View className="mt-1">
                {item.active_shares > 0 && (
                    <View className="flex-row items-center mb-0.5">
                        <MaterialCommunityIcons
                            name="share-variant"
                            size={13}
                            style={{ marginRight: 4, color: '#F05C0C' }}
                        />
                        <Text className="text-sm" style={{ color: '#F05C0C' }}>
                            {item.active_shares} share{item.active_shares > 1 ? 's' : ''}
                        </Text>
                    </View>
                )}
                <Text className="text-sm text-gray-500">
                    {formatFullDate(item.created_at)}
                </Text>
            </View>
        </View>
        <TouchableOpacity
            onPress={() => onAction(item)}
            className="p-2 items-center justify-center w-10 h-10"
            disabled={deletingDocId === item.external_id}
        >
            {deletingDocId === item.external_id ? (
                <ActivityIndicator size="small" color="#9CA3AF" />
            ) : (
                <MaterialCommunityIcons name="dots-horizontal" size={22} color="#9CA3AF" />
            )}
        </TouchableOpacity>
    </TouchableOpacity>
);
