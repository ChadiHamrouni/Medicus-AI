import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

interface HeaderAddDependentButtonProps {
  compact?: boolean; // For smaller header spaces
  isLoading?: boolean;
}

const HeaderAddDependentButton: React.FC<HeaderAddDependentButtonProps> = ({
  compact = false,
  isLoading = false,
}) => {
  const router = useRouter();

  const handlePress = () => {
    if (isLoading) return;
    // Navigate to the Dependents list; users can add from the list's empty state CTA
    router.push('/(Dependents)/' as any);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isLoading}
      className={`${compact ? 'w-14 h-14' : 'w-16 h-16'} items-center justify-center bg-[#F05C0C] rounded-full shadow-md active:scale-95`}
      style={{ elevation: 4 }}
      accessibilityRole="button"
      accessibilityLabel="Add family member"
      accessibilityHint="Navigate to family members page to add dependents"
    >
      {/* Add Family Member Icon */}
      <MaterialCommunityIcons
        name="account-plus"
        size={compact ? 20 : 24}
        color="white"
      />
    </TouchableOpacity>
  );
};

export default HeaderAddDependentButton;
