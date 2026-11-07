"""
Quiet hours enforcement for notifications.
"""

from datetime import datetime, time, timedelta
from typing import Optional, Tuple
import pytz


def is_in_quiet_hours(
    current_time: datetime,
    quiet_start: Optional[time],
    quiet_end: Optional[time],
    timezone_str: str = "UTC"
) -> bool:
    """
    Check if current time falls within quiet hours.

    Handles overnight quiet periods (e.g., 22:00 - 08:00).
    Returns True if in quiet hours, False otherwise.
    """
    if not quiet_start or not quiet_end:
        return False

    try:
        tz = pytz.timezone(timezone_str)
        local_time = current_time.astimezone(tz).time()
    except Exception:
        # Fallback to UTC if timezone is invalid
        local_time = current_time.time()

    # Handle overnight quiet periods (e.g., 22:00 - 08:00)
    if quiet_start > quiet_end:
        # Quiet hours span midnight
        return local_time >= quiet_start or local_time < quiet_end
    else:
        # Normal same-day quiet hours
        return quiet_start <= local_time < quiet_end


def calculate_delay_for_quiet_hours(
    send_time: datetime,
    quiet_start: Optional[time],
    quiet_end: Optional[time],
    timezone_str: str = "UTC"
) -> datetime:
    """
    If send_time falls within quiet hours, delay to quiet_hours_end.
    Returns adjusted send time.
    """
    if not quiet_start or not quiet_end:
        return send_time

    if not is_in_quiet_hours(send_time, quiet_start, quiet_end, timezone_str):
        return send_time

    try:
        tz = pytz.timezone(timezone_str)
        local_time = send_time.astimezone(tz)
    except Exception:
        tz = pytz.UTC
        local_time = send_time

    # Calculate the next quiet_hours_end
    target_date = local_time.date()

    # If we're before midnight but after quiet_start, target tomorrow
    if quiet_start > quiet_end and local_time.time() >= quiet_start:
        target_date = target_date + timedelta(days=1)

    # Create the target datetime at quiet_hours_end
    target_datetime = tz.localize(
        datetime.combine(target_date, quiet_end)
    )

    return target_datetime


def get_user_quiet_hours(
    preferences: dict
) -> Tuple[Optional[time], Optional[time], str]:
    """
    Extract quiet hours from user preferences.
    Returns (quiet_start, quiet_end, timezone).
    """
    quiet_start = preferences.get("quiet_hours_start")
    quiet_end = preferences.get("quiet_hours_end")
    timezone_str = preferences.get("timezone", "UTC")

    # Parse time strings if needed
    if isinstance(quiet_start, str):
        try:
            quiet_start = datetime.strptime(quiet_start, "%H:%M").time()
        except ValueError:
            quiet_start = None

    if isinstance(quiet_end, str):
        try:
            quiet_end = datetime.strptime(quiet_end, "%H:%M").time()
        except ValueError:
            quiet_end = None

    return quiet_start, quiet_end, timezone_str
