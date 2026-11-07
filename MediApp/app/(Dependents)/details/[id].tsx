import { Button } from '@/components/shared/ui';
import { usePatient } from '@/contexts/PatientContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Dependent Details Screen
 * Shows detailed information about a family member
 */
export default function DependentDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { switchPatient, dependents } = usePatient();
  const [dependent, setDependent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dependents && id) {
      const foundDependent = dependents.find(
        (dep: any) => dep.id === parseInt(id, 10)
      );
      if (foundDependent) {
        setDependent(foundDependent);
      } else {
        setError('Family member not found');
      }
      setIsLoading(false);
    }
  }, [dependents, id]);

  const handleEdit = () => {
    if (dependent) {
      router.push(`/(Dependents)/edit/${dependent.id}` as any);
    }
  };

  const handleSwitchContext = async () => {
    if (dependent) {
      const success = await switchPatient(dependent);
      if (success) {
        router.back();
      }
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="px-4 py-3 border-b border-gray-200 bg-white flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">
            Family Member Details
          </Text>
        </View>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#F05C0C" />
          <Text className="mt-4 text-gray-600">Loading family member...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !dependent) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="px-4 py-3 border-b border-gray-200 bg-white flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">
            Family Member Details
          </Text>
        </View>
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-red-600 text-center mb-4 text-lg">
            {error || 'Family member not found'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getAge = (dob: string) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const getRelationshipColor = (relationship: string) => {
    switch (relationship) {
      case 'spouse':
        return 'bg-pink-100 text-pink-800';
      case 'child':
        return 'bg-green-100 text-green-800';
      case 'parent':
        return 'bg-blue-100 text-blue-800';
      case 'sibling':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="px-4 py-3 border-b border-gray-200 bg-white flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">
          Family Member Details
        </Text>
      </View>
      <ScrollView className="flex-1 p-4">
        {/* Header Section */}
        <View className="bg-gray-50 rounded-xl p-6 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-800 mb-1">
                {dependent.full_name}
              </Text>
              <Text className="text-gray-600">
                {getAge(dependent.dob)} years old
              </Text>
            </View>
            <View
              className={`px-3 py-1 rounded-full ${getRelationshipColor(dependent.relationship)}`}
            >
              <Text className="text-sm font-semibold capitalize">
                {dependent.relationship}
              </Text>
            </View>
          </View>

          <View className="flex-row space-x-4">
            <Button
              title="Switch Context"
              onPress={handleSwitchContext}
              containerClassName="flex-1 bg-[#F05C0C] py-3 rounded-lg mr-4"
              textClassName="text-white font-semibold text-center"
            />
            <Button
              title="Edit"
              onPress={handleEdit}
              containerClassName="flex-1 bg-gray-200 py-3 rounded-lg"
              textClassName="text-gray-700 font-semibold text-center"
            />
          </View>
        </View>

        {/* Basic Information */}
        <View className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-4">
            Basic Information
          </Text>

          <View className="space-y-4">
            <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
              <Text className="text-gray-600">First Name</Text>
              <Text className="font-medium text-gray-800">
                {dependent.first_name}
              </Text>
            </View>

            <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
              <Text className="text-gray-600">Last Name</Text>
              <Text className="font-medium text-gray-800">
                {dependent.last_name}
              </Text>
            </View>

            <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
              <Text className="text-gray-600">Date of Birth</Text>
              <Text className="font-medium text-gray-800">
                {formatDate(dependent.dob)}
              </Text>
            </View>

            {dependent.gender && (
              <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                <Text className="text-gray-600">Gender</Text>
                <Text className="font-medium text-gray-800">
                  {dependent.gender === 'M'
                    ? 'Male'
                    : dependent.gender === 'F'
                      ? 'Female'
                      : 'Other'}
                </Text>
              </View>
            )}

            <View className="flex-row justify-between items-center py-2">
              <Text className="text-gray-600">Relationship</Text>
              <Text className="font-medium text-gray-800 capitalize">
                {dependent.relationship}
              </Text>
            </View>
          </View>
        </View>

        {/* Emergency Contact */}
        {dependent.emergency_contact && (
          <View className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-4">
              Emergency Contact
            </Text>

            <View className="space-y-4">
              <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                <Text className="text-gray-600">Name</Text>
                <Text className="font-medium text-gray-800">
                  {dependent.emergency_contact.name}
                </Text>
              </View>

              <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                <Text className="text-gray-600">Phone</Text>
                <Text className="font-medium text-gray-800">
                  {dependent.emergency_contact.phone}
                </Text>
              </View>

              <View
                className={`flex-row justify-between items-center py-2 ${dependent.emergency_contact.email ? 'border-b border-gray-100' : ''}`}
              >
                <Text className="text-gray-600">Relationship</Text>
                <Text className="font-medium text-gray-800">
                  {dependent.emergency_contact.relationship}
                </Text>
              </View>

              {dependent.emergency_contact.email && (
                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-gray-600">Email</Text>
                  <Text className="font-medium text-gray-800">
                    {dependent.emergency_contact.email}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Additional Information */}
        <View className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-4">
            Additional Information
          </Text>

          <View className="space-y-4">
            {dependent.wa_number && (
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-gray-600">WhatsApp Number</Text>
                <Text className="font-medium text-gray-800">
                  {dependent.wa_number}
                </Text>
              </View>
            )}

            <View className="flex-row justify-between items-center py-2">
              <Text className="text-gray-600">Status</Text>
              <View
                className={`px-2 py-1 rounded ${dependent.status === 'active' ? 'bg-green-100' : 'bg-gray-100'}`}
              >
                <Text
                  className={`text-sm font-medium ${dependent.status === 'active' ? 'text-green-800' : 'text-gray-800'}`}
                >
                  {dependent.status}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
