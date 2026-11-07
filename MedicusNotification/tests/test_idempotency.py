"""
Edge case tests for the idempotency key generator.

These are pure unit tests with no mocks needed — the function
is a deterministic hash.
"""

import pytest
from datetime import datetime, timezone

from src.core.idempotency import generate_idempotency_key


# ── 1. Same inputs → same key ────────────────────────────────────────────────

def test_same_inputs_same_key():
    """Identical parameters must produce the same idempotency key."""
    kwargs = dict(
        user_id=1,
        template_key="APPOINTMENT_CONFIRMED",
        template_version=1,
        payload={"doctor_name": "Dr. Smith"},
        send_after=datetime(2026, 3, 1, 12, 0, tzinfo=timezone.utc),
        language="en",
    )
    assert generate_idempotency_key(**kwargs) == generate_idempotency_key(**kwargs)


# ── 2. Different payload → different key ─────────────────────────────────────

def test_different_payload_different_key():
    """Changing the payload must produce a different key."""
    base = dict(
        user_id=1,
        template_key="APPOINTMENT_CONFIRMED",
        template_version=1,
        send_after=datetime(2026, 3, 1, 12, 0, tzinfo=timezone.utc),
        language="en",
    )
    key_a = generate_idempotency_key(payload={"doctor_name": "A"}, **base)
    key_b = generate_idempotency_key(payload={"doctor_name": "B"}, **base)
    assert key_a != key_b


# ── 3. Different day → different key ─────────────────────────────────────────

def test_different_day_different_key():
    """Same template on different dates must produce different keys."""
    base = dict(
        user_id=1,
        template_key="APPOINTMENT_CONFIRMED",
        template_version=1,
        payload={"doctor_name": "Dr. Smith"},
        language="en",
    )
    key_day1 = generate_idempotency_key(
        send_after=datetime(2026, 3, 1, 12, 0, tzinfo=timezone.utc), **base
    )
    key_day2 = generate_idempotency_key(
        send_after=datetime(2026, 3, 2, 12, 0, tzinfo=timezone.utc), **base
    )
    assert key_day1 != key_day2


# ── 4. Different language → different key ────────────────────────────────────

def test_different_language_different_key():
    """en vs fr must produce different keys."""
    base = dict(
        user_id=1,
        template_key="APPOINTMENT_CONFIRMED",
        template_version=1,
        payload={"doctor_name": "Dr. Smith"},
        send_after=datetime(2026, 3, 1, 12, 0, tzinfo=timezone.utc),
    )
    key_en = generate_idempotency_key(language="en", **base)
    key_fr = generate_idempotency_key(language="fr", **base)
    assert key_en != key_fr


# ── 5. Payload key order is irrelevant ───────────────────────────────────────

def test_payload_key_order_irrelevant():
    """Dict key ordering must NOT affect the idempotency key (canonical JSON)."""
    base = dict(
        user_id=1,
        template_key="APPOINTMENT_CONFIRMED",
        template_version=1,
        send_after=datetime(2026, 3, 1, 12, 0, tzinfo=timezone.utc),
        language="en",
    )
    key_a = generate_idempotency_key(payload={"a": 1, "b": 2}, **base)
    key_b = generate_idempotency_key(payload={"b": 2, "a": 1}, **base)
    assert key_a == key_b


# ── 6. None send_after → valid key ──────────────────────────────────────────

def test_none_send_after():
    """Missing send_after should still produce a valid, deterministic key."""
    key = generate_idempotency_key(
        user_id=1,
        template_key="APPOINTMENT_CONFIRMED",
        template_version=1,
        payload={"doctor_name": "Dr. Smith"},
        send_after=None,
        language="en",
    )
    assert isinstance(key, str)
    assert len(key) == 64  # SHA-256 hex digest length
