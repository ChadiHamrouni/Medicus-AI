import { smartDocumentGenerationService } from '@/services/documents/smartDocumentGeneration';
import {
  BeforeAfterPhotoSet,
  PhotoReference,
  PhotoAngle,
  DocumentVisibility,
} from '@/types/DoctorDocuments';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';

interface BeforeAfterPhotoManagerProps {
  visible: boolean;
  onClose: () => void;
  onSave: (photoSet: BeforeAfterPhotoSet) => void;
  doctorId: number;
  existingPhotoSet?: BeforeAfterPhotoSet;
}

export const BeforeAfterPhotoManager: React.FC<
  BeforeAfterPhotoManagerProps
> = ({ visible, onClose, onSave, doctorId, existingPhotoSet }) => {
  const [procedureName, setProcedureName] = useState('');
  const [procedureDate, setProcedureDate] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [bodyArea, setBodyArea] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<DocumentVisibility>(
    DocumentVisibility.PRIVATE
  );
  const [beforePhotos, setBeforePhotos] = useState<PhotoReference[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<PhotoReference[]>([]);
  const [followUpPhotos, setFollowUpPhotos] = useState<PhotoReference[]>([]);
  const [activePhotoType, setActivePhotoType] = useState<
    'before' | 'after' | 'follow-up'
  >('before');

  useEffect(() => {
    if (existingPhotoSet) {
      setProcedureName(existingPhotoSet.procedure_name);
      setProcedureDate(existingPhotoSet.procedure_date);
      setSpecialty(existingPhotoSet.specialty);
      setBodyArea(existingPhotoSet.body_area);
      setDescription(existingPhotoSet.description || '');
      setTags(existingPhotoSet.tags.join(', '));
      setVisibility(existingPhotoSet.visibility);
      setBeforePhotos(existingPhotoSet.before_photos);
      setAfterPhotos(existingPhotoSet.after_photos);
      setFollowUpPhotos(existingPhotoSet.follow_up_photos || []);
    }
  }, [existingPhotoSet]);

  const handleCapturePhoto = async (angle: PhotoAngle) => {
    try {
      const photoSet: Partial<BeforeAfterPhotoSet> = {
        doctor_id: doctorId,
        procedure_name: procedureName,
        specialty: specialty,
        body_area: bodyArea,
      };

      const photoRef =
        await smartDocumentGenerationService.captureBeforeAfterPhoto(
          photoSet,
          angle,
          activePhotoType
        );

      if (photoRef) {
        switch (activePhotoType) {
          case 'before':
            setBeforePhotos(prev => [...prev, photoRef]);
            break;
          case 'after':
            setAfterPhotos(prev => [...prev, photoRef]);
            break;
          case 'follow-up':
            setFollowUpPhotos(prev => [...prev, photoRef]);
            break;
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  const handleDeletePhoto = (
    photoId: string,
    photoType: 'before' | 'after' | 'follow-up'
  ) => {
    Alert.alert('Delete Photo', 'Are you sure you want to delete this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          switch (photoType) {
            case 'before':
              setBeforePhotos(prev => prev.filter(p => p.id !== photoId));
              break;
            case 'after':
              setAfterPhotos(prev => prev.filter(p => p.id !== photoId));
              break;
            case 'follow-up':
              setFollowUpPhotos(prev => prev.filter(p => p.id !== photoId));
              break;
          }
        },
      },
    ]);
  };

  const handleSave = () => {
    if (!procedureName || !procedureDate || !specialty || !bodyArea) {
      Alert.alert('Required Fields', 'Please fill in all required fields.');
      return;
    }

    if (beforePhotos.length === 0) {
      Alert.alert('Photos Required', 'At least one before photo is required.');
      return;
    }

    const photoSet: BeforeAfterPhotoSet = {
      id: existingPhotoSet?.id || `photoset_${Date.now()}`,
      doctor_id: doctorId,
      procedure_name: procedureName,
      procedure_date: procedureDate,
      specialty,
      body_area: bodyArea,
      before_photos: beforePhotos,
      after_photos: afterPhotos,
      follow_up_photos: followUpPhotos,
      description: description || undefined,
      tags: tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0),
      visibility,
      created_at: existingPhotoSet?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSave(photoSet);
  };

  const getAngleIcon = (angle: PhotoAngle): string => {
    const iconMap: Record<PhotoAngle, string> = {
      [PhotoAngle.FRONT]: 'account-outline',
      [PhotoAngle.SIDE_LEFT]: 'arrow-left-bold',
      [PhotoAngle.SIDE_RIGHT]: 'arrow-right-bold',
      [PhotoAngle.BACK]: 'account-remove-outline',
      [PhotoAngle.CLOSE_UP]: 'magnify-plus',
      [PhotoAngle.WIDE_ANGLE]: 'magnify-minus',
      [PhotoAngle.CUSTOM]: 'camera',
    };
    return iconMap[angle] || 'camera';
  };

  const getPhotoTypeCount = (
    type: 'before' | 'after' | 'follow-up'
  ): number => {
    switch (type) {
      case 'before':
        return beforePhotos.length;
      case 'after':
        return afterPhotos.length;
      case 'follow-up':
        return followUpPhotos.length;
      default:
        return 0;
    }
  };

  const getCurrentPhotos = (): PhotoReference[] => {
    switch (activePhotoType) {
      case 'before':
        return beforePhotos;
      case 'after':
        return afterPhotos;
      case 'follow-up':
        return followUpPhotos;
      default:
        return [];
    }
  };

  const renderPhotoGrid = () => {
    const photos = getCurrentPhotos();

    return (
      <View className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false}>
          {photos.length > 0 && (
            <View className="flex-row flex-wrap justify-between p-4">
              {photos.map((photo, index) => (
                <View key={photo.id} className="w-[48%] mb-4">
                  <View className="relative">
                    <Image
                      source={{ uri: photo.photo_url }}
                      className="w-full h-32 rounded-lg"
                      resizeMode="cover"
                    />
                    <View className="absolute top-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded">
                      <Text className="text-white text-xs font-medium">
                        {photo.angle.replace('-', ' ').toUpperCase()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        handleDeletePhoto(photo.id, activePhotoType)
                      }
                      className="absolute top-2 right-2 bg-red-500 rounded-full p-1"
                    >
                      <MaterialCommunityIcons
                        name="close"
                        size={16}
                        color="white"
                      />
                    </TouchableOpacity>
                  </View>
                  <Text className="text-xs text-gray-500 mt-1">
                    {new Date(photo.upload_date).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {photos.length === 0 && (
            <View className="flex-1 items-center justify-center py-12">
              <MaterialCommunityIcons
                name="camera-plus"
                size={48}
                color="#9CA3AF"
              />
              <Text className="text-gray-500 font-medium mt-4">
                No {activePhotoType} photos
              </Text>
              <Text className="text-gray-400 text-sm mt-2 text-center px-8">
                Capture {activePhotoType} photos using the camera angles below
              </Text>
            </View>
          )}

          {/* Camera Angle Options */}
          <View className="p-4 border-t border-gray-200">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Capture Photo
            </Text>
            <View className="flex-row flex-wrap justify-between">
              {Object.values(PhotoAngle).map(angle => (
                <TouchableOpacity
                  key={angle}
                  onPress={() => handleCapturePhoto(angle)}
                  className="w-[30%] bg-white rounded-lg border border-gray-200 p-3 mb-3 items-center"
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={getAngleIcon(angle) as any}
                    size={24}
                    color="#F05C0C"
                  />
                  <Text className="text-sm font-medium text-gray-900 mt-2 text-center">
                    {angle.replace('-', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    );
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
            <TouchableOpacity onPress={onClose} className="p-2">
              <MaterialCommunityIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>

            <Text className="text-lg font-semibold text-gray-900">
              Before/After Photos
            </Text>

            <TouchableOpacity
              onPress={handleSave}
              className="bg-[#F05C0C] px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-medium">Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1">
          {/* Basic Information */}
          <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm p-4">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Procedure Information
            </Text>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Procedure Name *
              </Text>
              <TextInput
                value={procedureName}
                onChangeText={setProcedureName}
                placeholder="e.g., Rhinoplasty, Facelift, Breast Augmentation"
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Procedure Date *
              </Text>
              <TextInput
                value={procedureDate}
                onChangeText={setProcedureDate}
                placeholder="YYYY-MM-DD"
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Specialty *
              </Text>
              <TextInput
                value={specialty}
                onChangeText={setSpecialty}
                placeholder="e.g., Plastic Surgery, Dermatology"
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Body Area *
              </Text>
              <TextInput
                value={bodyArea}
                onChangeText={setBodyArea}
                placeholder="e.g., Face, Breast, Abdomen"
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Description
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Optional description of the procedure and outcomes"
                multiline
                numberOfLines={3}
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                textAlignVertical="top"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Tags
              </Text>
              <TextInput
                value={tags}
                onChangeText={setTags}
                placeholder="Separate tags with commas"
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Visibility
              </Text>
              <View className="flex-row space-x-3">
                {Object.values(DocumentVisibility).map(vis => (
                  <TouchableOpacity
                    key={vis}
                    onPress={() => setVisibility(vis)}
                    className={`px-3 py-2 rounded-lg border ${
                      visibility === vis
                        ? 'bg-[#F05C0C] border-[#F05C0C]'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        visibility === vis ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {vis.charAt(0).toUpperCase() + vis.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Photo Type Tabs */}
          <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
            <View className="flex-row border-b border-gray-200">
              {(['before', 'after', 'follow-up'] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setActivePhotoType(type)}
                  className={`flex-1 py-3 px-4 ${
                    activePhotoType === type
                      ? 'border-b-2 border-[#F05C0C]'
                      : ''
                  }`}
                >
                  <View className="flex-row items-center justify-center">
                    <Text
                      className={`font-medium ${
                        activePhotoType === type
                          ? 'text-[#F05C0C]'
                          : 'text-gray-600'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() +
                        type.slice(1).replace('-', ' ')}
                    </Text>
                    {getPhotoTypeCount(type) > 0 && (
                      <View className="ml-2 bg-[#F05C0C] rounded-full min-w-5 h-5 items-center justify-center">
                        <Text className="text-white text-xs font-bold">
                          {getPhotoTypeCount(type)}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {renderPhotoGrid()}
          </View>

          {/* Bottom spacing */}
          <View className="h-8" />
        </ScrollView>
      </View>
    </Modal>
  );
};

export default BeforeAfterPhotoManager;
