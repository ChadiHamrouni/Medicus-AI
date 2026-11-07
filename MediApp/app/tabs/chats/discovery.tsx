import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import {
  StandardScreenLayout,
  ErrorStateDisplay,
  SearchBox,
  OutOfNetworkToggle,
  DoctorCard,
  Card,
} from '@/components';
import { TwoRowTabs, type TwoRowTabOption } from '@/components/shared/ui/Tabs';
import { useConversationCreation, useDoctorDiscovery } from '@/hooks';

// Animated spinner component (can be extracted to shared components later)
const AnimatedSpinner = ({
  size = 20,
  borderWidth = 2,
  color = '#F05C0C',
}: {
  size?: number;
  borderWidth?: number;
  color?: string;
}) => {
  const spinValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();
    return () => spinAnimation.stop();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderWidth: borderWidth,
        borderColor: color,
        borderTopColor: 'transparent',
        borderRadius: size / 2,
        transform: [{ rotate: spin }],
      }}
    />
  );
};

const NewConversationScreen: React.FC = () => {
  const router = useRouter();
  const { createNewConversation } = useConversationCreation();

  // Use the BRD-compliant doctor discovery hook
  const {
    // Category State
    selectedCategoryId,
    superCategories,
    loadingCategories,

    // Search State
    selectedSpecialty,
    doctorName,
    specialties,
    specialtiesLoading,

    // Results State
    inNetworkDoctors,
    outOfNetworkDoctors,
    showOutOfNetwork,
    hasMoreInNetwork,
    hasMoreOutOfNetwork,

    // Loading States
    searching,
    loadingOutOfNetwork,

    // Error States
    error,

    // UI State
    expandedDoctorId,

    // User Context
    userCountryName,

    // Actions
    handleCategorySelect,
    handleSpecialtySelect,
    handleDoctorNameChange,
    handleSearch,
    toggleOutOfNetwork,
    handleDoctorSelect,
    loadMoreInNetwork,
    loadMoreOutOfNetwork,
    clearError,
    retryLastOperation,
  } = useDoctorDiscovery();

  // Handler for starting conversation with a doctor
  const handleStartConversation = (doctor: any) => {
    const doctorUser = {
      id: doctor.id.toString(),
      displayName: `Dr. ${doctor.first_name} ${doctor.last_name}`,
      role: 'doctor' as const,
    };
    createNewConversation(doctorUser);
  };

  // Map database icon names to MaterialCommunityIcons names
  const databaseIconToMaterialIcon: Record<string, string> = {
    stethoscope: 'stethoscope',
    baby: 'baby-face',
    skin: 'account-check',
    heartbeat: 'heart-pulse',
    brain: 'brain',
    tooth: 'tooth',
  };

  const { tabsRow1, tabsRow2 } = useMemo(() => {
    const tabs: TwoRowTabOption[] = superCategories.map(category => ({
      key: category.id.toString(),
      label: category.name,
      icon: databaseIconToMaterialIcon[category.icon || ''] || 'medical-bag',
    }));

    const midPoint = Math.ceil(tabs.length / 2);
    return {
      tabsRow1: tabs.slice(0, midPoint),
      tabsRow2: tabs.slice(midPoint),
    };
  }, [superCategories]);

  const handleCategoryFilterChange = (key: string) => {
    handleCategorySelect(parseInt(key, 10));
  };

  return (
    <StandardScreenLayout title="Find Doctors" onBack={() => router.back()}>
      <View className="flex-1 bg-gray-50">
        {/* Sara AI Quick Access */}
        {/* <View className="mx-4 mt-6 mb-6">
          <TouchableOpacity
            onPress={createSaraChat}
            disabled={isCreating}
            className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex-row items-center"
            activeOpacity={0.9}
          >
            <View className="w-12 h-12 rounded-xl overflow-hidden mr-4">
              <Image
                source={require('@/assets/images/Sara.png')}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900">Ask Sara</Text>
              <Text className="text-sm text-gray-600">
                {isCreating
                  ? 'Creating conversation...'
                  : 'AI health assistant for quick questions'}
              </Text>
            </View>
            {isCreating ? (
              <AnimatedSpinner size={24} />
            ) : (
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color="#9CA3AF"
              />
            )}
          </TouchableOpacity>
        </View> */}
        <Card>
          {/* Category Filters */}
          {loadingCategories ? (
            <View className="m-4">
              <View className="flex-row justify-between mb-3">
                {[1, 2, 3].map(i => (
                  <View
                    key={i}
                    className="h-10 bg-gray-200 rounded-lg"
                    style={{ width: '30%' }}
                  />
                ))}
              </View>
              <View className="flex-row justify-between">
                {[1, 2, 3].map(i => (
                  <View
                    key={i}
                    className="h-10 bg-gray-200 rounded-lg"
                    style={{ width: '30%' }}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View className="m-4">
              <TwoRowTabs
                tabsRow1={tabsRow1}
                tabsRow2={tabsRow2}
                activeKey={selectedCategoryId?.toString() || ''}
                onTabChange={handleCategoryFilterChange}
              />
            </View>
          )}

          {/* Local Search Box */}
          <SearchBox
            specialties={specialties}
            specialtiesLoading={specialtiesLoading}
            selectedSpecialty={selectedSpecialty}
            doctorName={doctorName}
            onSpecialtySelect={handleSpecialtySelect}
            onDoctorNameChange={handleDoctorNameChange}
            onSearch={handleSearch}
            disabled={searching}
            userCountryName={userCountryName || undefined}
          />

          {/* Results Section */}
          <View className="p-4 pb-4 border-t border-gray-200 rounded-xl">
            {/* Error Display */}
            {error && (
              <ErrorStateDisplay
                error={error}
                onRetry={retryLastOperation}
                onDismiss={clearError}
              />
            )}

            {/* Loading State */}
            {searching && (
              <View className="p-8 items-center">
                <AnimatedSpinner size={32} />
                <Text className="text-lg font-medium text-gray-500 mt-4 mb-2">
                  Finding doctors...
                </Text>
                <Text className="text-sm text-gray-400 text-center">
                  Searching our network for the best matches
                </Text>
              </View>
            )}

            {/* Results */}
            {!searching && (
              <>
                {/* In-Network Doctors */}
                {inNetworkDoctors.length > 0 && (
                  <>
                    <Text className="text-xl font-normal text-gray-900 mb-4">
                      Available Doctors ({inNetworkDoctors.length})
                    </Text>
                    {inNetworkDoctors.map(doctor => (
                      <DoctorCard
                        key={doctor.id}
                        doctor={doctor}
                        isExpanded={expandedDoctorId === doctor.id.toString()}
                        onSelect={handleDoctorSelect}
                        onStartConversation={handleStartConversation}
                      />
                    ))}
                  </>
                )}

                {/* Out-of-Network Toggle - Show after any search is performed */}
                {(inNetworkDoctors.length > 0 || selectedCategoryId || selectedSpecialty || doctorName.trim()) && (
                  <OutOfNetworkToggle
                    showOutOfNetwork={showOutOfNetwork}
                    outOfNetworkCount={outOfNetworkDoctors.length}
                    onToggle={toggleOutOfNetwork}
                    loading={loadingOutOfNetwork}
                  />
                )}

                {/* Out-of-Network Doctors List */}
                {showOutOfNetwork && outOfNetworkDoctors.length > 0 && (
                  <>
                    <Text className="text-xl font-normal text-gray-900 mb-4 mt-4">
                      Out-of-Network Doctors ({outOfNetworkDoctors.length})
                    </Text>
                    {outOfNetworkDoctors.map(doctor => (
                      <DoctorCard
                        key={doctor.id}
                        doctor={doctor}
                        isExpanded={expandedDoctorId === doctor.id.toString()}
                        onSelect={handleDoctorSelect}
                      />
                    ))}

                    {/* Load More Out-of-Network Button */}
                    {hasMoreOutOfNetwork && (
                      <TouchableOpacity
                        onPress={loadMoreOutOfNetwork}
                        className="p-4 mt-4 items-center"
                        disabled={loadingOutOfNetwork}
                        activeOpacity={0.8}
                      >
                        <Text className="text-orange-600 font-medium">
                          {loadingOutOfNetwork
                            ? 'Loading...'
                            : 'Load More Out-of-Network Doctors'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {/* Load More In-Network Button */}
                {hasMoreInNetwork && inNetworkDoctors.length > 0 && (
                  <TouchableOpacity
                    onPress={loadMoreInNetwork}
                    className="p-4 mt-4 items-center"
                    disabled={searching}
                    activeOpacity={0.8}
                  >
                    <Text className="text-orange-600 font-medium">
                      {searching ? 'Loading...' : 'Load More Doctors'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Empty State - Default when no search/category selected */}
                {inNetworkDoctors.length === 0 &&
                  outOfNetworkDoctors.length === 0 &&
                  !selectedSpecialty &&
                  !doctorName.trim() &&
                  !selectedCategoryId && (
                    <View className="p-8 items-center">
                      <MaterialCommunityIcons
                        name="doctor"
                        size={48}
                        color="#9CA3AF"
                      />
                      <Text className="text-lg font-medium text-gray-500 mt-4 mb-2">
                        Ready to find doctors
                      </Text>
                      <Text className="text-sm text-gray-400 text-center">
                        Select a specialty, enter a doctor name, or choose a
                        category to find doctors
                      </Text>
                    </View>
                  )}

                {/* No Results - When search/category has no matches */}
                {inNetworkDoctors.length === 0 &&
                  outOfNetworkDoctors.length === 0 &&
                  (selectedSpecialty ||
                    doctorName.trim() ||
                    selectedCategoryId) && (
                    <View className="p-8 items-center">
                      <MaterialCommunityIcons
                        name="doctor"
                        size={48}
                        color="#9CA3AF"
                      />
                      <Text className="text-lg font-medium text-gray-500 mt-4 mb-2">
                        No doctors found
                      </Text>
                      <Text className="text-sm text-gray-400 text-center">
                        Try a different search term or browse by category
                      </Text>
                    </View>
                  )}
              </>
            )}
          </View>
          <View className="pb-4"></View>
        </Card>
      </View>
    </StandardScreenLayout>
  );
};

export default NewConversationScreen;
