# =============================================================================
# src/services/auth_service.py
"""Authentication service implementation - Fixed for modern Python."""

import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from jose import jwt, JWTError, ExpiredSignatureError
from passlib.context import CryptContext

from medicus_common.models.user import User, UserStatus
from medicus_common.core.config import get_settings
from medicus_common.core.database import db_manager
from medicus_common.core.exceptions import (
    AuthenticationError,
    UserNotFoundError,
    AccountLockedError,
    InvalidTokenError,
    DatabaseError
)
from medicus_common.core.logging_config import logger


class AuthService:
    """Authentication service with security features."""

    def __init__(self):
        self.settings = get_settings()
        # TEMPORARY: Skip CryptContext initialization in development to avoid bcrypt issues
        try:
            self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        except Exception as e:
            self.pwd_context = None

    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt."""
        return self.pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against bcrypt hash."""
        if not hashed_password or self.pwd_context is None:
            logger.warning(f"Password verification failed: hashed_password={bool(hashed_password)}, pwd_context={bool(self.pwd_context)}")
            return False

        # Only accept bcrypt hashes (starting with $2b$, $2a$, etc.)
        if not hashed_password.startswith('$2'):
            logger.warning(f"Password hash doesn't start with $2: {hashed_password[:10] if len(hashed_password) > 10 else hashed_password}")
            return False

        try:
            result = self.pwd_context.verify(plain_password, hashed_password)
            if not result:
                logger.warning(f"Password verification failed: bcrypt verify returned False")
            return result
        except Exception as e:
            # Log security event with exception details
            logger.warning(f"Password verification exception: {type(e).__name__}: {str(e)}")
            return False

    async def authenticate_user(self, identifier: str, password: str, ip_address: str, user_agent: str) -> User:
        
        # Determine if identifier is email or phone
        is_email = '@' in identifier
        identifier = identifier.lower().strip() if is_email else identifier.strip()
        
        # Get user by email or phone using UserService
        from src.services.auth.user_service import UserService
        if is_email:
            user = await UserService.get_user_by_email(identifier)
        else:
            user = await UserService.get_user_by_phone(identifier)

        if not user:
            await self._log_login_attempt(identifier, ip_address, user_agent, False, "User not found")
            raise AuthenticationError("Invalid credentials")

        # Check if account is locked
        if user.locked_until and user.locked_until > datetime.now(timezone.utc):
            await self._log_login_attempt(identifier, ip_address, user_agent, False, "Account locked")
            raise AccountLockedError("Account is temporarily locked")

        # Verify password before revealing anything about the account's state.
        if not self.verify_password(password, user.password_hash):
            await self._handle_failed_login(user, ip_address, user_agent)
            raise AuthenticationError("Invalid credentials")

        if user.status != UserStatus.ACTIVE:
            await self._log_login_attempt(identifier, ip_address, user_agent, False, f"Account {user.status}")
            raise AuthenticationError(f"Account is {user.status.value}")

        # Reset failed attempts on successful login
        await self._reset_failed_attempts(user.id)
        await self._update_last_login(user.id)
        await self._log_login_attempt(identifier, ip_address, user_agent, True)

        return user

    async def create_tokens(self, user: User) -> Tuple[str, str]:
        """Create access and refresh tokens."""
        # Create access token
        access_token_expires = timedelta(minutes=self.settings.jwt_access_token_expire_minutes)
        access_token = self._create_access_token(
            data={
                "sub": str(user.id), 
                "role": user.role.value,
                "email": user.email or "no-email@placeholder.com"  # Include email in JWT
            },
            expires_delta=access_token_expires
        )

        # Create refresh token
        refresh_token = await self._create_refresh_token(user.id)

        return access_token, refresh_token

    def _create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token."""
        to_encode = data.copy()

        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta  # Fixed: timezone-aware datetime
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=15)  # Fixed: timezone-aware datetime

        to_encode.update({
            "exp": expire,
            "iat": datetime.now(timezone.utc),  # Fixed: timezone-aware datetime
            "iss": self.settings.app_name,
            "aud": "medicus-api"
        })

        encoded_jwt = jwt.encode(
            to_encode,
            self.settings.jwt_secret_key,
            algorithm=self.settings.jwt_algorithm
        )
        return encoded_jwt

    async def _create_refresh_token(self, user_id: int) -> str:
        """Create and store refresh token."""
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        expires_at = datetime.now(timezone.utc) + timedelta(
            days=self.settings.jwt_refresh_token_expire_days)  # Fixed: timezone-aware datetime

        # Store in database
        query = """
            INSERT INTO auth.refresh_tokens (user_id, token_hash, expires_at, created_at)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        """

        await db_manager.execute(
            query,
            user_id,
            token_hash,
            expires_at,
            datetime.now(timezone.utc)  # Fixed: timezone-aware datetime
        )

        return token

    async def refresh_access_token(self, refresh_token: str) -> Tuple[str, str, int]:
        """Refresh access token using refresh token. Returns (access_token, refresh_token, user_id)."""

        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()

        # Query ONLY refresh_tokens table - no redundant JOIN
        query = """
            SELECT id, user_id, expires_at, revoked
            FROM auth.refresh_tokens
            WHERE token_hash = $1
        """

        row = await db_manager.fetchrow(query, token_hash)
        if not row:
            logger.warning(f"Refresh token not found in database")
            raise InvalidTokenError("Invalid refresh token")

        user_id = row['user_id']

        if row['revoked']:
            # A rotated token was replayed: assume it was stolen and end every session.
            logger.warning(f"Refresh token reuse detected for user {user_id}; revoking all sessions")
            await self.revoke_all_user_tokens(user_id)
            raise InvalidTokenError("Refresh token expired or revoked")
        if row['expires_at'] < datetime.now(timezone.utc):
            raise InvalidTokenError("Refresh token expired or revoked")

        from src.services.auth.user_service import UserService
        user = await UserService.get_user_by_id(user_id)
        if not user or user.status != UserStatus.ACTIVE:
            raise InvalidTokenError("Account is not active")

        access_token, new_refresh_token = await self.create_tokens(user)

        # Revoke old refresh token
        await self._revoke_refresh_token(row['id'])

        return access_token, new_refresh_token, user_id

    async def reset_password(self, user_id: int, new_password: str) -> bool:
        """Reset user password (called from password reset flow)."""
        try:
            # Hash new password
            new_password_hash = self.hash_password(new_password)

            # Update password in database
            query = """
                UPDATE auth.users 
                SET password = $1, updated_at = $2
                WHERE id = $3
            """

            await db_manager.execute(
                query,
                new_password_hash,
                datetime.now(timezone.utc),
                user_id
            )

            # Revoke all existing refresh tokens for security
            await self.revoke_all_user_tokens(user_id)

            return True

        except Exception as e:
            raise DatabaseError(f"Failed to reset password: {e}")

    async def _handle_failed_login(self, user: User, ip_address: str, user_agent: str) -> None:
        """Handle failed login attempt."""
        failed_attempts = user.failed_login_attempts + 1

        # Lock account if too many failures
        locked_until = None
        if failed_attempts >= self.settings.max_login_attempts:
            locked_until = datetime.now(timezone.utc) + timedelta(
                minutes=self.settings.lockout_duration_minutes)  # Fixed: timezone-aware datetime

        # Update user - use your exact database column names
        query = """
            UPDATE auth.users 
            SET failed_login_attempts = $1, locked_until = $2, updated_at = $3
            WHERE id = $4
        """

        await db_manager.execute(
            query,
            failed_attempts,
            locked_until,
            datetime.now(timezone.utc),  # Fixed: timezone-aware datetime
            user.id
        )

        await self._log_login_attempt(
            str(user.email or user.phone_number),  # Use email or phone
            ip_address,
            user_agent,
            False,
            "Invalid password"
        )

    @staticmethod
    async def _reset_failed_attempts(user_id: int) -> None:
        """Reset failed login attempts."""
        query = """
            UPDATE auth.users 
            SET failed_login_attempts = 0, locked_until = NULL, updated_at = $1
            WHERE id = $2
        """

        await db_manager.execute(query, datetime.now(timezone.utc), user_id)  # Fixed: timezone-aware datetime

    @staticmethod
    async def _update_last_login(user_id: int) -> None:
        """Update last login timestamp."""
        query = """
            UPDATE auth.users 
            SET last_login = $1, updated_at = $1
            WHERE id = $2
        """

        await db_manager.execute(query, datetime.now(timezone.utc), user_id)  # Fixed: timezone-aware datetime

    @staticmethod
    async def _log_login_attempt(
            identifier: str,
            ip_address: str,
            user_agent: str,
            success: bool,
            failure_reason: Optional[str] = None
    ) -> None:
        """Log login attempt for security audit."""
        # Determine if identifier is email or phone for logging
        is_email = '@' in identifier
        query = """
            INSERT INTO auth.login_attempts 
            (email, ip_address, user_agent, success, failure_reason, attempted_at)
            VALUES ($1, $2, $3, $4, $5, $6)
        """

        # Use placeholder email for phone-based logins to satisfy NOT NULL constraint
        email_for_logging = identifier if is_email else f"phone_{identifier}@placeholder.local"

        await db_manager.execute(
            query,
            email_for_logging,
            ip_address,
            user_agent,
            success,
            failure_reason,
            datetime.now(timezone.utc)  # Fixed: timezone-aware datetime
        )

    @staticmethod
    async def _revoke_refresh_token(token_id: int) -> None:
        """Revoke refresh token."""
        query = """
            UPDATE auth.refresh_tokens 
            SET revoked = TRUE, revoked_at = $1
            WHERE id = $2
        """

        await db_manager.execute(query, datetime.now(timezone.utc), token_id)  # Fixed: timezone-aware datetime

    @staticmethod
    async def revoke_refresh_token_value(refresh_token: str) -> None:
        """Revoke a refresh token by its raw value (logout)."""
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        await db_manager.execute(
            "UPDATE auth.refresh_tokens SET revoked = TRUE, revoked_at = $1 WHERE token_hash = $2 AND revoked = FALSE",
            datetime.now(timezone.utc), token_hash,
        )

    @staticmethod
    async def revoke_all_user_tokens(user_id: int) -> None:
        """Revoke all refresh tokens for a user (useful for logout all devices)."""
        query = """
            UPDATE auth.refresh_tokens 
            SET revoked = TRUE, revoked_at = $1
            WHERE user_id = $2 AND revoked = FALSE
        """

        result = await db_manager.execute(query, datetime.now(timezone.utc), user_id)  # Fixed: timezone-aware datetime

    @staticmethod
    async def cleanup_expired_tokens() -> int:
        """Clean up expired refresh tokens (should be run periodically)."""
        query = """
            DELETE FROM auth.refresh_tokens 
            WHERE expires_at < $1 OR revoked = TRUE
        """

        result = await db_manager.execute(query, datetime.now(timezone.utc))  # Fixed: timezone-aware datetime

        # Extract number of deleted rows from result
        deleted_count = 0
        if "DELETE " in result:
            try:
                deleted_count = int(result.split(" ")[1])
            except (IndexError, ValueError):
                pass

        return deleted_count

    @staticmethod
    async def get_user_active_sessions(user_id: int) -> int:
        """Get count of active refresh tokens for a user."""
        query = """
            SELECT COUNT(*) 
            FROM auth.refresh_tokens 
            WHERE user_id = $1 AND expires_at > $2 AND revoked = FALSE
        """

        count = await db_manager.fetchval(query, user_id, datetime.now(timezone.utc))  # Fixed: timezone-aware datetime
        return count or 0

    async def verify_token_payload(self, token: str) -> dict:
        """Verify and decode JWT token payload."""
        try:
            payload = jwt.decode(
                token,
                self.settings.jwt_secret_key,
                algorithms=[self.settings.jwt_algorithm],
                audience="medicus-api",  
                issuer=self.settings.app_name
            )

            # Check if token is expired
            if payload.get("exp", 0) < datetime.now(timezone.utc).timestamp():  # Fixed: timezone-aware datetime
                raise InvalidTokenError("Token has expired")

            return payload

        except ExpiredSignatureError:
            raise InvalidTokenError("Token has expired")
        except JWTError as e:  # Use JWTError instead of jwt.InvalidTokenError
            raise InvalidTokenError(f"Invalid token: {e}")
        except Exception as e:
            raise AuthenticationError(f"Token verification failed: {e}")

    async def revoke_token(self, token: str) -> bool:
        """Revoke access token by adding to blacklist."""
        try:
            # Decode token to get user_id and expiry
            payload = await self.verify_token_payload(token)
            user_id = int(payload.get("sub"))
            exp = payload.get("exp", 0)
            
            # Create token hash for storage
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            expires_at = datetime.fromtimestamp(exp, timezone.utc)
            
            # Store in blacklist table (create if not exists)
            query = """
                INSERT INTO auth.token_blacklist (token_hash, user_id, expires_at, revoked_at)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (token_hash) DO NOTHING
            """
            
            await db_manager.execute(
                query,
                token_hash,
                user_id,
                expires_at,
                datetime.now(timezone.utc)
            )

            return True
            
        except Exception as e:
            # Don't raise exception to avoid blocking logout
            return False

    async def is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted."""
        try:
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            
            query = """
                SELECT 1 FROM auth.token_blacklist 
                WHERE token_hash = $1 AND expires_at > $2
            """
            
            result = await db_manager.fetchval(
                query, 
                token_hash, 
                datetime.now(timezone.utc)
            )
            
            return result is not None
            
        except Exception as e:
            # If check fails, assume token is valid to avoid blocking users
            return False

    async def change_password(self, user_id: int, old_password: str, new_password: str) -> bool:
        """Change user password with old password verification."""
        try:
            # Query users table directly for password (not exposed in view for security)
            password_query = "SELECT password FROM auth.users WHERE id = $1 AND deleted_at IS NULL"
            password_row = await db_manager.fetchrow(password_query, user_id)

            if not password_row:
                raise UserNotFoundError(f"User with ID {user_id} not found")

            # Verify old password
            if not self.verify_password(old_password, password_row['password']):
                raise AuthenticationError("Current password is incorrect")

            # Hash new password
            new_password_hash = self.hash_password(new_password)

            # Update password in database
            query = """
                UPDATE auth.users 
                SET password = $1, updated_at = $2
                WHERE id = $3
            """

            await db_manager.execute(
                query,
                new_password_hash,
                datetime.now(timezone.utc),  # Fixed: timezone-aware datetime
                user_id
            )

            # Revoke all existing refresh tokens for security
            await self.revoke_all_user_tokens(user_id)

            return True

        except (UserNotFoundError, AuthenticationError):
            raise
        except Exception as e:
            raise DatabaseError(f"Failed to change password: {e}")
