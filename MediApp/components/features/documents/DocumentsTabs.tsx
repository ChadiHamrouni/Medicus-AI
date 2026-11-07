import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type TabKey = 'vault' | 'shared';
export type ViewMode = 'gallery' | 'list';
export type SortBy = 'date' | 'name' | 'size';

interface DocumentsTabsProps {
    activeTab: TabKey;
    setActiveTab: (tab: TabKey) => void;
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    sortBy: SortBy;
    setSortBy: (sort: SortBy) => void;
    showSortDropdown: boolean;
    setShowSortDropdown: (show: boolean) => void;
}

export const DocumentsTabs: React.FC<DocumentsTabsProps> = ({
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    showSortDropdown,
    setShowSortDropdown,
}) => {
    return (
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
            {/* Tab buttons */}
            <TouchableOpacity onPress={() => setActiveTab('vault')} className="mr-5">
                <Text className={`text-base font-normal ${activeTab === 'vault' ? '' : 'text-gray-400'}`} style={activeTab === 'vault' ? { color: '#F05C0C' } : {}}>
                    My Documents
                </Text>
                {activeTab === 'vault' && <View className="h-1 mt-1.5 rounded-full" style={{ backgroundColor: '#F05C0C' }} />}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setActiveTab('shared')} className="mr-auto">
                <Text className={`text-base font-normal ${activeTab === 'shared' ? '' : 'text-gray-400'}`} style={activeTab === 'shared' ? { color: '#F05C0C' } : {}}>
                    Shared with me
                </Text>
                {activeTab === 'shared' && <View className="h-1 mt-1.5 rounded-full" style={{ backgroundColor: '#F05C0C' }} />}
            </TouchableOpacity>

            {/* View toggle */}
            <TouchableOpacity
                onPress={() => setViewMode(viewMode === 'gallery' ? 'list' : 'gallery')}
                className="p-2 mr-1"
            >
                <MaterialCommunityIcons
                    name={viewMode === 'gallery' ? 'view-list' : 'view-grid'}
                    size={22}
                    color="#374151"
                />
            </TouchableOpacity>

            {/* Sort dropdown trigger */}
            <TouchableOpacity
                onPress={() => setShowSortDropdown(!showSortDropdown)}
                className="flex-row items-center p-2"
            >
                <MaterialCommunityIcons name="sort-variant" size={22} color="#374151" />
                <MaterialCommunityIcons name="chevron-down" size={16} color="#374151" />
            </TouchableOpacity>

            {/* Sort dropdown */}
            {showSortDropdown && (
                <View className="absolute right-4 top-12 bg-white rounded-xl shadow-lg z-20 py-2" style={{ elevation: 8, minWidth: 140 }}>
                    {([
                        { key: 'date' as SortBy, label: 'By Date' },
                        { key: 'name' as SortBy, label: 'By Name' },
                        { key: 'size' as SortBy, label: 'By Size' },
                    ]).map((opt) => (
                        <TouchableOpacity
                            key={opt.key}
                            onPress={() => { setSortBy(opt.key); setShowSortDropdown(false); }}
                            className="px-4 py-3"
                        >
                            <Text className={`text-md ${sortBy === opt.key ? 'font-normal' : 'text-gray-600'}`} style={sortBy === opt.key ? { color: '#F05C0C' } : {}}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};
