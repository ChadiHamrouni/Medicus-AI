from typing import Optional, Literal
from pathlib import Path
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator, ConfigDict
from enum import Enum
from pydantic.errors import PydanticUserError


class ConvoStatus(str, Enum):
    NEW = "NEW"
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class Location(BaseModel):
    """Geographic location with latitude and longitude coordinates."""

    latitude: Decimal = Field(
        ...,
        ge=-90,
        le=90,
        description="Latitude in degrees, between -90 and 90"
    )
    longitude: Decimal = Field(
        ...,
        ge=-180,
        le=180,
        description="Longitude in degrees, between -180 and 180"
    )


class MediaInfo(BaseModel):
    sid: str            # Unique identifier for the media resource.
    uri: str            # Relative URI of the media resource.
    url: str            # Full URL to access the media content.
    content_type: str   # MIME type of the media (e.g., 'audio/wav').
    size: int           # Size of the media file in bytes.


class FileInfo(MediaInfo):
    """Information about an uploaded file with type validation."""

    model_config = ConfigDict(str_strip_whitespace=True)

    file_path: Optional[str] = Field(..., description="Path to the file")
    size: Optional[int] = Field(None, ge=0, description="File size in bytes")
    type: Optional[Literal['image', 'document', 'video']] = Field(..., description="Type of file")

    # Class-level constants for better maintainability
    _TYPE_EXTENSIONS = {
        'image': {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.svg'},
        'document': {'.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.ppt', '.pptx', '.rtf', '.odt'},
        'video': {'.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.m4v'},
    }

    @classmethod
    @field_validator('file_path')
    def validate_file_path(cls, v: str, info) -> str:
        """Validate file path has correct extension for the specified type."""
        if not v:
            raise ValueError('file_path cannot be empty')

        # Get the file type from the model data
        file_type = info.data.get('type')
        if file_type is None:
            raise ValueError('type must be specified to validate file_path')

        # Extract file extension
        file_path = Path(v)
        extension = file_path.suffix.lower()

        if not extension:
            raise ValueError('file_path must have a file extension')

        # Check if extension matches the file type
        allowed_extensions = cls._TYPE_EXTENSIONS[file_type]
        if extension not in allowed_extensions:
            raise ValueError(
                f'File extension "{extension}" does not match type "{file_type}". '
                f'Allowed extensions: {sorted(allowed_extensions)}'
            )

        return v


class AudioInfo(MediaInfo):
    """Information about an audio file with validation."""

    model_config = ConfigDict(str_strip_whitespace=True)

    audio_path: Optional[str] = Field(..., description="Path to the audio file")
    length: Optional[float] = Field(None, gt=0, description="Audio length in seconds")
    bitrate: Optional[int] = Field(None, gt=0, description="Audio bitrate in kbps")

    # Class-level constants
    _AUDIO_EXTENSIONS = {'.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a', '.wma', '.opus'}

    @classmethod
    @field_validator('audio_path')
    def validate_audio_path(cls, v: str) -> str:
        """Validate audio file has a supported extension."""
        if not v:
            raise ValueError('audio_path cannot be empty')

        file_path = Path(v)
        extension = file_path.suffix.lower()

        if not extension:
            raise ValueError('audio_path must have a file extension')

        if extension not in cls._AUDIO_EXTENSIONS:
            raise ValueError(
                f'Audio extension "{extension}" not supported. '
                f'Allowed extensions: {sorted(cls._AUDIO_EXTENSIONS)}'
            )

        return v


class Attachment(BaseModel):
    """Attachment metadata for images, PDFs, and other files."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    blob_path: str = Field(..., description="Blob storage path (e.g., vault/p-xxx/d-xxx)")
    content_type: str = Field(..., description="MIME type (e.g., image/jpeg, application/pdf)")
    filename: str = Field(..., description="Original filename")
    size: Optional[int] = Field(None, description="File size in bytes")


class Payload(BaseModel):
    """Base payload model for medical conversation system."""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
    )

    # Core I/O fields - now using string IDs
    text_io: Optional[str] = Field(None, description="Text query input")
    audio_io: Optional[str] = Field(None, description="Audio blob path (NOT shared with doctor)")
    attachments: Optional[list[Attachment]] = Field(None, description="Attachment metadata for images/PDFs (shared with doctor)")

    @classmethod
    @field_validator('text_io')
    def validate_text_io(cls, v: Optional[str]) -> Optional[str]:
        """Validate text input is not just whitespace."""
        if v is not None and not v.strip():
            return None
        return v

    def has_input(self) -> bool:
        """Check if payload has any input content."""
        return any([
            self.text_io and self.text_io.strip(),
            self.audio_io is not None,
            self.attachments is not None and len(self.attachments) > 0
        ])

    def input_types(self) -> list[str]:
        """Return list of input types present in this payload."""
        types = []
        if self.text_io and self.text_io.strip():
            types.append('text')
        if self.audio_io:
            types.append('audio')
        if self.attachments and len(self.attachments) > 0:
            types.append('attachments')
        return types


class AppPayload(Payload):
    """App-specific payload model for medical conversation system."""
    type: Literal["app"] = "app"
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        extra='allow',
    )

    # Make fields optional with defaults for mobile app compatibility
    user_id: Optional[int] = Field(default=None, description="ID of the user who owns the app")
    sender_id: Optional[int] = Field(default=None, description="ID of the message sender (patient or doctor)")
    assistant: Literal['mediaid', 'medidoc'] = Field(default='mediaid', description="Type of medical assistant")

    # Optional fields with defaults
    convo_id: Optional[str] = Field(None, description="Conversation ID")
    convo_status: ConvoStatus = Field(ConvoStatus.ACTIVE, description="Status of the conversation")
    receiver_id: Optional[int] = Field(default=None, description="ID of the message receiver")
    direct_message: bool = Field(False, description="Whether message should pass through directly")
    location: Optional[Location] = Field(None, description="Geographic location of the caller")

    # Mirror conversation fields
    mirror_convo_id: Optional[str] = Field(None, description="Mirror conversation ID")

    # Compaction (AI long-term memory)
    compact_summary: Optional[str] = Field(None, description="Latest compaction summary (AI long-term memory, sent by frontend for ACTIVE conversations)")
    compact_to_message: Optional[int] = Field(None, description="Last message ID covered by latest compaction (boundary marker for INACTIVE context loading)")

    # Rolling context window (short-term memory for ACTIVE/NEW conversations)
    # Client sends the last N [user, assistant] message pairs accumulated since the
    # last compaction (or since conversation start for NEW). Reset to [] after each
    # compaction event. Ignored for INACTIVE (server loads history from DB instead).
    recent_messages: Optional[list[dict]] = Field(
        default=None,
        description="Recent [user, assistant] message pairs since last compaction. Sent by client for ACTIVE/NEW conversations to bridge the pre-compaction blind zone.",
    )

    # Conversation context - patient and doctor IDs for AI tools
    patient_id: Optional[int] = Field(None, description="Patient ID in this conversation (for AI context)")
    doctor_id: Optional[int] = Field(None, description="Doctor ID in this conversation (for AI context)")

    # Added for backend correlation / idempotency
    external_conversation_id: Optional[str] = Field(None, description="External conversation system ID")
    message_id: Optional[int] = Field(None, description="Backend message ID for correlation")

    @classmethod
    @field_validator('convo_id')
    def validate_convo_id(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise PydanticUserError(
                'convo_id_invalid',
                'Conversation ID cannot be blank or empty string.'
            )
        return v


class CloudPayload(Payload):
    """Cloud-specific payload model for medical conversation system."""
    type: Literal["cloud"] = "cloud"
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        extra='forbid'
    )

    cloud_session_id: Optional[str] = Field(None, description="Cloud session identifier")
    region: Optional[str] = Field(None, description="Cloud deployment region")
    api_version: Optional[str] = Field(None, description="API version")
    status_code: int = Field(200, description="HTTP status code (200 for success, 400/500 for errors)")
    message: Optional[str] = Field(None, description="Response message")

    # Multiple media attachments support
    media_ids: Optional[list[str]] = Field(None, description="List of media IDs for multiple attachments")