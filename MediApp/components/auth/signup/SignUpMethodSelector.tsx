import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

export type SignUpMethod = 'phone' | 'email' | 'google' | 'apple';

interface SignUpMethodSelectorProps {
  selectedMethod: SignUpMethod | null;
  onMethodSelect: (method: SignUpMethod) => void;
}

export const SignUpMethodSelector: React.FC<SignUpMethodSelectorProps> = ({
  selectedMethod,
  onMethodSelect,
}) => {
  const router = useRouter();
  const methods = [
    {
      id: 'phone' as SignUpMethod,
      title: 'Continue with phone number',
      subtitle: 'Get a verification code via SMS',
      icon: '📱',
      primary: true,
    },
    {
      id: 'email' as SignUpMethod,
      title: 'Continue with email',
      subtitle: 'Create account with email & password',
      icon: '📧',
      primary: false,
    },
    {
      id: 'google' as SignUpMethod,
      title: 'Continue with Google',
      subtitle: 'Quick signup with your Google account',
      icon: 'google',
      primary: false,
      disabled: true,
    },
  ];

  return (
    <View className="w-full max-w-md mx-auto px-4">
      <Text className="text-xl font-semibold text-gray-900 mb-6 text-center">
        Choose how to sign up
      </Text>

      <View className="space-y-4">
        {methods.map(method => (
          <TouchableOpacity
            key={method.id}
            className={`w-full p-5 rounded-lg border-2 flex-row items-center mb-3 ${
              method.disabled
                ? 'border-gray-200 bg-gray-100 opacity-50'
                : selectedMethod === method.id
                  ? 'border-[#F05C0C] bg-orange-50'
                  : 'border-gray-200 bg-white'
            }`}
            onPress={() => !method.disabled && onMethodSelect(method.id)}
            activeOpacity={method.disabled ? 1 : 0.7}
            disabled={method.disabled}
          >
            {/* Icon */}
            <View className="mr-4">
              {method.icon === 'google' ? (
                <Image
                  source={require('../../../assets/images/google-logo.png')}
                  className="w-6 h-6"
                  resizeMode="contain"
                />
              ) : method.icon === 'apple' ? (
                <View className="w-6 h-6 items-center justify-center">
                  <Text className="text-lg">🍎</Text>
                </View>
              ) : (
                <Text className="text-2xl">{method.icon}</Text>
              )}
            </View>

            {/* Content */}
            <View className="flex-1">
              <Text
                className={`text-base font-medium ${
                  method.disabled
                    ? 'text-gray-400'
                    : selectedMethod === method.id
                      ? 'text-[#F05C0C]'
                      : 'text-gray-900'
                }`}
              >
                {method.title}
              </Text>
              <Text
                className={`text-sm mt-1 ${
                  method.disabled ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {method.subtitle}
              </Text>
            </View>

            {/* Selection indicator */}
            {selectedMethod === method.id && (
              <View className="ml-2">
                <Text className="text-[#F05C0C] text-lg">✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Sign In Option */}
      <View className="flex-row justify-center items-center mt-8">
        <Text className="text-gray-600">Already have an account?</Text>
        <TouchableOpacity
          className="ml-2"
          onPress={() => router.push('/(SignIn)/SignInScreen')}
        >
          <Text className="text-[#F05C0C] font-semibold">Sign in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SignUpMethodSelector;
