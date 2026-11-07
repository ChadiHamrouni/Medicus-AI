"""
Expo Push Notification provider.
"""

import httpx
from typing import Any, Dict, Optional

from .base import BaseProvider, ProviderResult
from src.core.config import get_notification_settings
from medicus_common.core.logging_config import logger


class ExpoPushProvider(BaseProvider):
    """
    Expo Push Notification provider.
    
    Handles both iOS and Android via Expo's push service.
    """

    def __init__(self):
        self.settings = get_notification_settings()
        self.client = httpx.AsyncClient(timeout=10.0)
        self.url = "https://exp.host/--/api/v2/push/send"
        self.initialized = False

    async def initialize(self) -> None:
        """Initialize Expo provider."""
        self.initialized = True
        logger.info("ExpoPushProvider initialized")

    async def send(
        self,
        to_address: str,
        title: Optional[str],
        body: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> ProviderResult:
        """
        Send push notification via Expo.
        
        to_address should be an Expo Push Token: ExponentPushToken[...]
        """
        if not self.initialized:
            return ProviderResult(
                success=False,
                error_message="Expo provider not initialized",
                is_permanent_failure=True,
            )

        # Validate token format
        if not (to_address.startswith("ExponentPushToken[") or to_address.startswith("ExpoPushToken[")):
            logger.error(f"Invalid Expo Push Token: {to_address}")
            return ProviderResult(
                success=False,
                error_message=f"Invalid Expo Push Token format: {to_address}",
                is_permanent_failure=True,
            )

        payload = {
            "to": to_address,
            "title": title,
            "body": body,
            "data": data or {},
            "sound": "default",
        }

        # Log exactly what we are sending for debugging
        logger.info(f"[Expo Push] Sending payload data: {payload.get('data')} (type: {type(payload.get('data'))})")

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Accept-encoding": "gzip, deflate",
        }

        if self.settings.expo_access_token:
            headers["Authorization"] = f"Bearer {self.settings.expo_access_token}"

        try:
            # Expo expects a list of notification objects
            response = await self.client.post(self.url, json=[payload], headers=headers)
            
            # 4xx errors are usually permanent (invalid token, etc)
            if 400 <= response.status_code < 500:
                error_text = response.text
                logger.error(f"Expo API permanent error ({response.status_code}): {error_text}")
                return ProviderResult(
                    success=False,
                    error_message=f"Expo API Error: {error_text}",
                    is_permanent_failure=True,
                )
            
            response.raise_for_status()
            result = response.json()
            
            # Process Expo response: {"data": [{"status": "ok", "id": "..."}]}
            if "data" in result and len(result["data"]) > 0:
                delivery_status = result["data"][0]
                if delivery_status.get("status") == "ok":
                    message_id = delivery_status.get("id")
                    logger.info(f"Expo push sent successfully, id: {message_id}")
                    return ProviderResult(
                        success=True,
                        provider_message_id=message_id,
                    )
                else:
                    error_msg = delivery_status.get("message", "Unknown Expo error")
                    details = delivery_status.get("details", {})
                    # DeviceNotRegistered is a permanent failure
                    is_permanent = details.get("error") == "DeviceNotRegistered"
                    
                    logger.error(f"Expo push delivery failed: {error_msg}, permanent={is_permanent}")
                    return ProviderResult(
                        success=False,
                        error_message=error_msg,
                        is_permanent_failure=is_permanent,
                    )

            return ProviderResult(
                success=False,
                error_message="Unexpected Expo API response format",
            )

        except httpx.HTTPStatusError as e:
            logger.error(f"Expo API HTTP error: {e}")
            return ProviderResult(
                success=False,
                error_message=f"HTTP Error: {str(e)}",
                is_permanent_failure=False, # Retry on 5xx
            )
        except Exception as e:
            logger.error(f"Expo push exception: {e}")
            return ProviderResult(
                success=False,
                error_message=str(e),
            )

    async def health_check(self) -> Dict[str, Any]:
        """Check Expo provider status."""
        return {
            "provider": "expo",
            "status": "healthy" if self.initialized else "not_initialized",
            "initialized": self.initialized,
        }

    async def cleanup(self) -> None:
        """Cleanup resources."""
        await self.client.aclose()
        logger.info("ExpoPushProvider client closed")
