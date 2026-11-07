import { PatientStatusForm } from '@/components/features/patient/profile';
import React from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';

const PatientStatusScreen: React.FC = () => {
  return (
    <View className="flex-1">
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <KeyboardAwareScrollView
          enableOnAndroid={true}
          extraScrollHeight={100}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={false}
          className="flex-1"
        >
          <PatientStatusForm />
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
};

export default PatientStatusScreen;
