"""Medical models for the Medicus platform."""

from medicus_common.models.medical.exams import (
    MedicalExamEntry,
    ExamCounts,
    ExamsResponse,
    MedicalExamRecord,
    MedicalExamOrderInput,
    MedicalExamInput,
    MedicalExamOrderSupersedeRecord,
    ExaminationsSimpleResponse,
    MedicalExamResultResponse,
    project_exam_status,
    build_exam_entry,
    group_exams_by_status,
    calculate_exam_counts,
    # Legacy compatibility models
    ExamResult,
    MedicalExam,
    MedicalExamOrder,
    ExamType,
)
from medicus_common.models.medical.notes import (
    # SOAP structure models
    Subjective,
    Objective,
    Assessment,
    Plan,
    NoteDetail,
    # External models (agent/API consumption)
    MedicalNoteEntry,
    MedicalNotesResponse,
    # Internal models
    MedicalNoteRecord,
    MedicalNoteInput,
    MedicalNoteSupersedeRecord,
    MedicalNoteInvalidate,
    build_note_entry,
    sort_notes,
)
from medicus_common.models.medical.medications import (
    MedicalPrescription,
    MedicalPrescriptionRecord,
    Medication,
)
from medicus_common.models.medical.procedures import (
    MedicalProcedureEntry,
    MedicalProceduresResponse,
    MedicalProcedureInput,
    MedicalProcedureSupersedeRecord,
    MedicalProcedureDetailsResponse,
    ProcedureDetailEventEntry,
    MedicalProcedureResultResponse,
    calculate_procedure_counts,
)
from medicus_common.models.medical.visits import (
    TimeSlot,
    MedicalVisitEntry,
    MedicalVisitCounts,
    MedicalVisitsResponse,
    MedicalVisitRecord,
    MedicalVisitsInput,
    MedicalVisitsSupersedRecord,
    project_visit_status,
    build_visit_entry,
    group_visits_by_status,
    calculate_visit_counts,
    sort_upcoming_visits,
    sort_ongoing_visits,
    sort_past_visits,
    # Legacy compatibility
    MedicalVisit,
)
from medicus_common.models.medical.vitals import (
    MedicalVitalEntry,
    MedicalVitalsResponse,
    MedicalVitalsCounts,
    MedicalVitalsInput,
    MedicalVitalsSimpleResponse,
    MedicalVitalsResultResponse,
    VitalValue
)

# Backward compatibility aliases
MedicalData = MedicalVitalEntry  # Old name for MedicalEntry
MedicalProfile = MedicalVitalEntry
MedicalProfileResponse = MedicalVitalsResponse
from medicus_common.models.medical.conditions import (
    MedicalConditionBase,
    MedicalConditionResponse,
    MedicalConditionsListResponse,
    MedicalConditionFilter,
    build_condition_entry,
    calculate_condition_counts,
)

__all__ = [
    # exam
    "MedicalExamEntry",
    "ExamCounts",
    "ExamsResponse",
    "MedicalExamRecord",
    "MedicalExamOrderInput",
    "MedicalExamInput",
    "MedicalExamOrderSupersedeRecord",
    "ExaminationsSimpleResponse",
    "MedicalExamResultResponse",
    "project_exam_status",
    "build_exam_entry",
    "group_exams_by_status",
    "calculate_exam_counts",
    # exam (legacy compatibility)
    "ExamResult",
    "MedicalExam",
    "MedicalExamOrder",
    "ExamType",
    # note (SOAP structure)
    "Subjective",
    "Objective",
    "Assessment",
    "Plan",
    "NoteDetail",
    # note (external models)
    "MedicalNoteEntry",
    "MedicalNotesResponse",
    # note (internal models)
    "MedicalNoteRecord",
    "MedicalNoteInput",
    "MedicalNoteSupersedeRecord",
    "MedicalNoteInvalidate",
    "build_note_entry",
    "sort_notes",
    # prescription
    "MedicalPrescription",
    "MedicalPrescriptionRecord",
    "Medication",
    # procedures
    "MedicalProcedureEntry",
    "MedicalProceduresResponse",
    "MedicalProcedureInput",
    "MedicalProcedureSupersedeRecord",
    "MedicalProcedureDetailsResponse",
    "ProcedureDetailEventEntry",
    "MedicalProcedureResultResponse",
    "calculate_procedure_counts",
    # visit
    "TimeSlot",
    "MedicalVisitEntry",
    "MedicalVisitCounts",
    "MedicalVisitsResponse",
    "MedicalVisitRecord",
    "MedicalVisitsInput",
    "MedicalVisitsSupersedRecord",
    "project_visit_status",
    "build_visit_entry",
    "group_visits_by_status",
    "calculate_visit_counts",
    "sort_upcoming_visits",
    "sort_ongoing_visits",
    "sort_past_visits",
    # visit (legacy compatibility)
    "MedicalVisit",
    # vitals
    "MedicalVitalEntry",
    "MedicalVitalsResponse",
    "MedicalVitalsCounts",
    "MedicalVitalsInput",
    "MedicalVitalsSimpleResponse",
    "MedicalVitalsResultResponse",
    "VitalValue",
    "MedicalData",
    "MedicalProfile",
    "MedicalProfileResponse",
    # medical_conditions
    "MedicalConditionBase",
    "MedicalConditionResponse",
    "MedicalConditionsListResponse",
    "MedicalConditionFilter",
    "build_condition_entry",
    "calculate_condition_counts",
]