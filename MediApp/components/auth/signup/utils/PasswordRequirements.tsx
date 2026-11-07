import React from 'react';
import { View, Text } from 'react-native';

interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface PasswordRequirementsProps {
  password: string;
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
  password,
}) => {
  const requirements: PasswordRequirement[] = [
    {
      label: 'At least 8 characters',
      met: password.length >= 8,
    },
    {
      label: 'Contains a lowercase letter',
      met: /[a-z]/.test(password),
    },
    { label: 'Contains an uppercase letter', met: /[A-Z]/.test(password) },
    {
      label: 'Contains a number',
      met: /\d/.test(password),
    },
    {
      label: 'Contains a special character (!@#$%^&*...)',
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    },
  ];

  // Don't show if password is empty
  if (!password || password.length === 0) {
    return null;
  }

  const allMet = requirements.every(req => req.met);

  return (
    <View
      style={{
        marginTop: 8,
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: '#374151',
          marginBottom: 8,
        }}
      >
        Password Requirements:
      </Text>
      {requirements.map((requirement, index) => (
        <View
          key={index}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 4,
          }}
        >
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              marginRight: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: requirement.met ? '#10B981' : '#E5E7EB',
            }}
          >
            {requirement.met ? (
              <Text
                style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}
              >
                ✓
              </Text>
            ) : (
              <Text
                style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 'bold' }}
              >
                ○
              </Text>
            )}
          </View>
          <Text
            style={{
              fontSize: 12,
              flex: 1,
              color: requirement.met ? '#10B981' : '#6B7280',
              textDecorationLine: requirement.met ? 'line-through' : 'none',
            }}
          >
            {requirement.label}
          </Text>
        </View>
      ))}
      {allMet && (
        <View
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: '#D1D5DB',
          }}
        >
          <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>
            ✓ All requirements met!
          </Text>
        </View>
      )}
    </View>
  );
};

export default PasswordRequirements;
