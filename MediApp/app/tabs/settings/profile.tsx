import { FormFieldWrapper } from '@/components/shared/ui';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDependents } from '@/contexts/DependentsContext';
import { useAnimatedFormField } from '@/hooks/ui/forms';
import { useDependentQuery } from '@/hooks/patient/queries';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StandardScreenLayout } from '@/components/shared/layout/StandardScreenLayout';

const ProfileSettings: React.FC = () => {
  const router = useRouter();
  const { authState, getCurrentUser } = useAuthContext();
  const { selectedDependent, getDependentById } = useDependents();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');

  // Determine if viewing dependent or main user
  const isViewingDependent = selectedDependent !== 'main';
  const dependentId =
    typeof selectedDependent === 'number' ? selectedDependent : null;

  const { data: dependentData, isLoading: isLoadingDependent } =
    useDependentQuery(dependentId, {
      enabled: isViewingDependent && dependentId !== null,
    });

  const currentDependent = isViewingDependent
    ? getDependentById(selectedDependent)
    : null;

  // Load user data on component mount or when dependent data changes
  useEffect(() => {
    if (isViewingDependent && dependentData) {
      // Load dependent data
      setFirstName(dependentData.first_name || '');
      setLastName(dependentData.last_name || '');
      setDisplayName(dependentData.full_name || '');
      setBio('');
    } else if (isViewingDependent && currentDependent) {
      // Fallback to context data
      const nameParts = currentDependent.name.split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      setDisplayName(currentDependent.name);
      setBio('');
    } else if (authState?.user) {
      // Load main user data
      setFirstName(authState.user.first_name || '');
      setLastName(authState.user.last_name || '');
      setDisplayName(
        authState.user.display_name ||
          authState.user.full_name ||
          `${authState.user.first_name || ''} ${authState.user.last_name || ''}`.trim() ||
          ''
      );
      setBio(''); // Bio not implemented in user model yet
    }
  }, [authState?.user, isViewingDependent, currentDependent, dependentData]);

  const formFields = ['firstName', 'lastName', 'displayName', 'bio'];

  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
  } = useAnimatedFormField(formFields);

  const handleSave = async () => {
    try {
      if (isViewingDependent && currentDependent) {
        // Save dependent profile changes
        // TODO: Call updateDependent API - needs to be implemented
        alert('Dependent profile updates are not yet implemented');
      } else {
        // Save main user profile changes
        const { updateCurrentUser } = await import('@/services');
        await updateCurrentUser({
          first_name: firstName,
          last_name: lastName,
        });

        // Refresh user data in auth context
        await getCurrentUser();

        alert('Profile updated successfully!');
      }
      router.back();
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  return (
    <StandardScreenLayout
      title={
        isViewingDependent
          ? `${dependentData?.full_name || currentDependent?.name || 'Dependent'} Profile`
          : 'Profile Settings'
      }
      onBack={() => router.back()}
    >
      {/* Show loading indicator while fetching dependent data */}
      {isViewingDependent && isLoadingDependent ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#F05C0C" />
          <Text className="text-gray-600 mt-4">Loading profile...</Text>
        </View>
      ) : (
        <>
          {/* Profile Picture Section */}
          <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm p-4">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Profile Picture
            </Text>

            <View className="items-center">
              <View className="relative">
                <Image
                  source={
                    !isViewingDependent && authState?.user?.avatar
                      ? { uri: authState?.user?.avatar }
                      : require('@/assets/images/Dummy-User-M.png')
                  }
                  className="w-24 h-24 rounded-full border-4 border-gray-200"
                />
                {/* Dependent indicator */}
                {isViewingDependent && (
                  <View className="absolute -top-2 -left-2 w-7 h-7 bg-teal-500 rounded-full items-center justify-center border-2 border-white">
                    <MaterialCommunityIcons
                      name="account-child"
                      size={14}
                      color="white"
                    />
                  </View>
                )}
                <TouchableOpacity className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#F05C0C] rounded-full items-center justify-center border-2 border-white">
                  <MaterialCommunityIcons
                    name="camera"
                    size={16}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity className="mt-3">
                <Text className="text-[#F05C0C] font-medium">
                  {isViewingDependent
                    ? 'Change Dependent Photo'
                    : 'Change Photo'}
                </Text>
              </TouchableOpacity>
              {/* Context indicator */}
              {isViewingDependent && (
                <View className="mt-2">
                  <View className="bg-teal-50 px-3 py-1 rounded-full">
                    <Text className="text-xs text-teal-700 font-medium">
                      Editing {currentDependent?.relationship || 'Dependent'}{' '}
                      Profile
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Personal Information */}
          <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm p-4">
            <Text className="text-lg font-semibold text-gray-900 mb-6">
              {isViewingDependent
                ? `${currentDependent?.name || 'Dependent'} Information`
                : 'Personal Information'}
            </Text>

            <View>
              <View className="mb-6">
                <FormFieldWrapper
                  type="text"
                  field="firstName"
                  value={firstName}
                  label="First Name"
                  placeholder="Enter first name"
                  isActive={selectedInput === 'firstName'}
                  borderColor={getBorderColor('firstName')}
                  labelStyle={getLabelStyle('firstName')}
                  onFocus={() => handleFocus('firstName')}
                  onBlur={() => handleBlur('firstName')}
                  onChangeText={setFirstName}
                />
              </View>

              <View className="mb-6">
                <FormFieldWrapper
                  type="text"
                  field="lastName"
                  value={lastName}
                  label="Last Name"
                  placeholder="Enter last name"
                  isActive={selectedInput === 'lastName'}
                  borderColor={getBorderColor('lastName')}
                  labelStyle={getLabelStyle('lastName')}
                  onFocus={() => handleFocus('lastName')}
                  onBlur={() => handleBlur('lastName')}
                  onChangeText={setLastName}
                />
              </View>

              <View className="mb-6">
                <FormFieldWrapper
                  type="text"
                  field="displayName"
                  value={displayName}
                  label="Display Name"
                  placeholder="How others see your name"
                  isActive={selectedInput === 'displayName'}
                  borderColor={getBorderColor('displayName')}
                  labelStyle={getLabelStyle('displayName')}
                  onFocus={() => handleFocus('displayName')}
                  onBlur={() => handleBlur('displayName')}
                  onChangeText={setDisplayName}
                />
              </View>

              {/* Bio field - only show for main user */}
              {!isViewingDependent && (
                <View className="mb-6">
                  <FormFieldWrapper
                    type="text"
                    field="bio"
                    value={bio}
                    label="Bio"
                    placeholder="Tell us about yourself (optional)"
                    isActive={selectedInput === 'bio'}
                    borderColor={getBorderColor('bio')}
                    labelStyle={getLabelStyle('bio')}
                    onFocus={() => handleFocus('bio')}
                    onBlur={() => handleBlur('bio')}
                    onChangeText={setBio}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}

              {/* Save Button */}
              <TouchableOpacity
                className="w-full bg-[#F05C0C] rounded-lg py-4 items-center justify-center"
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Text className="text-white font-semibold text-base">Save</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Preferences */}
          <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm p-4 opacity-50">
            <Text className="text-lg font-semibold text-gray-400 mb-4">
              Profile Preferences
            </Text>

            <TouchableOpacity
              className="flex-row items-center py-3 border-b border-gray-100"
              activeOpacity={1}
              disabled={true}
            >
              <View className="mr-4">
                <MaterialCommunityIcons name="eye" size={24} color="#9CA3AF" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-400">
                  Profile Visibility
                  <Text className="text-xs text-gray-400 font-normal">
                    {' '}
                    (Coming Soon)
                  </Text>
                </Text>
                <Text className="text-sm text-gray-400">
                  Control who can see your profile
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#D1D5DB"
              />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center py-3"
              activeOpacity={1}
              disabled={true}
            >
              <View className="mr-4">
                <MaterialCommunityIcons
                  name="account-check"
                  size={24}
                  color="#9CA3AF"
                />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-400">
                  Verification Status
                  <Text className="text-xs text-gray-400 font-normal">
                    {' '}
                    (Coming Soon)
                  </Text>
                </Text>
                <Text className="text-sm text-gray-400">
                  Verify your identity
                </Text>
              </View>
              <View className="bg-gray-200 rounded-full px-2 py-1 mr-2">
                <Text className="text-gray-500 text-xs font-medium">
                  Verified
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#D1D5DB"
              />
            </TouchableOpacity>
          </View>

          {/* Bottom spacing for navigation bar */}
          <View className="h-20" />
        </>
      )}
    </StandardScreenLayout>
  );
};

export default ProfileSettings;
