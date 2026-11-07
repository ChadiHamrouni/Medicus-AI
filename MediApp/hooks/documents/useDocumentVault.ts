import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getVaultDocs,
  getSharedDocs,
  revokeShare,
  getDownloadUrl,
  renameDocument,
  deleteDocument,
  shareDocument,
} from '@/services/documents/documentVault';

export function useVaultDocs(ownerType: 'patient' | 'doctor', ownerId: number | null) {
  return useQuery({
    queryKey: ['vault-docs', ownerType, ownerId],
    queryFn: () => getVaultDocs(ownerType, ownerId!),
    enabled: !!ownerId,
  });
}

export function useSharedDocs(ownerType: 'patient' | 'doctor', ownerId: number | null) {
  return useQuery({
    queryKey: ['shared-docs', ownerType, ownerId],
    queryFn: () => getSharedDocs(ownerType, ownerId!),
    enabled: !!ownerId,
  });
}

export function useRevokeShare(ownerType: 'patient' | 'doctor') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ docExternalId, conversationId }: { docExternalId: string; conversationId?: string }) =>
      revokeShare(docExternalId, ownerType, conversationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vault-docs'] });
      queryClient.invalidateQueries({ queryKey: ['shared-docs'] });
      queryClient.invalidateQueries({ queryKey: ['document-shares', ownerType, variables.docExternalId] });
    },
  });
}

export function useRenameDocument(ownerType: 'patient' | 'doctor') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ docExternalId, newName }: { docExternalId: string; newName: string }) =>
      renameDocument(docExternalId, newName, ownerType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-docs'] });
    },
  });
}

export function useDeleteDocument(ownerType: 'patient' | 'doctor') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docExternalId: string) => deleteDocument(docExternalId, ownerType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-docs'] });
      queryClient.invalidateQueries({ queryKey: ['shared-docs'] });
    },
  });
}

export function useShareDocument(ownerType: 'patient' | 'doctor') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ docExternalId, conversationId }: { docExternalId: string; conversationId: string }) =>
      shareDocument(docExternalId, conversationId, ownerType),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vault-docs'] });
      queryClient.invalidateQueries({ queryKey: ['shared-docs'] });
      queryClient.invalidateQueries({ queryKey: ['document-shares', ownerType, variables.docExternalId] });
    },
  });
}

export function useDownloadUrl() {
  return useMutation({
    mutationFn: ({ docExternalId, ownerType }: { docExternalId: string; ownerType: 'patient' | 'doctor' }) =>
      getDownloadUrl(docExternalId, ownerType),
  });
}