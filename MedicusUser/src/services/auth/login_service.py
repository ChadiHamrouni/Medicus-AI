"""
Login Service - Orchestrates Domain Services for Efficient Data Retrieval
Implements clean architecture: orchestrates calls to domain-specific services
"""

from datetime import datetime, timezone
from typing import  Dict, Any
from medicus_common.core.exceptions import  DatabaseError
from medicus_common.core.logging_config import get_logger

from src.services.auth.user_service import UserService
from src.services.patient.patient_service import PatientService
from src.services.doctor.doctor_service import DoctorService

logger = get_logger("login_service")

class LoginService:
    """
    Efficient login service that orchestrates calls to domain services.
    Called once at login, data is cached for entire app session.

    Architecture:
    - UserService.get_connected_user(): Complete user + profile + settings (includes user_assistant)
    - PatientService.get_connected_patient(): Complete patient data (when user.role='patient')
    - DoctorService.get_connected_doctor(): Complete doctor data (when user.role='doctor')

    Total: 2 queries maximum per login (1 + 1)
    Result: Complete app data for entire session with profile based on role
    """


    @staticmethod
    async def get_complete_login_data(user_id: int, user_assistant: str = None) -> Dict[str, Any]:
        """
        MASTER LOGIN FUNCTION
        Get ALL data needed for entire app session efficiently.
        Call this ONCE at login and cache the result.

        **SINGLE SOURCE OF TRUTH** for user_assistant - everything depends on this!

        Args:
            user_id: The user ID to get data for
            user_assistant: Override assistant mode ('mediaid'/'medidoc'), None uses database default

        Returns:
            dict containing:
            - user: Complete user/profile/settings data
            - patient: Complete patient data (if user.role='patient')
            - doctor: Complete doctor data (if user.role='doctor')
            - user_assistant: Current assistant mode (SOURCE OF TRUTH)
        """
        try:
            user_data = await UserService.get_connected_user(user_id)

            # Determine which assistant mode to use
            if user_assistant is None:
                user_assistant = user_data.get('user_assistant', 'mediaid')

            patient_data, doctor_data = None, None

            # Load profile based on USER ROLE (not assistant mode)
            # This ensures doctors always get doctorProfile and patients always get patientProfile
            user_role = user_data.get('role')

            if user_role == 'doctor':
                doctor_data = await DoctorService.get_connected_doctor(user_id)
            elif user_role == 'patient':
                patient_data = await PatientService.get_connected_patient(user_id)
            
            # Build complete login response
            # Based on user role, one of patient or doctor would be None
            complete_data = {
                'user': user_data,
                'patient': patient_data,
                'doctor': doctor_data,
                'user_assistant': user_assistant,
                'retrieved_at': datetime.now(timezone.utc).isoformat()
            }
            
            return complete_data
            
        except Exception as e:
            raise DatabaseError(f"Failed to get complete login data: {e}")