"""
EmailService — reusable email notification facade.

Provides a clean, SOLID-compliant boundary between callers (notification worker,
API handlers, scheduled jobs) and the underlying ACS Email provider.

Usage:
    email_service = EmailService()
    await email_service.initialize()

    success = await email_service.sendEmailNotification(
        to="patient@example.com",
        subject="Your appointment is confirmed",
        htmlBody="<h1>Confirmed!</h1><p>See you at 10 AM</p>",
    )
"""

from typing import Optional

from medicus_common.core.logging_config import logger

from src.providers.acs_email_provider import AcsEmailProvider


class EmailService:
    """
    Reusable email notification service backed by Azure Communication Services.

    Single Responsibility: orchestrate email sends with consistent logging,
    error handling, and a stable public API regardless of the underlying
    delivery provider.
    """

    def __init__(self, provider: Optional[AcsEmailProvider] = None) -> None:
        # Dependency injection supported for testability;
        # defaults to a standard AcsEmailProvider instance.
        self._provider = provider or AcsEmailProvider()
        self._initialized: bool = False

    async def initialize(self) -> None:
        """Initialize the underlying provider.  Call once at service startup."""
        await self._provider.initialize()
        self._initialized = self._provider.initialized
        if self._initialized:
            logger.info("EmailService ready (ACS Email provider initialized).")
        else:
            logger.warning(
                "EmailService: ACS Email provider failed to initialize — "
                "email notifications will not be delivered."
            )

    async def sendEmailNotification(
        self,
        to: str,
        subject: str,
        htmlBody: str,
    ) -> bool:
        """
        Send an email notification.

        Args:
            to:       Recipient email address.
            subject:  Email subject line.
            htmlBody: Full HTML body. A plain-text fallback is derived automatically
                      inside AcsEmailProvider so every email is dual-format.

        Returns:
            True if the email was delivered successfully, False otherwise.
        """
        # Guard: log clearly if not initialised so callers don't silently lose emails
        if not self._initialized:
            logger.error(
                f"EmailService.sendEmailNotification: provider not initialized — "
                f"skipping email to {to!r} subject={subject!r}"
            )
            return False

        try:
            result = await self._provider.send(
                to_address=to,
                title=subject,
                body=htmlBody,
            )

            if result.success:
                logger.info(
                    f"EmailService: email delivered to={to!r} "
                    f"subject={subject!r} "
                    f"message_id={result.provider_message_id}"
                )
                return True
            else:
                logger.error(
                    f"EmailService: email delivery failed to={to!r} "
                    f"subject={subject!r} "
                    f"error={result.error_message!r} "
                    f"permanent={result.is_permanent_failure}"
                )
                return False

        except Exception as exc:
            # Defensive catch — unexpected errors must not bubble up and break the
            # caller (e.g. the notification worker) which expects a bool return.
            logger.error(
                f"EmailService: unexpected exception sending to={to!r}: {exc}",
                exc_info=True,
            )
            return False

    async def health_check(self) -> dict:
        """Proxy health check to the underlying provider."""
        return await self._provider.health_check()
