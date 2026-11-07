import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { useAppContext } from '@/contexts/AppContext';
import { useDependents } from '@/contexts/DependentsContext';
import { searchConversations, SearchConversationsParams } from '@/services/conversation/search';
import { Conversation } from '@/types';
import { logger } from '@/utils';

export type SearchMode = 'participant' | 'content';

export function useConversationSearch() {
  const { authState } = useAuth();
  const { userAssistant } = useAppContext();
  const { selectedDependent } = useDependents();

  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('participant');
  const [results, setResults] = useState<Conversation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = query.trim().length > 0;
  const assistantType = userAssistant === 'mediaid' ? 'mediaid' : 'medidoc';

  const patientContextId =
    userAssistant === 'mediaid'
      ? selectedDependent === 'main'
        ? authState.patientProfile?.id
        : typeof selectedDependent === 'number'
          ? selectedDependent
          : undefined
      : undefined;

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const params: SearchConversationsParams = {
        q: q.trim(),
        mode: searchMode,
        assistant: assistantType,
        patientContextId,
      };

      const response = await searchConversations(params);
      setResults(response.results);
    } catch (err) {
      logger.error('Conversation search failed', err as Error, {
        component: 'useConversationSearch',
      });
      setError('Search failed');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchMode, assistantType, patientContextId]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
  }, []);

  const participantLabel = assistantType === 'medidoc' ? 'Patients' : 'Doctors';

  return {
    query,
    setQuery,
    searchMode,
    setSearchMode,
    results,
    isSearching,
    isActive,
    error,
    clear,
    participantLabel,
  };
}