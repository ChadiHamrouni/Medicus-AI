import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import {
  InputBarActions,
  InputBarLeftSection,
  MessageInputField,
} from './components';
import { useCameraHandler } from './utils';
import { useDocumentPicker } from './utils/FilePicker';
import { VoiceInput } from './VoiceInput';

export interface InputBarProps {
  message: string;
  onMessageChange: (_text: string) => void;
  onSend: () => void;
  onVoiceMessageSend?: (
    _audioUri: string,
    _duration?: number,
    _waveform?: number[]
  ) => void;
  onEmojiPress: () => void;
  onVoicePress?: () => void;
  onRealTimePress?: () => void;
  onPlusPress?: () => void;
  onFileSelect?: (_file: any) => void;
  onImageSelect: (_image: any) => void;
  inputRef: React.RefObject<TextInput | null>;
  isLoading?: boolean;
  hasAttachments?: boolean;
  showRTCButton?: boolean;
  onSendToSara?: (_data: any) => void;
  chatId?: number;
  receiverId?: number;
}

/**
 * Main InputBar component
 */
export const InputBar: React.FC<InputBarProps> = ({
  message,
  onMessageChange,
  onSend,
  onVoiceMessageSend,
  onVoicePress,
  onRealTimePress,
  onPlusPress,
  onFileSelect,
  onImageSelect,
  inputRef,
  isLoading: isSendingMessage = false,
  hasAttachments = false,
  showRTCButton = false,
}) => {
  const [showOptionsModal, setShowOptionsModal] = useState<boolean>(false);
  const [showVoiceInput, setShowVoiceInput] = useState<boolean>(false);

  const { handleCameraPress, handleGalleryPress } =
    useCameraHandler(onImageSelect);
  const { handleFilePicker } = useDocumentPicker(onFileSelect);

  const handlePlusPress = () => {
    setShowOptionsModal(!showOptionsModal);
    if (onPlusPress) onPlusPress();
  };

  const handleVoicePress = async () => {
    // Toggle voice input mode
    setShowVoiceInput(!showVoiceInput);

    if (onVoicePress) {
      onVoicePress();
    }
  };

  const handleVoiceInputSend = (
    audioUri: string,
    duration?: number,
    waveform?: number[]
  ) => {
    // Always send voice notes directly through onVoiceMessageSend
    // Voice notes should not be added to attachments preview
    if (onVoiceMessageSend) {
      onVoiceMessageSend(audioUri, duration, waveform);
    }

    // Return to text input mode after adding attachment
    setShowVoiceInput(false);
  };

  const handleVoiceInputCancel = () => {
    // Return to text input mode when voice input is cancelled
    setShowVoiceInput(false);
  };

  // Handle selection of specific input mode
  const handleModeSelect = (
    mode: 'keyboard' | 'location' | 'files' | 'images' | 'camera'
  ) => {
    setShowOptionsModal(false);

    switch (mode) {
      case 'keyboard':
        setShowVoiceInput(false);
        break;
      case 'files':
        handleFilePicker();
        break;
      case 'images':
        handleGalleryPress();
        break;
      case 'camera':
        handleCameraPress();
        break;
    }
  };

  return (
    <View>
      <View className="flex-row items-end mx-2 my-2">
        {/* Left section - Plus button with options */}
        <InputBarLeftSection
          showVoiceInput={showVoiceInput}
          showOptionsModal={showOptionsModal}
          onPlusPress={handlePlusPress}
          onOptionSelect={handleModeSelect}
          hasAttachments={hasAttachments}
        />

        {/* Middle section - Text input or Voice input */}
        {showVoiceInput ? (
          <VoiceInput
            onSend={handleVoiceInputSend}
            onCancel={handleVoiceInputCancel}
          />
        ) : (
          <MessageInputField
            message={message}
            onMessageChange={onMessageChange}
            onSend={onSend}
            inputRef={inputRef}
            isLoading={isSendingMessage}
            hasAttachments={hasAttachments}
          />
        )}

        {/* Right section - Mic and Wave buttons */}
        <InputBarActions
          onVoicePress={handleVoicePress}
          onRealTimePress={onRealTimePress}
          showVoiceInput={showVoiceInput}
          hasText={message.trim().length > 0}
          showRTCButton={showRTCButton}
        />
      </View>
    </View>
  );
};
