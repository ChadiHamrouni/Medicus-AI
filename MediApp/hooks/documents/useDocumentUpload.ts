import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { uploadFileToVault } from '@/services/documents/documentVault';

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

export function useDocumentUpload(ownerType: 'patient' | 'doctor', ownerId: number | null) {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });
  const queryClient = useQueryClient();

  const upload = useCallback(
    async (fileUri: string, fileName: string, mimeType: string) => {
      if (!ownerId) throw new Error('No owner ID');

      setState({ isUploading: true, progress: 0, error: null });

      try {
        const result = await uploadFileToVault(
          fileUri,
          fileName,
          mimeType,
          ownerType,
          ownerId,
          (percent) => setState((prev) => ({ ...prev, progress: percent })),
        );

        setState({ isUploading: false, progress: 100, error: null });
        queryClient.invalidateQueries({ queryKey: ['vault-docs'] });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setState({ isUploading: false, progress: 0, error: message });
        throw err;
      }
    },
    [ownerType, ownerId, queryClient],
  );

  return { ...state, upload };
}