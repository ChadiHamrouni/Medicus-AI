import { IMessage } from '@/types';

interface Chat {
  id: string;
  participants: {
    id: string;
    name: string;
  }[];
  messages: IMessage[];
  isRead: boolean;
}
// Remove mock data - use real data from API
export const MOCK_CHATS: Chat[] = [];

export const SARA_IDENTITY = 'Sara';
export const DEFAULT_IDENTITY = 'Test User (static)';
