# src/models/base.py
"""Base Pydantic models for MedicusCommon - Pure AsyncPG, no SQLAlchemy."""

from datetime import datetime
from typing import Any, Dict, Optional, TypeVar, Generic
import uuid
from pydantic import BaseModel, Field, ConfigDict


class BaseResponseModel(BaseModel):
    """Base model for API responses."""
    
    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
        validate_assignment=True
    )


class TimestampMixin(BaseModel):
    """Mixin for created_at and updated_at timestamps."""
    
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")


class UUIDMixin(BaseModel):
    """Mixin for UUID primary key."""
    
    id: uuid.UUID = Field(..., description="Unique identifier")


class IntegerIDMixin(BaseModel):
    """Mixin for integer primary key."""
    
    id: int = Field(..., description="Unique identifier", gt=0)


class SoftDeleteMixin(BaseModel):
    """Mixin for soft delete functionality."""
    
    deleted_at: Optional[datetime] = Field(None, description="Soft deletion timestamp")

    @property
    def is_deleted(self) -> bool:
        """Check if record is soft deleted."""
        return self.deleted_at is not None


class StatusMixin(BaseModel):
    """Mixin for status field."""
    
    status: str = Field(default="active", description="Record status")

    @property
    def is_active(self) -> bool:
        """Check if record is active."""
        return self.status == "active"


class AuditMixin(BaseModel):
    """Mixin for audit fields."""
    
    created_by: Optional[int] = Field(None, description="User ID who created this record")
    updated_by: Optional[int] = Field(None, description="User ID who last updated this record")
    created_by_ip: Optional[str] = Field(None, description="IP address of creator", max_length=45)
    updated_by_ip: Optional[str] = Field(None, description="IP address of last updater", max_length=45)


class VersionMixin(BaseModel):
    """Mixin for optimistic locking with version field."""
    
    version: int = Field(default=1, description="Version for optimistic locking", ge=1)


class MetadataMixin(BaseModel):
    """Mixin for JSON metadata field."""
    
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class SlugMixin(BaseModel):
    """Mixin for URL-friendly slug field."""
    
    slug: Optional[str] = Field(None, description="URL-friendly slug", max_length=255)


# Common model combinations
class CommonModel(BaseResponseModel, IntegerIDMixin, TimestampMixin, SoftDeleteMixin, StatusMixin):
    """Common model with integer ID, timestamps, soft delete, and status."""
    pass


class UUIDModel(BaseResponseModel, UUIDMixin, TimestampMixin, SoftDeleteMixin, StatusMixin):
    """Common model with UUID, timestamps, soft delete, and status."""
    pass


class AuditedModel(CommonModel, AuditMixin, VersionMixin):
    """Model with full audit trail and versioning."""
    pass


class AuditedUUIDModel(UUIDModel, AuditMixin, VersionMixin):
    """UUID model with full audit trail and versioning."""
    pass


# Database record models (for converting asyncpg.Record to Pydantic)
T = TypeVar('T', bound=BaseModel)

class DatabaseRecord(Generic[T]):
    """Wrapper for converting asyncpg.Record to Pydantic models."""
    
    @classmethod
    def from_record(cls, record: Any, model_class: type[T]) -> T:
        """Convert asyncpg.Record to Pydantic model.
        
        Args:
            record: asyncpg.Record object
            model_class: Target Pydantic model class
            
        Returns:
            Pydantic model instance
        """
        if record is None:
            return None
        
        # Convert record to dict
        record_dict = dict(record)
        
        # Create Pydantic model
        return model_class(**record_dict)
    
    @classmethod
    def from_records(cls, records: list[Any], model_class: type[T]) -> list[T]:
        """Convert list of asyncpg.Record to list of Pydantic models.
        
        Args:
            records: List of asyncpg.Record objects
            model_class: Target Pydantic model class
            
        Returns:
            List of Pydantic model instances
        """
        return [cls.from_record(record, model_class) for record in records]


# Pagination models
class PaginationParams(BaseModel):
    """Standard pagination parameters."""
    
    limit: int = Field(default=20, ge=1, le=100, description="Number of items per page")
    offset: int = Field(default=0, ge=0, description="Number of items to skip")
    
    @property
    def page(self) -> int:
        """Calculate page number from offset and limit."""
        return (self.offset // self.limit) + 1


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated response."""
    
    items: list[T] = Field(..., description="List of items")
    total: int = Field(..., description="Total number of items")
    limit: int = Field(..., description="Items per page")
    offset: int = Field(..., description="Items skipped")
    has_next: bool = Field(..., description="Whether there are more items")
    has_prev: bool = Field(..., description="Whether there are previous items")
    
    @classmethod
    def create(
        cls,
        items: list[T],
        total: int,
        pagination: PaginationParams
    ) -> "PaginatedResponse[T]":
        """Create paginated response.
        
        Args:
            items: List of items for current page
            total: Total number of items
            pagination: Pagination parameters
            
        Returns:
            Paginated response
        """
        return cls(
            items=items,
            total=total,
            limit=pagination.limit,
            offset=pagination.offset,
            has_next=pagination.offset + pagination.limit < total,
            has_prev=pagination.offset > 0
        )