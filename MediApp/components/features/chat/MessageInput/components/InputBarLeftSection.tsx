import React from 'react';
import { View } from 'react-native';
import { ActionButton } from './ActionButton';
import { OptionsModal, InputMode } from './OptionsModal';

interface InputBarLeftSectionProps {
  showVoiceInput: boolean;
  showOptionsModal: boolean;
  onPlusPress: () => void;
  onOptionSelect: (mode: InputMode) => void;
  hasAttachments?: boolean;
}

/**
 * Component for displaying the left section of the input bar with plus/trash buttons
 */
export const InputBarLeftSection: React.FC<InputBarLeftSectionProps> = ({
  showVoiceInput,
  showOptionsModal,
  onPlusPress,
  onOptionSelect,
  hasAttachments = false,
}) => {
  return (
    <View className="flex-row items-center">
      {!showVoiceInput && (
        <View>
          <OptionsModal
            visible={showOptionsModal}
            onOptionSelect={onOptionSelect}
            hasAttachments={hasAttachments}
          />
          <ActionButton icon="plus" onPress={onPlusPress} />
        </View>
      )}
    </View>
  );
};
