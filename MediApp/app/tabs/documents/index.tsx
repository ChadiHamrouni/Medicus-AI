import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import {
  useVaultDocs,
  useSharedDocs,
  useRevokeShare,
  useDownloadUrl,
  useRenameDocument,
  useDeleteDocument,
  useShareDocument,
} from '@/hooks/documents/useDocumentVault';
import { useDocumentUpload } from '@/hooks/documents/useDocumentUpload';
import { ShareModalContent } from '../../../components/features/documents/ShareModalContent';
import type { DocumentRecord, SharedDocumentRecord } from '@/types/documents';
import { useAppContext } from '@/contexts/AppContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDependents } from '@/contexts/DependentsContext';
import { DocumentGalleryItem, DocumentListItem, DocumentsHeader, DocumentsTabs, FloatingActions, RenameModal, SearchField, SharedDocumentGalleryItem, SharedDocumentListItem, SortBy, TabKey, ViewMode } from '@/components';


const DocumentsTab: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('vault');
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('name');
  const [showSearchFieldDropdown, setShowSearchFieldDropdown] = useState(false);
  const [shareDoc, setShareDoc] = useState<{ id: string; sharedWith: string[] } | null>(null);
  const [shareSearch, setShareSearch] = useState('');
  const [selectedConvoIds, setSelectedConvoIds] = useState<string[]>([]);
  const [removedShares, setRemovedShares] = useState<string[]>([]);
  const [renameDoc, setRenameDoc] = useState<{ id: string; name: string; ext: string } | null>(null);
  const [renameText, setRenameText] = useState('');
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);

  const { userRole } = useAppContext();
  const { authState } = useAuthContext();
  const { selectedDependent } = useDependents();

  const ownerType = userRole === 'doctor' ? 'doctor' : 'patient';
  const ownerId =
    ownerType === 'doctor'
      ? authState.doctorProfile?.id || 0
      : selectedDependent === 'main'
        ? authState.patientProfile?.id || 0
        : typeof selectedDependent === 'number'
          ? selectedDependent
          : 0;

  const { data: vaultData, isLoading: vaultLoading } = useVaultDocs(ownerType, ownerId || null);
  const { data: sharedData, isLoading: sharedLoading } = useSharedDocs(ownerType, ownerId || null);
  const revokeMutation = useRevokeShare(ownerType);
  const downloadMutation = useDownloadUrl();
  const renameMutation = useRenameDocument(ownerType);
  const deleteMutation = useDeleteDocument(ownerType);
  const shareMutation = useShareDocument(ownerType);
  const { isUploading, progress, upload } = useDocumentUpload(ownerType, ownerId || null);

  const handleUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'audio/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];

      // Check file size (3MB limit)
      if (file.size && file.size > 3 * 1024 * 1024) {
        Alert.alert('Upload Failed', 'File size exceeds the 3MB limit.');
        return;
      }

      await upload(file.uri, file.name, file.mimeType || 'application/octet-stream');
      Alert.alert('Uploaded', `"${file.name}" added to your vault.`);
    } catch (err) {
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Unknown error');
    }
  }, [upload]);

  const handleDownload = useCallback(
    async (item: DocumentRecord | SharedDocumentRecord) => {
      const docExternalId = item.external_id;
      const mimeType = item.mime_type;
      const fileName = item.original_name;

      setOpeningDocId(docExternalId);

      try {
        // Determine the correct owner_type for download
        // If viewing shared docs, the document is owned by the OTHER party
        const downloadOwnerType = activeTab === 'shared'
          ? (ownerType === 'doctor' ? 'patient' : 'doctor')
          : ownerType;

        const url = await downloadMutation.mutateAsync({ docExternalId, ownerType: downloadOwnerType });

        if (mimeType === 'application/pdf') {
          router.push({
            pathname: '/viewers/pdf-viewer',
            params: { uri: encodeURIComponent(url), title: fileName },
          });
        } else if (mimeType.startsWith('image/')) {
          router.push({
            pathname: '/viewers/image-viewer',
            params: { uri: encodeURIComponent(url), title: fileName },
          });
        } else if (mimeType.startsWith('audio/')) {
          router.push({
            pathname: '/viewers/audio-player',
            params: { uri: encodeURIComponent(url), title: fileName, mimeType: mimeType },
          });
        } else {
          // Fallback to opening in external app/browser
          await Linking.openURL(url);
        }
      } catch (err) {
        console.error('Error opening document:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        Alert.alert('Error', `Could not open document: ${errorMessage}`);
      } finally {
        setOpeningDocId(null);
      }
    },
    [downloadMutation, ownerType, activeTab, router],
  );

  const showVaultActions = useCallback(
    (doc: DocumentRecord) => {
      Alert.alert(doc.original_name, undefined, [
        {
          text: 'Share',
          onPress: () => {
            setShareSearch('');
            setSelectedConvoIds([]);
            setRemovedShares([]);
            setShareDoc({ id: doc.external_id, sharedWith: doc.shared_with || [] });
          },
        },
        {
          text: 'Rename',
          onPress: () => {
            const lastDotIndex = doc.original_name.lastIndexOf('.');
            if (lastDotIndex !== -1) {
              const name = doc.original_name.substring(0, lastDotIndex);
              const ext = doc.original_name.substring(lastDotIndex);
              setRenameText(name);
              setRenameDoc({ id: doc.external_id, name, ext });
            } else {
              setRenameText(doc.original_name);
              setRenameDoc({ id: doc.external_id, name: doc.original_name, ext: '' });
            }
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Document',
              `Are you sure you want to delete "${doc.original_name}"? This will also revoke all shares.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    setDeletingDocId(doc.external_id);
                    deleteMutation.mutate(doc.external_id, {
                      onError: () => {
                        setDeletingDocId(null);
                        Alert.alert('Error', 'Failed to delete document');
                      },
                      onSuccess: () => {
                        setDeletingDocId(null);
                      }
                    });
                  },
                },
              ],
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [deleteMutation],
  );

  const handleRenameSubmit = useCallback(() => {
    if (!renameDoc || !renameText.trim()) return;
    const fullNewName = renameText.trim() + (renameDoc.ext || '');
    renameMutation.mutate(
      { docExternalId: renameDoc.id, newName: fullNewName },
      {
        onSuccess: () => setRenameDoc(null),
        onError: () => Alert.alert('Error', 'Failed to rename document'),
      },
    );
  }, [renameDoc, renameText, renameMutation]);

  const handleScan = useCallback(() => {
    // Placeholder for scan functionality
    Alert.alert('Scan', 'Document scanning coming soon.');
  }, []);

  const vaultDocs = vaultData?.documents || [];
  const sharedDocs = sharedData?.documents || [];
  const isLoading = activeTab === 'vault' ? vaultLoading : sharedLoading;

  // Sort documents
  const sortedVaultDocs = useMemo(() => {
    const docs = [...vaultDocs];
    switch (sortBy) {
      case 'date':
        return docs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'name':
        return docs.sort((a, b) => a.original_name.localeCompare(b.original_name));
      case 'size':
        return docs.sort((a, b) => b.size_bytes - a.size_bytes);
      default:
        return docs;
    }
  }, [vaultDocs, sortBy]);

  // Filter documents by search
  const filteredVaultDocs = useMemo(() => {
    if (!searchText.trim()) return sortedVaultDocs;
    const q = searchText.trim().toLowerCase();
    return sortedVaultDocs.filter((doc) =>
      doc.original_name.toLowerCase().includes(q)
    );
  }, [sortedVaultDocs, searchText]);

  const filteredSharedDocs = useMemo(() => {
    if (!searchText.trim()) return sharedDocs;
    const q = searchText.trim().toLowerCase();
    if (searchField === 'from') {
      return sharedDocs.filter((doc) =>
        doc.shared_by_name?.toLowerCase().includes(q)
      );
    }
    return sharedDocs.filter((doc) =>
      doc.original_name.toLowerCase().includes(q)
    );
  }, [sharedDocs, searchText, searchField]);

  const currentDocs = activeTab === 'vault' ? filteredVaultDocs : filteredSharedDocs;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <DocumentsHeader
        searchText={searchText}
        setSearchText={setSearchText}
        searchField={searchField}
        setSearchField={setSearchField}
        showSearchFieldDropdown={showSearchFieldDropdown}
        setShowSearchFieldDropdown={setShowSearchFieldDropdown}
      />

      <DocumentsTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        viewMode={viewMode}
        setViewMode={setViewMode}
        sortBy={sortBy}
        setSortBy={setSortBy}
        showSortDropdown={showSortDropdown}
        setShowSortDropdown={setShowSortDropdown}
      />

      {/* Upload progress */}
      {isUploading && (
        <View className="px-4 py-3 bg-orange-50 border-b border-orange-200">
          <View className="flex-row items-center">
            <ActivityIndicator size="small" color="#F05C0C" />
            <Text className="text-sm text-orange-700 ml-2">Uploading... {progress}%</Text>
          </View>
          <View className="h-1 bg-orange-200 rounded-full mt-2">
            <View className="h-1 bg-orange-500 rounded-full" style={{ width: `${progress}%` }} />
          </View>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F05C0C" />
        </View>
      ) : (
        <FlatList
          key={viewMode}
          data={currentDocs as any}
          keyExtractor={(item) => ('shared_at' in item ? item.external_id + item.shared_at : item.external_id)}
          renderItem={({ item }) => {
            if (activeTab === 'vault') {
              if (viewMode === 'gallery') {
                return (
                  <DocumentGalleryItem
                    item={item as DocumentRecord}
                    onPress={() => handleDownload(item)}
                    onAction={showVaultActions}
                    deletingDocId={deletingDocId}
                    isOpening={openingDocId === item.external_id}
                  />
                );
              } else {
                return (
                  <DocumentListItem
                    item={item as DocumentRecord}
                    onPress={() => handleDownload(item)}
                    onAction={showVaultActions}
                    deletingDocId={deletingDocId}
                    isOpening={openingDocId === item.external_id}
                  />
                );
              }
            } else {
              if (viewMode === 'gallery') {
                return (
                  <SharedDocumentGalleryItem
                    item={item as SharedDocumentRecord}
                    onPress={() => handleDownload(item)}
                    isOpening={openingDocId === item.external_id}
                  />
                );
              } else {
                return (
                  <SharedDocumentListItem
                    item={item as SharedDocumentRecord}
                    onPress={() => handleDownload(item)}
                    isOpening={openingDocId === item.external_id}
                  />
                );
              }
            }
          }}
          numColumns={viewMode === 'gallery' ? 2 : 1}
          columnWrapperStyle={viewMode === 'gallery' ? { justifyContent: 'space-between', paddingHorizontal: 16 } : undefined}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-12">
              <MaterialCommunityIcons
                name={activeTab === 'vault' ? "folder-open-outline" : "file-send-outline"}
                size={48}
                color="#9CA3AF"
              />
              <Text className="text-gray-500 text-base font-medium mt-3">
                {activeTab === 'vault' ? 'Your vault is empty' : 'No shared documents'}
              </Text>
              <Text className="text-gray-400 text-sm mt-1">
                {activeTab === 'vault' ? 'Upload your first document' : 'Documents shared with you will appear here'}
              </Text>
            </View>
          }
        />
      )}

      <FloatingActions
        onScan={handleScan}
        onUpload={handleUpload}
        isUploading={isUploading}
      />

      <RenameModal
        visible={!!renameDoc}
        renameText={renameText}
        setRenameText={setRenameText}
        ext={renameDoc?.ext || ''}
        onClose={() => setRenameDoc(null)}
        onSubmit={handleRenameSubmit}
        isLoading={renameMutation.isPending}
      />

      {/* Share picker modal */}
      {shareDoc && (
        <ShareModalContent
          docId={shareDoc.id}
          ownerType={ownerType}
          visible={!!shareDoc}
          onClose={() => setShareDoc(null)}
        />
      )}

      {/* Dismiss overlays */}
      {(showSortDropdown || showSearchFieldDropdown) && (
        <TouchableOpacity
          className="absolute inset-0"
          activeOpacity={1}
          onPress={() => { setShowSortDropdown(false); setShowSearchFieldDropdown(false); }}
          style={{ zIndex: 10 }}
        />
      )}
    </SafeAreaView >
  );
};

export default DocumentsTab;
