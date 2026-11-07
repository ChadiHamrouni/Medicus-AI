import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface FloatingActionsProps {
    onScan: () => void;
    onUpload: () => void;
    isUploading: boolean;
}

export const FloatingActions: React.FC<FloatingActionsProps> = ({
    onScan,
    onUpload,
    isUploading,
}) => {
    return (
        <View className="absolute bottom-6 right-6 items-center">
            {/* Scan button */}
            <TouchableOpacity
                onPress={onScan}
                className="w-12 h-12 rounded-full items-center justify-center mb-3"
                style={{
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1.5,
                    borderColor: '#D1D5DB',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3
                }}
                activeOpacity={0.8}
            >
                <MaterialCommunityIcons name="text-box-search-outline" size={22} color="#374151" />
            </TouchableOpacity>

            {/* Add/Upload button */}
            <TouchableOpacity
                onPress={onUpload}
                disabled={isUploading}
                className="w-14 h-14 rounded-full items-center justify-center shadow-lg"
                style={{
                    backgroundColor: '#F05C0C',
                    shadowColor: '#F05C0C',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 6,
                }}
                activeOpacity={0.8}
            >
                <MaterialCommunityIcons name="plus" size={30} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );
};
