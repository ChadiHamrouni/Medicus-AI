"""
Event handler for processing external domain events.
"""

from datetime import datetime
import logging
from typing import Any, Dict, Optional

from medicus_notification.core.enums import NotificationCategory
from src.services.notification_service import NotificationService
from medicus_notification import EVENT_REGISTRY

logger = logging.getLogger(__name__)

class EventHandler:
    """
    Handles external events and converts them into notifications.
    Uses a dynamic registry from MedicusCommon.
    """

    def __init__(self, notification_service: NotificationService):
        self.notification_service = notification_service
        self.db = notification_service.db  # Access DB via service

    async def handle_event(self, event_type: str, payload: Dict[str, Any]) -> int:
        """Fan an event out to the notifications configured in EVENT_REGISTRY; returns how many were created."""
        logger.info(f"Processing event: {event_type}")
        count = await self._process_event(event_type, payload)
        if count == 0:
            logger.warning(f"No notifications created for event: {event_type}")
        return count

    async def _process_event(self, event_type: str, payload: Dict[str, Any]) -> int:
        """Process event using registry."""
        configs = self._get_event_configs(event_type)
        if not configs:
            return 0

        # Normalize payload once
        normalized_payload = self._normalize_payload(event_type, payload)
        
        count = 0
        for config in configs:
            try:
                # Resolve recipient User ID
                user_id = await self._resolve_user_id(config["recipient_source"], payload)
                if not user_id:
                    logger.warning(f"Could not resolve user_id for {config['template']} from {payload}")
                    continue

                # Build final payload with data/deep link info
                final_payload = normalized_payload.copy()
                
                # Add deep link data
                final_payload["data"] = {
                    "type": config.get("data_type", "default"),
                    # Propagate key IDs for deep linking
                    "appointmentId": str(payload.get("id")) if payload.get("id") else None,
                    "patientId": str(payload.get("patient_id")) if payload.get("patient_id") else None,
                    "doctorId": str(payload.get("doctor_id")) if payload.get("doctor_id") else None,
                    "userId": str(payload.get("user_id")) if payload.get("user_id") else None,
                }
                # Clean up None values
                final_payload["data"] = {k: v for k, v in final_payload["data"].items() if v is not None}

                # Validate and map category to database enum
                raw_cat = config["category"]
                # logger.info(
                #     f"[category-trace] template={config['template']} "
                #     f"raw_category={raw_cat!r} type={type(raw_cat).__qualname__} "
                #     f"module={type(raw_cat).__module__} "
                #     f"value={getattr(raw_cat, 'value', raw_cat)!r}"
                # )
                category = self._validate_category(raw_cat, config["template"])
                
                if not category:
                    logger.warning(f"Skipping template {config['template']} - invalid category {raw_cat!r}")
                    continue

                await self.notification_service.create_notification(
                    user_id=user_id,
                    template_key=config["template"],
                    category=category,
                    channels=config["channels"],
                    priority=config["priority"],
                    payload=final_payload,
                )
                count += 1
                
            except Exception as e:
                logger.error(f"Error processing template {config['template']} for event {event_type}: {e}", exc_info=True)

        return count

    def _validate_category(self, category_value, template_key: str) -> Optional[NotificationCategory]:
        """
        Validate category against database enums and map if needed.
        Returns None if category is invalid and cannot be mapped.
        Accepts both NotificationCategory enum instances and raw strings.
        """
        # Normalize any enum-like object to its string value
        if hasattr(category_value, 'value') and not isinstance(category_value, str):
            logger.info(
                f"[category-trace] normalizing enum {type(category_value).__qualname__} "
                f"(module={type(category_value).__module__}) "
                f"value={category_value.value!r} isinstance_local={isinstance(category_value, NotificationCategory)}"
            )
            category_value = category_value.value
        logger.info(f"[category-trace] after normalization: category_value={category_value!r}")

        
        # Check if it's valid for patient or doctor based on template name
        is_doctor_template = 'DOCTOR' in template_key.upper()
        
        # Convert string to NotificationCategory enum
        try:
            return NotificationCategory(category_value)
        except ValueError:
            logger.error(f"Category '{category_value}' not found in NotificationCategory enum")
            return None

    def _get_event_configs(self, event_type: str) -> list:
        """
        Get configuration for event type from shared registry.
        """
        # Handle test notification mapping logic locally if needed, or move to registry
        if event_type == "test_notification":
             return [] 

        return EVENT_REGISTRY.get(event_type, [])

    def _normalize_payload(self, event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize payload values (e.g. converting datetimes to ISO strings).
        Also injects defaults for missing fields to match legacy behavior.
        """
        normalized = {}
        # Recursive normalization helper
        def normalize_val(v):
            if isinstance(v, datetime):
                return v.isoformat()
            elif isinstance(v, dict):
                return {k2: normalize_val(v2) for k2, v2 in v.items()}
            return v

        for k, v in payload.items():
            normalized[k] = normalize_val(v)
        
        # Inject defaults only for relevant events
        if "appointment" in event_type:
            if "location" not in normalized:
                normalized["location"] = "Virtual Clinic"
            if "reason" not in normalized:
                normalized["reason"] = "No reason provided"
                
        if "security" in event_type:
            if "device_name" not in normalized:
                normalized["device_name"] = "Unknown Device"
            if "location" not in normalized:
                normalized["location"] = "Unknown Location"

        # Helper: Ensure appointment_date/time exist if start_time exists
        # This mirrors the old logic but uses ISO strings
        if "start_time" in normalized and "appointment_date" not in normalized:
            try:
                # Try to parse if string
                dt = normalized["start_time"]
                if isinstance(dt, str):
                    dt = datetime.fromisoformat(dt)
                
                # Provide components for templates that might not use filters yet
                # Note: These are English defaults. Ideally templates use {{ start_time | date }}
                # But to avoid breaking existing templates we provide these.
                normalized["appointment_date"] = dt.strftime("%B %d, %Y")
                normalized["appointment_time"] = dt.strftime("%I:%M %p")
            except:
                pass
                
        return normalized

    async def _resolve_user_id(self, source_field: str, payload: Dict[str, Any]) -> int:
        """
        Resolve auth user_id from the payload based on source field.
        """
        source_id = payload.get(source_field)
        if not source_id:
            return None
            
        try:
            source_id = int(source_id)
        except:
            return None

        # If User ID, return directly
        if source_field == "user_id":
            return source_id

        # If Patient ID, translate
        if source_field == "patient_id":
            # Lookup in patients table
            query = "SELECT user_id FROM public.patients_view WHERE id = $1"
            return await self.db.fetchval(query, source_id)

        # If Doctor ID, translate
        if source_field == "doctor_id":
             # Lookup in doctors table
            query = "SELECT user_id FROM public.doctors_view WHERE id = $1"
            return await self.db.fetchval(query, source_id)

        return None
