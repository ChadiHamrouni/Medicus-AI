import { useQuery } from '@tanstack/react-query';
import { authenticatedFetch } from '@/utils';
import { DOCS_BASE } from '@/services/documents/documentVault';

export interface ShareDetail {
    conversation_id: string;
    recipient_name: string;
    shared_at: string;
}

interface SharesResponse {
    shares: ShareDetail[];
}

export function useDocumentShares(docExternalId: string | null, ownerType: 'patient' | 'doctor') {
    return useQuery({
        queryKey: ['document-shares', ownerType, docExternalId],
        queryFn: async () => {
            if (!docExternalId) return [];
            const res = await authenticatedFetch(
                `${DOCS_BASE}/${docExternalId}/shares?owner_type=${ownerType}`
            );
            if (!res.ok) {
                throw new Error('Failed to fetch shares');
            }
            const data: SharesResponse = await res.json();
            return data.shares;
        },
        enabled: !!docExternalId,
    });
}
