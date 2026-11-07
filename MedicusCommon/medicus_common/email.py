"""
Outgoing email with a pluggable backend (EMAIL_BACKEND):

  smtp     (default) any SMTP server: Postfix, Mailpit/MailHog for development,
           SES/SendGrid/Mailgun/Postmark SMTP relays, Gmail, ...
  azure    Azure Communication Services Email (optional `azure` extra)
  console  print messages to the log instead of sending them. Development only:
           messages may contain one-time codes.
  none     drop all messages
"""

import asyncio
import smtplib
import ssl
from email.message import EmailMessage
from functools import lru_cache
from typing import Literal, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from medicus_common.core.logging_config import logger


class EmailSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    backend: Literal["smtp", "azure", "console", "none"] = Field("smtp", alias="EMAIL_BACKEND")
    from_address: str = Field("Medicus <no-reply@localhost>", alias="EMAIL_FROM")
    smtp_host: str = Field("localhost", alias="SMTP_HOST")
    smtp_port: int = Field(587, alias="SMTP_PORT")
    smtp_username: Optional[str] = Field(None, alias="SMTP_USERNAME")
    smtp_password: Optional[str] = Field(None, alias="SMTP_PASSWORD")
    smtp_security: Literal["starttls", "ssl", "none"] = Field("starttls", alias="SMTP_SECURITY")
    azure_connection_string: Optional[str] = Field(None, alias="AZURE_EMAIL_CONNECTION_STRING")
    environment: str = Field("development", alias="ENVIRONMENT")


@lru_cache
def get_email_settings() -> EmailSettings:
    return EmailSettings()


def _send_smtp(s: EmailSettings, message: EmailMessage) -> None:
    if s.smtp_security == "ssl":
        server: smtplib.SMTP = smtplib.SMTP_SSL(s.smtp_host, s.smtp_port, context=ssl.create_default_context(), timeout=20)
    else:
        server = smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=20)
    with server:
        if s.smtp_security == "starttls":
            server.starttls(context=ssl.create_default_context())
        if s.smtp_username:
            server.login(s.smtp_username, s.smtp_password or "")
        server.send_message(message)


def _send_azure(s: EmailSettings, to: str, subject: str, text: str, html: Optional[str]) -> None:
    from azure.communication.email import EmailClient

    if not s.azure_connection_string:
        raise RuntimeError("EMAIL_BACKEND=azure requires AZURE_EMAIL_CONNECTION_STRING")
    content = {"subject": subject, "plainText": text}
    if html:
        content["html"] = html
    EmailClient.from_connection_string(s.azure_connection_string).begin_send({
        "senderAddress": s.from_address.split("<")[-1].rstrip(">").strip(),
        "recipients": {"to": [{"address": to}]},
        "content": content,
    }).result()


async def send_email(to: str, subject: str, text: str, html: Optional[str] = None) -> bool:
    """Send one message. Returns False (and logs) on failure; never raises."""
    s = get_email_settings()
    try:
        if s.backend == "none":
            return True
        if s.backend == "console":
            if s.environment == "production":
                logger.error("EMAIL_BACKEND=console is not allowed in production; message dropped")
                return False
            logger.warning(f"[EMAIL:console] to={to} subject={subject!r}\n{text}")
            return True
        if s.backend == "azure":
            await asyncio.to_thread(_send_azure, s, to, subject, text, html)
            return True

        message = EmailMessage()
        message["From"] = s.from_address
        message["To"] = to
        message["Subject"] = subject
        message.set_content(text)
        if html:
            message.add_alternative(html, subtype="html")
        await asyncio.to_thread(_send_smtp, s, message)
        return True
    except Exception as e:
        logger.error(f"Email delivery failed ({s.backend}): {type(e).__name__}: {e}")
        return False
