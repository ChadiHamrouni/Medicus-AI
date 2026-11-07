import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SharedDocumentRecord } from '@/types/documents';
import { getFileIcon, getFileIconColor, formatFullDate } from './utils';

interface SharedDocumentListItemProps {
    item: SharedDocumentRecord;
    onPress: (item: SharedDocumentRecord) => void;
    isOpening: boolean;
}

export const SharedDocumentListItem: React.FC<SharedDocumentListItemProps> = ({
    item,
    onPress,
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
                <View className="flex-row items-center mb-0.5">
                    <MaterialCommunityIcons
                        name="account-multiple"
                        size={14}
                        style={{ marginRight: 4, color: '#6B7280' }}
                    />
                    <Text className="text-sm font-medium text-gray-600">
                        {item.shared_by_name}
                    </Text>
                </View>
                <Text className="text-sm text-gray-500">
                    {formatFullDate(item.shared_at)}
                </Text>
            </View>
        </View>
    </TouchableOpacity>
);
