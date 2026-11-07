export interface PatientSection {
  key: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  badge?: number;
  status?: 'complete' | 'incomplete' | 'pending';
}

export const PATIENT_SECTIONS: PatientSection[] = [
  {
    key: 'contact_details',
    title: 'Contact Details',
    description: 'Address, phone numbers, contact preferences',
    icon: 'email',
    route: '/tabs/patients/contact-details',
  },
  {
    key: 'emergency_contact',
    title: 'Emergency Contact',
    description: 'ICE contact information',
    icon: 'phone-alert',
    route: '/tabs/patients/emergency-contact',
  },
  {
    key: 'insurance',
    title: 'Insurance',
    description: 'Coverage details, policy information',
    icon: 'shield-account',
    route: '/tabs/patients/insurance',
  },
  {
    key: 'health_profile',
    title: 'Health Profile',
    description: 'Vitals, body metrics, immunizations, lifestyle',
    icon: 'heart-pulse',
    route: '/tabs/patients/health-profile',
  },
  {
    key: 'health_conditions',
    title: 'Health Conditions',
    description: 'Diagnosed conditions, chronic illnesses',
    icon: 'medical-bag',
    route: '/tabs/patients/health-conditions',
  },
  {
    key: 'medical_procedures',
    title: 'Medical Procedures',
    description: 'Scheduled and completed procedures',
    icon: 'hospital-box',
    route: '/tabs/patients/medical-procedures',
  },
  {
    key: 'medical_notes',
    title: 'Medical Notes',
    description: 'Clinical SOAP notes from visits',
    icon: 'note-text',
    route: '/tabs/patients/medical-notes',
  },
  {
    key: 'medications',
    title: 'Medications',
    description: 'Current and past medications',
    icon: 'pill',
    route: '/tabs/patients/medications',
  },
  {
    key: 'medical_events',
    title: 'Health Calendar',
    description: 'Scheduled visits and examinations',
    icon: 'calendar-clock',
    route: '/tabs/patients/medical-events',
  },
  {
    key: 'emergency_access',
    title: 'Emergency Access',
    description: 'Who can view records in emergency',
    icon: 'shield-cross',
    route: '/tabs/patients/emergency-access',
  },
  {
    key: 'appointment_reminders',
    title: 'Appointment Reminders',
    description: 'Reminder settings for this patient',
    icon: 'bell-ring',
    route: '/tabs/patients/appointment-reminders',
  },
  {
    key: 'patient_status',
    title: 'Patient Status',
    description: 'Active/Inactive/Archived',
    icon: 'account-check',
    route: '/tabs/patients/patient-status',
  },
];
