import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SharedDocumentRecord } from '@/types/documents';
import { getFileIcon, getFileIconColor, formatFullDate } from './utils';

interface SharedDocumentGalleryItemProps {
    item: SharedDocumentRecord;
    onPress: (item: SharedDocumentRecord) => void;
    isOpening: boolean;
}

export const SharedDocumentGalleryItem: React.FC<SharedDocumentGalleryItemProps> = ({
    item,
    onPress,
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
        <View className="flex-row items-center px-3 py-2.5">
            <MaterialCommunityIcons
                name={getFileIcon(item.mime_type) as any}
                size={20}
                color="#6B7280"
            />
            <Text className="flex-1 text-md font-normal text-gray-900 ml-2" numberOfLines={1}>
                {item.original_name}
            </Text>
        </View>
        <TouchableOpacity
            onPress={() => onPress(item)}
            className="h-36 justify-center items-center bg-gray-50"
            activeOpacity={0.7}
            disabled={isOpening}
        >
            {isOpening ? (
                <ActivityIndicator size="large" color="#F05C0C" />
            ) : (
                <MaterialCommunityIcons
                    name={getFileIcon(item.mime_type) as any}
                    size={52}
                    color="#F05C0C"
                />
            )}
        </TouchableOpacity>
        <View className="flex-row items-center justify-between px-3 py-2.5 flex-wrap gap-y-1">
            <View className="flex-row items-center flex-1 min-w-[100px] mr-2">
                <MaterialCommunityIcons
                    name="account-multiple"
                    size={15}
                    style={{ marginRight: 4, color: '#6B7280' }}
                />
                <Text className="text-xs text-gray-600 font-medium" numberOfLines={1}>
                    {item.shared_by_name}
                </Text>
            </View>
            <Text className="text-xs text-gray-400 shrink-0">{formatFullDate(item.shared_at)}</Text>
        </View>
    </View>
);
