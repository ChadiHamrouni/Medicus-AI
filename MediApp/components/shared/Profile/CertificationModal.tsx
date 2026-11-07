import { Button, FormFieldWrapper } from '@/components/shared/ui';
import { useAnimatedFormField } from '@/hooks';
import { Certification } from '@/types';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface CertificationModalProps {
  visible: boolean;
  certifications: Certification[];
  onClose: () => void;
  onAdd: (_certification: Certification) => void;
  onUpdate: (_index: number, _certification: Certification) => void;
  onDelete: (_index: number) => void;
}

const CertificationModal: React.FC<CertificationModalProps> = ({
  visible,
  certifications,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    certif_date: '',
    issuing_body: '',
  });

  // Form field animation management
  const formFields = ['title', 'certif_date', 'issuing_body'];
  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
    resetAnimations,
  } = useAnimatedFormField(formFields);

  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      certif_date: '',
      issuing_body: '',
    });
    setShowAddForm(false);
    setEditIndex(null);
    resetAnimations();
  }, [resetAnimations]);

  const handleSave = useCallback(() => {
    if (
      !formData.title.trim() ||
      !formData.certif_date.trim() ||
      !formData.issuing_body.trim()
    ) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const certification: Certification = {
      title: formData.title.trim(),
      certif_date: formData.certif_date.trim(),
      issuing_body: formData.issuing_body.trim(),
    };

    if (editIndex !== null) {
      onUpdate(editIndex, certification);
    } else {
      onAdd(certification);
    }

    resetForm();
  }, [formData, editIndex, onAdd, onUpdate, resetForm]);

  const handleEdit = useCallback(
    (index: number) => {
      const cert = certifications[index];
      setFormData({
        title: cert.title,
        certif_date: cert.certif_date,
        issuing_body: cert.issuing_body,
      });
      setEditIndex(index);
      setShowAddForm(true);
    },
    [certifications]
  );

  const handleDelete = useCallback(
    (index: number) => {
      Alert.alert(
        'Delete Certification',
        'Are you sure you want to delete this certification?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => onDelete(index),
          },
        ]
      );
    },
    [onDelete]
  );

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 bg-white p-4 mt-6">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 pt-12 border-b border-gray-200">
          <Text className="text-lg font-semibold text-gray-900">
            Manage Certifications
          </Text>
          <TouchableOpacity onPress={handleClose}>
            <MaterialIcons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Add/Edit Form */}
          {showAddForm && (
            <View className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
              <Text className="text-lg font-medium mb-4">
                {editIndex !== null
                  ? 'Edit Certification'
                  : 'Add New Certification'}
              </Text>

              <View className="mb-4">
                <FormFieldWrapper
                  type="text"
                  field="title"
                  value={formData.title}
                  label="Title"
                  isActive={selectedInput === 'title'}
                  borderColor={getBorderColor('title')}
                  labelStyle={getLabelStyle('title')}
                  onFocus={() => handleFocus('title')}
                  onBlur={() => handleBlur('title')}
                  onChangeText={text =>
                    setFormData(prev => ({ ...prev, title: text }))
                  }
                />
              </View>

              <View className="mb-4">
                <FormFieldWrapper
                  type="date"
                  field="certif_date"
                  value={formData.certif_date}
                  label="Certification Date"
                  isActive={selectedInput === 'certif_date'}
                  borderColor={getBorderColor('certif_date')}
                  labelStyle={getLabelStyle('certif_date')}
                  onFocus={() => handleFocus('certif_date')}
                  onBlur={() => handleBlur('certif_date')}
                  onChange={date =>
                    setFormData(prev => ({ ...prev, certif_date: date }))
                  }
                  dateFormat="full"
                />
              </View>

              <View className="mb-4">
                <FormFieldWrapper
                  type="text"
                  field="issuing_body"
                  value={formData.issuing_body}
                  label="Issuing Body"
                  isActive={selectedInput === 'issuing_body'}
                  borderColor={getBorderColor('issuing_body')}
                  labelStyle={getLabelStyle('issuing_body')}
                  onFocus={() => handleFocus('issuing_body')}
                  onBlur={() => handleBlur('issuing_body')}
                  onChangeText={text =>
                    setFormData(prev => ({ ...prev, issuing_body: text }))
                  }
                />
              </View>

              <View className="flex-row space-x-3">
                <Button
                  onPress={handleSave}
                  title="Save"
                  containerClassName="flex-1 h-12 bg-[#F05C0C] rounded-lg items-center justify-center"
                  textClassName="text-white font-semibold"
                />
                <Button
                  onPress={resetForm}
                  title="Cancel"
                  containerClassName="flex-1 h-12 bg-gray-200 rounded-lg items-center justify-center"
                  textClassName="text-gray-700 font-semibold"
                />
              </View>
            </View>
          )}

          {/* Add Button */}
          {!showAddForm && (
            <TouchableOpacity
              onPress={() => setShowAddForm(true)}
              className="mb-6 p-4 bg-[#F05C0C] rounded-lg flex-row items-center justify-center"
            >
              <MaterialIcons name="add" size={24} color="white" />
              <Text className="text-white font-semibold ml-2">
                Add Certification
              </Text>
            </TouchableOpacity>
          )}

          {/* Certifications List */}
          <View>
            <Text className="text-lg font-medium mb-4">
              Current Certifications ({certifications.length})
            </Text>

            {certifications.length === 0 ? (
              <View className="p-8 items-center">
                <MaterialIcons name="school" size={48} color="#D1D5DB" />
                <Text className="text-gray-500 text-center mt-4">
                  No certifications added yet.{'\n'}Tap &quot;Add
                  Certification&quot; to get started.
                </Text>
              </View>
            ) : (
              certifications.map((cert, index) => (
                <View
                  key={index}
                  className="mb-3 p-4 bg-white border border-gray-200 rounded-lg"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text className="text-lg font-medium text-gray-900 mb-1">
                        {cert.title}
                      </Text>
                      <Text className="text-sm text-gray-600 mb-1">
                        Issued by: {cert.issuing_body}
                      </Text>
                      <Text className="text-sm text-gray-500">
                        Date: {cert.certif_date}
                      </Text>
                    </View>
                    <View className="flex-row space-x-2">
                      <TouchableOpacity
                        onPress={() => handleEdit(index)}
                        className="p-2"
                      >
                        <MaterialIcons name="edit" size={20} color="#6B7280" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(index)}
                        className="p-2"
                      >
                        <MaterialIcons
                          name="delete"
                          size={20}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default CertificationModal;
