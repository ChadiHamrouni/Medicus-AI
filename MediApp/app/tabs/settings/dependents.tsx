import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppContext } from '@/contexts/AppContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePatient } from '@/contexts/PatientContext';
import { StandardScreenLayout } from '@/components/shared/layout/StandardScreenLayout';
import { ThreeDotsLoader } from '@/components';

import { useDependents } from '@/contexts/DependentsContext';

const DependentsPage: React.FC = () => {
  const router = useRouter();
  const { authState } = useAuthContext();
  const { user } = authState;
  const {
    dependents: fetchedDependents,
    isLoading,
    deleteDependent,
    isDeletingDependent,
    error,
    refresh,
  } = usePatient();
  const { setSelectedDependent } = useDependents();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const isAuthReady = !authState.isLoading && !!user;

  const handleRefresh = async () => {
    await refresh();
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await refresh();
    setIsRetrying(false);
  };

  if (!isAuthReady) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#F05C0C" />
      </View>
    );
  }

  const { userAssistant } = useAppContext();

  if (user?.role !== 'patient' && userAssistant !== 'mediaid') {
    return <Redirect href="/tabs/settings" />;
  }

  // Get gender icon and color
  const getGenderDisplay = (gender: string) => {
    switch (gender?.toUpperCase()) {
      case 'MALE':
        return { icon: 'gender-male', color: '#3B82F6', label: 'Male' };
      case 'FEMALE':
        return { icon: 'gender-female', color: '#EC4899', label: 'Female' };
      default:
        return {
          icon: 'gender-male-female',
          color: '#6B7280',
          label: 'Other',
        };
    }
  };

  // Get relationship badge color
  const getRelationshipColor = (relationship: string) => {
    switch (relationship?.toLowerCase()) {
      case 'spouse':
        return '#F59E0B';
      case 'child':
        return '#10B981';
      case 'parent':
        return '#8B5CF6';
      case 'sibling':
        return '#06B6D4';
      default:
        return '#6B7280';
    }
  };

  // Get initials from name for avatar fallback
  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return `${first}${last}`;
  };

  // Handle delete dependent
  const handleDeleteDependent = (
    id: number,
    firstName: string,
    lastName: string
  ) => {
    const fullName = `${firstName} ${lastName}`.trim();
    Alert.alert(
      'Delete Dependent',
      `Are you sure you want to remove ${fullName} from your dependents? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(id);
              await deleteDependent(id);
            } catch (error) {
              console.error('Failed to delete dependent:', error);
              Alert.alert(
                'Error',
                'Failed to delete dependent. Please try again.'
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const showFullPageLoader =
    (isLoading || isRetrying) && fetchedDependents.length === 0 && !isDeletingDependent;

  if (error && fetchedDependents.length === 0) {
    return (
      <StandardScreenLayout
        title="Dependents"
        onBack={() => router.replace('/tabs/settings')}
        bottomSpacingColor="bg-white"
        noScroll
      >
        <View className="flex-1 items-center justify-center bg-white px-4">
          <Text className="text-center text-gray-700 font-semibold text-base mb-4">
            An error occurred while fetching your dependents.
          </Text>
          <Text
            className="text-center text-orange-600 font-semibold"
            onPress={handleRetry}
          >
            Tap to retry
          </Text>
        </View>
      </StandardScreenLayout>
    );
  }

  return (
    <StandardScreenLayout
      title="Dependents"
      onBack={() => router.replace('/tabs/settings')}
      bottomSpacingColor="bg-white"
      noScroll
    >
      <View className="flex-1 bg-white">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && !isDeletingDependent}
              onRefresh={handleRefresh}
              colors={['#F05C0C']}
              tintColor="#F05C0C"
            />
          }
        >
          {showFullPageLoader ? (
            <View className="flex-1 items-center justify-center py-20">
              <ThreeDotsLoader size={24} />
            </View>
          ) : fetchedDependents.length === 0 ? (
            // Empty State - No Dependents
            <View className="flex-1 items-center justify-center px-6 py-16">
              <View className="bg-orange-50 rounded-full p-8 mb-6">
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={64}
                  color="#F05C0C"
                />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
                No Dependents Yet
              </Text>
              <Text className="text-base text-gray-600 text-center leading-6 max-w-sm">
                Add family members to manage their healthcare alongside yours.
                Book appointments, track their health, and more.
              </Text>
            </View>
          ) : (
            // Dependents List
            <View className="bg-white">
              {/* Main Patient (Me) Card */}
              {fetchedDependents.length > 0 && (
                <View className="bg-white">
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        console.log('Switching to main account');
                        await setSelectedDependent('main');
                        router.push('/tabs/patients');
                      } catch (error) {
                        console.error('Failed to switch to main:', error);
                      }
                    }}
                    className="flex-row items-center px-4 py-6"
                    activeOpacity={0.7}
                  >
                    {/* Avatar */}
                    <View className="mr-4">
                      <View className="w-14 h-14 rounded-full items-center justify-center bg-blue-100">
                        <Text className="text-blue-600 text-lg font-bold">
                          {(user?.first_name?.charAt(0) || '') +
                            (user?.last_name?.charAt(0) || '') || 'ME'}
                        </Text>
                      </View>
                    </View>

                    {/* Info */}
                    <View className="flex-1">
                      <Text className="text-lg text-gray-900 mb-1 font-semibold">
                        {`${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
                          'Me'}
                      </Text>
                      <View className="flex-row items-center">
                        <Text className="text-sm text-gray-500">Main Account</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {fetchedDependents.map((dependent, index) => {
                const genderDisplay = getGenderDisplay(dependent.gender || '');
                const relationshipColor = getRelationshipColor(
                  dependent.relationship
                );
                const initials = getInitials(
                  dependent.first_name,
                  dependent.last_name
                );

                return (
                  <View
                    key={dependent.id}
                    className={`bg-white`}
                  >
                    <View className="flex-row items-center px-4 py-6">
                      {/* Clickable Area for Switch */}
                      <TouchableOpacity
                        className="flex-1 flex-row items-center"
                        onPress={async () => {
                          try {
                            console.log(
                              'Switching to dependent:',
                              dependent.id
                            );
                            await setSelectedDependent(dependent.id);
                            router.push('/tabs/patients');
                          } catch (error) {
                            console.error(
                              'Failed to switch dependent:',
                              error
                            );
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        {/* Avatar */}
                        <View className="mr-4">
                          {dependent.profile_picture_url ? (
                            <Image
                              source={{ uri: dependent.profile_picture_url }}
                              className="w-14 h-14 rounded-full"
                              style={{ backgroundColor: '#F3F4F6' }}
                            />
                          ) : (
                            <View
                              className="w-14 h-14 rounded-full items-center justify-center"
                              style={{ backgroundColor: '#F05C0C' }}
                            >
                              <Text className="text-white text-lg font-bold">
                                {initials}
                              </Text>
                            </View>
                          )}
                          {/* Gender Badge */}
                          <View
                            className="absolute -bottom-1 -right-1 rounded-full p-0.5 bg-white shadow-sm"
                          >
                            <MaterialCommunityIcons
                              name={genderDisplay.icon as any}
                              size={12}
                              color={genderDisplay.color}
                            />
                          </View>
                        </View>

                        {/* Info */}
                        <View className="flex-1">
                          {/* Name */}
                          <Text className="text-lg text-gray-900 mb-1 font-medium">
                            {dependent.first_name} {dependent.last_name}
                          </Text>

                          {/* Details Row */}
                          <View className="flex-row items-center flex-wrap">
                            <Text
                              className="text-sm capitalize mr-2"
                              style={{ color: relationshipColor }}
                            >
                              {dependent.relationship}
                            </Text>
                            <Text className="text-sm text-gray-400 mr-2">•</Text>
                            <Text className="text-sm text-gray-500">
                              {dependent.age || 0} yrs
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>

                      {/* Action Icons */}
                      <View className="flex-row items-center ml-2">
                        {/* Edit Icon */}
                        <TouchableOpacity
                          onPress={() => {
                            router.push(
                              `/(Dependents)/edit/${dependent.id}` as any
                            );
                          }}
                          className="p-2"
                          activeOpacity={0.7}
                        >
                          <MaterialCommunityIcons
                            name="account-edit"
                            size={24}
                            color="#9CA3AF"
                          />
                        </TouchableOpacity>

                        {/* Delete Icon */}
                        <TouchableOpacity
                          onPress={() =>
                            handleDeleteDependent(
                              dependent.id,
                              dependent.first_name,
                              dependent.last_name
                            )
                          }
                          className="p-2 ml-1"
                          activeOpacity={0.7}
                          disabled={isDeletingDependent}
                        >
                          {deletingId === dependent.id ? (
                            <ActivityIndicator size="small" color="#EF4444" />
                          ) : (
                            <MaterialCommunityIcons
                              name="trash-can-outline"
                              size={24}
                              color="#EF4444"
                            />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        <Pressable
          onPress={() => router.push('/(Dependents)/add' as any)}
          className="absolute bottom-10 right-6 bg-[#F05C0C] w-14 h-14 rounded-full items-center justify-center shadow-lg"
          style={({ pressed }) => [
            {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 8,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <MaterialCommunityIcons name="plus" size={24} color="white" />
        </Pressable>
      </View>
    </StandardScreenLayout>
  );
};

export default DependentsPage;
