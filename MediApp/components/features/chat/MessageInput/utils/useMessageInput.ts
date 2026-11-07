import { Attachment } from '@/types';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, Keyboard, TextInput } from 'react-native';

export const useMessageInput = (
  onSend: (_message: string, _attachments?: Attachment[]) => void
) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const inputRef = useRef<TextInput | null>(null);

  const { height: screenHeight } = Dimensions.get('window');
  const emojiPickerHeight = useMemo(() => screenHeight * 0.4, [screenHeight]);

  const handleSend = useCallback(() => {
    if (message.trim() || attachments.length > 0) {
      onSend(message, attachments.length > 0 ? attachments : undefined);
      setMessage('');
      setAttachments([]);
    }
  }, [message, attachments, onSend]);

  const handleEmojiSelected = useCallback((emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  }, []);

  const handleEmojiButtonPress = useCallback(() => {
    Keyboard.dismiss();
    setShowEmojiPicker(true);
  }, []);

  const handleImageSelect = useCallback(
    (image: { uri: string; type: string }) => {
      const newAttachment: Attachment = {
        uri: image.uri,
        type: 'image',
      };
      setAttachments(prev => [...prev, newAttachment]);
    },
    []
  );

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleCloseEmojiPicker = useCallback(() => {
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  }, []);

  return {
    message,
    setMessage,
    showEmojiPicker,
    attachments,
    inputRef,
    emojiPickerHeight,
    handleSend,
    handleEmojiSelected,
    handleEmojiButtonPress,
    handleImageSelect,
    handleRemoveAttachment,
    handleCloseEmojiPicker,
  };
};
