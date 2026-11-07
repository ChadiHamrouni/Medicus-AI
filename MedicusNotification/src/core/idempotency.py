"""
Idempotency key generation for notifications.
"""

import hashlib
import json
from datetime import datetime
from typing import Any, Dict, Optional


def generate_idempotency_key(
    user_id: int,
    template_key: str,
    template_version: int,
    payload: Dict[str, Any],
    send_after: Optional[datetime] = None,
    language: str = "en"
) -> str:
    """
    Generate idempotency key per spec:
    SHA256(user_id + template_key + template_version + canonical_json(payload) + send_after_date + language)

    This prevents duplicate notifications while allowing:
    - Same template on different days
    - Same user receiving different notifications
    - Template version upgrades without collision
    - Different languages (bilingual users)
    """
    # Canonical JSON (sorted keys for consistency)
    canonical_payload = json.dumps(payload, sort_keys=True, default=str)

    # Extract date portion only (YYYY-MM-DD)
    send_date = ""
    if send_after:
        send_date = send_after.strftime("%Y-%m-%d")

    # Build the key components
    key_parts = [
        str(user_id),
        template_key,
        str(template_version),
        canonical_payload,
        send_date,
        language
    ]

    # Join and hash
    key_string = "|".join(key_parts)
    return hashlib.sha256(key_string.encode("utf-8")).hexdigest()
