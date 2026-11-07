import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDoctorProfile } from '@/hooks/doctor';
import { useAuthContext } from '@/contexts/AuthContext';
import { GENDERS } from '@/constants/Onboarding';

const GENDER_OPTIONS = GENDERS.map(g => ({
  label: g.value === 'not_specified' ? 'Prefer not to say' : g.label,
  value: g.value,
}));

const ProfileForm: React.FC = () => {
  const { authState } = useAuthContext();
  // Use cached profile data from login instead of separate API call
  const profile = authState.doctorProfile;
  // Keep mutation operations for updates
  const { updateAdditionalInfo, isUpdatingAdditionalInfo } = useDoctorProfile();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  const [bio, setBio] = useState('');

  // Change tracking
  const [initialData, setInitialData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    bio: '',
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Load profile data from cached login data
  useEffect(() => {
    if (authState.user || profile) {
      const userData = {
        firstName: authState.user?.first_name || profile?.first_name || '',
        lastName: authState.user?.last_name || profile?.last_name || '',
        gender: authState.user?.gender || profile?.gender || '',
        bio: profile?.about_you || profile?.bio || '',
      };

      setFirstName(userData.firstName);
      setLastName(userData.lastName);
      setGender(userData.gender);
      setBio(userData.bio);
      setInitialData(userData);
    }
  }, [authState.user, profile]);

  // Track changes
  useEffect(() => {
    const currentData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender: gender.trim(),
      bio: bio.trim(),
    };
    const hasDataChanged =
      JSON.stringify(currentData) !== JSON.stringify(initialData);
    setHasChanges(hasDataChanged);
  }, [firstName, lastName, gender, bio, initialData]);

  const handleSave = useCallback(async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'First name and last name are required.');
      return;
    }

    try {
      const profileData = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        gender: gender.trim() || undefined,
        about_you: bio.trim() || undefined,
      };

      await updateAdditionalInfo(profileData);

      // Update initial data to reflect saved state
      const updatedData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender: gender.trim(),
        bio: bio.trim(),
      };
      setInitialData(updatedData);

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  }, [firstName, lastName, gender, bio, updateAdditionalInfo]);

  const renderGenderSelector = () => (
    <View className="mb-6">
      <Text className="text-base font-semibold text-gray-900 mb-3">Gender</Text>
      <View className="space-y-2">
        {GENDER_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.value}
            onPress={() => setGender(option.value)}
            className={`flex-row items-center p-4 rounded-lg border-2 ${
              gender === option.value
                ? 'border-[#F05C0C] bg-orange-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <View
              className={`w-5 h-5 rounded-full border-2 mr-3 ${
                gender === option.value
                  ? 'border-[#F05C0C] bg-[#F05C0C]'
                  : 'border-gray-300'
              }`}
            >
              {gender === option.value && (
                <View className="w-full h-full rounded-full bg-white scale-50" />
              )}
            </View>
            <Text
              className={`text-base ${
                gender === option.value
                  ? 'text-[#F05C0C] font-semibold'
                  : 'text-gray-700'
              }`}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Personal Information Section */}
        <View className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mt-4">
          <View className="flex-row items-center mb-6">
            <MaterialCommunityIcons name="account" size={24} color="#F05C0C" />
            <Text className="text-lg font-bold text-gray-900 ml-3">
              Personal Information
            </Text>
          </View>

          {/* First Name */}
          <View className="mb-4">
            <Text className="text-base font-semibold text-gray-900 mb-2">
              First Name *
            </Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter your first name"
              className="border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 bg-white"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Last Name */}
          <View className="mb-6">
            <Text className="text-base font-semibold text-gray-900 mb-2">
              Last Name *
            </Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter your last name"
              className="border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 bg-white"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Gender */}
          {renderGenderSelector()}
        </View>

        {/* About Section */}
        <View className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mt-4 mb-6">
          <View className="flex-row items-center mb-4">
            <MaterialCommunityIcons
              name="text-account"
              size={24}
              color="#F05C0C"
            />
            <Text className="text-lg font-bold text-gray-900 ml-3">
              About You
            </Text>
          </View>

          <View className="mb-4">
            <Text className="text-base font-semibold text-gray-900 mb-2">
              Bio
            </Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell patients about yourself, your approach to medicine, interests, etc."
              className="border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 bg-white"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={{ minHeight: 120 }}
            />
            <Text className="text-sm text-gray-500 mt-1">
              This will be visible to patients on your profile
            </Text>
          </View>
        </View>

        {/* Bottom spacing for fixed save button */}
        <View className="h-20" />
      </ScrollView>

      {/* Fixed Save Button */}
      {hasChanges && (
        <View className="bg-white border-t border-gray-200 px-4 py-3">
          <TouchableOpacity
            onPress={handleSave}
            disabled={isUpdatingAdditionalInfo}
            className={`w-full rounded-lg py-4 items-center ${
              isUpdatingAdditionalInfo ? 'bg-gray-400' : 'bg-[#F05C0C]'
            }`}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              {isUpdatingAdditionalInfo && (
                <MaterialCommunityIcons
                  name="loading"
                  size={20}
                  color="white"
                  className="mr-2 animate-spin"
                />
              )}
              <Text className="text-white font-semibold text-base">
                {isUpdatingAdditionalInfo ? 'Saving...' : 'Save Profile'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default ProfileForm;
