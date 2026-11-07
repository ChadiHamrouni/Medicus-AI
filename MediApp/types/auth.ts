/* eslint-disable no-unused-vars */
export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface UserRegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  dob?: string;
  role: UserRole;
  gender: Gender;
  medical_licence?: string;
  specialty_id?: number;
}

export interface EmailVerificationRequest {
  email: string;
}

export interface EmailVerificationResponse {
  success: boolean;
  message: string;
}

export interface EmailVerificationCodeRequest {
  email: string;
  code: string;
}

export interface PasswordChangeRequest {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export interface PasswordChangeResponse {
  success: boolean;
  message: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

export interface PasswordResetCodeRequest {
  email: string;
  code: string;
  new_password: string;
}

export interface PasswordResetCodeResponse {
  success: boolean;
  message: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserResponse;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserResponse;
  // Profile data from materialized views - populated at login time
  doctorProfile?: import('./doctor').DoctorProfileResponse;
  patientProfile?: import('./patient').PatientProfileResponse;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user?: UserResponse;
}

export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  LOCKED = 'locked',
  PENDING = 'pending',
  VERIFIED = 'verified',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  UNDISCLOSED = 'UNDISCLOSED',
}

export interface UserResponse {
  id: number;
  email: string;
  role: UserRole;
  account_status: UserStatus;
  signup_step: number;
  is_email_verified: boolean;
  is_phone_verified?: boolean;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  full_name?: string;
  phone_number?: string;
  dob?: string;
  created_at?: string;
  last_login?: string;
  avatar?: string;
  country_id?: number;
  gender?: Gender;
}

export interface AuthError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserResponse | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: AuthError | null;
  // Profile data from materialized views - loaded at login time
  doctorProfile?: import('./doctor').DoctorProfileResponse | null;
  patientProfile?: import('./patient').PatientProfileResponse | null;
}
