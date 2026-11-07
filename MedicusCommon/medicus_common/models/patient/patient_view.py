# medicus_common/models/patient/patient_view.py
"""Patient View Models - Three-tier architecture for optimal performance.

LIGHT View: Identity and lookups only (primary context)
DETAILS View: Profile detail data (on-demand via tool)
ANALYTICS View: Engagement and health metrics (admin/tracking only)
"""

from datetime import datetime, date
from typing import Optional, Dict, Any
from pydantic import BaseModel

from medicus_common.models.common import Gender
from medicus_common.models.patient.patient_core import PatientStatus


class PatientView(BaseModel):
    """Model matching patients_view LIGHT materialized view schema.

    LIGHT VIEW - Primary Entry Point (Sub-10ms queries)
    Contains ONLY:
    - Core identity: id, user_id, name, dob, gender, relationship, wa_number
    - Static lookups: country_name, language_name, current_age
    - Status: status, timestamps

    Profile details → get_patient_profile_details() → patients_details_view
    Analytics/metrics → get_patient_engagement_metrics() → patients_analytics_view
    Clinical data → get_medical_vitals/conditions/medications/etc.
    """

    # Core Identity
    id: int
    user_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[Gender] = None
    relationship: Optional[str] = None
    wa_number: Optional[str] = None
    status: Optional[PatientStatus] = None

    # Static Lookups
    country_name: Optional[str] = None
    language_name: Optional[str] = None
    current_age: Optional[int] = None

    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {'extra': 'allow'}


class PatientDetailsView(BaseModel):
    """Model matching patients_details_view materialized view schema.

    DETAILS VIEW - Profile Detail Data (Fetched on-demand)
    Contains:
    - Extended insurance details (plans, copay, deductibles)
    - Family medical history metadata
    - Care team preferences (preferred providers, facilities)
    - Communication preferences (language, accessibility)
    - Advanced directives and consent metadata
    - Dependent relationships

    Usage: Called by get_patient_profile_details() tool when profile detail is needed.
    Refresh: Every 5-10 minutes (profile data changes infrequently)
    """

    id: int
    insurance_details: Optional[Dict[str, Any]] = None
    family_history_metadata: Optional[Dict[str, Any]] = None
    care_preferences: Optional[Dict[str, Any]] = None
    communication_preferences: Optional[Dict[str, Any]] = None
    advance_directives: Optional[Dict[str, Any]] = None
    dependent_info: Optional[Dict[str, Any]] = None

    model_config = {'extra': 'allow'}


class PatientAnalyticsView(BaseModel):
    """Model matching patients_analytics_view materialized view schema.

    ANALYTICS VIEW - Engagement & Health Metrics (Admin/Tracking only)
    Contains:
    - Engagement metrics (visits, conversations)
    - Health tracking (vitals frequency, consistency)
    - Clinical load (active conditions, medications, pending exams)
    - Compliance indicators (if tracked)

    Usage: Called by population health dashboards and engagement tracking.
    Refresh: Hourly (real-time accuracy not required)
    """

    patient_id: int
    total_visits: int = 0
    last_visit_date: Optional[datetime] = None
    avg_visits_per_month: float = 0.0
    vitals_recorded_count: int = 0
    last_vital_date: Optional[datetime] = None
    tracking_consistency_score: float = 0.0
    active_conditions_count: int = 0
    active_medications_count: int = 0
    pending_exams_count: int = 0
    total_conversations: int = 0
    last_conversation_date: Optional[datetime] = None

    model_config = {'extra': 'allow'}


class PatientProfileDetailsResponse(BaseModel):
    """Response model for get_patient_profile_details tool."""
    patient_id: int
    found: bool = True
    message: Optional[str] = None
    insurance_details: Optional[Dict[str, Any]] = None
    family_history_metadata: Optional[Dict[str, Any]] = None
    care_preferences: Optional[Dict[str, Any]] = None
    communication_preferences: Optional[Dict[str, Any]] = None
    advance_directives: Optional[Dict[str, Any]] = None
    dependent_info: Optional[Dict[str, Any]] = None

    model_config = {'extra': 'allow'}


class PatientEngagementMetricsResponse(BaseModel):
    """Response model for get_patient_engagement_metrics tool."""
    patient_id: int
    found: bool = True
    message: Optional[str] = None
    total_visits: int = 0
    last_visit_date: Optional[datetime] = None
    avg_visits_per_month: float = 0.0
    vitals_recorded_count: int = 0
    last_vital_date: Optional[datetime] = None
    tracking_consistency_score: float = 0.0
    active_conditions_count: int = 0
    active_medications_count: int = 0
    pending_exams_count: int = 0
    total_conversations: int = 0
    last_conversation_date: Optional[datetime] = None

    model_config = {'extra': 'allow'}
