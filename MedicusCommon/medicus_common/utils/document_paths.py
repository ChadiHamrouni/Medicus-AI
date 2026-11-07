"""
Document path utilities for Medicus Azure Blob Storage structure.
Provides standardized path generation following document_structure.md
"""

from typing import Optional
from pathlib import Path
from enum import Enum


class DocumentCategory(Enum):
    """Document categories for MedicusSearch"""
    # Doctor practice documents
    PRACTICE_DOCS = "practice-docs"
    BEFORE_AFTER_PHOTOS = "before-after-photos"
    CASE_STUDIES = "case-studies"
    
    # Admin regulation documents
    MEDICAL_REGULATIONS = "medical-regulations"
    COMPLIANCE_DOCS = "compliance-docs"
    GUIDELINES = "guidelines"
    
    # Shared documents
    EDUCATIONAL_MATERIALS = "educational-materials"
    REFERENCE_DOCS = "reference-docs"
    
    # System documents
    BACKUPS = "backups"
    LOGS = "logs"
    TEMP = "temp"


class DoctorDocumentCategory(Enum):
    """Doctor credential and verification document categories"""
    MEDICAL_LICENSE = "medical_license"
    DEA_REGISTRATION = "dea_registration"
    BOARD_CERTIFICATION = "board_certification"
    MALPRACTICE_INSURANCE = "malpractice_insurance"
    GOVERNMENT_ID = "government_id"
    PROOF_OF_ADDRESS = "proof_of_address"
    CV_RESUME = "cv_resume"
    MEDICAL_DIPLOMA = "medical_diploma"
    RESIDENCY_CERTIFICATE = "residency_certificate"
    CME_CERTIFICATE = "cme_certificate"
    HOSPITAL_PRIVILEGES = "hospital_privileges"
    PROFESSIONAL_HEADSHOT = "professional_headshot"


class DocumentPaths:
    """Utility class for generating standardized document paths"""
    
    # Patient document paths (/mediaid/)
    
    @staticmethod
    def patient_message_attachment_path(
        patient_id: int,
        conversation_id: int,
        message_id: int,
        filename: str
    ) -> str:
        """Generate path for patient message attachment"""
        return f"mediaid/patients/{patient_id}/conversations/{conversation_id}/messages/{message_id}/{filename}"
    
    @staticmethod
    def patient_profile_path(patient_id: int, filename: str) -> str:
        """Generate path for patient profile document"""
        return f"mediaid/patients/{patient_id}/profile/{filename}"
    
    @staticmethod
    def patient_avatar_path(patient_id: int, file_extension: str = ".jpg") -> str:
        """Generate standardized path for patient avatar"""
        return f"mediaid/patients/{patient_id}/profile/avatar{file_extension}"
    
    @staticmethod
    def patient_insurance_card_path(patient_id: int, file_extension: str = ".pdf") -> str:
        """Generate standardized path for patient insurance card"""
        return f"mediaid/patients/{patient_id}/profile/insurance_card{file_extension}"
    
    # Doctor document paths (/medidoc/)
    
    @staticmethod
    def doctor_message_attachment_path(
        doctor_id: int,
        conversation_id: int,
        message_id: int,
        filename: str
    ) -> str:
        """Generate path for doctor message attachment"""
        return f"medidoc/doctors/{doctor_id}/conversations/{conversation_id}/messages/{message_id}/{filename}"
    
    @staticmethod
    def doctor_profile_path(doctor_id: int, filename: str) -> str:
        """Generate path for doctor profile document"""
        return f"medidoc/doctors/{doctor_id}/profile/{filename}"
    
    @staticmethod
    def doctor_avatar_path(doctor_id: int, file_extension: str = ".jpg") -> str:
        """Generate standardized path for doctor avatar"""
        return f"medidoc/doctors/{doctor_id}/profile/avatar{file_extension}"
    
    @staticmethod
    def doctor_license_path(doctor_id: int, file_extension: str = ".pdf") -> str:
        """Generate standardized path for doctor license"""
        return f"medidoc/doctors/{doctor_id}/profile/license{file_extension}"
    
    @staticmethod
    def doctor_credential_path(
        doctor_id: int,
        category: DoctorDocumentCategory,
        filename: str
    ) -> str:
        """Generate path for doctor credential document"""
        return f"medidoc/doctors/{doctor_id}/credentials/{category.value}/{filename}"
    
    # MedicusSearch document paths (/medicussearch/)
    
    @staticmethod
    def doctor_practice_document_path(
        doctor_id: int,
        category: DocumentCategory,
        filename: str
    ) -> str:
        """Generate path for doctor practice document"""
        if category not in [DocumentCategory.PRACTICE_DOCS, DocumentCategory.BEFORE_AFTER_PHOTOS, DocumentCategory.CASE_STUDIES]:
            raise ValueError(f"Invalid doctor practice category: {category}")
        
        return f"medicussearch/doctors/{doctor_id}/{category.value}/{filename}"
    
    @staticmethod
    def admin_regulation_path(
        country: str,
        subcategory: DocumentCategory,
        filename: str
    ) -> str:
        """Generate path for admin regulation document"""
        if subcategory not in [DocumentCategory.MEDICAL_REGULATIONS, DocumentCategory.COMPLIANCE_DOCS, DocumentCategory.GUIDELINES]:
            raise ValueError(f"Invalid regulation subcategory: {subcategory}")
        
        return f"medicussearch/admin/regulations/{country}/{subcategory.value}/{filename}"
    
    @staticmethod
    def shared_document_path(category: str, filename: str) -> str:
        """Generate path for shared document"""
        return f"medicussearch/shared/{category}/{filename}"
    
    @staticmethod
    def shared_educational_path(filename: str) -> str:
        """Generate path for shared educational material"""
        return f"medicussearch/shared/{DocumentCategory.EDUCATIONAL_MATERIALS.value}/{filename}"
    
    @staticmethod
    def shared_reference_path(filename: str) -> str:
        """Generate path for shared reference document"""
        return f"medicussearch/shared/{DocumentCategory.REFERENCE_DOCS.value}/{filename}"
    
    @staticmethod
    def shared_template_path(country: str, filename: str) -> str:
        """Generate path for shared template document"""
        return f"medicussearch/shared/{country}/templates/{filename}"
    
    # System document paths (/system/)
    
    @staticmethod
    def system_document_path(category: DocumentCategory, filename: str) -> str:
        """Generate path for system document"""
        if category not in [DocumentCategory.BACKUPS, DocumentCategory.LOGS, DocumentCategory.TEMP]:
            raise ValueError(f"Invalid system category: {category}")
        
        return f"system/{category.value}/{filename}"
    
    @staticmethod
    def system_backup_path(filename: str) -> str:
        """Generate path for system backup"""
        return f"system/{DocumentCategory.BACKUPS.value}/{filename}"
    
    @staticmethod
    def system_log_path(filename: str) -> str:
        """Generate path for system log"""
        return f"system/{DocumentCategory.LOGS.value}/{filename}"
    
    @staticmethod
    def system_temp_path(filename: str) -> str:
        """Generate path for temporary file"""
        return f"system/{DocumentCategory.TEMP.value}/{filename}"
    
    # Utility methods
    
    @staticmethod
    def extract_components_from_path(blob_path: str) -> dict:
        """Extract components from a blob path"""
        parts = blob_path.split('/')
        
        if len(parts) < 2:
            return {"service": None, "type": None}
        
        service = parts[0]  # mediaid, medidoc, medicussearch, system
        
        result = {"service": service}
        
        if service == "mediaid" and len(parts) >= 3:
            result.update({
                "type": "patient",
                "patient_id": int(parts[2]) if parts[2].isdigit() else None
            })
            
            if len(parts) >= 4 and parts[3] == "conversations":
                result["context"] = "conversation"
                if len(parts) >= 5:
                    result["conversation_id"] = int(parts[4]) if parts[4].isdigit() else None
                if len(parts) >= 7:
                    result["message_id"] = int(parts[6]) if parts[6].isdigit() else None
            elif len(parts) >= 4 and parts[3] == "profile":
                result["context"] = "profile"
        
        elif service == "medidoc" and len(parts) >= 3:
            result.update({
                "type": "doctor",
                "doctor_id": int(parts[2]) if parts[2].isdigit() else None
            })
            
            if len(parts) >= 4 and parts[3] == "conversations":
                result["context"] = "conversation"
                if len(parts) >= 5:
                    result["conversation_id"] = int(parts[4]) if parts[4].isdigit() else None
                if len(parts) >= 7:
                    result["message_id"] = int(parts[6]) if parts[6].isdigit() else None
            elif len(parts) >= 4 and parts[3] == "profile":
                result["context"] = "profile"
            elif len(parts) >= 4 and parts[3] == "credentials":
                result["context"] = "credentials"
                if len(parts) >= 5:
                    result["credential_category"] = parts[4]
        
        elif service == "medicussearch":
            if len(parts) >= 2 and parts[1] == "doctors":
                result["type"] = "doctor_practice"
                if len(parts) >= 3:
                    result["doctor_id"] = int(parts[2]) if parts[2].isdigit() else None
                if len(parts) >= 4:
                    result["category"] = parts[3]
            elif len(parts) >= 2 and parts[1] == "admin":
                result["type"] = "admin_regulation"
                if len(parts) >= 4:
                    result["country"] = parts[3]
                if len(parts) >= 5:
                    result["subcategory"] = parts[4]
            elif len(parts) >= 2 and parts[1] == "shared":
                result["type"] = "shared"
                if len(parts) >= 3:
                    result["category"] = parts[2]
        
        elif service == "system":
            result["type"] = "system"
            if len(parts) >= 2:
                result["category"] = parts[1]
        
        return result
    
    @staticmethod
    def is_valid_path(blob_path: str) -> bool:
        """Validate if blob path follows Medicus structure"""
        components = DocumentPaths.extract_components_from_path(blob_path)
        
        # Must have a valid service
        if components.get("service") not in ["mediaid", "medidoc", "medicussearch", "system"]:
            return False
        
        # Additional validation can be added here
        return True
    
    @staticmethod
    def get_service_from_path(blob_path: str) -> Optional[str]:
        """Extract service name from blob path"""
        parts = blob_path.split('/')
        return parts[0] if len(parts) > 0 else None


class DocumentUrlHelper:
    """Helper class for working with document URLs"""
    
    @staticmethod
    def extract_filename(blob_url: str) -> str:
        """Extract filename from blob URL"""
        return Path(blob_url).name
    
    @staticmethod
    def extract_blob_path(blob_url: str, container_name: str = "medicusdoc") -> str:
        """Extract blob path from full URL"""
        if f"/{container_name}/" in blob_url:
            return blob_url.split(f"/{container_name}/")[-1]
        return blob_url
    
    @staticmethod
    def get_file_extension(blob_url: str) -> str:
        """Get file extension from blob URL"""
        return Path(blob_url).suffix
    
    @staticmethod
    def is_image(blob_url: str) -> bool:
        """Check if blob URL points to an image file"""
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'}
        return DocumentUrlHelper.get_file_extension(blob_url).lower() in image_extensions
    
    @staticmethod
    def is_document(blob_url: str) -> bool:
        """Check if blob URL points to a document file"""
        doc_extensions = {'.pdf', '.doc', '.docx', '.txt', '.rtf'}
        return DocumentUrlHelper.get_file_extension(blob_url).lower() in doc_extensions
    
    @staticmethod
    def is_audio(blob_url: str) -> bool:
        """Check if blob URL points to an audio file"""
        audio_extensions = {'.mp3', '.wav', '.ogg', '.m4a', '.aac'}
        return DocumentUrlHelper.get_file_extension(blob_url).lower() in audio_extensions