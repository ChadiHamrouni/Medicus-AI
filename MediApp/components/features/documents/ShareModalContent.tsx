import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, Modal, Dimensions, Keyboard } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDocumentShares } from '@/hooks/documents/useDocumentShares';
import { useRevokeShare, useShareDocument } from '@/hooks/documents/useDocumentVault';
import { useConversations } from '@/hooks/chat/useConversations';
import { useKeyboardHeight } from '@/hooks';

export const ShareModalContent = ({
    docId,
    ownerType,
    visible = true,
    onClose,
}: {
    docId: string;
    ownerType: 'patient' | 'doctor';
    visible?: boolean;
    onClose: () => void;
}) => {
    const [shareSearch, setShareSearch] = useState('');
    const [sharingId, setSharingId] = useState<string | null>(null);
    const [revokingId, setRevokingId] = useState<string | null>(null);

    const { data: shares, isLoading: sharesLoading } = useDocumentShares(docId, ownerType);
    const revokeMutation = useRevokeShare(ownerType);
    const shareMutation = useShareDocument(ownerType);
    const { conversations: conversationsList } = useConversations();

    const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();
    const screenHeight = Dimensions.get('window').height;
    const insets = useSafeAreaInsets();

    const maxModalHeight = useMemo(() => {
        if (isKeyboardVisible) {
            return screenHeight - keyboardHeight - 50;
        }
        return screenHeight * 0.85;
    }, [isKeyboardVisible, keyboardHeight, screenHeight]);

    const filteredConvos = useMemo(() => {
        if (!shareSearch.trim()) return [];
        return (conversationsList || []).filter(c => {
            const name = c.doctor?.name || c.patient?.name || 'Unknown';
            return name?.toLowerCase().includes(shareSearch.toLowerCase());
        });
    }, [conversationsList, shareSearch]);

    const shareableConvos = useMemo(() => {
        const sharedConvIds = new Set(shares?.map(s => s.conversation_id));
        return filteredConvos.filter(c => !sharedConvIds.has(c.id?.toString() || c.conversation_id));
    }, [filteredConvos, shares]);

    const handleShare = async (convoId: string) => {
        try {
            setSharingId(convoId);
            await shareMutation.mutateAsync({ docExternalId: docId, conversationId: convoId });
            Alert.alert('Success', 'Document shared successfully');
            setShareSearch('');
            Keyboard.dismiss();
        } catch (e) {
            Alert.alert('Error', 'Failed to share document');
        } finally {
            setSharingId(null);
        }
    };

    const handleClose = () => {
        setShareSearch('');
        setSharingId(null);
        Keyboard.dismiss();
        onClose();
    }

    const handleRevoke = (share: any) => {
        Alert.alert("Revoke Access", `Remove access for ${share.recipient_name}?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Remove",
                style: "destructive",
                onPress: async () => {
                    try {
                        setRevokingId(share.conversation_id);
                        await revokeMutation.mutateAsync({ docExternalId: docId, conversationId: share.conversation_id });
                    } catch (error) {
                        Alert.alert('Error', 'Failed to revoke access');
                    } finally {
                        setRevokingId(null);
                    }
                }
            }
        ]);
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View className="flex-1 justify-end bg-black/50">
                <TouchableOpacity
                    className="absolute inset-0"
                    activeOpacity={1}
                    onPress={handleClose}
                />

                <View
                    className="bg-white rounded-t-3xl shadow-xl z-50 absolute bottom-0 left-0 right-0"
                    style={{
                        maxHeight: maxModalHeight,
                        marginBottom: isKeyboardVisible ? keyboardHeight : 0,
                        paddingBottom: Math.max(insets.bottom, 20),
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 16,
                    }}
                >
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
                        <Text className="text-lg font-normal text-gray-900">Manage Access</Text>
                        <TouchableOpacity
                            className="p-1"
                            onPress={handleClose}
                        >
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={{ flexGrow: 1 }}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Active Shares Section */}
                        <View className="px-5 py-4 border-b border-gray-100">
                            <Text className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                                People with access ({shares?.length || 0})
                            </Text>

                            {sharesLoading ? (
                                <ActivityIndicator size="small" color="#F05C0C" />
                            ) : shares && shares.length > 0 ? (
                                <View className="flex-row flex-wrap">
                                    {shares.map((share) => (
                                        <View
                                            key={share.conversation_id}
                                            className="flex-row items-center bg-gray-100 rounded-full pl-1 pr-2 py-1 mr-2 mb-2 border border-gray-200"
                                        >
                                            {/* <View className="w-6 h-6 rounded-full bg-white flex items-center justify-center border border-gray-100 mr-2 shadow-sm">
                                                <Ionicons name="person" size={12} color="#6B7280" />
                                            </View> */}
                                            <Text className="text-gray-700 text-sm font-medium mr-2 pl-2" numberOfLines={1} style={{ maxWidth: 120 }}>
                                                {share.recipient_name}
                                            </Text>
                                            <TouchableOpacity
                                                onPress={() => handleRevoke(share)}
                                                disabled={revokingId === share.conversation_id}
                                                className="w-5 h-5 items-center justify-center rounded-full bg-gray-200"
                                                activeOpacity={0.7}
                                            >
                                                {revokingId === share.conversation_id ? (
                                                    <ActivityIndicator size="small" color="#6B7280" />
                                                ) : (
                                                    <Ionicons name="close" size={14} color="#6B7280" />
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View className="py-2 items-center flex-row">
                                    <Ionicons name="people-outline" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
                                    <Text className="text-gray-400 text-sm">Not shared with anyone yet</Text>
                                </View>
                            )}
                        </View>

                        {/* Add Share Section */}
                        <View className="pt-4">
                            <View className="px-5 pb-2">
                                <Text className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Share with others</Text>
                                <View className="flex-row items-center px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200">
                                    <Ionicons name="search" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
                                    <TextInput
                                        className="flex-1 text-base text-gray-900 p-0"
                                        placeholder="Search people..."
                                        placeholderTextColor="#9CA3AF"
                                        value={shareSearch}
                                        onChangeText={setShareSearch}
                                        autoCorrect={false}
                                    />
                                    {shareSearch.length > 0 && (
                                        <TouchableOpacity onPress={() => setShareSearch('')}>
                                            <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            <View>
                                {shareSearch.length === 0 ? (
                                    <View className="items-center justify-center pt-8">
                                        <View className="w-12 h-12 rounded-full bg-gray-50 items-center justify-center mb-3">
                                            <Ionicons name="search" size={24} color="#D1D5DB" />
                                        </View>
                                        <Text className="text-sm text-gray-400 font-medium">
                                            Start typing to find people
                                        </Text>
                                    </View>
                                ) : shareableConvos.length === 0 ? (
                                    <View className="items-center justify-center py-8">
                                        <Text className="text-base text-gray-500 font-medium mb-1">No people found</Text>
                                        <Text className="text-sm text-gray-400">Try a different search term</Text>
                                    </View>
                                ) : (
                                    <>
                                        {shareableConvos.slice(0, 5).map((convo) => {
                                            const convoId = convo.id?.toString() || convo.conversation_id;
                                            const name = convo.doctor?.name || convo.patient?.name || 'Unknown';

                                            return (
                                                <TouchableOpacity
                                                    key={convoId}
                                                    onPress={() => handleShare(convoId)}
                                                    className="px-4 py-3 mx-3 my-1 rounded-xl bg-white border border-transparent active:bg-gray-50"
                                                    activeOpacity={0.7}
                                                    disabled={!!sharingId}
                                                >
                                                    <View className="flex-row items-center justify-between">
                                                        <View className="flex-row items-center flex-1">
                                                            <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3">
                                                                <FontAwesome5 name="user" size={14} color="#6B7280" />
                                                            </View>
                                                            <Text className="text-base font-medium text-gray-900 flex-1" numberOfLines={1}>
                                                                {name}
                                                            </Text>
                                                        </View>

                                                        {sharingId === convoId && (
                                                            <ActivityIndicator size="small" color="#F05C0C" />
                                                        )}
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                        {shareableConvos.length > 5 && (
                                            <View className="py-3 items-center">
                                                <Text className="text-xs text-gray-400 italic">
                                                    Continue typing to see more results
                                                </Text>
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};
