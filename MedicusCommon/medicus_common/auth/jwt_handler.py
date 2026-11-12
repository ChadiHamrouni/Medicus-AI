# medicus_common/auth/jwt_handler.py
"""JWT token handling utilities."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, Union

from jose import JWTError, jwt
from pydantic import BaseModel, Field

from medicus_common.core.exceptions import AuthenticationError, TokenExpiredError

logger = logging.getLogger(__name__)


class TokenPayload(BaseModel):
    """JWT token payload model."""

    sub: Union[str, int] = Field(..., description="Subject (user ID)")
    exp: datetime = Field(..., description="Expiration time")
    iat: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Issued at")
    jti: Optional[str] = Field(None, description="JWT ID for revocation")

    # Custom claims
    email: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[list[str]] = []
    session_id: Optional[str] = None

    # Additional metadata
    metadata: Optional[Dict[str, Any]] = {}


class JWTHandler:
    """Handles JWT token creation and validation."""

    def __init__(
            self,
            secret: str,
            algorithm: str = "HS256",
            expiration_days: int = 7,
            issuer: Optional[str] = None,
            audience: Optional[str] = None
    ):
        """Initialize JWT handler.

        Args:
            secret: Secret key for signing tokens
            algorithm: JWT algorithm
            expiration_days: Token expiration in days
            issuer: Token issuer (for validation)
            audience: Token audience (for validation)
        """
        self.secret = secret
        self.algorithm = algorithm
        self.expiration_days = expiration_days
        self.issuer = issuer
        self.audience = audience

    def create_token(
            self,
            subject: Union[str, int],
            email: Optional[str] = None,
            role: Optional[str] = None,
            permissions: Optional[list[str]] = None,
            session_id: Optional[str] = None,
            metadata: Optional[Dict[str, Any]] = None,
            expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT token.

        Args:
            subject: User ID or username
            email: User email
            role: User role
            permissions: List of permissions
            session_id: Session identifier
            metadata: Additional metadata
            expires_delta: Custom expiration time

        Returns:
            Encoded JWT token
        """
        # Calculate expiration
        if expires_delta is not None:   # timedelta(0) is falsy but is a real (immediate) expiry
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(days=self.expiration_days)

        # Create payload
        payload = TokenPayload(
            sub=str(subject),
            exp=expire,
            email=email,
            role=role,
            permissions=permissions or [],
            session_id=session_id,
            metadata=metadata or {}
        )

        # Add standard claims
        to_encode = payload.model_dump(exclude_none=True)

        if self.issuer:
            to_encode["iss"] = self.issuer
        if self.audience:
            to_encode["aud"] = self.audience

        # Create token
        encoded_jwt = jwt.encode(to_encode, self.secret, algorithm=self.algorithm)

        logger.debug(f"Created token for subject: {subject}")
        return encoded_jwt

    def decode_token(self, token: str) -> TokenPayload:
        """Decode and validate JWT token.

        Args:
            token: JWT token to decode

        Returns:
            Token payload

        Raises:
            TokenExpiredError: If token is expired
            AuthenticationError: If token is invalid
        """
        try:
            # Decode token
            options = {"verify_exp": True}

            payload = jwt.decode(
                token,
                self.secret,
                algorithms=[self.algorithm],
                options=options,
                issuer=self.issuer,
                audience=self.audience
            )

            # Convert to TokenPayload
            return TokenPayload(**payload)

        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            raise TokenExpiredError("Token has expired")
        except JWTError as e:
            logger.warning(f"Invalid token: {e}")
            raise AuthenticationError(f"Invalid token: {str(e)}")

    def verify_token(self, token: str) -> Optional[TokenPayload]:
        """Verify token without raising exceptions.

        Args:
            token: JWT token to verify

        Returns:
            Token payload if valid, None otherwise
        """
        try:
            return self.decode_token(token)
        except (TokenExpiredError, AuthenticationError):
            return None

    def refresh_token(self, token: str, verify_exp: bool = False) -> str:
        """Refresh JWT token.

        Args:
            token: Current JWT token
            verify_exp: Whether to verify expiration

        Returns:
            New JWT token

        Raises:
            AuthenticationError: If token is invalid
        """
        try:
            # Decode without expiration check if requested
            options = {"verify_exp": verify_exp}

            payload = jwt.decode(
                token,
                self.secret,
                algorithms=[self.algorithm],
                options=options,
                issuer=self.issuer,
                audience=self.audience
            )

            # Create new token with same claims but new expiration
            return self.create_token(
                subject=payload["sub"],
                email=payload.get("email"),
                role=payload.get("role"),
                permissions=payload.get("permissions", []),
                session_id=payload.get("session_id"),
                metadata=payload.get("metadata", {})
            )

        except JWTError as e:
            logger.warning(f"Failed to refresh token: {e}")
            raise AuthenticationError(f"Failed to refresh token: {str(e)}")

    def create_access_token(self, subject: Union[str, int], **kwargs) -> str:
        """Create short-lived access token.

        Args:
            subject: User ID or username
            **kwargs: Additional claims

        Returns:
            Access token
        """
        return self.create_token(
            subject=subject,
            expires_delta=timedelta(minutes=15),
            **kwargs
        )

    def create_refresh_token(self, subject: Union[str, int], **kwargs) -> str:
        """Create long-lived refresh token.

        Args:
            subject: User ID or username
            **kwargs: Additional claims

        Returns:
            Refresh token
        """
        return self.create_token(
            subject=subject,
            expires_delta=timedelta(days=30),
            **kwargs
        )

    def get_token_expiry(self, token: str) -> Optional[datetime]:
        """Get token expiration time.

        Args:
            token: JWT token

        Returns:
            Expiration datetime or None if invalid
        """
        try:
            payload = self.decode_token(token)
            return payload.exp
        except (TokenExpiredError, AuthenticationError):
            return None

    def is_token_expired(self, token: str) -> bool:
        """Check if token is expired.

        Args:
            token: JWT token

        Returns:
            True if expired, False otherwise
        """
        expiry = self.get_token_expiry(token)
        if expiry is None:
            return True
        return expiry < datetime.now(timezone.utc)