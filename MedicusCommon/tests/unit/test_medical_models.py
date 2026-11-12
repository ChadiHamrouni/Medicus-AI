"""Input models the assistant's tools receive from the LLM.

Small models send these in many shapes; the models accept the common ones and normalise
them, so a tool call is not rejected (and the user told something was saved when it was not).
"""

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from medicus_common.models.common import MedicalProcedureDetails
from medicus_common.models.convo.medibrief import MediBrief
from medicus_common.models.medical.exams import MedicalExamOrder
from medicus_common.models.medical.medications import MedicalPrescription, Medication
from medicus_common.models.medical.visits import MedicalVisit
from medicus_common.models.medical.vitals import MedicalVitalsInput


# --- vitals -------------------------------------------------------------------------------

def test_vitals_list_form_is_accepted():
    v = MedicalVitalsInput(vital_values=[{"vital_text": "blood pressure", "vital_value": "150/95"}])
    assert v.vital_values[0].vital_value == "150/95"


def test_vitals_mapping_form_is_converted_to_the_list_form():
    v = MedicalVitalsInput(vital_values={"blood pressure": "150/95", "heart rate": 78})
    assert [(x.vital_text, x.vital_value) for x in v.vital_values] == [("blood pressure", "150/95"), ("heart rate", "78")]


def test_single_vital_object_is_wrapped_in_a_list():
    v = MedicalVitalsInput(vital_values={"vital_text": "pulse", "vital_value": 72})
    assert len(v.vital_values) == 1 and v.vital_values[0].vital_value == "72"


def test_vitals_reject_unknown_fields():
    with pytest.raises(ValidationError):
        MedicalVitalsInput(vital_values=[], recorded_by="me")


# --- prescriptions ------------------------------------------------------------------------

def test_medication_accepts_name_and_dose_aliases_and_numeric_duration():
    m = Medication.model_validate({"name": "Amlodipine", "dose": "10 mg", "frequency": "once daily", "duration": 90})
    assert (m.medication_name, m.dosage, m.duration) == ("Amlodipine", "10 mg", "90 days")


def test_prescription_needs_only_ids_and_medications():
    p = MedicalPrescription.model_validate({
        "patient_id": 33, "doctor_id": 3,
        "medications": [{"medication_name": "Amlodipine", "dosage": "10 mg"}],
    })
    assert p.patient_name is None and p.date_prescribed is None


def test_prescription_still_requires_a_dosage():
    with pytest.raises(ValidationError):
        MedicalPrescription.model_validate({"patient_id": 1, "doctor_id": 1, "medications": [{"name": "Amlodipine"}]})


# --- doctor profile -----------------------------------------------------------------------

@pytest.mark.parametrize("price, stored", [(60.0, "60"), (42.5, "42.5"), ("60", "60")])
def test_procedure_price_accepts_the_number_the_profile_returns(price, stored):
    # GET /doctor/profile returns prices as numbers; writing the profile back must work.
    assert MedicalProcedureDetails(procedure_name="Consultation", procedure_price=price).procedure_price == stored


# --- bookings -----------------------------------------------------------------------------

def test_booking_needs_only_the_start_time():
    v = MedicalVisit(doctor_id=3, patient_id=33, start_time=datetime(2026, 11, 12, 10, tzinfo=timezone.utc))
    assert v.end_time is None            # the booking tool adds the default length
    assert v.visit_type == "consultation"


def test_booking_rejects_a_missing_start_time():
    with pytest.raises(ValidationError):
        MedicalVisit(doctor_id=3, patient_id=33)


# --- exams and briefs ---------------------------------------------------------------------

def test_exam_order_provider_is_optional_and_documented_as_never_invented():
    order = MedicalExamOrder(patient_id=1, doctor_id=1, ordered_exam="Lipid panel", exam_type="lab_test")
    assert order.healthcare_provider_name is None
    description = MedicalExamOrder.model_fields["healthcare_provider_name"].description
    assert "Never invent" in description


def test_medibrief_requires_a_summary():
    assert MediBrief(summary="Asked about ibuprofen").key_symptoms is None
    with pytest.raises(ValidationError):
        MediBrief()
