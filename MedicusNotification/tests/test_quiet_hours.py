"""
Edge case tests for quiet hours logic.

Pure unit tests — no mocks needed.
"""

import pytest
from datetime import datetime, time, timedelta, timezone

from src.core.quiet_hours import (
    is_in_quiet_hours,
    calculate_delay_for_quiet_hours,
    get_user_quiet_hours,
)


# ── 1. Overnight quiet hours (22:00–08:00) ───────────────────────────────────

def test_overnight_quiet_hours_before_midnight():
    """23:00 with 22:00–08:00 range → should be in quiet hours."""
    current = datetime(2026, 3, 1, 23, 0, tzinfo=timezone.utc)
    assert is_in_quiet_hours(current, time(22, 0), time(8, 0)) is True


def test_overnight_quiet_hours_after_midnight():
    """03:00 with 22:00–08:00 range → should be in quiet hours."""
    current = datetime(2026, 3, 2, 3, 0, tzinfo=timezone.utc)
    assert is_in_quiet_hours(current, time(22, 0), time(8, 0)) is True


# ── 2. Same-day quiet hours (01:00–06:00) ────────────────────────────────────

def test_same_day_quiet_hours_inside():
    """03:00 with 01:00–06:00 → in quiet hours."""
    current = datetime(2026, 3, 1, 3, 0, tzinfo=timezone.utc)
    assert is_in_quiet_hours(current, time(1, 0), time(6, 0)) is True


def test_same_day_quiet_hours_outside():
    """07:00 with 01:00–06:00 → NOT in quiet hours."""
    current = datetime(2026, 3, 1, 7, 0, tzinfo=timezone.utc)
    assert is_in_quiet_hours(current, time(1, 0), time(6, 0)) is False


# ── 3. Outside quiet hours ───────────────────────────────────────────────────

def test_not_in_quiet_hours():
    """12:00 noon with 22:00–08:00 → NOT in quiet hours."""
    current = datetime(2026, 3, 1, 12, 0, tzinfo=timezone.utc)
    assert is_in_quiet_hours(current, time(22, 0), time(8, 0)) is False


# ── 4. Delay to next morning ─────────────────────────────────────────────────

def test_delay_to_next_morning():
    """Send at 23:00 with 22:00–08:00 → delayed to 08:00 next day."""
    send_time = datetime(2026, 3, 1, 23, 0, tzinfo=timezone.utc)
    result = calculate_delay_for_quiet_hours(
        send_time, time(22, 0), time(8, 0)
    )
    assert result.hour == 8
    assert result.day == 2  # Next day


# ── 5. No quiet hours set ────────────────────────────────────────────────────

def test_no_quiet_hours_set():
    """None start/end → no delay at all."""
    send_time = datetime(2026, 3, 1, 23, 0, tzinfo=timezone.utc)
    result = calculate_delay_for_quiet_hours(send_time, None, None)
    assert result == send_time


def test_no_quiet_hours_not_in():
    """None start/end → is_in_quiet_hours returns False."""
    current = datetime(2026, 3, 1, 23, 0, tzinfo=timezone.utc)
    assert is_in_quiet_hours(current, None, None) is False


# ── 6. Invalid timezone fallback ─────────────────────────────────────────────

def test_invalid_timezone_fallback():
    """Invalid timezone string → falls back to UTC, no crash."""
    current = datetime(2026, 3, 1, 3, 0, tzinfo=timezone.utc)
    # Should not raise, should fall back
    result = is_in_quiet_hours(current, time(1, 0), time(6, 0), "Invalid/Zone")
    assert isinstance(result, bool)


# ── 7. Parse time strings ────────────────────────────────────────────────────

def test_parse_valid_time_strings():
    """String times like '22:00' should parse correctly."""
    prefs = {
        "quiet_hours_start": "22:00",
        "quiet_hours_end": "08:00",
        "timezone": "UTC",
    }
    start, end, tz = get_user_quiet_hours(prefs)
    assert start == time(22, 0)
    assert end == time(8, 0)
    assert tz == "UTC"


# ── 8. Invalid time string ───────────────────────────────────────────────────

def test_invalid_time_string():
    """Invalid time string → returns None (no crash)."""
    prefs = {
        "quiet_hours_start": "abc",
        "quiet_hours_end": "08:00",
        "timezone": "UTC",
    }
    start, end, tz = get_user_quiet_hours(prefs)
    assert start is None  # Invalid → None
    assert end == time(8, 0)
