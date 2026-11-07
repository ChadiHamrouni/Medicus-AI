"""Patient service for MedicusUser.

This service handles patient management operations including:
- Patient lookup and search functionality
- Insurance coverage management
- Patient profile operations

Migrated and adapted from MedicusRegistry to consolidate patient management
functionality within MedicusUser service.
"""

from typing import Optional, List, Dict, Any, Union
from datetime import date

from medicus_common.models.patient import (
    PatientResponse,
    PatientListResponse,
    InsuranceCoverage,
    PatientStatus,
    PatientProfileUpdateRequest
)
from medicus_common.models.common import Gender
from medicus_common.core.database import db_manager

# Import extracted logic
from .patient_mapper import row_to_patient_response
from .patient_creator import create_patient_impl
from .patient_updater import (
    update_patient_impl,
    update_patient_user_id_impl,
    delete_patient_impl
)
from .patient_insurance import add_insurance_coverage_impl, get_patient_insurance_impl
from .patient_search import search_patients_impl, get_dropdown_options_impl, get_patient_count_impl
from .patient_retrieval import (
    get_connected_patient_impl,
    get_patient_by_phone_impl,
    get_patient_by_id_impl,
    get_patient_by_user_id_impl
)
from .patient_utils import map_gender_to_db


class PatientService:
    """Service class for patient management operations."""
    
    def __init__(self):
        """Initialize the patient service."""
        self.db_manager = db_manager
    
    @staticmethod
    def _map_gender_to_db(gender: Gender) -> str:
        """Map Gender enum to database gender_type enum values.

        Deprecated: Use map_gender_to_db from patient_utils instead.
        """
        return map_gender_to_db(gender)

    @staticmethod
    async def get_connected_patient(user_id: int) -> Optional[Dict[str, Any]]:
        """Delegate to extracted retrieval function."""
        return await get_connected_patient_impl(db_manager, user_id)
        
    async def get_patient_by_phone(self, phone_number: str) -> Optional[PatientResponse]:
        """Delegate to extracted retrieval function."""
        return await get_patient_by_phone_impl(
            self.db_manager,
            self._row_to_patient_response,
            phone_number
        )
            
    async def get_patient_by_id(self, patient_id: int) -> Optional[PatientResponse]:
        """Delegate to extracted retrieval function."""
        return await get_patient_by_id_impl(
            self.db_manager,
            self._row_to_patient_response,
            patient_id
        )

    async def get_patient_by_user_id(self, user_id: int) -> Optional[PatientResponse]:
        """Delegate to extracted retrieval function."""
        return await get_patient_by_user_id_impl(
            self.db_manager,
            self._row_to_patient_response,
            user_id
        )
            
    async def search_patients(
        self,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        status: Optional[PatientStatus] = None,
        limit: int = 50,
        offset: int = 0
    ) -> PatientListResponse:
        """Delegate to extracted search function."""
        return await search_patients_impl(
            self.db_manager,
            self._row_to_patient_response,
            first_name,
            last_name,
            status,
            limit,
            offset
        )
            
    async def add_insurance_coverage(
        self,
        patient_id: int,
        insurance: InsuranceCoverage
    ) -> PatientResponse:
        """Delegate to extracted insurance function."""
        return await add_insurance_coverage_impl(self.db_manager, self, patient_id, insurance)
            
    async def get_patient_insurance(self, patient_id: int) -> Optional[InsuranceCoverage]:
        """Delegate to extracted insurance function."""
        return await get_patient_insurance_impl(self.db_manager, patient_id)
            
    async def _row_to_patient_response(self, row) -> PatientResponse:
        """Delegate to extracted mapper function."""
        return await row_to_patient_response(self.db_manager, row)

    async def get_dropdown_options(self) -> List[Dict[str, Any]]:
        """Delegate to extracted search function."""
        return await get_dropdown_options_impl(self.db_manager)
    
    async def get_patient_count(self) -> int:
        """Delegate to extracted search function."""
        return await get_patient_count_impl(self.db_manager)
    
    async def create_patient(
        self,
        wa_number: str,
        first_name: str,
        last_name: str,
        user_id: Optional[int] = None,
        gender: Optional[Gender] = None,
        dob: Optional[Union[str, date]] = None,
        country_id: int = 1,
        language_id: int = 1
    ) -> PatientResponse:
        """Delegate to extracted creator function."""
        return await create_patient_impl(
            self.db_manager,
            self,
            wa_number,
            first_name,
            last_name,
            user_id,
            gender,
            dob,
            country_id,
            language_id
        )
    
    async def update_patient(
        self,
        patient_id: int,
        update_data: PatientProfileUpdateRequest
    ) -> PatientResponse:
        """Delegate to extracted updater function."""
        return await update_patient_impl(self.db_manager, self, patient_id, update_data)
    
    async def update_patient_user_id(
        self,
        user_id: int,
        update_data: PatientProfileUpdateRequest
    ) -> PatientResponse:
        """Delegate to extracted updater function."""
        return await update_patient_user_id_impl(self.db_manager, self, user_id, update_data)

    async def delete_patient(self, patient_id: int) -> bool:
        """Delegate to extracted updater function."""
        return await delete_patient_impl(self.db_manager, self, patient_id)


# Singleton instance
patient_service = PatientService()