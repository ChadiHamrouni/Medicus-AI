/**
 * Patient-related constants
 * Used across patient profile, dependents, and health forms
 */

// Health Conditions
export const COMMON_CONDITIONS = [
  { id: 'diabetes', label: 'Diabetes', icon: 'diabetes', color: '#F59E0B' },
  {
    id: 'hypertension',
    label: 'High Blood Pressure',
    icon: 'heart-pulse',
    color: '#EF4444',
  },
  { id: 'asthma', label: 'Asthma', icon: 'lungs', color: '#06B6D4' },
  {
    id: 'heart-disease',
    label: 'Heart Disease',
    icon: 'heart',
    color: '#DC2626',
  },
  { id: 'arthritis', label: 'Arthritis', icon: 'bone', color: '#8B5CF6' },
  { id: 'depression', label: 'Depression', icon: 'brain', color: '#6366F1' },
  { id: 'anxiety', label: 'Anxiety', icon: 'lightning-bolt', color: '#EC4899' },
  { id: 'migraine', label: 'Migraine', icon: 'head-alert', color: '#10B981' },
];

// Blood Types
export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Gender Options (duplicates GENDERS from Onboarding - will be consolidated)
export const GENDER_OPTIONS = [
  { key: 'male', value: 'male', label: 'Male' },
  { key: 'female', value: 'female', label: 'Female' },
  { key: 'other', value: 'other', label: 'Other' },
];

// Relationship Options for Dependents
export const RELATIONSHIP_OPTIONS = [
  { key: 'spouse', value: 'Spouse' },
  { key: 'child', value: 'Child' },
  { key: 'parent', value: 'Parent' },
  { key: 'sibling', value: 'Sibling' },
  { key: 'grandparent', value: 'Grandparent' },
  { key: 'grandchild', value: 'Grandchild' },
  { key: 'guardian', value: 'Guardian' },
  { key: 'other', value: 'Other' },
];
