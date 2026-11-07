import React from 'react';
import { View, Text } from 'react-native';
import { SelectedAddressType } from './LocationMapModal';

type SelectedAddressPreviewProps = {
  address: SelectedAddressType;
};

export const SelectedAddressPreview: React.FC<SelectedAddressPreviewProps> = ({
  address,
}) => {
  return (
    <View className="px-4 py-3 bg-gray-50">
      <Text className="text-base font-bold mb-1">Selected Location:</Text>
      <Text className="text-sm">{address.address}</Text>
      {address.addressLine2 && (
        <Text className="text-sm">{address.addressLine2}</Text>
      )}
      <Text className="text-sm">
        {address.city}, {address.state} {address.zipCode}
      </Text>
    </View>
  );
};
