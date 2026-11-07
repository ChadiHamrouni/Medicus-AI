import { useRouter } from 'expo-router';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Button, RoleCard, UserRole } from '@/components';

const RoleSelectionScreen: React.FC = () => {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#FFFFFF');
  }, []);

  const handleContinue = () => {
    if (!selectedRole) return;

    router.push({
      pathname: '/(SignUp)/SignUpScreen',
      params: { role: selectedRole },
    });
  };

  const handleSignIn = () => {
    router.push('/(SignIn)/SignInScreen');
  };

  // Get navigation icons
  const getNavIcon = (iconName: string) => {
    switch (iconName) {
      case 'custom-patient':
        return require('@/assets/images/patient_icon.png');
      case 'custom-doctor':
        return require('@/assets/images/doctor_icon.png');
      default:
        return null;
    }
  };

  const roles = [
    {
      id: 'patient' as UserRole,
      title: 'Patient',
      subtitle: 'I need medical care',
      icon: getNavIcon('custom-patient'),
      borderColor: '#F97316',
      features: [
        // 'AI health assistant Sara',
        // 'Book appointments',
        // 'Medical documents',
        // 'Track symptoms & medications',
      ],
    },
    {
      id: 'doctor' as UserRole,
      title: 'Doctor',
      subtitle: 'I provide medical care',
      icon: getNavIcon('custom-doctor'),
      borderColor: '#F97316',
      features: [
        // 'Comprehensive patient dashboard',
        // 'Manage appointments & schedules',
        // 'Medical notes & prescriptions',
        // 'Telemedicine consultations',
      ],
      // note: 'Includes patient account access for personal use',
    },
  ];

  const getContinueButtonText = () => {
    if (selectedRole === 'doctor') return 'Sign up as Doctor';
    if (selectedRole === 'patient') return 'Sign up as Patient';
    return 'Select a role to continue';
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      style={{
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      <ScrollView
        className="flex-1 px-6 pt-4"
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: Math.max(insets.bottom + 20, 24),
        }}
      >
        <View className="flex-1">
          {/* Header */}
          <View className="bg-white px-6 pt-16 pb-8">
            <View className="items-center">
              <Text className="text-3xl font-normal text-gray-900 mb-1 text-center">
                Welcome to MedicusAI
              </Text>
              <Text className="text-base text-[#F05C0C] text-center mt-1 font-normal">
                Select your role to continue
              </Text>
            </View>
          </View>

          {/* Role Options */}
          <View className="mb-6">
            {roles.map(role => (
              <RoleCard
                key={role.id}
                role={role}
                isSelected={selectedRole === role.id}
                onPress={() => setSelectedRole(role.id)}
              />
            ))}
          </View>

          {/* Action buttons */}
          <View className="space-y-8">
            {/* Continue Button */}
            {selectedRole && (
              <Button
                onPress={handleContinue}
                title={getContinueButtonText()}
                disabled={!selectedRole}
                containerClassName={`w-full h-14 rounded-xl items-center justify-center ${selectedRole ? 'bg-[#F05C0C]' : 'bg-gray-300'
                  }`}
                textClassName={`font-bold text-lg ${selectedRole ? 'text-white' : 'text-gray-500'
                  }`}
              />
            )}
            {/* Sign In Option */}
            <TouchableOpacity
              onPress={handleSignIn}
              className="items-center mt-6"
              activeOpacity={0.7}
            >
              <Text className="text-gray-600 text-lg">
                Already have an account?{' '}
                <Text className="text-[#F05C0C] font-medium">Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RoleSelectionScreen;
