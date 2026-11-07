import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export type UserRole = 'patient' | 'doctor';

interface RoleSelectorProps {
  selectedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  selectedRole,
  onRoleChange,
}) => {
  return (
    <View className="mb-8">
      <View className="flex-row space-x-6">
        <TouchableOpacity
          className={`flex-1 h-14 rounded-lg border-2 items-center justify-center ${
            selectedRole === 'patient'
              ? 'border-[#F05C0C] bg-orange-50'
              : 'border-gray-200'
          }`}
          onPress={() => onRoleChange('patient')}
        >
          <Text
            className={`font-medium text-base ${
              selectedRole === 'patient' ? 'text-[#F05C0C]' : 'text-gray-600'
            }`}
          >
            Patient
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 h-14 rounded-lg border-2 items-center justify-center ${
            selectedRole === 'doctor'
              ? 'border-[#F05C0C] bg-orange-50'
              : 'border-gray-200'
          }`}
          onPress={() => onRoleChange('doctor')}
        >
          <Text
            className={`font-medium text-base ${
              selectedRole === 'doctor' ? 'text-[#F05C0C]' : 'text-gray-600'
            }`}
          >
            Doctor
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
