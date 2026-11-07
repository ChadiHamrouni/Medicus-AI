"""One-time verification codes (email/phone verification, password reset) and their emails."""

import hashlib
import hmac
import html
import os
import secrets
from datetime import datetime, timedelta, timezone

import structlog

from medicus_common.core.database import db_manager
from medicus_common.core.exceptions import DatabaseError
from medicus_common.email import send_email

logger = structlog.get_logger()

CODE_TTL = timedelta(minutes=15)
MAX_ATTEMPTS = 5


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def _brand() -> str:
    return os.getenv("APP_NAME", "Medicus")


def _column(identifier: str) -> str:
    return "email" if "@" in identifier else "phone_number"


class EmailService:
    async def generate_verification_code(self, identifier: str, code_type: str = "email_verification") -> str:
        """Create a fresh 6-digit code (replacing earlier ones) and return it for delivery."""
        code = f"{secrets.randbelow(1_000_000):06d}"
        column = _column(identifier)
        try:
            async with db_manager.transaction() as conn:
                await conn.execute(
                    f"DELETE FROM auth.verification_codes WHERE {column} = $1 AND code_type = $2",
                    identifier, code_type,
                )
                await conn.execute(
                    f"""INSERT INTO auth.verification_codes ({column}, code_hash, code_type, expires_at)
                        VALUES ($1, $2, $3, $4)""",
                    identifier, _hash_code(code), code_type, datetime.now(timezone.utc) + CODE_TTL,
                )
        except Exception as e:
            logger.error("Failed to generate verification code", error=str(e), code_type=code_type)
            raise DatabaseError("Failed to generate verification code") from e
        return code

    async def verify_code(self, identifier: str, code: str, code_type: str = "email_verification") -> bool:
        """
        Check a code. Each wrong guess counts against the code; after MAX_ATTEMPTS
        the code is unusable and a new one must be requested.
        """
        column = _column(identifier)
        async with db_manager.transaction() as conn:
            row = await conn.fetchrow(
                f"""SELECT id, code_hash, expires_at, used_at, attempts FROM auth.verification_codes
                    WHERE {column} = $1 AND code_type = $2 ORDER BY created_at DESC LIMIT 1 FOR UPDATE""",
                identifier, code_type,
            )
            if row is None or row["used_at"] or row["attempts"] >= MAX_ATTEMPTS:
                return False
            if row["expires_at"] < datetime.now(timezone.utc):
                return False
            if not hmac.compare_digest(row["code_hash"], _hash_code((code or "").strip())):
                await conn.execute("UPDATE auth.verification_codes SET attempts = attempts + 1 WHERE id = $1", row["id"])
                logger.warning("Invalid verification code", code_type=code_type)
                return False

            now = datetime.now(timezone.utc)
            await conn.execute("UPDATE auth.verification_codes SET used_at = $1 WHERE id = $2", now, row["id"])
            if code_type == "email_verification":
                await conn.execute(
                    "UPDATE auth.users SET is_email_verified = true, updated_at = $1 WHERE lower(email) = lower($2)",
                    now, identifier,
                )
            elif code_type == "phone_verification":
                await conn.execute(
                    "UPDATE auth.users SET is_phone_verified = true, updated_at = $1 WHERE phone_number = $2",
                    now, identifier,
                )
        return True

    async def send_verification_email(self, email: str, code: str, user_name: str = "") -> bool:
        brand = _brand()
        greeting = f"Hi {user_name or 'there'},"
        text = (f"{greeting}\n\nYour {brand} email verification code is: {code}\n\n"
                f"This code expires in 15 minutes. If you didn't request it, ignore this email.\n\n— {brand}")
        return await send_email(email, f"{brand} - Email verification code", text,
                                self._html(brand, "Email verification", greeting,
                                           "Use this code to verify your email address:", code, "#2c5aa0"))

    async def send_password_reset_email(self, email: str, code: str, user_name: str = "") -> bool:
        brand = _brand()
        greeting = f"Hi {user_name or 'there'},"
        text = (f"{greeting}\n\nYour {brand} password reset code is: {code}\n\n"
                f"This code expires in 15 minutes. If you didn't request a reset, ignore this email; "
                f"your password will not change.\n\n— {brand}")
        return await send_email(email, f"{brand} - Password reset code", text,
                                self._html(brand, "Password reset", greeting,
                                           "Use this code to reset your password:", code, "#dc3545"))

    @staticmethod
    def _html(brand: str, title: str, greeting: str, lead: str, code: str, color: str) -> str:
        brand, title, greeting, lead = (html.escape(v) for v in (brand, title, greeting, lead))
        return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{title} - {brand}</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: {color}; text-align: center;">{brand}</h1>
    <h2>{title}</h2>
    <p>{greeting}</p>
    <p>{lead}</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; letter-spacing: 8px; color: {color}; border: 2px solid {color};
                   border-radius: 8px; padding: 16px 24px; display: inline-block;">{code}</span>
    </div>
    <p><strong>This code expires in 15 minutes.</strong></p>
    <p style="font-size: 12px; color: #666;">If you didn't request this, you can ignore this email.</p>
  </div>
</body></html>"""
