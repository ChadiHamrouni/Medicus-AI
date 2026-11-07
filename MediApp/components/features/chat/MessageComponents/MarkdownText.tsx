import React from 'react';
import Markdown from 'react-native-markdown-display';
import { StyleSheet, View, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { usePatientView } from '@/contexts/PatientViewContext';

export interface MarkdownTextProps {
  children: string;
  isCurrentUser: boolean;
  testID?: string;
}

const MarkdownText: React.FC<MarkdownTextProps> = ({
  children,
  isCurrentUser,
  testID,
}) => {
  const router = useRouter();
  const { setViewingPatient } = usePatientView();

  const onLinkPress = (url: string) => {
    const cleanUrl = url.trim();
    console.log('[MarkdownText] Link pressed:', cleanUrl);

    if (cleanUrl.startsWith('mediapp://conversation/')) {
      const conversationId = cleanUrl.split('mediapp://conversation/')[1];
      if (conversationId) {
        router.push(`/tabs/chats/${conversationId}`);
        return false;
      }
    }

    // Handle patient profile navigation from MediDoc
    // Format: mediapp://patient/{patient_id}?convo_id={convo_id}&patient_name={name}&patient_age={age}&patient_gender={gender}
    if (cleanUrl.startsWith('mediapp://patient/')) {
      try {
        const urlParts = cleanUrl.replace('mediapp://patient/', '').split('?');
        const patientId = parseInt(urlParts[0], 10);
        const params = new URLSearchParams(urlParts[1] || '');
        const convoId = params.get('convo_id') || '';
        const patientName = params.get('patient_name') || undefined;
        const patientAgeStr = params.get('patient_age');
        const patientAge = patientAgeStr ? parseInt(patientAgeStr, 10) : undefined;
        const patientGender = params.get('patient_gender') || undefined;

        if (patientId && convoId) {
          // Set the patient view context before navigating
          setViewingPatient({
            patientId,
            convoId,
            patientName,
            patientAge,
            patientGender,
          });
          router.push('/tabs/patients' as any);
        }
        return false;
      } catch (e) {
        console.error('[MarkdownText] Error parsing patient URL:', e);
        return false;
      }
    }

    // Safety check: Don't try to open mediapp:// links with Linking.openURL if they fell through
    if (cleanUrl.startsWith('mediapp://')) {
      return false;
    }

    return true;
  };

  const markdownStyles = StyleSheet.create({
    body: {
      color: isCurrentUser ? '#111827' : '#1f2937',
      fontSize: 14,
      lineHeight: 20,
    },
    heading1: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isCurrentUser ? '#111827' : '#1f2937',
      marginTop: 8,
      marginBottom: 8,
    },
    heading2: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isCurrentUser ? '#111827' : '#1f2937',
      marginTop: 6,
      marginBottom: 6,
    },
    heading3: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isCurrentUser ? '#111827' : '#1f2937',
      marginTop: 4,
      marginBottom: 4,
    },
    heading4: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isCurrentUser ? '#111827' : '#1f2937',
      marginTop: 4,
      marginBottom: 4,
    },
    heading5: {
      fontSize: 14,
      fontWeight: 'bold',
      color: isCurrentUser ? '#111827' : '#1f2937',
      marginTop: 2,
      marginBottom: 2,
    },
    heading6: {
      fontSize: 14,
      fontWeight: 'bold',
      color: isCurrentUser ? '#111827' : '#1f2937',
      marginTop: 2,
      marginBottom: 2,
    },
    strong: {
      fontWeight: 'bold',
    },
    em: {
      fontStyle: 'italic',
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 0,
    },
    bullet_list: {
      marginTop: 4,
      marginBottom: 4,
    },
    ordered_list: {
      marginTop: 4,
      marginBottom: 4,
    },
    list_item: {
      marginTop: 2,
      marginBottom: 2,
    },
    code_inline: {
      backgroundColor: isCurrentUser ? '#f3f4f6' : '#e5e7eb',
      color: '#dc2626',
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      fontFamily: 'Courier',
      fontSize: 13,
    },
    code_block: {
      backgroundColor: isCurrentUser ? '#f3f4f6' : '#e5e7eb',
      padding: 8,
      borderRadius: 6,
      fontFamily: 'Courier',
      fontSize: 13,
      marginTop: 4,
      marginBottom: 4,
    },
    fence: {
      backgroundColor: isCurrentUser ? '#f3f4f6' : '#e5e7eb',
      padding: 8,
      borderRadius: 6,
      fontFamily: 'Courier',
      fontSize: 13,
      marginTop: 4,
      marginBottom: 4,
    },
    blockquote: {
      backgroundColor: isCurrentUser ? '#f9fafb' : '#f3f4f6',
      borderLeftColor: '#9ca3af',
      borderLeftWidth: 4,
      paddingLeft: 12,
      paddingVertical: 4,
      marginTop: 4,
      marginBottom: 4,
    },
    link: {
      color: '#2563eb',
      textDecorationLine: 'underline',
    },
    hr: {
      backgroundColor: '#d1d5db',
      height: 1,
      marginVertical: 8,
    },
    table: {
      borderWidth: 1,
      borderColor: '#d1d5db',
      marginTop: 4,
      marginBottom: 4,
    },
    thead: {
      backgroundColor: isCurrentUser ? '#f9fafb' : '#f3f4f6',
    },
    tr: {
      borderBottomWidth: 1,
      borderColor: '#d1d5db',
    },
    th: {
      padding: 8,
      fontWeight: 'bold',
    },
    td: {
      padding: 8,
    },
  });

  return (
    <View testID={testID}>
      <Markdown style={markdownStyles} onLinkPress={onLinkPress}>
        {children}
      </Markdown>
    </View>
  );
};

export default MarkdownText;
