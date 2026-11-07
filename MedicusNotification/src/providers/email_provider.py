"""Email delivery through medicus_common.email (SMTP by default; Azure ACS or console optional)."""

import html
import os
from typing import Any, Dict, Optional

from medicus_common.email import get_email_settings, send_email

from .base import BaseProvider, ProviderResult


def _text_to_html(text: str) -> str:
    """Escape rendered template text (it can contain user-supplied values) and keep line breaks."""
    body = "<br>".join(html.escape(line) for line in text.splitlines())
    return f'<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">{body}</div>'


class EmailProvider(BaseProvider):
    name = "email"

    def __init__(self) -> None:
        self.initialized = False

    async def initialize(self) -> None:
        self.initialized = get_email_settings().backend != "none"

    async def send(self, to_address: str, title: Optional[str], body: str,
                   data: Optional[Dict[str, Any]] = None) -> ProviderResult:
        subject = title or f"Notification from {os.getenv('APP_NAME', 'Medicus')}"
        if await send_email(to_address, subject, body, _text_to_html(body)):
            return ProviderResult(success=True)
        # Delivery errors (SMTP outage, throttling) are worth retrying.
        return ProviderResult(success=False, error_message="email delivery failed", is_permanent_failure=False)

    async def health_check(self) -> Dict[str, Any]:
        return {"provider": "email", "backend": get_email_settings().backend, "initialized": self.initialized}
