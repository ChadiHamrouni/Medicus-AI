import { Button, Footer, FormFieldWrapper } from '@/components/shared/ui';
import { useUpdateDoctorAdditionalLinksMutation } from '@/hooks/doctor/mutations';
import { useAnimatedFormField } from '@/hooks/ui/forms';

import { useAuthContext } from '@/contexts/AuthContext';
import { AdditionalLink } from '@/types';
import { logger } from '@/utils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export const AdditionalLinksForm: React.FC = () => {
  const { authState } = useAuthContext();
  // Use cached profile data from login instead of separate API call
  const profile = authState.doctorProfile;
  // No loading state needed since data comes from login cache
  const updateAdditionalLinksMutation =
    useUpdateDoctorAdditionalLinksMutation();

  const defaultPlatforms = [
    { name: 'Personal Website', url: 'https://www.' },
    { name: 'Facebook', url: 'https://www.facebook.com/' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/' },
    { name: 'Instagram', url: 'https://www.instagram.com/' },
    { name: 'Twitter/X', url: 'https://twitter.com/' },
    { name: 'YouTube', url: 'https://www.youtube.com/c/' },
  ];

  const [additionalLinks, setAdditionalLinks] = useState<AdditionalLink[]>([
    { website_name: '', website_url: '' },
  ]);
  const [selectedField, setSelectedField] = useState<string | null>(null);

  const { getBorderColor, getLabelStyle, handleFocus, handleBlur } =
    useAnimatedFormField(['website_name', 'website_url']);

  useEffect(() => {
    if (profile?.additional_links && profile.additional_links.length > 0) {
      setAdditionalLinks(profile.additional_links);
    } else {
      setAdditionalLinks([{ website_name: '', website_url: '' }]);
    }
  }, [profile?.additional_links]);

  const getPlatformIcon = (websiteName: string) => {
    const name = websiteName.toLowerCase();
    if (name.includes('facebook')) return 'facebook';
    if (name.includes('linkedin')) return 'linkedin';
    if (name.includes('instagram')) return 'instagram';
    if (name.includes('twitter') || name.includes('x')) return 'twitter';
    if (name.includes('youtube')) return 'youtube';
    if (name.includes('website') || name.includes('personal')) return 'web';
    return 'link-variant';
  };

  const addAdditionalLink = () => {
    setAdditionalLinks(prev => [
      ...prev,
      { website_name: '', website_url: '' },
    ]);
  };

  const addPlatformLink = (platform: { name: string; url: string }) => {
    // Check if this platform already exists
    const existingPlatform = additionalLinks.find(
      link => link.website_name.toLowerCase() === platform.name.toLowerCase()
    );

    if (!existingPlatform) {
      setAdditionalLinks(prev => [
        ...prev,
        { website_name: platform.name, website_url: platform.url },
      ]);
    }
  };

  const removeAdditionalLink = (index: number) => {
    if (additionalLinks.length > 1) {
      setAdditionalLinks(prev => prev.filter((_, i) => i !== index));
      if (selectedField === `link-${index}`) {
        setSelectedField(null);
      }
    }
  };

  const updateAdditionalLink = (
    index: number,
    field: keyof AdditionalLink,
    value: string
  ) => {
    setAdditionalLinks(prev =>
      prev.map((link, i) => (i === index ? { ...link, [field]: value } : link))
    );
  };

  const handleFieldFocus = (fieldId: string) => {
    setSelectedField(fieldId);
    const fieldType = fieldId.includes('name') ? 'website_name' : 'website_url';
    handleFocus(fieldType);
  };

  const handleFieldBlur = (fieldId: string) => {
    if (selectedField === fieldId) {
      setSelectedField(null);
      const fieldType = fieldId.includes('name')
        ? 'website_name'
        : 'website_url';
      handleBlur(fieldType);
    }
  };

  const handleSubmit = async () => {
    try {
      // Filter out empty links
      const validLinks = additionalLinks.filter(
        link => link.website_name.trim() && link.website_url.trim()
      );

      await updateAdditionalLinksMutation.mutateAsync({
        additional_links: validLinks,
      });

      // Show success message
      Alert.alert('Success', 'Additional links updated successfully!', [
        { text: 'OK' },
      ]);
    } catch (error) {
      logger.error('Failed to update additional links', error as Error, {
        component: 'AdditionalLinksForm',
      });

      // Show error message
      Alert.alert(
        'Error',
        'Failed to update additional links. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const isLoading = updateAdditionalLinksMutation.isPending;

  return (
    <View className="p-4">
      <View className="mb-6">
        {additionalLinks.map((link, index) => (
          <View
            key={index}
            className="mb-4 p-4 border border-gray-200 rounded-lg"
          >
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                <MaterialCommunityIcons
                  name={getPlatformIcon(link.website_name)}
                  size={24}
                  color="#6B7280"
                  className="mr-2"
                />
                <Text className="text-lg font-semibold">
                  {link.website_name || `Website ${index + 1}`}
                </Text>
              </View>
              {additionalLinks.length > 1 && (
                <TouchableOpacity onPress={() => removeAdditionalLink(index)}>
                  <MaterialCommunityIcons name="close" size={24} color="gray" />
                </TouchableOpacity>
              )}
            </View>

            <View className="mb-4">
              <FormFieldWrapper
                type="text"
                field={`website-name-${index}`}
                value={link.website_name}
                label="Website Name"
                isActive={selectedField === `website-name-${index}`}
                borderColor={getBorderColor('website_name')}
                labelStyle={getLabelStyle('website_name')}
                onFocus={() => handleFieldFocus(`website-name-${index}`)}
                onBlur={() => handleFieldBlur(`website-name-${index}`)}
                onChangeText={text =>
                  updateAdditionalLink(index, 'website_name', text)
                }
                keyboardType="default"
              />
              {!link.website_name && (
                <Text className="text-xs text-gray-500 mt-1">
                  e.g., Personal Website, LinkedIn, Facebook
                </Text>
              )}
            </View>

            <View>
              <FormFieldWrapper
                type="text"
                field={`website-url-${index}`}
                value={link.website_url}
                label="Website URL"
                isActive={selectedField === `website-url-${index}`}
                borderColor={getBorderColor('website_url')}
                labelStyle={getLabelStyle('website_url')}
                onFocus={() => handleFieldFocus(`website-url-${index}`)}
                onBlur={() => handleFieldBlur(`website-url-${index}`)}
                onChangeText={text =>
                  updateAdditionalLink(index, 'website_url', text)
                }
                keyboardType="default"
              />
              {!link.website_url && (
                <Text className="text-xs text-gray-500 mt-1">
                  e.g., https://www.yourwebsite.com,
                  https://linkedin.com/in/yourname
                </Text>
              )}
            </View>
          </View>
        ))}

        {/* Quick-add platform buttons */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-600 mb-3">
            Quick Add Popular Platforms
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {defaultPlatforms.slice(0, 4).map((platform, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => addPlatformLink(platform)}
                className="flex-row items-center px-3 py-2 bg-gray-100 rounded-lg mr-2 mb-2"
              >
                <MaterialCommunityIcons
                  name={getPlatformIcon(platform.name)}
                  size={16}
                  color="#6B7280"
                />
                <Text className="ml-2 text-sm text-gray-700">
                  {platform.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          onPress={addAdditionalLink}
          className="flex-row items-center justify-center p-4 border border-gray-200 rounded-lg"
        >
          <MaterialCommunityIcons name="plus" size={24} color="gray" />
          <Text className="ml-2 text-gray-700">Add Custom Link</Text>
        </TouchableOpacity>
      </View>

      <Button
        onPress={handleSubmit}
        title={isLoading ? 'Updating...' : 'Update'}
        containerClassName="w-full h-14 bg-[#F05C0C] rounded-lg items-center justify-center mb-6 py-4"
        textClassName="text-white font-semibold text-base"
        disabled={isLoading}
      >
        {isLoading && (
          <ActivityIndicator size="small" color="#FFFFFF" className="ml-2" />
        )}
      </Button>

      <Footer />
    </View>
  );
};
