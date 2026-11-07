import { StandardBottomButton } from '@/components/shared/ui/StandardBottomButton';
import { FormFieldWrapper } from '@/components/shared/ui/Form/FormFieldWrapper';
import { useAnimatedFormField } from '@/hooks/ui/forms';
import {
  getDocumentCategories,
  getUploadGuidelines,
  uploadDoctorDocument,
} from '@/services';
import {
  CategoryOption,
  DOCTOR_DOCUMENT_ALLOWED_TYPES,
  DoctorDocumentCategory,
  DoctorDocumentUploadRequest,
  DoctorDocumentUploadResponse,
  DocumentVisibility,
  MAX_DOCTOR_DOCUMENT_SIZE,
  MAX_TAGS_PER_DOCUMENT,
  MAX_TAG_LENGTH,
  SpecialtyOption,
  VisibilityOption,
} from '@/types/DoctorDocuments';
import { parseErrorMessage, showErrorModal } from '@/utils';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export interface DoctorDocumentUploadProps {
  onUploadSuccess: (_response: DoctorDocumentUploadResponse) => void;
  onUploadStart?: () => void;
  className?: string;
  preselectedCategory?: DoctorDocumentCategory;
}

export function DoctorDocumentUpload({
  onUploadSuccess,
  onUploadStart,
  className = 'mb-6',
  preselectedCategory,
}: DoctorDocumentUploadProps) {
  // Form state
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMetadataForm, setShowMetadataForm] = useState(false);

  // Metadata form state
  const [category, setCategory] = useState<string>(preselectedCategory || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [visibility, setVisibility] = useState<string>(
    DocumentVisibility.PRIVATE
  );

  // Options state
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyOption[]>([]);
  const [visibilityOptions, setVisibilityOptions] = useState<
    VisibilityOption[]
  >([]);
  const [maxFileSize, setMaxFileSize] = useState(50);

  // Form field animations
  const titleField = useAnimatedFormField(['title']);
  const descriptionField = useAnimatedFormField(['description']);
  const tagsField = useAnimatedFormField(['tags']);

  // Load initial data
  useEffect(() => {
    loadFormOptions();
  }, []);

  const loadFormOptions = async () => {
    try {
      const [categoriesData, guidelines] = await Promise.all([
        getDocumentCategories(),
        getUploadGuidelines(),
      ]);

      setCategories(categoriesData.categories);
      setSpecialties(categoriesData.specialties);
      setVisibilityOptions(categoriesData.visibility_levels);
      setMaxFileSize(guidelines.max_file_size_mb);
    } catch (error) {
      console.error('Failed to load form options:', error);
      showErrorModal(
        'Setup Error',
        'Failed to load form configuration. Please try again.'
      );
    }
  };

  const handleFileSelection = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: DOCTOR_DOCUMENT_ALLOWED_TYPES,
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Validate file size
        if (asset.size && asset.size > MAX_DOCTOR_DOCUMENT_SIZE) {
          showErrorModal(
            'File Too Large',
            `File size exceeds ${maxFileSize}MB limit. Please reduce the file size and try again.`
          );
          return;
        }

        setSelectedFile(asset);
        setTitle(asset.name.replace(/\.[^/.]+$/, '')); // Remove extension from filename
        setShowMetadataForm(true);
      }
    } catch (error) {
      console.error('Error selecting document:', error);
      const errorMessage = parseErrorMessage(error);
      showErrorModal('Selection Failed', errorMessage);
    }
  };

  const validateForm = (): string | null => {
    if (!selectedFile) return 'Please select a file first';
    if (!category) return 'Please select a document category';
    if (!title.trim()) return 'Please enter a document title';

    // Validate tags
    const tags = tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag);
    if (tags.length > MAX_TAGS_PER_DOCUMENT) {
      return `Maximum ${MAX_TAGS_PER_DOCUMENT} tags allowed`;
    }

    for (const tag of tags) {
      if (tag.length > MAX_TAG_LENGTH) {
        return `Tag "${tag}" exceeds ${MAX_TAG_LENGTH} character limit`;
      }
    }

    return null;
  };

  const handleUpload = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    setIsUploading(true);
    onUploadStart?.();

    try {
      const tags = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);

      const metadata: DoctorDocumentUploadRequest = {
        filename: selectedFile.name,
        category: category as DoctorDocumentCategory,
        title: title.trim(),
        description: description.trim() || undefined,
        specialty: specialty || undefined,
        tags,
        visibility: visibility as DocumentVisibility,
        content_type: selectedFile.mimeType,
      };

      const uploadResponse = await uploadDoctorDocument(selectedFile, metadata);

      // Reset form
      setSelectedFile(null);
      setShowMetadataForm(false);
      setTitle('');
      setDescription('');
      setTagsInput('');
      setSpecialty('');
      setCategory(preselectedCategory || '');
      setVisibility(DocumentVisibility.PRIVATE);

      onUploadSuccess(uploadResponse);
      Alert.alert('Upload Successful', uploadResponse.message, [
        { text: 'OK' },
      ]);
    } catch (error) {
      console.error('Error uploading document:', error);
      const errorMessage = parseErrorMessage(error);
      showErrorModal('Upload Failed', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setShowMetadataForm(false);
    setTitle('');
    setDescription('');
    setTagsInput('');
  };

  const getCategoryOptions = () =>
    categories.map(cat => ({
      key: cat.value,
      value: `${cat.label} - ${cat.description}`,
    }));

  const getSpecialtyOptions = () =>
    specialties.map(spec => ({
      key: spec.id.toString(),
      value: spec.label,
    }));

  const getVisibilityOptions = () =>
    visibilityOptions.map(vis => ({
      key: vis.value,
      value: `${vis.label} - ${vis.description}`,
    }));

  if (showMetadataForm && selectedFile) {
    return (
      <ScrollView className={className}>
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          {/* File Preview */}
          <View className="mb-6 p-4 bg-orange-50 rounded-xl">
            <View className="flex-row items-center">
              <Ionicons name="document-outline" size={24} color="#F05C0C" />
              <View className="ml-3 flex-1">
                <Text className="font-semibold text-gray-900" numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <Text className="text-sm text-gray-500">
                  {selectedFile.size
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                    : 'Unknown size'}
                </Text>
              </View>
            </View>
          </View>

          {/* Category Selection */}
          <View className="mb-4">
            <FormFieldWrapper
              type="singleDropdown"
              field="category"
              value={category}
              label="Document Category *"
              options={getCategoryOptions()}
              onValueChange={setCategory}
              isActive={!!category}
              borderColor="#F05C0C"
              labelStyle={{ color: '#F05C0C' }}
              onFocus={() => {}}
              onBlur={() => {}}
            />
          </View>

          {/* Title */}
          <View className="mb-4">
            <FormFieldWrapper
              type="text"
              field="title"
              value={title}
              label="Document Title *"
              onChangeText={setTitle}
              isActive={titleField.selectedInput === 'title'}
              borderColor={titleField.getBorderColor('title')}
              labelStyle={titleField.getLabelStyle('title')}
              onFocus={() => titleField.handleFocus('title')}
              onBlur={() => titleField.handleBlur('title')}
            />
          </View>

          {/* Description */}
          <View className="mb-4">
            <FormFieldWrapper
              type="text"
              field="description"
              value={description}
              label="Description (Optional)"
              onChangeText={setDescription}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
              isActive={descriptionField.selectedInput === 'description'}
              borderColor={descriptionField.getBorderColor('description')}
              labelStyle={descriptionField.getLabelStyle('description')}
              onFocus={() => descriptionField.handleFocus('description')}
              onBlur={() => descriptionField.handleBlur('description')}
            />
          </View>

          {/* Specialty */}
          <View className="mb-4">
            <FormFieldWrapper
              type="singleDropdown"
              field="specialty"
              value={specialty}
              label="Medical Specialty (Optional)"
              options={getSpecialtyOptions()}
              onValueChange={setSpecialty}
              isActive={!!specialty}
              borderColor="#F05C0C"
              labelStyle={{ color: '#F05C0C' }}
              onFocus={() => {}}
              onBlur={() => {}}
            />
          </View>

          {/* Tags */}
          <View className="mb-4">
            <FormFieldWrapper
              type="text"
              field="tags"
              value={tagsInput}
              label="Tags (comma-separated, optional)"
              onChangeText={setTagsInput}
              isActive={tagsField.selectedInput === 'tags'}
              borderColor={tagsField.getBorderColor('tags')}
              labelStyle={tagsField.getLabelStyle('tags')}
              onFocus={() => tagsField.handleFocus('tags')}
              onBlur={() => tagsField.handleBlur('tags')}
            />
            <Text className="text-xs text-gray-500 mt-1">
              e.g., dermatology, acne, treatment protocol
            </Text>
          </View>

          {/* Visibility */}
          <View className="mb-6">
            <FormFieldWrapper
              type="singleDropdown"
              field="visibility"
              value={visibility}
              label="Document Visibility"
              options={getVisibilityOptions()}
              onValueChange={setVisibility}
              isActive={!!visibility}
              borderColor="#F05C0C"
              labelStyle={{ color: '#F05C0C' }}
              onFocus={() => {}}
              onBlur={() => {}}
            />
          </View>

          {/* Action Buttons */}
          <View className="flex-row space-x-3">
            <View className="flex-1 mr-2">
              <StandardBottomButton
                label="Cancel"
                onPress={cancelUpload}
                isDisabled={isUploading}
                variant="secondary"
              />
            </View>
            <View className="flex-1 ml-2">
              <StandardBottomButton
                label="Upload Document"
                onPress={handleUpload}
                isLoading={isUploading}
                isDisabled={isUploading}
                variant="primary"
              />
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <TouchableOpacity
      className={`${className} bg-orange-50 border-2 border-dashed border-orange-300 rounded-2xl items-center justify-center py-8 px-4 active:bg-orange-100`}
      onPress={handleFileSelection}
      activeOpacity={0.85}
      disabled={isUploading}
    >
      <Ionicons name="cloud-upload-outline" size={48} color="#F05C0C" />
      <Text className="mt-3 text-lg font-semibold text-orange-600">
        Upload Medical Document
      </Text>
      <Text className="text-gray-500 text-center mt-1">
        PDF, Images, Documents
      </Text>
      <Text className="text-xs text-gray-400 text-center mt-2">
        Max {maxFileSize}MB • Practice docs, case studies, before/after photos
      </Text>
    </TouchableOpacity>
  );
}
