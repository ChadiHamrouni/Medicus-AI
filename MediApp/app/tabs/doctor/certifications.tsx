import React from 'react';
import { StandardScreenLayout } from '@/components/shared/layout';
import {
  CertificationsForm,
  OtherSpecialtiesForm,
} from '@/components/features/doctor/profile';
import { View, Text, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useDoctorProfile } from '@/hooks/doctor';
import { ThreeDotsLoader } from '@/components/shared/ui';
import { useState, useCallback } from 'react';
import { useViewingDoctor } from '@/contexts/ViewingDoctorContext';

const CertificationsScreen: React.FC = () => {
  const { isViewingFromConversation, doctorId } = useViewingDoctor();

  return (
    <StandardScreenLayout title="Certifications & Specialties" noScroll={true}>
      <View className="flex-1 bg-white">
        <ScrollView
          className="flex-1 bg-white"
          showsVerticalScrollIndicator={false}
        >
          <OtherSpecialtiesForm
            embedMode
            readOnly={isViewingFromConversation}
            doctorId={isViewingFromConversation ? doctorId ?? undefined : undefined}
          />

          {/* Separator */}
          {/* <View className="h-px bg-gray-200 mx-4 my-6" /> */}

          <CertificationsForm
            embedMode
            readOnly={isViewingFromConversation}
            doctorId={isViewingFromConversation ? doctorId ?? undefined : undefined}
          />
          <View className="h-32" />
        </ScrollView>
      </View>
    </StandardScreenLayout>
  );
};

export default CertificationsScreen;
