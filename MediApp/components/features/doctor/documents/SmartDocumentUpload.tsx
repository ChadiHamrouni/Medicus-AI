import { useAppContext } from '@/contexts/AppContext';
import { smartDocumentGenerationService } from '@/services/documents/smartDocumentGeneration';
import {
  DoctorDocumentCategory,
  UploadSuggestion,
  DocumentTemplate,
} from '@/types/DoctorDocuments';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';

interface SmartDocumentUploadProps {
  visible: boolean;
  onClose: () => void;
  onUploadComplete: (_documentId: string) => void;
  doctorSpecialty?: string;
  existingDocuments?: string[];
}

export const SmartDocumentUpload: React.FC<SmartDocumentUploadProps> = ({
  visible,
  onClose,
  onUploadComplete,
  doctorSpecialty = 'Unknown Specialty',
  existingDocuments = [],
}) => {
  const { activeId } = useAppContext();
  const [currentStep, setCurrentStep] = useState<
    'suggestions' | 'category' | 'template' | 'upload'
  >('suggestions');
  const [selectedCategory, setSelectedCategory] =
    useState<DoctorDocumentCategory | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<DocumentTemplate | null>(null);
  const [uploadSuggestions, setUploadSuggestions] = useState<
    UploadSuggestion[]
  >([]);
  const [availableTemplates, setAvailableTemplates] = useState<
    DocumentTemplate[]
  >([]);

  useEffect(() => {
    if (visible) {
      loadSuggestions();
      loadTemplates();
    }
  }, [visible, doctorSpecialty, existingDocuments]);

  const loadSuggestions = () => {
    const suggestions = smartDocumentGenerationService.getUploadSuggestions(
      doctorSpecialty,
      existingDocuments
    );
    setUploadSuggestions(suggestions);
  };

  const loadTemplates = () => {
    const templates = smartDocumentGenerationService.getDocumentTemplates();
    setAvailableTemplates(templates);
  };

  const handleSuggestionPress = (suggestion: UploadSuggestion) => {
    setSelectedCategory(suggestion.category);
    setCurrentStep('template');
  };

  const handleCategorySelect = (category: DoctorDocumentCategory) => {
    setSelectedCategory(category);
    setCurrentStep('template');
  };

  const handleTemplateSelect = (template: DocumentTemplate | null) => {
    setSelectedTemplate(template);
    setCurrentStep('upload');
  };

  const handleGenerateFromTemplate = async () => {
    if (!selectedTemplate || !activeId) {
      Alert.alert('Error', 'Template or doctor ID not available');
      return;
    }

    // Mock field data - in production, collect from form
    const fieldData = {
      doctor_name: 'Unknown Doctor',
      primary_specialty: doctorSpecialty,
      practice_name: 'Unknown Practice',
      current_date: new Date().toLocaleDateString(),
    };

    try {
      const response = await smartDocumentGenerationService.generateDocument({
        template_id: selectedTemplate.id,
        doctor_id: parseInt(activeId),
        field_data: fieldData,
        output_format: 'pdf',
        watermark: true,
        auto_save: true,
      });

      if (response.status === 'completed') {
        Alert.alert(
          'Document Generated',
          'Your document has been generated successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                onUploadComplete(response.document_id);
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Generation Failed',
          response.message || 'Failed to generate document'
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to generate document. Please try again.');
    }
  };

  const handleManualUpload = () => {
    // Handle manual file upload
    Alert.alert(
      'Upload Document',
      'Choose how you want to add your document:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Take Photo',
          onPress: () => {
            // Handle camera capture
          },
        },
        {
          text: 'Choose File',
          onPress: () => {
            // Handle file picker
          },
        },
      ]
    );
  };

  const getCategoryIcon = (category: DoctorDocumentCategory): string => {
    const iconMap: Record<DoctorDocumentCategory, string> = {
      [DoctorDocumentCategory.MEDICAL_LICENSE]: 'certificate',
      [DoctorDocumentCategory.BOARD_CERTIFICATIONS]: 'school',
      [DoctorDocumentCategory.FELLOWSHIP_CERTIFICATES]: 'medal',
      [DoctorDocumentCategory.DEA_LICENSE]: 'pill',
      [DoctorDocumentCategory.STATE_PERMITS]: 'file-certificate',
      [DoctorDocumentCategory.MALPRACTICE_INSURANCE]: 'shield-account',
      [DoctorDocumentCategory.MEDICAL_DEGREE]: 'school-outline',
      [DoctorDocumentCategory.RESIDENCY_CERTIFICATES]: 'hospital-building',
      [DoctorDocumentCategory.CONTINUING_EDUCATION]: 'book-open-page-variant',
      [DoctorDocumentCategory.CONFERENCE_CERTIFICATES]: 'microphone-variant',
      [DoctorDocumentCategory.PRACTICE_DOCS]: 'folder',
      [DoctorDocumentCategory.PROTOCOLS_PROCEDURES]: 'clipboard-list',
      [DoctorDocumentCategory.QUALITY_MEASURES]: 'chart-line',
      [DoctorDocumentCategory.PATIENT_TESTIMONIALS]: 'comment-quote',
      [DoctorDocumentCategory.BEFORE_AFTER_PHOTOS]: 'camera-account',
      [DoctorDocumentCategory.CASE_STUDIES]: 'file-document-outline',
      [DoctorDocumentCategory.RESEARCH_PUBLICATIONS]: 'book-open',
      [DoctorDocumentCategory.TREATMENT_OUTCOMES]: 'trending-up',
      [DoctorDocumentCategory.AWARDS_RECOGNITION]: 'trophy',
      [DoctorDocumentCategory.SPEAKING_ENGAGEMENTS]: 'microphone',
      [DoctorDocumentCategory.MEDIA_COVERAGE]: 'newspaper-variant',
      [DoctorDocumentCategory.PROFESSIONAL_MEMBERSHIPS]: 'account-group',
    };
    return iconMap[category] || 'file';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const renderSuggestions = () => (
    <View className="flex-1">
      <View className="p-4 border-b border-gray-200">
        <Text className="text-xl font-bold text-gray-900 mb-2">
          Smart Upload Suggestions
        </Text>
        <Text className="text-sm text-gray-600">
          Based on your specialty and existing documents, here are
          recommendations to enhance your profile.
        </Text>
      </View>

      <ScrollView className="flex-1">
        {uploadSuggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleSuggestionPress(suggestion)}
            className="mx-4 mt-4 bg-white rounded-lg border border-gray-200 shadow-sm"
            activeOpacity={0.7}
          >
            <View className="p-4">
              <View className="flex-row items-start">
                <MaterialCommunityIcons
                  name={getCategoryIcon(suggestion.category) as any}
                  size={24}
                  color="#F05C0C"
                  style={{ marginRight: 12, marginTop: 2 }}
                />

                <View className="flex-1">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-lg font-semibold text-gray-900">
                      {suggestion.title}
                    </Text>
                    <View
                      className={`px-2 py-1 rounded-full ${getPriorityColor(suggestion.priority)}`}
                    >
                      <Text className="text-xs font-medium capitalize">
                        {suggestion.priority}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-sm text-gray-600 mb-2">
                    {suggestion.description}
                  </Text>

                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-gray-500">
                      {suggestion.reason}
                    </Text>
                    <View className="flex-row items-center">
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={12}
                        color="#9CA3AF"
                        style={{ marginRight: 4 }}
                      />
                      <Text className="text-xs text-gray-500">
                        ~{suggestion.estimated_time_minutes} min
                      </Text>
                      {suggestion.template_available && (
                        <View className="ml-2 bg-blue-100 px-2 py-1 rounded">
                          <Text className="text-xs text-blue-600 font-medium">
                            Template
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={() => setCurrentStep('category')}
          className="mx-4 mt-4 mb-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-6 items-center"
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="plus-circle-outline"
            size={32}
            color="#9CA3AF"
          />
          <Text className="text-gray-600 font-medium mt-2">
            Browse All Categories
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderCategorySelection = () => {
    const categories =
      smartDocumentGenerationService.getDocumentCategoryMetadata();

    return (
      <View className="flex-1">
        <View className="p-4 border-b border-gray-200">
          <Text className="text-xl font-bold text-gray-900 mb-2">
            Select Document Category
          </Text>
          <Text className="text-sm text-gray-600">
            Choose the type of document you want to upload or generate.
          </Text>
        </View>

        <ScrollView className="flex-1 p-4">
          {categories.map((category, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleCategorySelect(category.category)}
              className="bg-white rounded-lg border border-gray-200 shadow-sm mb-3 p-4"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <MaterialCommunityIcons
                  name={category.icon as any}
                  size={28}
                  color="#F05C0C"
                  style={{ marginRight: 12 }}
                />
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900 mb-1">
                    {category.display_name}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {category.description}
                  </Text>
                  {category.required_for_verification && (
                    <View className="mt-2">
                      <View className="bg-orange-100 px-2 py-1 rounded self-start">
                        <Text className="text-orange-700 text-xs font-medium">
                          Required
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color="#9CA3AF"
                />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderTemplateSelection = () => {
    const categoryTemplates = availableTemplates.filter(
      t => t.category === selectedCategory
    );

    return (
      <View className="flex-1">
        <View className="p-4 border-b border-gray-200">
          <Text className="text-xl font-bold text-gray-900 mb-2">
            Document Templates
          </Text>
          <Text className="text-sm text-gray-600">
            Choose a template to generate your document automatically, or upload
            manually.
          </Text>
        </View>

        <ScrollView className="flex-1 p-4">
          {categoryTemplates.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                Available Templates
              </Text>
              {categoryTemplates.map((template, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleTemplateSelect(template)}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm mb-3 p-4"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-start">
                    <MaterialCommunityIcons
                      name="file-document-plus-outline"
                      size={24}
                      color="#3B82F6"
                      style={{ marginRight: 12, marginTop: 2 }}
                    />
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-900 mb-1">
                        {template.name}
                      </Text>
                      <Text className="text-sm text-gray-600 mb-2">
                        {template.description}
                      </Text>
                      <View className="flex-row flex-wrap">
                        {template.required_fields
                          .slice(0, 3)
                          .map((field, idx) => (
                            <View
                              key={idx}
                              className="bg-blue-50 px-2 py-1 rounded mr-2 mb-1"
                            >
                              <Text className="text-xs text-blue-700">
                                {field}
                              </Text>
                            </View>
                          ))}
                        {template.required_fields.length > 3 && (
                          <Text className="text-xs text-gray-500 py-1">
                            +{template.required_fields.length - 3} more
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View className="border-t border-gray-200 pt-4">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Manual Upload
            </Text>
            <TouchableOpacity
              onPress={() => handleTemplateSelect(null)}
              className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-6 items-center"
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="upload" size={32} color="#9CA3AF" />
              <Text className="text-gray-600 font-medium mt-2">
                Upload Your Own Document
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                Upload an existing document or scan
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderUploadForm = () => (
    <View className="flex-1">
      <View className="p-4 border-b border-gray-200">
        <Text className="text-xl font-bold text-gray-900 mb-2">
          {selectedTemplate ? 'Generate Document' : 'Upload Document'}
        </Text>
        <Text className="text-sm text-gray-600">
          {selectedTemplate
            ? 'Fill in the details to generate your document automatically.'
            : 'Add details for your document upload.'}
        </Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {selectedTemplate ? (
          <View>
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Template: {selectedTemplate.name}
            </Text>

            <View className="bg-blue-50 p-4 rounded-lg mb-4">
              <Text className="text-blue-900 font-medium mb-2">
                Required Fields:
              </Text>
              {selectedTemplate.required_fields.map((field, index) => (
                <Text key={index} className="text-blue-800 text-sm">
                  • {field}
                </Text>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleGenerateFromTemplate}
              className="bg-[#F05C0C] rounded-lg py-4 px-6 mb-4"
              activeOpacity={0.8}
            >
              <View className="flex-row items-center justify-center">
                <MaterialCommunityIcons
                  name="auto-fix"
                  size={20}
                  color="white"
                />
                <Text className="text-white font-semibold ml-2">
                  Generate Document
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <TouchableOpacity
              onPress={handleManualUpload}
              className="bg-[#F05C0C] rounded-lg py-4 px-6 mb-4"
              activeOpacity={0.8}
            >
              <View className="flex-row items-center justify-center">
                <MaterialCommunityIcons name="upload" size={20} color="white" />
                <Text className="text-white font-semibold ml-2">
                  Choose File to Upload
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );

  const getStepTitle = () => {
    switch (currentStep) {
      case 'suggestions':
        return 'Smart Suggestions';
      case 'category':
        return 'Select Category';
      case 'template':
        return 'Choose Template';
      case 'upload':
        return 'Upload Document';
      default:
        return 'Upload';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white border-b border-gray-200 pt-12 pb-4">
          <View className="flex-row items-center justify-between px-4">
            <TouchableOpacity
              onPress={() => {
                if (currentStep === 'suggestions') {
                  onClose();
                } else {
                  // Go back to previous step
                  if (currentStep === 'upload') setCurrentStep('template');
                  else if (currentStep === 'template')
                    setCurrentStep('category');
                  else if (currentStep === 'category')
                    setCurrentStep('suggestions');
                }
              }}
              className="p-2"
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color="#374151"
              />
            </TouchableOpacity>

            <Text className="text-lg font-semibold text-gray-900">
              {getStepTitle()}
            </Text>

            <TouchableOpacity onPress={onClose} className="p-2">
              <MaterialCommunityIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        {currentStep === 'suggestions' && renderSuggestions()}
        {currentStep === 'category' && renderCategorySelection()}
        {currentStep === 'template' && renderTemplateSelection()}
        {currentStep === 'upload' && renderUploadForm()}
      </View>
    </Modal>
  );
};

export default SmartDocumentUpload;
