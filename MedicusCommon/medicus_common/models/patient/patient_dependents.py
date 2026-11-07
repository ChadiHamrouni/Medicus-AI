# =============================================================================
# medicus_common/models/patient_dependents.py
"""Dependent patient models for the simplified dependent system."""

from datetime import date, datetime
from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, validator, EmailStr, ConfigDict
from medicus_common.models.common import EmergencyContact, Gender
from .patient_records import PatientMedicalData


class RelationshipType(str, Enum):
    """Relationship types for dependents."""
    MAIN = "main"
    SPOUSE = "spouse"
    CHILD = "child"
    PARENT = "parent"
    SIBLING = "sibling"
    GRANDPARENT = "grandparent"
    GRANDCHILD = "grandchild"
    GUARDIAN = "guardian"
    OTHER = "other"


# Request Models
class CreateDependentPatientRequest(BaseModel):
    """Request model for creating a dependent patient."""
    first_name: str = Field(..., min_length=1, max_length=255, description="First name of the dependent")
    last_name: str = Field(..., min_length=1, max_length=255, description="Last name of the dependent")
    relationship: RelationshipType = Field(..., description="Relationship to the main user")
    dob: date = Field(..., description="Date of birth")
    gender: Optional[Gender] = Field(None, description="Gender (optional)")
    
    # Emergency contact (required for dependents)
    emergency_contact: Optional[List[EmergencyContact]] = Field(
        default_factory=list,
        description="List of emergency contact information"
    )    
    address: Optional[Dict[str, str]] = Field(None, description="Address information")
    contact: Optional[Dict[str, str]] = Field(None, description="Contact information")
    
    # Optional contact info for adult dependents
    wa_number: Optional[str] = Field(None, min_length=10, max_length=20, description="WhatsApp number")
    
    # Additional metadata
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional information")

    @validator('dob')
    def validate_dob(cls, v):
        """Validate that DOB is not in the future and is reasonable."""
        if v > date.today():
            raise ValueError('Date of birth cannot be in the future')
        
        # Check if age is reasonable (not older than 120 years)
        age = (date.today() - v).days // 365
        if age > 120:
            raise ValueError('Age cannot be more than 120 years')
        
        return v

    @validator('relationship')
    def validate_relationship_not_main(cls, v):
        """Ensure dependents cannot have 'main' relationship."""
        if v == RelationshipType.MAIN:
            raise ValueError('Dependents cannot have "main" relationship')
        return v


class UpdateDependentPatientRequest(BaseModel):
    """Request model for updating a dependent patient."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=255)
    last_name: Optional[str] = Field(None, min_length=1, max_length=255)
    relationship: Optional[RelationshipType] = None
    dob: Optional[date] = None
    gender: Optional[Gender] = Field(None)
    
    # Emergency contact update
    emergency_contact: Optional[List[EmergencyContact]] = Field(
        default_factory=list,
        description="List of emergency contact information"
    )
    
    address: Optional[Dict[str, str]] = Field(None, description="Address information")
    contact: Optional[Dict[str, str]] = Field(None, description="Contact information")
    
    # Contact info
    wa_number: Optional[str] = Field(None, min_length=10, max_length=20)
    
    # Metadata
    metadata: Optional[Dict[str, Any]] = None
    
    # Status
    status: Optional[str] = Field(None, pattern="^(ACTIVE|INACTIVE|DELETED)$", description="Patient status")

    @validator('dob')
    def validate_dob(cls, v):
        """Validate that DOB is not in the future."""
        if v and v > date.today():
            raise ValueError('Date of birth cannot be in the future')
        return v

    @validator('relationship')
    def validate_relationship_not_main(cls, v):
        """Ensure dependents cannot have 'main' relationship."""
        if v == RelationshipType.MAIN:
            raise ValueError('Dependents cannot have "main" relationship')
        return v


# Response Models
class DependentPatientResponse(BaseModel):
    """Response model for dependent patient information."""
    id: int
    user_id: int  # Primary user ID
    first_name: str
    last_name: str
    full_name: str  # Computed field
    relationship: RelationshipType
    dob: date
    age: int  # Computed field
    gender: Optional[Gender] = None
    
    # Contact information
    wa_number: Optional[str]
    emergency_contact: Optional[List[EmergencyContact]] = Field(
        default_factory=list,
        description="List of emergency contact information"
    )
    
    address: Optional[Dict[str, str]] = Field(None, description="Address information")
    contact: Optional[Dict[str, str]] = Field(None, description="Contact information")
    medical_prescriptions: Optional[List[Dict[str, Any]]]  # List of prescriptions
    past_medical_visits: Optional[List[Dict[str, Any]]] = Field(None, description="Past medical visits from materialized view")
    medical_data: Optional[PatientMedicalData] = Field(None, description="Medical data JSON")

    # Status and metadata
    status: str
    metadata: Dict[str, Any]
    
    # Timestamps
    created_at: datetime
    updated_at: datetime

    @validator('full_name', pre=True, always=True)
    def compute_full_name(cls, v, values):
        """Compute full name from first and last name."""
        first_name = values.get('first_name', '')
        last_name = values.get('last_name', '')
        return f"{first_name} {last_name}".strip()

    @validator('age', pre=True, always=True)
    def calculate_age(cls, v, values):
        """Calculate age from date of birth."""
        if 'dob' in values and values['dob']:
            today = date.today()
            dob = values['dob']
            return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return 0


class DependentPatientListResponse(BaseModel):
    """Response model for listing dependent patients."""
    dependents: List[DependentPatientResponse]
    total: int
    main_patient: Optional[DependentPatientResponse] = None  # Include main patient for context
    summary: Dict[str, Any]  # Summary statistics

    @validator('summary', pre=True, always=True)
    def compute_summary(cls, v, values):
        """Compute summary statistics."""
        if 'dependents' in values:
            dependents = values['dependents']
            total = len(dependents)
            
            # Count by relationship
            relationship_counts = {}
            age_groups = {'minor': 0, 'adult': 0}  # Under 18 vs 18+
            
            for dependent in dependents:
                # Count relationships
                rel = dependent.relationship.value if hasattr(dependent.relationship, 'value') else str(dependent.relationship)
                relationship_counts[rel] = relationship_counts.get(rel, 0) + 1
                
                # Count age groups
                age = getattr(dependent, 'age', 0)
                if age < 18:
                    age_groups['minor'] += 1
                else:
                    age_groups['adult'] += 1
            
            return {
                'total_dependents': total,
                'relationship_breakdown': relationship_counts,
                'age_groups': age_groups,
                'has_minors': age_groups['minor'] > 0,
                'has_adults': age_groups['adult'] > 0
            }
        
        return {
            'total_dependents': 0,
            'relationship_breakdown': {},
            'age_groups': {'minor': 0, 'adult': 0},
            'has_minors': False,
            'has_adults': False
        }


# Context Switching Models
class SwitchContextRequest(BaseModel):
    """Request model for switching to dependent context."""
    patient_id: int = Field(..., description="ID of the patient to switch context to")


class SwitchContextResponse(BaseModel):
    """Response model for context switching."""
    active_patient_id: int
    active_patient: DependentPatientResponse
    is_dependent_context: bool
    available_patients: List[DependentPatientResponse]


# Validation Models
class DependentValidationError(BaseModel):
    """Model for dependent validation errors."""
    field: str
    message: str
    code: str


class DependentOperationResponse(BaseModel):
    """Generic response model for dependent operations."""
    success: bool
    message: str
    data: Optional[DependentPatientResponse] = None
    errors: Optional[List[DependentValidationError]] = None