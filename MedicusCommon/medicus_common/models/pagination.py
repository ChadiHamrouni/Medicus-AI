# medicus_common/models/schemas/pagination.py
"""Standardized pagination schemas for all Medicus APIs."""

from typing import Generic, TypeVar, List, Optional
from pydantic import BaseModel, Field, ConfigDict

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    """
    Standardized pagination response format.
    
    This follows the Django REST Framework pagination format:
    - results: List of items for current page
    - count: Total number of items across all pages
    - next: URL for next page (null if no next page)
    - previous: URL for previous page (null if no previous page)
    
    Example:
    {
        "results": [...],
        "count": 150,
        "next": "https://api.example.com/items?page=3",
        "previous": "https://api.example.com/items?page=1"
    }
    """
    results: List[T] = Field(description="List of items for current page")
    count: int = Field(description="Total number of items across all pages")
    next: Optional[str] = Field(None, description="URL for next page")
    previous: Optional[str] = Field(None, description="URL for previous page")

    model_config = ConfigDict(from_attributes=True)


class PaginationParams(BaseModel):
    """Standard pagination parameters."""
    page: int = Field(1, ge=1, description="Page number (starts from 1)")
    page_size: int = Field(20, ge=1, le=100, description="Number of items per page")
    
    def to_offset_limit(self) -> tuple[int, int]:
        """Convert page/page_size to offset/limit."""
        offset = (self.page - 1) * self.page_size
        limit = self.page_size
        return offset, limit
    
    def build_pagination_urls(
        self, 
        base_url: str, 
        total_count: int, 
        query_params: dict = None
    ) -> tuple[Optional[str], Optional[str]]:
        """
        Build next/previous URLs for pagination.
        
        Args:
            base_url: Base URL for the endpoint
            total_count: Total number of items
            query_params: Additional query parameters to include
            
        Returns:
            tuple of (next_url, previous_url)
        """
        query_params = query_params or {}
        
        # Calculate total pages
        total_pages = (total_count + self.page_size - 1) // self.page_size
        
        # Build query string
        def build_url(page: int) -> str:
            params = {**query_params, "page": page, "page_size": self.page_size}
            query_string = "&".join(f"{k}={v}" for k, v in params.items() if v is not None)
            return f"{base_url}?{query_string}"
        
        # Next URL
        next_url = None
        if self.page < total_pages:
            next_url = build_url(self.page + 1)
        
        # Previous URL
        previous_url = None
        if self.page > 1:
            previous_url = build_url(self.page - 1)
        
        return next_url, previous_url