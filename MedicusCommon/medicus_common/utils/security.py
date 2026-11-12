"""
Security utilities for MedicusAI application.

This module provides security-related functions for input validation,
file operations, and data sanitization.
"""

import os
import re
import hashlib
import secrets
from pathlib import Path
from typing import List, Union


from medicus_common.core.constants import (
    ValidationConstants
)
from medicus_common.core.exceptions import SecurityError, FileOperationError
from medicus_common.core.logging_config import get_logger


logger = get_logger(__name__)


class PathValidator:
    """Validates file paths and prevents directory traversal attacks."""
    
    @staticmethod
    def validate_file_path(file_path: Union[str, Path], allowed_dirs: List[str]) -> Path:
        """Validate file path against allowed directories.
        
        Args:
            file_path: Path to validate
            allowed_dirs: List of allowed base directories
            
        Returns:
            Validated Path object
            
        Raises:
            SecurityError: If path is invalid or outside allowed directories
        """
        try:
            path = Path(file_path).resolve()
        except (OSError, ValueError) as e:
            logger.error_with_context(
                "Invalid file path provided",
                file_path=str(file_path),
                error=str(e)
            )
            raise SecurityError(
                f"Invalid file path: {e}",
                error_code="INVALID_PATH",
                details={"path": str(file_path)}
            )
        
        # Check if path is within allowed directories
        for allowed_dir in allowed_dirs:
            try:
                allowed_path = Path(allowed_dir).resolve()
                if path.is_relative_to(allowed_path):
                    logger.debug_with_context(
                        "File path validated successfully",
                        file_path=str(path),
                        allowed_dir=str(allowed_path)
                    )
                    return path
            except (OSError, ValueError):
                continue
        
        logger.warning_with_context(
            "File path outside allowed directories",
            file_path=str(path),
            allowed_dirs=allowed_dirs
        )
        raise SecurityError(
            f"File path outside allowed directories: {path}",
            error_code="PATH_TRAVERSAL_ATTEMPT",
            details={"path": str(path), "allowed_dirs": allowed_dirs}
        )
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename to prevent security issues.
        
        Args:
            filename: Original filename
            
        Returns:
            Sanitized filename
        """
        # Remove path separators and dangerous characters
        sanitized = re.sub(r'[<>:"/\\|?*]', '_', filename)
        sanitized = re.sub(r'\.{2,}', '.', sanitized)  # Multiple dots
        sanitized = sanitized.strip('. ')  # Leading/trailing dots and spaces
        
        # Ensure filename is not empty
        if not sanitized:
            sanitized = f"file_{secrets.token_hex(8)}"
        
        # Truncate if too long
        if len(sanitized) > 255:
            name, ext = os.path.splitext(sanitized)
            sanitized = name[:255-len(ext)] + ext
        
        logger.debug_with_context(
            "Filename sanitized",
            original=filename,
            sanitized=sanitized
        )
        
        return sanitized


class FileValidator:
    """Validates file types, sizes, and content."""
    
    @staticmethod
    def validate_file_extension(filename: str, allowed_extensions: List[str]) -> bool:
        """Validate file extension against allowed types.
        
        Args:
            filename: Name of the file
            allowed_extensions: List of allowed extensions (with dots)
            
        Returns:
            True if extension is allowed
        """
        file_ext = Path(filename).suffix.lower()
        is_valid = file_ext in [ext.lower() for ext in allowed_extensions]
        
        logger.debug_with_context(
            "File extension validation",
            filename=filename,
            extension=file_ext,
            is_valid=is_valid,
            allowed_extensions=allowed_extensions
        )
        
        return is_valid
    
    @staticmethod
    def validate_file_size(file_path: Union[str, Path], max_size_bytes: int) -> bool:
        """Validate file size against maximum allowed size.
        
        Args:
            file_path: Path to the file
            max_size_bytes: Maximum allowed size in bytes
            
        Returns:
            True if file size is within limit
        """
        try:
            file_size = Path(file_path).stat().st_size
            is_valid = file_size <= max_size_bytes
            
            logger.debug_with_context(
                "File size validation",
                file_path=str(file_path),
                file_size=file_size,
                max_size=max_size_bytes,
                is_valid=is_valid
            )
            
            return is_valid
            
        except OSError as e:
            logger.error_with_context(
                "Failed to check file size",
                file_path=str(file_path),
                error=str(e)
            )
            return False
    
    @staticmethod
    def validate_file_content(file_path: Union[str, Path], file_type: str) -> bool:
        """Validate file content matches expected type.
        
        Args:
            file_path: Path to the file
            file_type: Expected file type ('image', 'audio', 'document')
            
        Returns:
            True if content matches expected type
        """
        try:
            with open(file_path, 'rb') as f:
                header = f.read(64)  # Read first 64 bytes for magic number detection
            
            if file_type == 'image':
                return FileValidator._is_valid_image_header(header)
            elif file_type == 'audio':
                return FileValidator._is_valid_audio_header(header)
            elif file_type == 'document':
                return FileValidator._is_valid_document_header(header)
            else:
                return False
                
        except OSError as e:
            logger.error_with_context(
                "Failed to validate file content",
                file_path=str(file_path),
                error=str(e)
            )
            return False
    
    @staticmethod
    def _is_valid_image_header(header: bytes) -> bool:
        """Check if header matches valid image format."""
        image_signatures = [
            b'\xFF\xD8\xFF',  # JPEG
            b'\x89PNG\r\n\x1a\n',  # PNG
            b'GIF87a',  # GIF87a
            b'GIF89a',  # GIF89a
            b'BM',  # BMP
            b'II*\x00',  # TIFF (little endian)
            b'MM\x00*',  # TIFF (big endian)
        ]
        
        return any(header.startswith(sig) for sig in image_signatures)
    
    @staticmethod
    def _is_valid_audio_header(header: bytes) -> bool:
        """Check if header matches valid audio format."""
        audio_signatures = [
            b'RIFF',  # WAV
            b'\xFF\xFB',  # MP3
            b'\xFF\xF3',  # MP3
            b'\xFF\xF2',  # MP3
            b'ftyp',  # MP4/M4A (at offset 4)
            b'OggS',  # OGG
        ]
        
        return any(header.startswith(sig) or sig in header[:12] for sig in audio_signatures)
    
    @staticmethod
    def _is_valid_document_header(header: bytes) -> bool:
        """Check if header matches valid document format."""
        document_signatures = [
            b'%PDF',  # PDF
            b'\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1',  # Microsoft Office
            b'PK\x03\x04',  # ZIP-based formats (DOCX, etc.)
        ]
        
        return any(header.startswith(sig) for sig in document_signatures)


class InputValidator:
    """Validates user input for security and format compliance."""
    
    @staticmethod
    def validate_phone_number(phone: str) -> bool:
        """Validate phone number format.
        
        Args:
            phone: Phone number to validate
            
        Returns:
            True if phone number is valid
        """
        if not phone or not isinstance(phone, str):
            return False
            
        # Remove common formatting characters
        clean_phone = re.sub(r'[\s\-\(\)\.]+', '', phone)
        
        # Check against regex pattern
        pattern = re.compile(ValidationConstants.PHONE_REGEX)
        is_valid = bool(pattern.match(clean_phone))
        
        logger.debug_with_context(
            "Phone number validation",
            phone=phone,
            clean_phone=clean_phone,
            is_valid=is_valid
        )
        
        return is_valid
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email address format.
        
        Args:
            email: Email address to validate
            
        Returns:
            True if email is valid
        """
        if not email or not isinstance(email, str):
            return False
            
        pattern = re.compile(ValidationConstants.EMAIL_REGEX)
        is_valid = bool(pattern.match(email.lower()))
        
        logger.debug_with_context(
            "Email validation",
            email=email,
            is_valid=is_valid
        )
        
        return is_valid
    
    @staticmethod
    def sanitize_text_input(text: str, max_length: int = 4000) -> str:
        """Sanitize text input for security.
        
        Args:
            text: Text to sanitize
            max_length: Maximum allowed length
            
        Returns:
            Sanitized text
            
        Raises:
            SecurityError: If text contains potentially malicious content
        """
        if not isinstance(text, str):
            raise SecurityError(
                "Invalid input type for text sanitization",
                error_code="INVALID_INPUT_TYPE"
            )
        
        # Check length
        if len(text) > max_length:
            logger.warning_with_context(
                "Text input exceeds maximum length",
                length=len(text),
                max_length=max_length
            )
            text = text[:max_length]
        
        # Remove null bytes and control characters
        text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
        
        # Check for potential injection patterns
        suspicious_patterns = [
            r'<script[^>]*>',
            r'javascript:',
            r'data:text/html',
            r'vbscript:',
            r'on\w+\s*=',
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                logger.warning_with_context(
                    "Potentially malicious content detected in text input",
                    pattern=pattern,
                    text_sample=text[:100]
                )
                raise SecurityError(
                    "Potentially malicious content detected",
                    error_code="MALICIOUS_CONTENT",
                    details={"pattern": pattern}
                )
        
        return text.strip()


class CryptoUtils:
    """Cryptographic utilities for secure operations."""
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """Generate cryptographically secure random token.
        
        Args:
            length: Length of token in bytes
            
        Returns:
            Hex-encoded secure token
        """
        return secrets.token_hex(length)
    
    @staticmethod
    def hash_file(file_path: Union[str, Path]) -> str:
        """Calculate SHA-256 hash of file.
        
        Args:
            file_path: Path to file
            
        Returns:
            Hex-encoded SHA-256 hash
            
        Raises:
            FileOperationError: If file cannot be read
        """
        try:
            sha256_hash = hashlib.sha256()
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(chunk)
            
            file_hash = sha256_hash.hexdigest()
            
            logger.debug_with_context(
                "File hash calculated",
                file_path=str(file_path),
                hash=file_hash
            )
            
            return file_hash
            
        except OSError as e:
            logger.error_with_context(
                "Failed to calculate file hash",
                file_path=str(file_path),
                error=str(e)
            )
            raise FileOperationError(
                f"Failed to calculate file hash: {e}",
                error_code="HASH_CALCULATION_FAILED",
                details={"file_path": str(file_path)}
            )
    
    @staticmethod
    def compare_hashes(hash1: str, hash2: str) -> bool:
        """Securely compare two hashes using constant-time comparison.
        
        Args:
            hash1: First hash to compare
            hash2: Second hash to compare
            
        Returns:
            True if hashes match
        """
        return secrets.compare_digest(hash1, hash2)