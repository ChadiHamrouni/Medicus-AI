# medicus_common/models/doctor/doctor_view.py
"""Doctor View Models - Three-tier architecture for optimal performance.

LIGHT View: Identity and lookups only (primary context)
DETAILS View: Profile detail data (on-demand via tool)
ANALYTICS View: Aggregated statistics (admin/KPI only)
"""

from datetime import datetime, time
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field, model_validator

from medicus_common.models.doctor.doctor_core import DoctorStatus
from medicus_common.models.doctor.doctor_records import DoctorContact, DoctorProfileLocation


# Nested models for DoctorDetailsView (strict schema compatible)

class WorkingHourSlot(BaseModel):
    """Single working hour time slot - flattened representation from DoctorProfileWorkingHours.

    Note: The service layer transforms DoctorProfileWorkingHours (with nested time_slots)
    into this flattened structure for easier consumption by scheduling tools.
    """
    day_of_week: str = Field(..., description="Day of week (e.g., 'Monday')")
    from_time: str = Field(..., alias="from", description="Start time in HH:MM format")
    to: str = Field(..., description="End time in HH:MM format")
    is_available: Optional[bool] = Field(True, description="Whether this slot is available")
    model_config = ConfigDict(extra='ignore', populate_by_name=True)


class MedicalProcedureInfo(BaseModel):
    """Medical procedure information from database."""
    procedure_name: str = Field(..., description="Procedure name")
    procedure_price: Optional[float] = Field(None, description="Procedure price")
    model_config = ConfigDict(extra='ignore')


class Certification(BaseModel):
    """Doctor certification information from database."""
    title: str = Field(..., description="Certification title")
    certif_date: Optional[str] = Field(None, description="Certification date")
    issuing_body: Optional[str] = Field(None, description="Issuing organization")
    model_config = ConfigDict(extra='ignore')


class Address(BaseModel):
    """Doctor's primary practice address as stored in doctors.address.

    Two shapes exist: the legacy single-line ``{"clinic_address": ...}`` and the
    structured form written by MedicusUser's practice-info endpoint. Both are
    accepted; ``clinic_address`` is always filled for prompt rendering.
    """
    clinic_address: Optional[str] = Field(None, description="Full clinic address")
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    model_config = ConfigDict(extra='ignore')

    @model_validator(mode="after")
    def _fill_clinic_address(self):
        if not self.clinic_address:
            parts = [self.address_line_1, self.address_line_2, self.city,
                     " ".join(p for p in (self.state, self.zip_code) if p)]
            self.clinic_address = ", ".join(p for p in parts if p) or None
        return self


class DoctorView(BaseModel):
    """Model matching doctors_view LIGHT materialized view schema.

    LIGHT VIEW - Primary Entry Point (Sub-10ms queries)
    Contains ONLY:
    - Core identity: id, user_id, name, prefix, wa_number, avatar_url
    - Static lookups: country_name, region_name, specialty_name, language_name
    - Status metadata: status, network_status, created_at, updated_at

    Profile details → get_doctor_details() → doctors_details_view
    Analytics/stats → get_doctor_analytics() → doctors_analytics_view
    """

    # Core Identity
    id: int
    user_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    prefix: Optional[str] = None
    wa_number: Optional[str] = None
    avatar_url: Optional[str] = None
    medical_licence: Optional[str] = None
    gender: Optional[str] = None

    # Specialty (lookup only)
    specialty_id: Optional[int] = None
    specialty_name: Optional[str] = None
    super_category_id: Optional[int] = None

    # Location (lookup with region)
    country_id: Optional[int] = None
    country_name: Optional[str] = None
    region_id: Optional[int] = None
    region_name: Optional[str] = None

    # Language (lookup only)
    language_id: Optional[int] = None
    language_name: Optional[str] = None

    # Status
    status: Optional[DoctorStatus] = None
    network_status: Optional[str] = None  # 'IN_NETWORK' or 'OUT_OF_NETWORK'

    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    established_since: Optional[datetime] = None

    # Computed/aliased fields from database view
    display_name: Optional[str] = None
    full_name: Optional[str] = None
    specialty: Optional[str] = None
    country: Optional[str] = None
    language: Optional[str] = None
    whatsapp_number: Optional[str] = None

    model_config = ConfigDict(extra='ignore')


class DoctorDetailsView(BaseModel):
    """Model matching doctors_details_view materialized view schema.

    DETAILS VIEW - Profile Detail Data (Fetched on-demand)
    Contains:
    - Medical license and credentials
    - Practice details: procedures, certifications, working hours
    - Location details: address, other_locations
    - Contact information
    - Additional specialties and languages

    Usage: Called by get_doctor_details() tool when profile detail is needed.
    Refresh: Every 5-10 minutes (profile data changes infrequently)
    """

    id: int = Field(..., description="Doctor ID")
    medical_licence: Optional[str] = None
    medical_procedures: Optional[List[MedicalProcedureInfo]] = None
    certifications: Optional[List[Certification]] = None
    other_specialties: Optional[List[int]] = None
    working_hours: Optional[List[WorkingHourSlot]] = None
    contact: Optional[DoctorContact] = None
    address: Optional[Address] = None
    other_locations: Optional[List[DoctorProfileLocation]] = None
    languages: Optional[List[int]] = None

    model_config = ConfigDict(extra='ignore')


class DoctorAnalyticsView(BaseModel):
    """Model matching doctors_analytics_view materialized view schema.

    ANALYTICS VIEW - Performance Metrics (Admin/KPI only)
    Contains:
    - Conversation statistics
    - Patient engagement metrics
    - Performance indicators

    Usage: Called by admin dashboards and analytics endpoints.
    Refresh: Hourly (real-time accuracy not required)
    """

    doctor_id: int = Field(..., description="Doctor ID")
    total_convos: int = 0
    avg_conversation_duration_hours: float = 0.0
    unique_patients_count: int = 0

    model_config = ConfigDict(extra='forbid')


class DoctorAgendaAppointmentEntry(BaseModel):
    """Single appointment entry in doctor agenda."""
    event_type: str = Field(default="appointment", description="Event type identifier")
    id: int = Field(..., description="Appointment ID")
    patient_id: int = Field(..., description="Patient ID")
    patient_name: Optional[str] = Field(None, description="Patient full name")
    start_time: Optional[str] = Field(None, description="Appointment start time (ISO format)")
    end_time: Optional[str] = Field(None, description="Appointment end time (ISO format)")
    visit_type: Optional[str] = Field(None, description="Type of visit")
    visit_details: Optional[str] = Field(None, description="Visit details/reason")
    location: Optional[str] = Field(None, description="Location/healthcare provider name")
    created_at: Optional[str] = Field(None, description="Creation timestamp")

    model_config = ConfigDict(extra='forbid')


class DoctorAgendaProcedureEntry(BaseModel):
    """Single procedure entry in doctor agenda."""
    event_type: str = Field(default="procedure", description="Event type identifier")
    id: int = Field(..., description="Procedure ID")
    patient_id: int = Field(..., description="Patient ID")
    patient_name: Optional[str] = Field(None, description="Patient full name")
    procedure_name: Optional[str] = Field(None, description="Procedure name")
    scheduled_date: Optional[str] = Field(None, description="Scheduled date (ISO format)")
    scheduled_time: Optional[str] = Field(None, description="Scheduled time (ISO format)")
    event_datetime: Optional[str] = Field(None, description="Combined datetime (ISO format)")
    location: Optional[str] = Field(None, description="Location")
    procedure_code: Optional[str] = Field(None, description="Procedure code")
    cpt_code: Optional[str] = Field(None, description="CPT code")
    status: Optional[str] = Field(None, description="Procedure status")
    summary: Optional[str] = Field(None, description="Procedure summary")
    created_at: Optional[str] = Field(None, description="Creation timestamp")

    model_config = ConfigDict(extra='forbid')


class DoctorAgendaDateRange(BaseModel):
    """Date range for agenda query."""
    start: str = Field(..., description="Start datetime (ISO format)")
    end: str = Field(..., description="End datetime (ISO format)")

    model_config = ConfigDict(extra='forbid')


class DoctorAgendaCounts(BaseModel):
    """Counts of agenda items."""
    appointments: int = Field(default=0, description="Number of appointments")
    procedures: int = Field(default=0, description="Number of procedures")

    model_config = ConfigDict(extra='forbid')


class DoctorAgendaResponse(BaseModel):
    """Response model for get_doctor_agenda tool."""
    doctor_id: int = Field(..., description="Doctor ID")
    date_range: DoctorAgendaDateRange = Field(..., description="Query date range")
    appointments: List[DoctorAgendaAppointmentEntry] = Field(default_factory=list, description="List of appointments")
    procedures: List[DoctorAgendaProcedureEntry] = Field(default_factory=list, description="List of procedures")
    total_count: int = Field(0, description="Total number of events")
    counts: DoctorAgendaCounts = Field(default_factory=lambda: DoctorAgendaCounts(), description="Counts by type")
    grouped_by_date: Optional[Dict[str, List[Dict[str, Any]]]] = Field(None, description="Events grouped by date")

    model_config = ConfigDict(extra='forbid')


class DoctorProfileDetailsResponse(BaseModel):
    """Response model for get_doctor_profile_details tool."""
    doctor_id: int = Field(..., description="Doctor ID")
    found: bool = Field(True, description="Whether doctor was found")
    message: Optional[str] = Field(None, description="Message if not found")
    medical_licence: Optional[str] = None
    medical_procedures: Optional[List[MedicalProcedureInfo]] = None
    certifications: Optional[List[Certification]] = None
    other_specialties: Optional[List[int]] = None
    working_hours: Optional[List[WorkingHourSlot]] = None
    contact: Optional[DoctorContact] = None
    address: Optional[Address] = None
    other_locations: Optional[List[DoctorProfileLocation]] = None
    languages: Optional[List[int]] = None

    model_config = ConfigDict(extra='forbid')


class DoctorPerformanceMetricsResponse(BaseModel):
    """Response model for get_doctor_performance_metrics tool."""
    doctor_id: int = Field(..., description="Doctor ID")
    found: bool = Field(True, description="Whether doctor analytics were found")
    message: Optional[str] = Field(None, description="Message if not found")
    total_convos: int = Field(0, description="Total conversations")
    avg_conversation_duration_hours: float = Field(0.0, description="Average conversation duration")
    unique_patients_count: int = Field(0, description="Unique patients count")

    model_config = ConfigDict(extra='forbid')


class DoctorDiscoveryView(BaseModel):
    """Model matching doctors_discovery_view materialized view schema.

    DISCOVERY VIEW - Lightweight Search/Discovery (Sub-50ms queries)
    Contains ONLY fields needed for doctor search results:
    - Core identity: id, name, prefix, gender, avatar_url
    - Specialty info: specialty_id, specialty_name, super_category_id
    - Location: country_id, country_name
    - Language: language_id, language_name
    - Contact/Address: for out-of-network display
    - Network status: in_network flag

    Usage: Used by /doctor/search endpoint for fast discovery queries.
    """

    id: int = Field(..., description="Doctor ID")
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    prefix: Optional[str] = None
    gender: Optional[str] = None

    # Specialty
    specialty_id: Optional[int] = None
    specialty_name: Optional[str] = None
    super_category_id: Optional[int] = None

    # Location
    country_id: Optional[int] = None
    country_name: Optional[str] = None

    # Language
    language_id: Optional[int] = None
    language_name: Optional[str] = None

    # Contact and address (JSON fields)
    contact: Optional[Dict[str, Any]] = None
    address: Optional[Dict[str, Any]] = None

    # Profile
    avatar_url: Optional[str] = None

    # Status
    status: Optional[str] = None
    in_network: bool = False

    model_config = ConfigDict(extra='ignore')


class DoctorDiscoveryCard(BaseModel):
    """Lightweight doctor card returned from search endpoint.

    This is the response model for individual doctors in search results,
    with flattened contact/address fields for easy UI consumption.
    """

    id: int = Field(..., description="Doctor ID")
    name: str = Field(..., description="Full display name")
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    prefix: Optional[str] = None
    gender: Optional[str] = None

    # Specialty
    specialty_id: Optional[int] = None
    specialty_name: Optional[str] = None
    super_category_id: Optional[int] = None

    # Location
    country_id: Optional[int] = None
    country_name: Optional[str] = None

    # Language
    language_id: Optional[int] = None
    language_name: Optional[str] = None

    # Network status
    in_network: bool = False

    # Profile
    avatar_url: Optional[str] = None

    # Flattened contact info
    email: Optional[str] = None
    phone: Optional[str] = None

    # Flattened address info
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    
    user_id: Optional[int] = None

    model_config = ConfigDict(extra='ignore')


class DoctorOONView(BaseModel):
    """Model matching doctors_oon_view materialized view schema.

    OUT OF NETWORK VIEW - External Doctor Discovery
    Contains fields for doctors not in the network:
    - Core identity: id, name, prefix, wa_number
    - Specialty: specialty_id, specialty_name, super_category_id
    - Location: country_id, country_name
    - Language: language_id, language_name
    - Contact/Address: JSON fields from external data source
    - Data source: origin of the data
    - Status: doctor status

    Usage: Used when patient searches with "include out of network" enabled.
    """

    id: int = Field(..., description="Doctor ID from doctors_oon table")
    prefix: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    wa_number: Optional[str] = None

    # Specialty
    specialty_id: Optional[int] = None
    specialty_name: Optional[str] = None
    super_category_id: Optional[int] = None

    # Location
    country_id: Optional[int] = None
    country_name: Optional[str] = None

    # Language
    language_id: Optional[int] = None
    language_name: Optional[str] = None

    # Contact and address (JSON fields from external source)
    contact: Optional[Dict[str, Any]] = None
    address: Optional[Dict[str, Any]] = None

    # Metadata
    data_source: Optional[str] = None
    status: Optional[str] = None

    model_config = ConfigDict(extra='ignore')


class DoctorSearchResponse(BaseModel):
    """Response model for doctor search endpoint."""

    doctors: List[DoctorDiscoveryCard] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 20
    total_pages: int = 0
    in_network_count: int = 0
    out_of_network_count: int = 0

    model_config = ConfigDict(extra='ignore')

