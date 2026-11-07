import { StandardScreenLayout } from '@/components/shared/layout';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const InviteSettings: React.FC = () => {
  const router = useRouter();
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  const appStoreUrl = 'https://apps.apple.com/app/Medicus/id123456789';
  const inviteCode = 'MEDI2024';

  const shareMessage = `Hey! I've been using Medicus to manage my healthcare and it's been amazing. It helps me stay connected with my doctors, manage my health records, and keep track of everything in one place. 

You should check it out: ${appStoreUrl}

Use my invite code "${inviteCode}" when you sign up to get premium features free for your first month!`;

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: shareMessage,
        title: 'Try Medicus - Healthcare Made Simple',
        url: appStoreUrl,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleEmailInvite = () => {
    if (!emailInput.trim()) {
      Alert.alert(
        'Email Required',
        'Please enter an email address to send the invitation.'
      );
      return;
    }

    Alert.alert(
      'Invitation Sent!',
      `We've sent an invitation to ${emailInput}. They'll receive an email with a link to download Medicus and your referral code.`,
      [{ text: 'OK', onPress: () => setEmailInput('') }]
    );
  };

  const handleSMSInvite = () => {
    if (!phoneInput.trim()) {
      Alert.alert(
        'Phone Number Required',
        'Please enter a phone number to send the invitation.'
      );
      return;
    }

    Alert.alert(
      'Invitation Sent!',
      `We've sent a text message invitation to ${phoneInput}. They'll receive a link to download Medicus and your referral code.`,
      [{ text: 'OK', onPress: () => setPhoneInput('') }]
    );
  };

  const handleCopyInviteCode = () => {
    // In a real app, this would copy to clipboard
    Alert.alert('Copied!', 'Your invite code has been copied to clipboard.');
  };

  const handleCopyLink = () => {
    // In a real app, this would copy the referral link to clipboard
    Alert.alert('Copied!', 'The Medicus link has been copied to clipboard.');
  };

  const shareOptions = [
    {
      title: 'Share Link',
      description: 'Share Medicus with anyone',
      icon: 'share-variant',
      onPress: handleShareApp,
    },
    {
      title: 'Copy Link',
      description: 'Copy the app link to clipboard',
      icon: 'content-copy',
      onPress: handleCopyLink,
    },
    {
      title: 'Copy Invite Code',
      description: 'Share your personal invite code',
      icon: 'ticket-confirmation',
      onPress: handleCopyInviteCode,
    },
  ];

  const benefits = [
    {
      title: 'Free Premium Month',
      description: 'Get 1 month of Medicus Premium free',
      icon: 'crown',
      color: '#F59E0B',
    },
    {
      title: 'Priority Support',
      description: 'Access to priority customer support',
      icon: 'headset',
      color: '#3B82F6',
    },
    {
      title: 'Advanced Features',
      description: 'Unlock advanced health tracking tools',
      icon: 'chart-line',
      color: '#10B981',
    },
    {
      title: 'Family Sharing',
      description: 'Share health records with family members',
      icon: 'account-group',
      color: '#8B5CF6',
    },
  ];

  return (
    <StandardScreenLayout title="Help & Support" onBack={() => router.back()}>
      <View className="bg-gray-50">
        {/* Invite Banner */}
        <View
          style={{ backgroundColor: '#E5E7EB' }}
          className="mx-4 mt-4 rounded-lg p-6 opacity-50"
        >
          <View className="items-center">
            <MaterialCommunityIcons
              name="gift"
              size={48}
              color="#374151"
              className="mb-3"
            />
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              Share Medicus, Get Rewards! (Coming Soon)
            </Text>
            <Text className="text-sm text-gray-900 text-center font-medium">
              Invite friends and family to join Medicus. When they sign up with
              your invite code, you both get premium features!
            </Text>
          </View>
        </View>

        {/* Your Invite Code */}
        <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm opacity-50">
          <View className="p-4 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-400">
              Your Invite Code (Coming Soon)
            </Text>
            <Text className="text-sm text-gray-400 mt-1">
              Share this code with friends and family
            </Text>
          </View>

          <View className="p-4">
            <View className="bg-gray-50 rounded-lg p-4 flex-row items-center justify-between">
              <Text className="text-2xl font-bold text-gray-400 tracking-wider">
                {inviteCode}
              </Text>
              <TouchableOpacity
                onPress={() => {}}
                className="bg-gray-300 rounded-lg px-4 py-2"
                disabled={true}
                activeOpacity={1}
              >
                <Text className="text-gray-500 font-medium">Copy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quick Share Options */}
        <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
          <View className="p-4 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-900">
              Quick Share
            </Text>
            <Text className="text-sm text-gray-600 mt-1">
              Easy ways to share Medicus
            </Text>
          </View>

          {shareOptions.map((option, index) => {
            const isDisabled = option.title === 'Copy Invite Code';

            return (
              <TouchableOpacity
                key={option.title}
                className={`flex-row items-center px-4 py-4 ${isDisabled ? 'opacity-50' : ''}`}
                onPress={option.onPress}
                activeOpacity={isDisabled ? 1 : 0.7}
                disabled={isDisabled}
              >
                <View className="mr-4">
                  <MaterialCommunityIcons
                    name={option.icon as any}
                    size={24}
                    color={isDisabled ? '#9CA3AF' : '#F05C0C'}
                  />
                </View>

                <View className="flex-1">
                  <Text
                    className={`text-base font-semibold ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}
                  >
                    {option.title}
                    {isDisabled && (
                      <Text className="text-xs text-gray-400 font-normal">
                        {' '}
                        (Coming Soon)
                      </Text>
                    )}
                  </Text>
                  <Text
                    className={`text-sm ${isDisabled ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    {option.description}
                  </Text>
                </View>

                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={isDisabled ? '#D1D5DB' : '#9CA3AF'}
                />

                {index < shareOptions.length - 1 && (
                  <View className="absolute bottom-0 left-16 right-4 h-px bg-gray-100" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Send Personal Invites */}
        <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
          <View className="p-4 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-900">
              Send Personal Invites
            </Text>
            <Text className="text-sm text-gray-600 mt-1">
              Invite specific people directly
            </Text>
          </View>

          {/* Email Invite */}
          <View className="p-4 border-b border-gray-100">
            <View className="flex-row items-center mb-3">
              <MaterialCommunityIcons
                name="email"
                size={20}
                color="#F05C0C"
                className="mr-2"
              />
              <Text className="text-base font-medium text-gray-900">
                Email Invitation
              </Text>
            </View>
            <View className="flex-row items-center">
              <TextInput
                placeholder="Enter email address"
                value={emailInput}
                onChangeText={setEmailInput}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 mr-3"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={handleEmailInvite}
                className="bg-[#F05C0C] rounded-lg px-4 py-2"
              >
                <Text className="text-white font-medium">Send</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SMS Invite */}
          <View className="p-4">
            <View className="flex-row items-center mb-3">
              <MaterialCommunityIcons
                name="message-text"
                size={20}
                color="#F05C0C"
                className="mr-2"
              />
              <Text className="text-base font-medium text-gray-900">
                SMS Invitation
              </Text>
            </View>
            <View className="flex-row items-center">
              <TextInput
                placeholder="Enter phone number"
                value={phoneInput}
                onChangeText={setPhoneInput}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 mr-3"
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                onPress={handleSMSInvite}
                className="bg-[#F05C0C] rounded-lg px-4 py-2"
              >
                <Text className="text-white font-medium">Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Benefits for New Users */}
        <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm opacity-50">
          <View className="p-4 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-400">
              What They Get (Coming Soon)
            </Text>
            <Text className="text-sm text-gray-400 mt-1">
              Benefits for new users who join with your invite
            </Text>
          </View>

          {benefits.map((benefit, index) => (
            <View
              key={benefit.title}
              className="flex-row items-center px-4 py-4"
            >
              <View className="mr-4">
                <MaterialCommunityIcons
                  name={benefit.icon as any}
                  size={24}
                  color="#9CA3AF"
                />
              </View>

              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-400">
                  {benefit.title}
                </Text>
                <Text className="text-sm text-gray-400">
                  {benefit.description}
                </Text>
              </View>

              {index < benefits.length - 1 && (
                <View className="absolute bottom-0 left-16 right-4 h-px bg-gray-100" />
              )}
            </View>
          ))}
        </View>

        {/* Your Referral Stats */}
        <View className="bg-blue-50 mx-4 mt-4 rounded-lg border border-blue-200 p-4 opacity-50">
          <View className="flex-row items-center mb-3">
            <MaterialCommunityIcons
              name="chart-bar"
              size={20}
              color="#9CA3AF"
              className="mr-2"
            />
            <Text className="text-base font-semibold text-gray-400">
              Your Referral Stats (Coming Soon)
            </Text>
          </View>

          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className="text-2xl font-bold text-gray-400">3</Text>
              <Text className="text-sm text-gray-400">Invites Sent</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-gray-400">1</Text>
              <Text className="text-sm text-gray-400">Friends Joined</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-gray-400">$5</Text>
              <Text className="text-sm text-gray-400">Rewards Earned</Text>
            </View>
          </View>
        </View>

        {/* Bottom spacing */}
        <View className="h-8" />
      </View>
    </StandardScreenLayout>
  );
};

export default InviteSettings;
