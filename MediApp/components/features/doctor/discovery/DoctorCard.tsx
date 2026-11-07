import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, Text, View, Pressable } from 'react-native';

interface DoctorCardProps {
  doctor: any;
  isExpanded?: boolean;
  onSelect: (doctor: any) => void;
  onStartConversation?: (doctor: any) => void;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({
  doctor,
  isExpanded = false,
  onSelect,
  onStartConversation,
}) => {
  const isOutOfNetwork = doctor.in_network === false;

  return (
    <Pressable
      onPress={() => onSelect(doctor)}
      className={`rounded-2xl p-4 mb-3 border ${isExpanded
          ? isOutOfNetwork
            ? 'bg-amber-50 border-amber-500 border-dashed border-2'
            : 'bg-white border-[#F05C0C] border-2'
          : isOutOfNetwork
            ? 'bg-gray-50 border-gray-200 border-dashed'
            : 'bg-white border-gray-100'
        }`}
      style={({ pressed }) => [pressed && { opacity: 0.9 }]}
    >
      <View className="flex-row">
        <View className="w-10 h-10 bg-gray-200 justify-center items-center rounded-full mr-4">
          <Ionicons name="person" size={20} color="#374151" />
        </View>

        <View className="flex-1">
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-1">
              <Text
                className={`text-xl font-normal ${isOutOfNetwork ? 'text-gray-700' : 'text-gray-900'
                  }`}
              >
                {doctor.name}
              </Text>
              <Text
                className={`text-md ${isOutOfNetwork ? 'text-gray-500' : 'text-gray-600'
                  }`}
              >
                {doctor.specialty_name}
              </Text>
            </View>

            <View className="items-end">
              {doctor.rating && (
                <View className="flex-row items-center">
                  <MaterialCommunityIcons
                    name="star"
                    size={14}
                    color="#F59E0B"
                  />
                  <Text className="text-md font-medium ml-1 text-gray-900">
                    {doctor.rating}
                  </Text>
                  {doctor.reviewCount > 0 && (
                    <Text className="text-md text-gray-500 ml-1">
                      ({doctor.reviewCount})
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>

          <View className="flex-row items-center mb-3">
            <MaterialCommunityIcons
              name="map-marker"
              size={12}
              color="#6B7280"
            />
            <Text className="text-md text-gray-600 ml-1">
              {doctor.distance || 'Distance unknown'}
            </Text>

            {doctor.country_name && (
              <>
                <View className="w-1 h-1 bg-gray-400 rounded-full mx-2" />
                <Text className="text-md text-gray-600">
                  {doctor.country_name}
                </Text>
              </>
            )}
          </View>

          <View className="flex-row">
            <View
              className={`px-2 py-1 rounded-full mr-2 flex-row items-center ${isOutOfNetwork ? 'bg-amber-50' : 'bg-green-50'
                }`}
            >
              {isOutOfNetwork ? (
                <MaterialCommunityIcons
                  name="network-off"
                  size={12}
                  color="#F97316"
                  style={{ marginRight: 4 }}
                />
              ) : (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={12}
                  color="#10B981"
                  style={{ marginRight: 4 }}
                />
              )}
              <Text
                className={`text-md font-medium ${isOutOfNetwork ? 'text-amber-700' : 'text-green-600'
                  }`}
              >
                {isOutOfNetwork ? 'Out-of-Network' : 'In-Network'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Expandable Contact Info for Out-of-Network Doctors */}
      {isOutOfNetwork && isExpanded && (
        <View className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <View className="flex-row items-center mb-3">
            <MaterialCommunityIcons
              name="information"
              size={18}
              color="#F59E0B"
            />
            <Text className="text-lg font-normal text-amber-800 ml-2">
              Contact Information
            </Text>
          </View>

          <Text className="text-md text-amber-700 mb-3">
            This doctor is outside our network. Contact them directly:
          </Text>

          <View className="space-y-2">
            {doctor.phone && (
              <View className="flex-row items-center">
                <MaterialCommunityIcons
                  name="phone"
                  size={16}
                  color="#6B7280"
                />
                <Text className="text-md text-gray-700 ml-3">
                  {doctor.phone}
                </Text>
              </View>
            )}

            {doctor.email && (
              <View className="flex-row items-center">
                <MaterialCommunityIcons
                  name="email"
                  size={16}
                  color="#6B7280"
                />
                <Text className="text-md text-gray-700 ml-3">
                  {doctor.email}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Expandable Actions for In-Network Doctors */}
      {!isOutOfNetwork && isExpanded && onStartConversation && (
        <View className="mt-4">
          <Pressable
            onPress={e => {
              e.stopPropagation();
              onStartConversation(doctor);
            }}
            className="bg-[#F05C0C] rounded-lg py-4 items-center justify-center"
            style={({ pressed }) => [pressed && { opacity: 0.8 }]}
          >
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name="message-text"
                size={20}
                color="white"
              />
              <Text className="text-white font-semibold text-base ml-2">
                Start Conversation
              </Text>
            </View>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
};

export default DoctorCard;
