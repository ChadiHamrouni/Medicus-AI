import { MedicalEvent } from '@/hooks/patient/useMedicalEvents';

export const getEventIcon = (event: MedicalEvent): string => {
  const examType = event.exam_type?.toLowerCase() || '';
  const title = event.title.toLowerCase();

  // Visit types
  if (event.type === 'visit') {
    if (title.includes('follow')) return 'calendar-check';
    if (title.includes('consultation')) return 'comment-text';
    if (title.includes('checkup') || title.includes('check-up'))
      return 'clipboard-pulse';
    if (title.includes('emergency')) return 'ambulance';
    return 'stethoscope';
  }

  // Procedure types
  if (event.type === 'procedure') {
    if (title.includes('surgery')) return 'surgical-knife';
    if (title.includes('injection')) return 'needle';
    if (title.includes('biopsy')) return 'microscope';
    if (title.includes('endoscopy')) return 'camera';
    if (title.includes('catheter')) return 'needle';
    return 'medical-bag';
  }

  // Examination types
  if (
    examType === 'lab_test' ||
    title.includes('lab') ||
    title.includes('test')
  ) {
    return 'flask';
  }
  if (examType === 'ct_scan' || title.includes('ct')) {
    return 'scan-helper';
  }
  if (examType === 'mri' || title.includes('mri')) {
    return 'magnify-scan';
  }
  if (examType === 'ultrasound' || title.includes('ultrasound')) {
    return 'waveform';
  }
  if (
    examType === 'x_ray' ||
    title.includes('x-ray') ||
    title.includes('xray')
  ) {
    return 'radiator';
  }
  if (examType === 'hospitalization' || title.includes('hospital')) {
    return 'hospital-building';
  }
  if (title.includes('blood')) return 'water';
  if (title.includes('cardiac') || title.includes('heart'))
    return 'heart-pulse';
  if (title.includes('eye') || title.includes('vision')) return 'eye';
  if (title.includes('dental') || title.includes('teeth')) return 'tooth';

  // Default icon for exams
  return 'medical-bag';
};

export const hasAdditionalDetails = (event: MedicalEvent): boolean => {
  // Check for text details
  if (event.details && event.details !== 'No details provided') {
    return true;
  }

  // Check for structured event details
  if (event.event_details) {
    if (typeof event.event_details === 'string') {
      return (event.event_details as string).trim().length > 0;
    }
    if (typeof event.event_details === 'object') {
      return Object.keys(event.event_details).length > 0;
    }
  }

  return (
    (!!event.details && event.details !== 'No details provided') ||
    (!!event.event_details &&
      (typeof event.event_details === 'string'
        ? (event.event_details as string).trim().length > 0
        : Object.keys(event.event_details).length > 0))
  );
};
