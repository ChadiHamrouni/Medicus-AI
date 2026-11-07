import { useAuthContext } from '@/contexts/AuthContext';
import { useViewingDoctor } from '@/contexts/ViewingDoctorContext';
import { useDoctorProfile } from '@/hooks/doctor';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import {
  ProfileCard,
  ProfileRow,
  ThreeDotsLoader,
} from '@/components/shared/ui';
import { StandardScreenLayout } from '@/components/shared/layout/StandardScreenLayout';
import { getDoctorById } from '@/services/doctor/profile';

const DoctorTab: React.FC = () => {
  const { authState } = useAuthContext();
  const { profile: hookDoctorProfile, isLoading } = useDoctorProfile();
  const router = useRouter();

  // Patient viewing doctor context
  const {
    isViewingFromConversation,
    returnConvoId,
    doctorDemographics,
    doctorId: contextDoctorId,
    clearViewingDoctor,
  } = useViewingDoctor();

  // State for fetched doctor profile (when patient viewing from conversation)
  const [fetchedDoctorProfile, setFetchedDoctorProfile] = useState<{
    name?: string;
    specialty_name?: string;
    avatar?: string;
  } | null>(null);
  const [isLoadingFetchedProfile, setIsLoadingFetchedProfile] = useState(false);

  // Fetch doctor profile when patient is viewing from conversation
  useEffect(() => {
    const fetchDoctorProfile = async () => {
      if (!isViewingFromConversation || !contextDoctorId) {
        setFetchedDoctorProfile(null);
        return;
      }

      // Skip if we already have demographics from context
      if (doctorDemographics?.name) {
        return;
      }

      try {
        setIsLoadingFetchedProfile(true);
        const profile = await getDoctorById(contextDoctorId);
        setFetchedDoctorProfile({
          name: profile.full_name || profile.name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          specialty_name: profile.specialty_name || profile.specialty,
          avatar: profile.avatar,
        });
      } catch (error) {
        console.error('[DoctorTab] Error fetching doctor profile:', error);
        setFetchedDoctorProfile(null);
      } finally {
        setIsLoadingFetchedProfile(false);
      }
    };

    fetchDoctorProfile();
  }, [isViewingFromConversation, contextDoctorId, doctorDemographics?.name]);

  // Clean up viewing doctor context when component unmounts
  useEffect(() => {
    return () => {
      if (isViewingFromConversation) {
        clearViewingDoctor();
      }
    };
  }, [isViewingFromConversation, clearViewingDoctor]);

  // Handle exit back to conversation - uses replace to avoid tab history issues
  const handleExitToConversation = useCallback(() => {
    if (returnConvoId) {
      router.replace({
        pathname: '/tabs/chats/[id]',
        params: { id: returnConvoId },
      } as any);
    } else {
      router.replace('/tabs/chats' as any);
    }
  }, [returnConvoId, router]);

  // Get navigation object for event listeners
  const navigation = useNavigation();
  const isNavigatingRef = useRef(false);

  // Intercept ALL back navigation (works on both iOS and Android)
  // This catches: hardware back, swipe gestures, and programmatic navigation
  useEffect(() => {
    if (!isViewingFromConversation) return;

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Prevent infinite loop - if we're already navigating, let it through
      if (isNavigatingRef.current) return;

      // Prevent default back behavior
      e.preventDefault();

      // Set flag to prevent re-entry
      isNavigatingRef.current = true;

      // Navigate to conversation instead
      handleExitToConversation();
    });

    return unsubscribe;
  }, [isViewingFromConversation, navigation, handleExitToConversation]);

  // Handle hardware back button when patient is viewing doctor profile (Android)
  useEffect(() => {
    if (!isViewingFromConversation) return;

    const onBackPress = () => {
      handleExitToConversation();
      return true; // Prevent default back behavior
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      subscription.remove();
    };
  }, [isViewingFromConversation, handleExitToConversation]);

  // Use profile from hook if available, fallback to authState
  const doctorProfile = hookDoctorProfile || authState.doctorProfile;
  const user = authState.user;

  const getProfileStatus = () => {
    if (!doctorProfile) return 'Inactive';

    const isActive = doctorProfile.status === 'ACTIVE';
    const isVerified = doctorProfile.is_profile_verified === true;

    if (isActive && isVerified) return 'Active';
    if (isActive && !isVerified) return 'Pending Verification';
    if (!isActive) return 'Inactive';

    return 'Inactive';
  };

  const hasDoctorData = !!(hookDoctorProfile || authState.doctorProfile);
  const showSkeleton = isLoading && !hasDoctorData && !isViewingFromConversation;

  // Get display name and specialty for patient viewing mode
  const getViewingDoctorDisplay = () => {
    // Priority: Context demographics > Fetched profile > Loading
    if (doctorDemographics?.name) {
      return {
        name: doctorDemographics.name,
        specialty: doctorDemographics.specialty || 'Specialty not specified',
        avatar: undefined,
      };
    }
    if (fetchedDoctorProfile?.name) {
      return {
        name: fetchedDoctorProfile.name,
        specialty: fetchedDoctorProfile.specialty_name || 'Specialty not specified',
        avatar: fetchedDoctorProfile.avatar,
      };
    }
    return {
      name: 'Loading...',
      specialty: '',
      avatar: undefined,
    };
  };

  return (
    <StandardScreenLayout
      title="Doctor Profile"
      showBackButton={false}
      noScroll
    >
      {showSkeleton ? (
        <ThreeDotsLoader size={24} />
      ) : (
        <ScrollView
          className="flex-1 bg-white"
          showsVerticalScrollIndicator={false}
        >
          {/* Doctor Card */}
          <View className="bg-white mx-4 rounded-lg border-b border-gray-200 mt-2">
            <View className="p-3">
              <View className="flex-row items-center">
                {/* Profile Photo */}
                <View className="relative mr-4">
                  {isViewingFromConversation ? (
                    // Patient viewing doctor - use fetched/context data
                    <View className="w-[72px] h-[72px] rounded-full border-2 border-orange-500 bg-gray-200 justify-center items-center">
                      {isLoadingFetchedProfile ? (
                        <ActivityIndicator size="small" color="#F05C0C" />
                      ) : getViewingDoctorDisplay().avatar ? (
                        <Image
                          source={{ uri: getViewingDoctorDisplay().avatar }}
                          style={{ width: 72, height: 72 }}
                          className="rounded-full"
                        />
                      ) : (
                        <Text className="text-gray-600 font-bold text-lg">
                          {getViewingDoctorDisplay().name
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Image
                      source={
                        doctorProfile?.avatar_url
                          ? { uri: doctorProfile.avatar_url }
                          : user?.avatar
                            ? { uri: user.avatar }
                            : require('@/assets/images/Dummy-User-M.png')
                      }
                      style={{ width: 72, height: 72 }}
                      className="rounded-full border-2 border-orange-500"
                    />
                  )}
                  <View
                    className="absolute -bottom-1 -right-1 rounded-full items-center justify-center bg-[#F05C0C]"
                    style={{ width: 27, height: 27 }}
                  >
                    <MaterialCommunityIcons
                      name="stethoscope"
                      size={16}
                      color="white"
                    />
                  </View>
                </View>

                {/* Profile Info */}
                <View className="flex-1">
                  {isViewingFromConversation ? (
                    // Patient viewing doctor display
                    <>
                      <View className="flex-row items-center">
                        <Text className="text-lg font-bold text-gray-900">
                          Dr. {getViewingDoctorDisplay().name}
                        </Text>
                        {isLoadingFetchedProfile && (
                          <ActivityIndicator size="small" color="#F05C0C" style={{ marginLeft: 8 }} />
                        )}
                      </View>
                      <Text className="text-sm text-gray-600 mt-1">
                        {getViewingDoctorDisplay().specialty}
                      </Text>
                    </>
                  ) : (
                    // Doctor viewing own profile
                    <>
                      <Text className="text-lg font-bold text-gray-900">
                        {(() => {
                          const prefix = doctorProfile?.prefix || 'Dr.';

                          let displayName = '';
                          if (doctorProfile?.full_name) {
                            displayName = doctorProfile.full_name;
                          } else if (
                            doctorProfile?.first_name ||
                            doctorProfile?.last_name
                          ) {
                            displayName =
                              `${doctorProfile.first_name || ''} ${doctorProfile.last_name || ''}`.trim();
                          } else if (user?.display_name) {
                            displayName = user.display_name;
                          } else if (user?.full_name) {
                            displayName = user.full_name;
                          } else if (user?.first_name || user?.last_name) {
                            displayName =
                              `${user.first_name || ''} ${user.last_name || ''}`.trim();
                          } else if (user?.email) {
                            displayName = user.email;
                          }

                          if (!displayName) {
                            return 'Doctor Profile';
                          }

                          return `${prefix} ${displayName}`.trim();
                        })()}
                      </Text>
                      <Text className="text-sm text-gray-600 mt-1">
                        {doctorProfile?.specialty_name ||
                          doctorProfile?.specialty ||
                          'Specialty not specified'}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {doctorProfile?.medical_licence
                          ? `License #${doctorProfile.medical_licence}`
                          : 'License not provided'}
                      </Text>
                    </>
                  )}
                </View>

                {/* Exit button when patient viewing from conversation */}
                {isViewingFromConversation && (
                  <TouchableOpacity
                    onPress={handleExitToConversation}
                    className="ml-2 px-4 py-2 bg-orange-100 rounded-full flex-row items-center"
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="arrow-left" size={18} color="#F05C0C" />
                    <Text className="text-orange-600 text-sm font-medium ml-1">
                      Back to Chat
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* All Profile Sections - Single Column */}
          <View className="px-4">
            {/* Calendar/Events - Hidden when patient viewing */}
            {!isViewingFromConversation && (
              <ProfileCard className="mt-3">
                <ProfileRow
                  title="Calendar"
                  description="View upcoming visits and procedures"
                  href="/tabs/doctor/calendar"
                  icon="calendar"
                  iconSize={36}
                  isLast={true}
                />
              </ProfileCard>
            )}

            {/* 2. Schedule & Services Group - Working Hours, Medical Procedures, Specialties */}
            <ProfileCard className="mt-3">
              <ProfileRow
                title="Working Hours"
                description="Availability schedule, consultation hours"
                href="/tabs/doctor/working-hours"
                icon="clock-outline"
                iconSize={36}
                isLast={false}
              />
              <ProfileRow
                title="Practice"
                description="Services offered, procedure pricing"
                href="/tabs/doctor/medical-procedures"
                icon="medical-bag"
                iconSize={36}
                isLast={false}
              />
              <ProfileRow
                title="Certifications & Specialties"
                description="Medical specialties, board certifications, credentials"
                href="/tabs/doctor/certifications"
                icon="school"
                iconSize={36}
                isLast={true}
              />
            </ProfileCard>

            {/* 3. Profile Information Group - Contact, Addresses */}
            <ProfileCard className="mt-3">
              <ProfileRow
                title={isViewingFromConversation ? 'Contact & Addresses' : 'Contact'}
                description={
                  isViewingFromConversation
                    ? 'Email, phone, website, and practice locations'
                    : 'Email, phone numbers, professional contact info'
                }
                href="/tabs/doctor/professional-contact"
                icon="account-circle"
                iconSize={36}
                isLast={isViewingFromConversation}
              />
              {!isViewingFromConversation && (
                <ProfileRow
                  title="Addresses"
                  description="Practice locations, clinic addresses"
                  href="/tabs/doctor/address"
                  icon="map-marker"
                  iconSize={36}
                  isLast={true}
                />
              )}
            </ProfileCard>
          </View>

          <View className="h-20" />
        </ScrollView>
      )}
    </StandardScreenLayout>
  );
};

export default DoctorTab;
