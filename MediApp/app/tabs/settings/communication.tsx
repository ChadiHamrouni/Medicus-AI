import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StandardScreenLayout } from '@/components/shared/layout/StandardScreenLayout';

type ContactMethod = 'app' | 'email' | 'sms' | 'phone';
type MessageFormat = 'html' | 'plain';

const CommunicationSettings: React.FC = () => {
  const router = useRouter();

  const [preferredMethod, setPreferredMethod] = useState<ContactMethod>('app');
  const [messageFormat, setMessageFormat] = useState<MessageFormat>('html');
  const [autoSaveMessages, setAutoSaveMessages] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [typingIndicators, setTypingIndicators] = useState(true);
  const [offlineMessages, setOfflineMessages] = useState(true);
  const [messageEncryption, setMessageEncryption] = useState(true);
  const [voiceMessages, setVoiceMessages] = useState(true);
  const [fileSharing, setFileSharing] = useState(true);

  const contactMethods = [
    {
      value: 'app' as ContactMethod,
      label: 'In-App Messages',
      description: 'Receive messages within MediApp',
      icon: 'message',
      available: true,
    },
    {
      value: 'email' as ContactMethod,
      label: 'Email',
      description: 'Send messages to your email address',
      icon: 'email',
      available: true,
    },
    {
      value: 'sms' as ContactMethod,
      label: 'SMS/Text Message',
      description: 'Receive important messages via text',
      icon: 'message-text',
      available: true,
    },
    {
      value: 'phone' as ContactMethod,
      label: 'Phone Call',
      description: 'Contact via phone for urgent matters',
      icon: 'phone',
      available: false,
    },
  ];

  const messageFormats: {
    value: MessageFormat;
    label: string;
    description: string;
  }[] = [
    {
      value: 'html',
      label: 'Rich Text (HTML)',
      description: 'Support formatting, links, and media',
    },
    {
      value: 'plain',
      label: 'Plain Text',
      description: 'Simple text messages only',
    },
  ];

  return (
    <StandardScreenLayout title="Communication" onBack={() => router.back()}>
      {/* Preferred Contact Method */}
      <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
        <View className="p-4 border-b border-gray-100">
          <Text className="text-lg font-semibold text-gray-900">
            Preferred Contact Method
          </Text>
          <Text className="text-sm text-gray-600 mt-1">
            How you'd like healthcare providers to reach you
          </Text>
        </View>

        {contactMethods.map((method, index) => (
          <TouchableOpacity
            key={method.value}
            className={`flex-row items-center px-4 py-4 ${!method.available ? 'opacity-50' : ''}`}
            onPress={() => method.available && setPreferredMethod(method.value)}
            disabled={!method.available}
          >
            <View className="mr-4">
              <MaterialCommunityIcons
                name={method.icon as any}
                size={24}
                color={method.available ? '#F05C0C' : '#9CA3AF'}
              />
            </View>

            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="text-base font-semibold text-gray-900">
                  {method.label}
                </Text>
                {!method.available && (
                  <View className="ml-2 px-2 py-1 bg-gray-200 rounded">
                    <Text className="text-xs text-gray-600">Coming Soon</Text>
                  </View>
                )}
              </View>
              <Text className="text-sm text-gray-600 mt-1">
                {method.description}
              </Text>
            </View>

            <View className="w-6 h-6 rounded-full border-2 border-gray-300 items-center justify-center">
              {preferredMethod === method.value && method.available && (
                <View className="w-3 h-3 rounded-full bg-[#F05C0C]" />
              )}
            </View>

            {index < contactMethods.length - 1 && (
              <View className="absolute bottom-0 left-16 right-4 h-px bg-gray-100" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Message Format */}
      <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
        <View className="p-4 border-b border-gray-100">
          <Text className="text-lg font-semibold text-gray-900">
            Message Format
          </Text>
          <Text className="text-sm text-gray-600 mt-1">
            Choose how messages are formatted
          </Text>
        </View>

        {messageFormats.map((format, index) => (
          <TouchableOpacity
            key={format.value}
            className="flex-row items-center px-4 py-4"
            onPress={() => setMessageFormat(format.value)}
          >
            <View className="mr-4">
              <MaterialCommunityIcons
                name={format.value === 'html' ? 'code-tags' : 'format-text'}
                size={24}
                color="#F05C0C"
              />
            </View>

            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                {format.label}
              </Text>
              <Text className="text-sm text-gray-600">
                {format.description}
              </Text>
            </View>

            <View className="w-6 h-6 rounded-full border-2 border-gray-300 items-center justify-center">
              {messageFormat === format.value && (
                <View className="w-3 h-3 rounded-full bg-[#F05C0C]" />
              )}
            </View>

            {index < messageFormats.length - 1 && (
              <View className="absolute bottom-0 left-16 right-4 h-px bg-gray-100" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Message Features */}
      <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
        <View className="p-4 border-b border-gray-100">
          <Text className="text-lg font-semibold text-gray-900">
            Message Features
          </Text>
          <Text className="text-sm text-gray-600 mt-1">
            Control messaging behavior and features
          </Text>
        </View>

        <View className="flex-row items-center px-4 py-4 border-b border-gray-100">
          <View className="mr-4">
            <MaterialCommunityIcons
              name="content-save"
              size={24}
              color="#F05C0C"
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              Auto-save Messages
            </Text>
            <Text className="text-sm text-gray-600">
              Automatically save draft messages as you type
            </Text>
          </View>
          <Switch
            value={autoSaveMessages}
            onValueChange={setAutoSaveMessages}
            trackColor={{ false: '#E5E7EB', true: '#F05C0C' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View className="flex-row items-center px-4 py-4 border-b border-gray-100">
          <View className="mr-4">
            <MaterialCommunityIcons
              name="email-open"
              size={24}
              color="#F05C0C"
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              Read Receipts
            </Text>
            <Text className="text-sm text-gray-600">
              Show when you've read messages from providers
            </Text>
          </View>
          <Switch
            value={readReceipts}
            onValueChange={setReadReceipts}
            trackColor={{ false: '#E5E7EB', true: '#F05C0C' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View className="flex-row items-center px-4 py-4 border-b border-gray-100">
          <View className="mr-4">
            <MaterialCommunityIcons name="keyboard" size={24} color="#F05C0C" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              Typing Indicators
            </Text>
            <Text className="text-sm text-gray-600">
              Show when you're typing a message
            </Text>
          </View>
          <Switch
            value={typingIndicators}
            onValueChange={setTypingIndicators}
            trackColor={{ false: '#E5E7EB', true: '#F05C0C' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View className="flex-row items-center px-4 py-4">
          <View className="mr-4">
            <MaterialCommunityIcons
              name="cloud-download"
              size={24}
              color="#F05C0C"
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              Offline Messages
            </Text>
            <Text className="text-sm text-gray-600">
              Download messages for offline viewing
            </Text>
          </View>
          <Switch
            value={offlineMessages}
            onValueChange={setOfflineMessages}
            trackColor={{ false: '#E5E7EB', true: '#F05C0C' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Privacy & Security */}
      <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
        <View className="p-4 border-b border-gray-100">
          <Text className="text-lg font-semibold text-gray-900">
            Privacy & Security
          </Text>
          <Text className="text-sm text-gray-600 mt-1">
            Communication security settings
          </Text>
        </View>

        <View className="flex-row items-center px-4 py-4 border-b border-gray-100">
          <View className="mr-4">
            <MaterialCommunityIcons
              name="shield-key"
              size={24}
              color="#F05C0C"
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              End-to-End Encryption
            </Text>
            <Text className="text-sm text-gray-600">
              Encrypt messages for maximum security
            </Text>
          </View>
          <Switch
            value={messageEncryption}
            onValueChange={setMessageEncryption}
            trackColor={{ false: '#E5E7EB', true: '#F05C0C' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View className="flex-row items-center px-4 py-4 border-b border-gray-100">
          <View className="mr-4">
            <MaterialCommunityIcons
              name="microphone"
              size={24}
              color="#F05C0C"
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              Voice Messages
            </Text>
            <Text className="text-sm text-gray-600">
              Allow sending and receiving voice messages
            </Text>
          </View>
          <Switch
            value={voiceMessages}
            onValueChange={setVoiceMessages}
            trackColor={{ false: '#E5E7EB', true: '#F05C0C' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View className="flex-row items-center px-4 py-4">
          <View className="mr-4">
            <MaterialCommunityIcons
              name="file-document"
              size={24}
              color="#F05C0C"
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              File Sharing
            </Text>
            <Text className="text-sm text-gray-600">
              Allow sharing files and documents
            </Text>
          </View>
          <Switch
            value={fileSharing}
            onValueChange={setFileSharing}
            trackColor={{ false: '#E5E7EB', true: '#F05C0C' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Communication Guidelines */}
      <View className="bg-amber-50 mx-4 mt-4 rounded-lg border border-amber-200 p-4">
        <View className="flex-row items-start">
          <MaterialCommunityIcons
            name="information"
            size={22}
            color="#D97706"
            className="mr-3 mt-0.5"
          />
          <View className="flex-1">
            <Text className="text-sm font-semibold text-amber-900 mb-1">
              Communication Guidelines
            </Text>
            <Text className="text-sm text-amber-800 font-medium">
              • Response time: Healthcare providers typically respond within
              24-48 hours{'\n'}• Emergency situations: Call 911 or go to the
              nearest emergency room{'\n'}• Urgent matters: Use the urgent
              message flag or call your provider's office directly
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom spacing */}
      <View className="h-8" />
    </StandardScreenLayout>
  );
};

export default CommunicationSettings;
