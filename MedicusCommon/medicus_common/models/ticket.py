from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import List, Optional, Union
from datetime import datetime, timezone
from enum import Enum


class TicketStatus(str, Enum):
    OPEN = 'open'
    RESOLVED = 'resolved'
    CLOSED = 'closed'


class TicketPriority(str, Enum):
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    CRITICAL = 'critical'


class TicketCategory(str, Enum):
    TECHNICAL = 'technical'
    BILLING = 'billing'
    FEEDBACK = 'feedback'
    ACCOUNT = 'account'


class Attachment(BaseModel):
    filename: str = Field(..., description="Name of the file")
    url: str = Field(..., description="URL or path where the file is stored")
    size: Optional[int] = Field(None, description="File size in bytes")
    
    @field_validator('url')
    def validate_url(cls, v):
        # Allow both full URLs and relative paths for file storage
        if v.startswith('/') or v.startswith('http://') or v.startswith('https://'):
            return v
        return v


class Comment(BaseModel):
    created_by: Union[int, str] = Field(..., description="Author of the comment")
    content: str = Field(..., description="Markdown-formatted content")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Ticket(BaseModel):
    """Base ticket model for mutations (INSERT/UPDATE) on support.tickets table."""
    id: Optional[int] = Field(None, description="Unique identifier for the ticket")
    subject: str = Field(..., description="Subject of the ticket")
    body: Optional[dict] = None  # JSON field to store title, summary, description, etc.
    created_by: Optional[int] = Field(None, description="ID of the user who created the ticket")
    created_by_name: Optional[str] = Field(None, description="First and Last name of user")
    priority: TicketPriority = Field(TicketPriority.MEDIUM, description="Priority level of the ticket")
    category: TicketCategory = Field(TicketCategory.TECHNICAL, description="Category of the ticket")
    status: TicketStatus = Field(TicketStatus.OPEN, description="Current status of the ticket")
    tags: Optional[List[str]] = Field(default_factory=list, description="Tags for the ticket")
    assigned_to: Optional[int] = Field(None, description="ID of the assigned internal staff")
    assigned_to_name: Optional[str] = Field(None, description="First and Last name of user")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Creation timestamp")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Last update timestamp")
    closed_at: Optional[datetime] = Field(None, description="Closure timestamp")
    attachments: Optional[List[Attachment]] = Field(default_factory=list, description="List of attachments")
    user_comments: Optional[List[Comment]] = Field(default_factory=list, alias='user_comments',
                                                   description="List of comments")

    def __init__(self, **data):
        # Ensure attachments and user_comments are always a list, never None
        if 'attachments' not in data or data.get('attachments') is None:
            data['attachments'] = []
        if 'user_comments' not in data or data.get('user_comments') is None:
            data['user_comments'] = []
        super().__init__(**data)

    model_config = ConfigDict(populate_by_name=True)


class TicketResponse(BaseModel):
    """Ticket response model for reads from support.tickets_view materialized view.

    This model maps to the flattened structure of the materialized view which includes
    joined data from users, doctors, patients, specialties, countries, and staff tables.
    """
    ticket_id: int = Field(..., description="Unique identifier for the ticket")
    subject: str = Field(..., description="Subject of the ticket")
    description: Optional[str] = Field(None, description="Description from body->>'description'")
    ticket_status: str = Field(..., description="Current status (cast from ENUM as string)")
    priority: str = Field(..., description="Priority level (cast from ENUM as string)")
    category: str = Field(..., description="Category (cast from ENUM as string)")

    # Creator information (from view joins)
    creator_user_id: int = Field(..., description="User ID who created the ticket")
    creator_role: str = Field(..., description="Role of creator (doctor, patient, etc)")
    creator_name: str = Field(..., description="Full name of creator")
    clinical_id: Optional[int] = Field(None, description="Doctor ID or Patient ID depending on role")
    specialty: Optional[str] = Field(None, description="Specialty name if creator is a doctor")
    country: Optional[str] = Field(None, description="Country name if creator is a doctor")

    # Assignment information (from view joins)
    assigned_user_id: Optional[int] = Field(None, description="User ID of assigned staff")
    assigned_staff_name: Optional[str] = Field(None, description="Full name of assigned staff member")
    staff_level: Optional[str] = Field(None, description="Staff role level (cast from ENUM as string)")

    # Timestamps
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    closed_at: Optional[datetime] = Field(None, description="Closure timestamp")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class SupportTicketsResponse(BaseModel):
    """Response model for get_support tool returning list of tickets."""
    tickets: List[TicketResponse] = Field(default_factory=list, description="List of support tickets")
    total: int = Field(0, description="Total number of tickets")

    model_config = ConfigDict(extra='forbid')


class SupportTicketResultResponse(BaseModel):
    """Response model for support ticket mutation tools (report, close)."""
    id: Optional[int] = Field(None, description="Ticket ID")
    status: Optional[str] = Field(None, description="Ticket status")
    created_at: Optional[str] = Field(None, description="Creation timestamp")
    closed_at: Optional[str] = Field(None, description="Closure timestamp")

    model_config = ConfigDict(extra='forbid')
