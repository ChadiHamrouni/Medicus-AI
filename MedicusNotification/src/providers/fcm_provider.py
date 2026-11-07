"""
Firebase Cloud Messaging (FCM) provider for push notifications.
"""

import json
from typing import Any, Dict, Optional

from .base import BaseProvider, ProviderResult
from src.core.config import get_notification_settings

from medicus_common.core.logging_config import logger


class FCMProvider(BaseProvider):
    """
    FCM provider for push notifications.

    Per spec:
    - Credentials from Azure Key Vault (via env var)
    - No PHI in push payloads
    - Deep links only
    """

    def __init__(self):
        self.settings = get_notification_settings()
        self.app = None
        self.initialized = False

    async def initialize(self) -> None:
        """Initialize Firebase Admin SDK."""
        try:
            import firebase_admin
            from firebase_admin import credentials

            # Check if already initialized
            try:
                self.app = firebase_admin.get_app()
                self.initialized = True
                logger.info("FCM already initialized")
                return
            except ValueError:
                pass

            # Get credentials from env
            creds_json = self.settings.fcm_credentials_json
            creds_path = self.settings.fcm_credentials_path

            if creds_json:
                # Credentials as JSON string (from Key Vault)
                cred_dict = json.loads(creds_json)
                cred = credentials.Certificate(cred_dict)
            elif creds_path:
                # Credentials from file path
                cred = credentials.Certificate(creds_path)
            else:
                logger.warning("FCM credentials not configured, provider disabled")
                return

            self.app = firebase_admin.initialize_app(cred)
            self.initialized = True
            logger.info("FCM provider initialized")

        except ImportError:
            logger.error("firebase-admin package not installed")
        except Exception as e:
            logger.error(f"Failed to initialize FCM: {e}")

    async def send(
        self,
        to_address: str,
        title: Optional[str],
        body: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> ProviderResult:
        """
        Send push notification via FCM.

        Args:
            to_address: FCM device token
            title: Notification title
            body: Notification body (NO PHI)
            data: Additional data (deep links, etc.)
        """
        if not self.initialized:
            return ProviderResult(
                success=False,
                error_message="FCM not initialized",
                is_permanent_failure=True,
            )

        try:
            from firebase_admin import messaging

            # Build notification
            notification = messaging.Notification(
                title=title,
                body=body,
            )

            # Build message
            message = messaging.Message(
                notification=notification,
                token=to_address,
                data=data or {},
            )

            # Send
            response = messaging.send(message)

            logger.info(f"FCM sent successfully, message_id: {response}")

            return ProviderResult(
                success=True,
                provider_message_id=response,
            )

        except Exception as e:
            error_str = str(e).lower()

            # Determine if permanent failure
            is_permanent = any([
                "not-registered" in error_str,
                "invalid-registration" in error_str,
                "invalid-argument" in error_str,
            ])

            logger.error(f"FCM send failed: {e}, permanent={is_permanent}")

            return ProviderResult(
                success=False,
                error_message=str(e),
                is_permanent_failure=is_permanent,
            )

    async def health_check(self) -> Dict[str, Any]:
        """Check FCM health."""
        return {
            "provider": "fcm",
            "status": "healthy" if self.initialized else "not_initialized",
            "initialized": self.initialized,
        }

    async def cleanup(self) -> None:
        """Cleanup FCM resources."""
        # Firebase Admin SDK doesn't require explicit cleanup
        pass
