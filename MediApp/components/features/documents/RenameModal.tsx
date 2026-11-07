import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal } from 'react-native';

interface RenameModalProps {
    visible: boolean;
    renameText: string;
    setRenameText: (text: string) => void;
    ext: string;
    onClose: () => void;
    onSubmit: () => void;
    isLoading: boolean;
}

export const RenameModal: React.FC<RenameModalProps> = ({
    visible,
    renameText,
    setRenameText,
    ext,
    onClose,
    onSubmit,
    isLoading,
}) => {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity
                className="flex-1 bg-black/50 justify-center items-center"
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity activeOpacity={1} className="bg-white rounded-2xl mx-8 w-[85%] overflow-hidden">
                    <View className="px-5 pt-5 pb-3">
                        <Text className="text-lg font-normal text-gray-900 text-center">Rename Document</Text>
                    </View>
                    <View className="px-5 pb-4">
                        <View className="flex-row items-center border border-gray-300 rounded-lg px-3 py-2">
                            <TextInput
                                className="flex-1 text-base text-gray-900"
                                value={renameText}
                                onChangeText={setRenameText}
                                autoFocus
                                selectTextOnFocus
                                onSubmitEditing={onSubmit}
                                returnKeyType="done"
                                editable={!isLoading}
                            />
                            {ext && (
                                <Text className="text-base text-gray-500 ml-1">{ext}</Text>
                            )}
                        </View>
                    </View>
                    <View className="flex-row border-t border-gray-200">
                        <TouchableOpacity
                            onPress={onClose}
                            className="flex-1 py-3 items-center border-r border-gray-200"
                            disabled={isLoading}
                        >
                            <Text className={`text-base text-gray-500 ${isLoading ? 'opacity-50' : ''}`}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onSubmit}
                            className="flex-1 py-3 items-center"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Text className="text-base font-normal text-gray-400">Renaming...</Text>
                            ) : (
                                <Text className="text-base font-normal" style={{ color: '#F05C0C' }}>Rename</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};
