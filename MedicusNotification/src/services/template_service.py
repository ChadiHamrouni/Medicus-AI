"""
Simplified template service.
Handles template loading and Jinja2 rendering.
"""

from typing import Any, Dict, Optional

from jinja2 import TemplateError
from jinja2.sandbox import SandboxedEnvironment

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger


class TemplateService:
    """
    Template service per spec.

    - Templates stored in DB with versioning
    - Jinja2 rendering
    - No PHI in push/SMS
    """

    def __init__(self):
        self.db = None
        self.jinja_env = None

    async def initialize(self):
        """Initialize template service."""
        self.db = db_manager

        # Templates render plain text (push/SMS/email text part); the email provider
        # HTML-escapes when it builds the HTML part. The sandbox stops templates
        # stored in the database from reaching Python internals.
        self.jinja_env = SandboxedEnvironment(
            autoescape=False,
            trim_blocks=True,
            lstrip_blocks=True,
        )

        # Register custom filters
        self.jinja_env.filters["datetime_format"] = self._datetime_format
        self.jinja_env.filters["phone_format"] = self._phone_format
        # as_time / as_date — used in push/email templates for appointment times.
        # The payload already carries pre-formatted strings from _enrich_payload
        # (e.g. "02:02 PM", "March 04, 2026"), so these filters are pass-through
        # when a string is given, and fall back to strftime for raw datetime objects.
        self.jinja_env.filters["as_time"] = self._as_time
        self.jinja_env.filters["as_date"] = self._as_date


        logger.info("TemplateService initialized")

    async def get_template(
        self,
        key: str,
        version: int,
        channel: str,
        language: str = "en",
    ) -> Optional[Dict[str, Any]]:
        """
        Get template by key, version, channel, language.

        Returns dict with title and body, or None if not found.
        """
        query = """
            SELECT title, body
            FROM notif.notification_templates
            WHERE key = $1 AND version = $2 AND channel = $3 AND language = $4
            AND is_active = TRUE
        """
        record = await self.db.fetchrow(query, key, version, channel, language)

        if not record:
            # Try fallback to English
            if language != "en":
                return await self.get_template(key, version, channel, "en")
            return None

        return {
            "title": record["title"],
            "body": record["body"],
        }

    async def render_template(
        self,
        key: str,
        version: int,
        channel: str,
        variables: Dict[str, Any],
        language: str = "en",
    ) -> Optional[Dict[str, str]]:
        """
        Load and render a template with variables.

        Returns dict with rendered title and body.
        """
        template_data = await self.get_template(key, version, channel, language)

        if not template_data:
            logger.error(f"Template not found: {key} v{version} {channel} {language}")
            return None

        try:
            result = {}

            # Render title — use jinja_env.from_string() (not Template()) so that
            # all registered custom filters (as_time, as_date, etc.) are available.
            if template_data.get("title"):
                title_template = self.jinja_env.from_string(template_data["title"])
                result["title"] = title_template.render(**variables)
            else:
                result["title"] = None

            # Render body
            body_template = self.jinja_env.from_string(template_data["body"])
            result["body"] = body_template.render(**variables)

            return result

        except TemplateError as e:
            logger.error(f"Template rendering error for {key}: {e}")
            return None

    def _datetime_format(self, value, format_string="%Y-%m-%d %H:%M") -> str:
        """Format datetime."""
        if hasattr(value, "strftime"):
            return value.strftime(format_string)
        return str(value)

    def _phone_format(self, value) -> str:
        """Format phone number as (XXX) XXX-XXXX."""
        if not value:
            return ""

        digits = "".join(filter(str.isdigit, str(value)))

        if len(digits) == 10:
            return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
        elif len(digits) == 11 and digits[0] == "1":
            return f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"

        return value

    def _as_time(self, value, fmt: str = "%I:%M %p") -> str:
        """
        Format a value as a time string for use in templates.
        - If the value is already a plain string (pre-formatted by _enrich_payload,
          e.g. '02:02 PM'), it is returned unchanged.
        - If it is a datetime/time object, it is formatted with *fmt*.
        """
        if isinstance(value, str):
            return value
        if hasattr(value, "strftime"):
            return value.strftime(fmt)
        return str(value) if value is not None else ""

    def _as_date(self, value, fmt: str = "%B %d, %Y") -> str:
        """
        Format a value as a date string for use in templates.
        - If the value is already a plain string (e.g. 'March 04, 2026'), return as-is.
        - If it is a datetime/date object, format with *fmt*.
        """
        if isinstance(value, str):
            return value
        if hasattr(value, "strftime"):
            return value.strftime(fmt)
        return str(value) if value is not None else ""


    async def cleanup(self):
        """Cleanup resources."""
        if self.jinja_env:
            self.jinja_env = None
        logger.info("TemplateService cleanup complete")
