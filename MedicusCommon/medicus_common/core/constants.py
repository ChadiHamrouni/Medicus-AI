"""
Centralized constants for MedicusAI application.

This module contains all application-wide constants to avoid magic numbers
and improve maintainability.
"""

import os

from medicus_common.core.config_ai import Config

config = Config()
TEXT_MODEL = config.get("llms", "text_llm", "model")
TEXT_EMBEDDING_MODEL = config.get("embeddings", "text_embedding", "model")


class AudioConstants:
    """Audio processing related constants."""
    
    DEFAULT_SAMPLE_RATE = 48000
    FALLBACK_SAMPLE_RATE = 24000
    MAX_AUDIO_DURATION_SECONDS = 300  # 5 minutes
    SUPPORTED_AUDIO_FORMATS = ['.wav', '.mp3', '.m4a', '.flac', '.ogg']
    CHUNK_SIZE = 1024
    CHANNELS = 1


class DatabaseConstants:
    """Database related constants."""
    
    MAX_CONNECTIONS = 20
    MIN_CONNECTIONS = 5
    CONNECTION_TIMEOUT = 30
    QUERY_TIMEOUT = 60
    MAX_RETRIES = 3
    RETRY_DELAY = 1.0


class FileConstants:
    """File processing related constants."""
    
    MAX_FILE_SIZE_MB = 5
    MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
    TEMP_DIR = "/tmp/medicus"
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/app/uploads")
    STORAGE_DIR = os.getenv("STORAGE_DIR", "/app/storage")
    
    # Allowed file extensions
    ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff']
    ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.rtf']
    ALLOWED_AUDIO_EXTENSIONS = AudioConstants.SUPPORTED_AUDIO_FORMATS
    ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.wmv', '.flv']


class APIConstants:
    """API related constants."""
    
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100
    DEFAULT_TIMEOUT = 30
    MAX_RETRIES = 3
    RATE_LIMIT_REQUESTS = 100
    RATE_LIMIT_WINDOW = 3600  # 1 hour in seconds


class ConversationConstants:
    """Conversation related constants."""
    
    MAX_HISTORY_LENGTH = 20
    MAX_MESSAGE_LENGTH = 2048
    SESSION_TIMEOUT_MINUTES = 30
    ACTIVE_CONVO_WINDOW_HR = 24


class ModelConstants:
    """AI model related constants."""
    
    DEFAULT_MODEL = TEXT_MODEL
    DEFAULT_TEMPERATURE = 0.1
    DEFAULT_MAX_TOKENS = 1000
    DEFAULT_TOP_P = 1.0
    EMBEDDING_MODEL = TEXT_EMBEDDING_MODEL
    EMBEDDING_DIMENSIONS = 768


class SecurityConstants:
    """Security related constants."""
    
    TOKEN_EXPIRY_HOURS = 24
    REFRESH_TOKEN_EXPIRY_DAYS = 30
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION_MINUTES = 15
    PASSWORD_MIN_LENGTH = 8
    SESSION_COOKIE_NAME = "medicus_session"


class ElasticsearchConstants:
    """Elasticsearch related constants."""
    
    DEFAULT_INDEX_PREFIX = "medicus"
    MAX_SEARCH_RESULTS = 100
    DEFAULT_SEARCH_SIZE = 10
    SIMILARITY_THRESHOLD = 0.7
    MAX_QUERY_LENGTH = 1000


class RedisConstants:
    """Redis related constants."""
    
    DEFAULT_TTL = 3600  # 1 hour
    SESSION_TTL = 1800  # 30 minutes
    CACHE_TTL = 300     # 5 minutes
    MAX_CONNECTIONS = 20
    SOCKET_TIMEOUT = 5


class HealthCheckConstants:
    """Health check related constants."""
    
    TIMEOUT_SECONDS = 5
    CRITICAL_SERVICES = ["database", "redis", "elasticsearch"]
    CHECK_INTERVAL_SECONDS = 30


class LoggingConstants:
    """Logging related constants."""
    
    MAX_LOG_FILE_SIZE_MB = 10
    LOG_BACKUP_COUNT = 5
    LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s [%(filename)s:%(lineno)d]"
    LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


class ValidationConstants:
    """Data validation related constants."""
    
    PHONE_REGEX = r'^\+?1?\d{9,15}$'
    EMAIL_REGEX = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    PASSWORD_REGEX = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$'
    
    # Medical ID patterns
    MEDICAL_ID_REGEX = r'^[A-Z]{2}\d{6}$'
    PATIENT_ID_REGEX = r'^PAT\d{6}$'
    DOCTOR_ID_REGEX = r'^DOC\d{6}$'


class MessageConstants:
    """Message templates and constants."""
    
    # Success messages
    SUCCESS_CREATED = "Resource created successfully"
    SUCCESS_UPDATED = "Resource updated successfully"
    SUCCESS_DELETED = "Resource deleted successfully"
    
    # Error messages
    ERROR_NOT_FOUND = "Resource not found"
    ERROR_UNAUTHORIZED = "Unauthorized access"
    ERROR_FORBIDDEN = "Access forbidden"
    ERROR_VALIDATION = "Validation failed"
    ERROR_SERVER = "Internal server error"
    ERROR_RATE_LIMIT = "Rate limit exceeded"
    
    # Processing messages
    PROCESSING_AUDIO = "Processing audio file..."
    PROCESSING_IMAGE = "Processing image file..."
    PROCESSING_DOCUMENT = "Processing document..."


class HTTPStatusCodes:
    """HTTP status codes for consistent API responses."""
    
    OK = 200
    CREATED = 201
    ACCEPTED = 202
    NO_CONTENT = 204
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    METHOD_NOT_ALLOWED = 405
    CONFLICT = 409
    UNPROCESSABLE_ENTITY = 422
    TOO_MANY_REQUESTS = 429
    INTERNAL_SERVER_ERROR = 500
    BAD_GATEWAY = 502
    SERVICE_UNAVAILABLE = 503