"""
Profile Service - Efficient Architecture 
Uses LoginService for all data retrieval - NO REDUNDANT QUERIES
"""

from typing import Optional, Dict, Any
from src.services.auth.login_service import LoginService
import structlog

logger = structlog.get_logger()

# Remove all the inefficient garbage that was here before
# LoginService now handles ALL data retrieval efficiently

class ProfileService:
    """
    Lightweight profile service that delegates to LoginService.
    NO redundant queries - everything comes from login data.
    """

    @staticmethod
    async def get_complete_profile(user_id: int) -> Dict[str, Any]:
        """
        DEPRECATED: Use LoginService.get_complete_login_data() instead.
        This method now just calls the efficient login service.
        """
        logger.warning("get_complete_profile is deprecated - use LoginService.get_complete_login_data()", user_id=user_id)
        return await LoginService.get_complete_login_data(user_id)

    @staticmethod
    async def get_connected_user(user_id: int) -> Dict[str, Any]:
        """Get connected user data using UserService."""
        from src.services.auth.user_service import UserService
        return await UserService.get_connected_user(user_id)

    @staticmethod
    async def get_connected_patient(user_id: int) -> Optional[Dict[str, Any]]:
        """Get connected patient data using PatientService."""
        from src.services.patient.patient_service import PatientService
        return await PatientService.get_connected_patient(user_id)

    @staticmethod
    async def get_connected_doctor(user_id: int) -> Optional[Dict[str, Any]]:
        """Get connected doctor data using DoctorService."""
        from src.services.doctor.doctor_service import DoctorService
        return await DoctorService.get_connected_doctor(user_id)
