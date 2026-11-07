import { useEffect } from 'react';
import { useDependents } from '@/contexts/DependentsContext';
import { usePatient } from '@/contexts/PatientContext';
import {
  usePatientStore,
  type MedicalHistoryData,
} from '@/stores/patientStore';

export const useMedicalHistoryData = () => {
  const { selectedDependent, isLoading: isDependentsLoading } = useDependents();
  const { mainPatient, dependents } = usePatient();

  // Get data and actions from Zustand store
  const {
    getMedicalHistoryData,
    getMedicationsData,
    loadMedicalHistoryDataOnly,
    updateMedicalHistoryDataOptimistic,
    isLoading: isLoadingStore,
    error,
  } = usePatientStore();

  // Generate patient ID for store operations
  const patientId =
    selectedDependent === 'main' ? 'main' : String(selectedDependent);

  const currentPatientData =
    selectedDependent === 'main'
      ? mainPatient
      : dependents.find(d => d.id === selectedDependent);

  // Get visits from medical history
  const cachedMedicalHistoryData = getMedicalHistoryData(patientId);
  const originalMedicalHistoryData: MedicalHistoryData = {
    pastVisits: cachedMedicalHistoryData?.pastVisits || [],
    totalVisitsCount: cachedMedicalHistoryData?.totalVisitsCount || 0,
    lastUpdated: cachedMedicalHistoryData?.lastUpdated || null,
  };

  // Get prescriptions from medications data
  const cachedMedicationsData = getMedicationsData(patientId);
  const prescriptions = cachedMedicationsData?.currentMedications || [];

  // Get completed exams from patient data (NOT exam orders)
  const patientData = usePatientStore.getState().getPatientData(patientId);
  const completedExams = (patientData?.rawData?.medical_examinations ||
    []) as Array<{
    id: number;
    patient_id: number;
    doctor_id: number;
    exam_type: string;
    exam_date?: string;
    exam_results?: string;
    exam_summary?: string;
    healthcare_provider_name?: string;
    created_at: string;
  }>;

  // Transform prescriptions into visit-like format so they can be filtered with visits
  const prescriptionVisits = prescriptions.map(prescription => ({
    visit_id: prescription.prescription_id,
    date: prescription.date_prescribed,
    doctor_id: prescription.doctor_id || undefined, // Use real doctor_id from prescription, not hardcoded null
    created_by: prescription.created_by || undefined, // Use real created_by from prescription, not hardcoded 0
    visit_type: 'Prescription',
    visit_details: JSON.stringify({
      medications: [
        {
          name: prescription.name,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          duration: prescription.duration,
        },
      ],
      prescribed_by: prescription.prescribed_by,
      instructions:
        prescription.instructions || prescription.special_instructions,
    }),
    notes: prescription.instructions || prescription.special_instructions,
  }));

  // Transform completed exams into visit-like format
  const completedExamVisits = completedExams.map(exam => ({
    visit_id: `exam-${exam.id}`,
    date: exam.exam_date || exam.created_at,
    doctor_id: exam.doctor_id,
    created_by: exam.created_by || undefined, // Use real created_by from exam, not hardcoded 0
    visit_type: 'Exam',
    visit_details: JSON.stringify({
      exam_type: exam.exam_type,
      exam_summary: exam.exam_summary,
      exam_results: exam.exam_results,
      healthcare_provider: exam.healthcare_provider_name,
      status: 'Completed',
      is_order: false,
    }),
    notes: exam.exam_summary || 'Exam completed',
  }));

  // Combine visits, prescriptions, and completed exams
  const allVisits = [
    ...originalMedicalHistoryData.pastVisits,
    ...prescriptionVisits,
    ...completedExamVisits,
  ];
  const medicalHistoryData: MedicalHistoryData = {
    pastVisits: allVisits,
    totalVisitsCount: allVisits.length,
    lastUpdated: originalMedicalHistoryData.lastUpdated,
  };

  const hasNoData =
    !cachedMedicalHistoryData ||
    (medicalHistoryData.pastVisits.length === 0 &&
      !medicalHistoryData.lastUpdated);

  // Determine if we're in dependent context (not 'main')
  const isDependentContext = selectedDependent !== 'main';

  // Load medical history data when selected dependent changes
  useEffect(() => {
    if (selectedDependent !== null && currentPatientData) {
      loadMedicalHistoryDataOnly(patientId, currentPatientData);
    }
  }, [
    selectedDependent,
    patientId,
    currentPatientData?.id,
    loadMedicalHistoryDataOnly,
  ]);

  // Create a setter function that updates the store optimistically
  const setMedicalHistoryData = (
    updatesOrFn:
      | Partial<MedicalHistoryData>
      | ((_prev: MedicalHistoryData) => MedicalHistoryData)
  ) => {
    let updates: Partial<MedicalHistoryData>;

    if (typeof updatesOrFn === 'function') {
      updates = updatesOrFn(medicalHistoryData);
    } else {
      updates = updatesOrFn;
    }

    updateMedicalHistoryDataOptimistic(patientId, updates);
  };

  // Helper functions to get visits by type
  const getVisitsByType = (visitType: string) => {
    return medicalHistoryData.pastVisits.filter(
      visit => visit.visit_type === visitType
    );
  };

  // Helper function to get visits by doctor
  const getVisitsByDoctor = (doctorId: number) => {
    return medicalHistoryData.pastVisits.filter(
      visit => visit.doctor_id === doctorId
    );
  };

  // Helper function to get recent visits
  const getRecentVisits = (count: number = 5) => {
    return [...medicalHistoryData.pastVisits]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, count);
  };

  // Helper function to filter visits by category with flexible matching
  const getVisitsByCategory = (category: string) => {
    return medicalHistoryData.pastVisits.filter(visit => {
      const visitType = visit.visit_type.toLowerCase();

      switch (category.toLowerCase()) {
        case 'consultation':
          return (
            visitType.includes('consultation') || visitType.includes('consult')
          );
        case 'procedure':
          return (
            visitType.includes('procedure') ||
            visitType.includes('surgery') ||
            visitType.includes('operation')
          );
        case 'exam':
          return (
            visitType.includes('exam') ||
            visitType.includes('examination') ||
            visitType.includes('test')
          );
        case 'prescription':
          return (
            visitType.includes('prescription') ||
            visitType.includes('medication') ||
            visitType.includes('med')
          );
        case 'follow-up':
          return visitType.includes('follow') || visitType.includes('followup');
        case 'check-up':
          return (
            visitType.includes('check') ||
            visitType.includes('checkup') ||
            visitType.includes('general') ||
            visitType.includes('routine')
          );
        case 'emergency':
          return (
            visitType.includes('emergency') ||
            visitType.includes('urgent') ||
            visitType.includes('er')
          );
        default:
          return visitType === category.toLowerCase();
      }
    });
  };

  // Computed values
  const hasVisits = medicalHistoryData.totalVisitsCount > 0;
  const isEmpty = medicalHistoryData.totalVisitsCount === 0 && !isLoadingStore;
  const recentVisits = getRecentVisits();
  const uniqueVisitTypes = [
    ...new Set(medicalHistoryData.pastVisits.map(visit => visit.visit_type)),
  ];
  const uniqueDoctorIds = [
    ...new Set(medicalHistoryData.pastVisits.map(visit => visit.doctor_id)),
  ];

  return {
    medicalHistoryData,
    setMedicalHistoryData,
    isLoading:
      isLoadingStore ||
      isDependentsLoading ||
      (hasNoData && selectedDependent !== null),
    isDependentContext,
    currentPatient: null,
    selectedDependent,
    error,

    // Helper functions
    getVisitsByType,
    getVisitsByDoctor,
    getRecentVisits,
    getVisitsByCategory,

    // Computed values
    hasVisits,
    isEmpty,
    recentVisits,
    uniqueVisitTypes,
    uniqueDoctorIds,

    // Patient context info
    currentPatientId: selectedDependent === 'main' ? 'main' : selectedDependent,
    currentPatientName: isDependentContext
      ? `Dependent ${selectedDependent}`
      : 'Main Patient', // This could be enhanced with actual names
  };
};
