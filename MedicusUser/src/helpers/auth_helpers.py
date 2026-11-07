from dataclasses import dataclass
from typing import Dict, Any
from fastapi import Request
from medicus_common.models import User, UserLoginRequest
from src.services.auth.auth_service import AuthService


async def authenticate_user(
    user_data: UserLoginRequest,
    client_info: 'ClientInfo',
    auth_service: AuthService
) -> User:
    """
    Authenticate a user based on provided credentials and client information.

    This function optionally bypasses standard authentication for development/testing
    purposes using DevBypassService. If dev bypass is not enabled for the client,
    it calls AuthService to perform standard authentication.

    Args:
        user_data (UserLoginRequest): User login credentials (identifier & password).
        client_info (ClientInfo): Client metadata such as IP and User-Agent.
        auth_service (AuthService): Service responsible for authenticating users.

    Returns:
        User: Authenticated user object.

    Raises:
        AuthenticationError (from AuthService): If authentication fails.
    """
    return await auth_service.authenticate_user(
        user_data.identifier,
        user_data.password,
        client_info.ip,
        client_info.user_agent
    )


async def create_tokens(auth_service: AuthService, user: User):
    """
    Generate JWT access and refresh tokens for an authenticated user.

    Args:
        auth_service (AuthService): Service responsible for token creation.
        user (User): The authenticated user object.

    Returns:
        Tuple[str, str, int]: access_token, refresh_token, expires_in_seconds.
    """
    access_token, refresh_token = await auth_service.create_tokens(user)
    expires_in = auth_service.settings.jwt_access_token_expire_minutes * 60
    return access_token, refresh_token, expires_in


def build_login_response(
    user: User,
    complete_data: Dict[str, Any],
    access_token: str,
    refresh_token: str,
    expires_in: int
) -> Dict[str, Any]:
    """
    Construct the full login response payload for the client.

    Combines user profile data and authentication tokens into a single dictionary.

    Args:
        user (User): The authenticated user object.
        complete_data (Dict[str, Any]): Complete profile data (user, doctor, patient, conversations).
        access_token (str): JWT access token.
        refresh_token (str): JWT refresh token.
        expires_in (int): Expiration time of the access token in seconds.

    Returns:
        Dict[str, Any]: Response dictionary suitable for sending to the client.
    """
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": expires_in,
        "user": complete_data["user"],
        "doctorProfile": complete_data.get("doctor"),
        "patientProfile": complete_data.get("patient"),
        "conversations": complete_data.get("conversations", []),  # Add this line
        "user_assistant": complete_data.get("user_assistant"),  # Optional: include assistant mode
        "retrieved_at": complete_data.get("retrieved_at")  # Optional: include timestamp
    }


@dataclass
class ClientInfo:
    """
    Stores metadata about the client making the request.

    Attributes:
        ip (str): IP address of the client.
        user_agent (str): User-Agent string from the client request.
    """
    ip: str
    user_agent: str

    @classmethod
    def from_request(cls, request: Request) -> 'ClientInfo':
        """
        Extract client IP and User-Agent from a FastAPI Request object.

        Args:
            request (Request): Incoming HTTP request.

        Returns:
            ClientInfo: Instance containing extracted client metadata.
        """
        return cls(
            ip=request.client.host if request.client else "unknown",
            user_agent=request.headers.get("user-agent", "unknown")
        )


class UserRepository:
    """
    Repository class for transforming raw database rows into user dictionaries.

    Static methods only; no instance state.
    """
    @staticmethod
    def transform_user(row: dict) -> dict:
        """
        Transform a raw database row into a structured user dictionary.

        Ensures that metadata is normalized, converts account status to UserStatus enum,
        and properly sets password fields.

        Args:
            row (dict): Raw database row representing a user.

        Returns:
            dict: Transformed user dictionary with consistent keys and types.
        """
        from medicus_common.utils.helpers import ensure_metadata_dict
        from medicus_common.models.user import UserStatus

        user_dict = ensure_metadata_dict(dict(row))
        user_dict["password_hash"] = user_dict.pop("password", "")
        user_dict["status"] = UserStatus(user_dict.pop("account_status", "active"))
        user_dict["password"] = user_dict["password_hash"]
        user_dict["account_status"] = user_dict["status"].value
        return user_dict
