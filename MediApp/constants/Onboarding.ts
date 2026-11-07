import { SocialLink } from '@/types';

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const CURRENCIES = [
  { key: 'USD', value: 'US Dollar ($)' },
  { key: 'EUR', value: 'Euro (€)' },
  { key: 'GBP', value: 'British Pound (£)' },
  { key: 'TND', value: 'Tunisian Dinar (د.ت)' },
];

export const CONSULTATION_TYPES = [
  { key: '1', value: 'General Consultation' },
  { key: '2', value: 'Follow-up Consultation' },
  { key: '3', value: 'Emergency Consultation' },
  { key: '4', value: 'Online Consultation' },
];

export const INSURANCE_PLANS = [
  { key: '1', value: 'Private Insurance' },
  { key: '2', value: 'Public Insurance' },
  { key: '3', value: 'International Insurance' },
  { key: '4', value: 'Self-pay' },
];

export const SPECIALTIES = [
  { key: '1', value: 'Plastic Surgery' },
  { key: '2', value: 'General Surgery' },
  { key: '3', value: 'Cardiothoracic Surgery' },
  { key: '4', value: 'Neurosurgery' },
];

export const PREFIXES = [
  { key: 'dr', value: 'Dr.' },
  { key: 'prof', value: 'Prof.' },
  { key: 'mr', value: 'Mr.' },
  { key: 'mrs', value: 'Mrs.' },
  { key: 'ms', value: 'Ms.' },
  { key: 'dr_prof', value: 'Prof. Dr.' },
];

export const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  { id: '1', platform: 'Website', url: '' },
  { id: '2', platform: 'Facebook', url: '' },
  { id: '3', platform: 'Instagram', url: '' },
  { id: '4', platform: 'LinkedIn', url: '' },
];

export const GENDERS = [
  { key: 'male', value: 'Male' },
  { key: 'female', value: 'Female' },
  { key: 'prefer_not_to_say', value: 'Prefer not to say' },
];
