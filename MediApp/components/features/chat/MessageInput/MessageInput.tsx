import { Attachment } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmojiPickerModal } from './EmojiPicker';
import { InputBar } from './InputBar';
import FileAttachment from '@/components/features/chat/FileAttachment'; // updated to dispatcher
import { AudioAttachmentPreview } from './components';

interface MessageInputProps {
  onSend: (_message: string, _attachments?: Attachment[]) => void;
  onVoicePress?: () => void;
  onRealTimePress?: () => void;
  isLoading?: boolean;
  showRTCButton?: boolean;
  onSendToSara?: (_audioUri: string) => void; // New callback for Sara AI
  chatId?: string; // For Sara AI integration
  conversationId?: string; // Conversation UUID for file attachments
  receiverId?: number; // For Sara AI integration
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onVoicePress,
  onRealTimePress,
  isLoading = false,
  showRTCButton = false,
  onSendToSara,
  chatId,
  conversationId,
  receiverId,
}) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput | null>(null);
  const { height: screenHeight } = Dimensions.get('window');
  const emojiPickerHeight = screenHeight * 0.4;

  // Track keyboard visibility
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const handleSend = () => {
    if (message.trim() || attachments.length > 0) {
      onSend(message, attachments.length > 0 ? attachments : undefined);
      setMessage('');
      setAttachments([]);
    }
  };

  const handleVoiceMessageSend = (
    audioUri: string,
    duration?: number,
    waveform?: number[]
  ) => {
    const voiceAttachment: Attachment = {
      uri: audioUri,
      type: 'audio',
      name: `voice_message_${Date.now()}.m4a`,
      duration: duration,
      waveform: waveform,
      mimeType: 'audio/m4a',
    };

    // Send voice note directly to chat without adding to attachments preview
    onSend('', [voiceAttachment]);
  };

  const handleEmojiSelected = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleEmojiButtonPress = () => {
    Keyboard.dismiss();
    setShowEmojiPicker(true);
  };

  const handleImageSelect = (image: { uri: string; type: string; mimeType?: string; size?: number; name?: string } | Array<{ uri: string; type: string; mimeType?: string; size?: number; name?: string }>) => {
    // Support both single image and multiple images
    const imagesToAdd = Array.isArray(image) ? image : [image];

    const newAttachments: Attachment[] = imagesToAdd.map(img => ({
      uri: img.uri,
      type: 'image',
      mimeType: img.mimeType,
      size: img.size,
      name: img.name,
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleFileSelect = (file: {
    uri: string;
    name?: string;
    size?: number;
    mimeType?: string;
    type?: string;
    duration?: number;
    waveform?: number[];
  }) => {
    // Determine if this is an audio file
    const isAudio =
      file.type === 'audio' ||
      (file.mimeType && file.mimeType.startsWith('audio/'));

    // Determine the attachment type based on the file's mimeType or explicit type
    let attachmentType: 'image' | 'file' | 'audio' = 'file';

    if (isAudio) {
      attachmentType = 'audio';
    } else if (file.mimeType && file.mimeType.startsWith('image/')) {
      attachmentType = 'image';
    }

    const newAttachment: Attachment = {
      uri: file.uri,
      type: attachmentType,
      name: file.name,
      size: file.size,
      mimeType: file.mimeType,
    };

    // Add audio-specific properties if it's an audio file
    if (isAudio) {
      newAttachment.duration = file.duration;
      newAttachment.waveform = file.waveform;
    }

    setAttachments(prev => [...prev, newAttachment]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Render attachment preview item
  const renderAttachmentItem = ({
    item,
    index,
  }: {
    item: Attachment;
    index: number;
  }) => {
    return (
      <View className="mr-2 relative">
        {item.type === 'image' ? (
          <Image
            source={{ uri: item.uri }}
            style={{ width: 80, height: 80 }}
            className="rounded-lg"
            resizeMode="cover"
          />
        ) : item.type === 'audio' ? (
          <AudioAttachmentPreview attachment={item} />
        ) : (
          <FileAttachment
            attachment={item}
            maxWidth={100}
            isSending={false}
            conversationId={conversationId}
          />
        )}
        <Pressable
          onPress={() => handleRemoveAttachment(index)}
          className="absolute top-1 right-1 bg-gray-800 rounded-full p-1 opacity-80"
        >
          <Ionicons name="close" size={14} color="white" />
        </Pressable>
      </View>
    );
  };

  return (
    <View
      className="border-t border-gray-200"
      style={{ paddingBottom: isKeyboardVisible ? 0 : insets.bottom }}
    >
      {attachments.length > 0 && (
        <View className="mx-2 mt-2 mb-1">
          <FlatList
            data={attachments}
            renderItem={renderAttachmentItem}
            keyExtractor={(item, index) => `${item.uri}-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 4 }}
          />
        </View>
      )}

      <InputBar
        message={message}
        onMessageChange={setMessage}
        onSend={handleSend}
        onVoiceMessageSend={handleVoiceMessageSend}
        onEmojiPress={handleEmojiButtonPress}
        onVoicePress={onVoicePress}
        onRealTimePress={onRealTimePress}
        onImageSelect={handleImageSelect}
        onFileSelect={handleFileSelect}
        inputRef={inputRef}
        isLoading={isLoading}
        hasAttachments={attachments.length > 0}
        showRTCButton={showRTCButton}
        onSendToSara={onSendToSara}
        chatId={typeof chatId === 'string' ? parseInt(chatId) : chatId}
        receiverId={
          typeof receiverId === 'string' ? parseInt(receiverId) : receiverId
        }
      />

      <EmojiPickerModal
        visible={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onEmojiSelected={handleEmojiSelected}
        height={emojiPickerHeight}
        insets={insets}
      />
    </View>
  );
};

export default MessageInput;
