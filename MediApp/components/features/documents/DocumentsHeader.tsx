import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type SearchField = 'from' | 'name';

interface DocumentsHeaderProps {
    searchText: string;
    setSearchText: (text: string) => void;
    searchField: SearchField;
    setSearchField: (field: SearchField) => void;
    showSearchFieldDropdown: boolean;
    setShowSearchFieldDropdown: (show: boolean) => void;
}

export const DocumentsHeader: React.FC<DocumentsHeaderProps> = ({
    searchText,
    setSearchText,
    searchField,
    setSearchField,
    showSearchFieldDropdown,
    setShowSearchFieldDropdown,
}) => {
    return (
        <View className="px-4 pt-3 pb-3 bg-white">
            <View className="flex-row items-center bg-gray-50 rounded-xl px-1 py-1 border border-gray-200">
                {/* Search field selector */}
                <TouchableOpacity
                    onPress={() => setShowSearchFieldDropdown(!showSearchFieldDropdown)}
                    className="flex-row items-center rounded-lg px-3 py-2 bg-white border border-gray-200"
                >
                    <Text className="text-sm font-semibold text-gray-700">
                        {searchField === 'from' ? 'From' : 'Name'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={16} color="#6B7280" />
                </TouchableOpacity>

                <TextInput
                    className="flex-1 ml-3 text-sm text-gray-900"
                    placeholder="Search documents"
                    placeholderTextColor="#9CA3AF"
                    value={searchText}
                    onChangeText={setSearchText}
                    autoCorrect={false}
                />

                {searchText.length > 0 ? (
                    <TouchableOpacity onPress={() => setSearchText('')} className="p-2">
                        <MaterialCommunityIcons name="close-circle" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                ) : (
                    <View className="p-2">
                        <MaterialCommunityIcons name="magnify" size={22} color="#9CA3AF" />
                    </View>
                )}
            </View>

            {/* Search field dropdown */}
            {showSearchFieldDropdown && (
                <View className="absolute left-4 top-16 bg-white rounded-xl shadow-lg z-20 py-2" style={{ elevation: 8, minWidth: 120 }}>
                    {(['name', 'from'] as const).map((field) => (
                        <TouchableOpacity
                            key={field}
                            onPress={() => { setSearchField(field); setShowSearchFieldDropdown(false); }}
                            className="px-4 py-3"
                        >
                            <Text className={`text-sm ${searchField === field ? 'font-bold' : 'text-gray-600'}`} style={searchField === field ? { color: '#F05C0C' } : {}}>
                                {field === 'from' ? 'From' : 'Name'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};
