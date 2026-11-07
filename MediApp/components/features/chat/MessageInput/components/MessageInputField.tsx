import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';

export interface MessageInputFieldProps {
  message: string;
  onMessageChange: (_text: string) => void;
  onSend: () => void;
  inputRef: React.RefObject<TextInput | null>;
  isLoading?: boolean;
  hasAttachments?: boolean;
}

/**
 * Text input field with send button
 */
export const MessageInputField: React.FC<MessageInputFieldProps> = ({
  message,
  onMessageChange,
  onSend,
  inputRef,
  isLoading = false,
  hasAttachments = false,
}) => {
  const [inputHeight, setInputHeight] = useState(40);
  const maxHeight = 120; // Maximum height (about 5 lines)
  const minHeight = 20; // Minimum height (1 line)

  return (
    <View
      className="flex-1 flex-row bg-gray-100 rounded-3xl px-4 mr-2"
      style={{
        minHeight: minHeight + 16,
        maxHeight: maxHeight + 16,
        paddingVertical: 8,
      }}
    >
      <View className="flex-1 justify-center">
        <TextInput
          ref={inputRef}
          testID="message-input"
          placeholder="Message..."
          className="text-base text-gray-900"
          placeholderTextColor="#9CA3AF"
          multiline={true}
          maxLength={2000}
          value={message}
          onChangeText={onMessageChange}
          onContentSizeChange={event => {
            const { height } = event.nativeEvent.contentSize;
            const newHeight = Math.max(minHeight, Math.min(maxHeight, height));
            setInputHeight(newHeight);
          }}
          style={{
            minHeight: minHeight,
            maxHeight: maxHeight,
            paddingVertical: 0,
            textAlignVertical: message.length === 0 ? 'center' : 'top',
          }}
          scrollEnabled={inputHeight >= maxHeight}
          returnKeyType="default"
          blurOnSubmit={false}
        />
      </View>
      <View className="justify-center ml-2">
        <TouchableOpacity
          testID="send-button"
          accessibilityLabel="send-button"
          accessible={true}
          onPress={onSend}
          disabled={isLoading || (!message.trim() && !hasAttachments)}
        >
          <MaterialCommunityIcons
            name={isLoading ? 'loading' : 'send'}
            size={24}
            color="#F05C0C"
            style={{
              opacity:
                isLoading || (!message.trim() && !hasAttachments) ? 0.3 : 1,
            }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};
