"""
Base provider interface for notification delivery.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Optional


@dataclass
class ProviderResult:
    """Result of a provider send attempt."""
    success: bool
    provider_message_id: Optional[str] = None
    error_message: Optional[str] = None
    is_permanent_failure: bool = False  # 4xx = permanent, 5xx = transient
    metadata: Optional[Dict[str, Any]] = None

    @property
    def should_retry(self) -> bool:
        """Transient failures should be retried."""
        return not self.success and not self.is_permanent_failure


class BaseProvider(ABC):
    """Abstract base class for notification providers."""

    @abstractmethod
    async def initialize(self) -> None:
        """Initialize the provider (auth, connections, etc.)."""
        pass

    @abstractmethod
    async def send(
        self,
        to_address: str,
        title: Optional[str],
        body: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> ProviderResult:
        """
        Send a notification.

        Args:
            to_address: Recipient address (email, phone, push token)
            title: Notification title (optional for some channels)
            body: Notification body
            data: Additional data/payload

        Returns:
            ProviderResult with success status and details
        """
        pass

    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """Check provider health/connectivity."""
        pass

    async def cleanup(self) -> None:
        """Cleanup resources."""
        pass
