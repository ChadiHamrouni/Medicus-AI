import { UserResponse, UserRole } from './auth';

export interface User {
  id: string;
  identity: string;
  displayName: string;
  avatar: string;
  type: 'doctor' | 'patient' | string;
}

export interface UsersSearchResponse {
  results: UserResponse[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface SearchUsersParams {
  query?: string;
  role?: UserRole;
  page?: number;
  page_size?: number;
}
