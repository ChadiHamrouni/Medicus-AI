from typing import List, Tuple, Optional, Union
from datetime import datetime, date, timedelta, timezone
from agents import function_tool
import traceback

from src.services.doctor.doctor_details_service import get_doctor_details
from src.tools.medibooking.helpers import WEEKDAY_MAP, get_attr
from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.models.medical.visits import TimeSlot
from medicus_common.utils.type_conversion import to_datetime

# Upper bound on returned appointment slots, to keep the tool output short.
_MAX_SLOTS = 40


@function_tool
async def find_free_slots(
    doctor_id: int,
    start_date: Optional[datetime | str] = None,
    end_date: Optional[datetime | str] = None,
    duration: Optional[int] = None
) -> Union[List[TimeSlot], str]:
    """
    Retrieve future available appointment time slots for a doctor.

    CRITICAL: MULTI-TURN PROTOCOL
    ----------------------------
    - TURN 1 (Symptom Description): Perform triage only. DO NOT CALL THIS TOOL.
    - TURN 2+ (Post-Triage): Call only if red flags are ruled out and user confirms intent.

    INTENT
    ------
    Use this tool ONLY when:
    1. User explicitly requests to book AFTER triage.
    2. You have ruled out emergency 'Red Flags' (sudden onset, fever, neurological changes).
    3. User is requesting a follow-up or routine checkup.

    DO NOT use this tool if:
    - You are in Turn 1 and the user has only stated a symptom.
    - Triage (Severity, Duration, Red Flags) is incomplete.

    STATE TRANSITION
    ----------------
    This tool moves the state from ASSESSMENT -> SCHEDULING.
    Do not skip the ASSESSMENT state.

    PARAMETERS
    ----------
    doctor_id : int
        Doctor identifier.
    start_date : datetime or ISO string, optional
        Defaults to now.
    end_date : datetime or ISO string, optional
        Defaults to 15 days from now.
    duration : int, optional
        Defaults to 30.

    RETURNS
    -------
    Bookable appointment slots in chronological order (at most 40), each `duration` minutes
    long, e.g. [{"start": "...T10:00:00Z", "end": "...T10:30:00Z"}, ...]. A requested time is
    available exactly when a slot starts at that time. To see a specific day, pass
    start_date/end_date for that day.

    HARD RULES
    ----------
    - NEVER call this tool as a 'proactive' gesture in Turn 1.
    - You MUST wait for user confirmation after suggesting an appointment is appropriate.
    """
    # ========== EXTENSIVE LOGGING FOR DEBUGGING ==========
    logger.debug(f"\n{'='*60}")
    logger.debug(f"[FIND_FREE_SLOTS] START - doctor_id={doctor_id}")
    logger.debug(f"[FIND_FREE_SLOTS] Input params: start_date={start_date}, end_date={end_date}, duration={duration}")
    logger.info(f"[FIND_FREE_SLOTS] START - doctor_id={doctor_id}, start_date={start_date}, end_date={end_date}, duration={duration}")

    try:
        # Fetch doctor details (working hours) from database
        logger.debug(f"[FIND_FREE_SLOTS] Fetching doctor details...")
        doctor_details = await get_doctor_details(doctor_id)
        logger.debug(f"[FIND_FREE_SLOTS] ✅ Got doctor details")

        if not doctor_details:
            error_msg = f"Doctor (ID: {doctor_id}) not found in the system."
            logger.debug(f"[FIND_FREE_SLOTS] ❌ {error_msg}")
            logger.error(f"[FIND_FREE_SLOTS] {error_msg}")
            return error_msg

        working_hours = doctor_details.working_hours or []
        logger.debug(f"[FIND_FREE_SLOTS] ✅ Found {len(working_hours)} working hour slots for doctor_id={doctor_id}")
        logger.info(f"[FIND_FREE_SLOTS] Found {len(working_hours)} working hour slots")

        if working_hours:
            logger.debug(f"[FIND_FREE_SLOTS] Working hours: {working_hours}")
        else:
            error_msg = f"Doctor (ID: {doctor_id}) has no working hours configured. Please contact the clinic directly."
            logger.debug(f"[FIND_FREE_SLOTS] ⚠️ {error_msg}")
            logger.warning(f"[FIND_FREE_SLOTS] {error_msg}")
            return error_msg

        # 1. TZ Correction: Use UTC Aware 'now'
        now = datetime.now(timezone.utc)
        logger.debug(f"[FIND_FREE_SLOTS] Current time (UTC): {now}")

        # 2. TZ Correction: Ensure inputs are cast to UTC
        start_dt = to_datetime(start_date).astimezone(timezone.utc) if start_date else now
        end_dt = to_datetime(end_date).astimezone(timezone.utc) if end_date else now + timedelta(days=15)
        logger.debug(f"[FIND_FREE_SLOTS] Date range: {start_dt} to {end_dt}")
        logger.info(f"[FIND_FREE_SLOTS] Date range: {start_dt} to {end_dt}")

        # Safety bounds
        start_dt = max(start_dt, now)
        if end_dt <= start_dt:
            end_dt = start_dt + timedelta(days=1)
        logger.debug(f"[FIND_FREE_SLOTS] Adjusted date range: {start_dt} to {end_dt}")

        _duration_td = timedelta(minutes=duration or 30)
        logger.debug(f"[FIND_FREE_SLOTS] Duration: {_duration_td}")

        # Fetch booked slots from database
        logger.debug(f"[FIND_FREE_SLOTS] Fetching booked slots from DB...")
        async with db_manager.get_connection() as conn:
            query = """
                SELECT start_time, end_time
                FROM medical_visits_view
                WHERE doctor_id = $1
                  AND start_time >= $2 AND end_time <= $3
                ORDER BY start_time;
            """
            params = [doctor_id, start_dt, end_dt]
            results = await conn.fetch(query, *params)
            logger.debug(f"[FIND_FREE_SLOTS] Found {len(results)} booked slots in DB")

            # 3. TZ Correction: Ensure database results are treated as UTC
            booked_slots = []
            for b in results:
                s = b['start_time'].astimezone(timezone.utc)
                e = b['end_time'].astimezone(timezone.utc)
                booked_slots.append((s, e))

            booked_slots = sorted(booked_slots)

        # Print Statement for Booked Slots
        if booked_slots:
            logger.debug(f"\n--- BOOKED SLOTS (UTC) for Doctor {doctor_id} ---")
            for s, e in booked_slots:
                logger.debug(f"Booked: {s.strftime('%Y-%m-%d %H:%M')} to {e.strftime('%H:%M')} UTC")

        # Compute free slots
        logger.debug(f"[FIND_FREE_SLOTS] Computing free slots...")
        free_slots = _compute_free_slots(
            working_hours,
            start_dt.date(),
            end_dt.date(),
            booked_slots,
            _duration_td
        )
        logger.debug(f"[FIND_FREE_SLOTS] Computed {len(free_slots)} raw free slots")

        # 4. TZ Correction: Use UTC 'now' for filtering
        # Keep ranges that are still open (a range that started earlier today can still have later slots).
        future_free_slots = [slot for slot in free_slots if slot[1].astimezone(timezone.utc) > now]
        logger.debug(f"[FIND_FREE_SLOTS] After filtering past slots: {len(future_free_slots)} future slots")

        # Sort and Merge
        future_free_slots = sorted(future_free_slots, key=lambda slot: slot[0])
        merged_intervals = _merge_intervals(future_free_slots)
        logger.debug(f"[FIND_FREE_SLOTS] After merging: {len(merged_intervals)} intervals")

        # Print Statement for Free Slots
        logger.debug(f"\n--- FREE SLOTS (UTC) for Doctor {doctor_id} ---")
        if not merged_intervals:
            logger.debug("No free slots available.")
        for start, end in merged_intervals:
            logger.debug(f"Available: {start.strftime('%Y-%m-%d %H:%M')} to {end.strftime('%H:%M')} UTC")
        logger.debug("-------------------------------------------\n")

        # Bookable appointments, not free ranges: small models misread "08:30-12:30" as
        # "only 08:30". Each slot is one appointment of `duration`, starting on that grid.
        time_slots = []
        for start, end in merged_intervals:
            slot = start
            while slot + _duration_td <= end and len(time_slots) < _MAX_SLOTS:
                if slot > now:
                    time_slots.append(TimeSlot(start=slot, end=slot + _duration_td))
                slot += _duration_td

        # If no slots found, return helpful error message
        if not time_slots:
            if not working_hours:
                error_msg = (
                    f"Doctor (ID: {doctor_id}) has no working hours configured. "
                    "Please ask the patient to contact the clinic directly to schedule an appointment."
                )
            else:
                error_msg = (
                    f"No available slots found for Doctor (ID: {doctor_id}) between "
                    f"{start_dt.strftime('%B %d')} and {end_dt.strftime('%B %d, %Y')}. "
                    "The doctor may be fully booked. Please try a different date range or contact the clinic."
                )
            logger.debug(f"[FIND_FREE_SLOTS] ⚠️ {error_msg}")
            logger.warning(f"[FIND_FREE_SLOTS] {error_msg}")
            return error_msg

        # Return the first available slot info for easy booking
        first_slot = time_slots[0]
        logger.debug(f"[FIND_FREE_SLOTS] ✅ First available slot: {first_slot.start.strftime('%B %d, %Y at %I:%M %p')} UTC")
        logger.debug(f"[FIND_FREE_SLOTS] ✅ Returning {len(time_slots)} time slots")
        logger.info(f"[FIND_FREE_SLOTS] SUCCESS - Returning {len(time_slots)} slots, first: {first_slot.start}")
        logger.debug(f"{'='*60}\n")

        return time_slots

    except Exception as e:
        error_msg = f"Error finding free slots for doctor {doctor_id}: {str(e)}"
        logger.debug(f"[FIND_FREE_SLOTS] ❌ EXCEPTION: {error_msg}")
        logger.debug(f"[FIND_FREE_SLOTS] ❌ Traceback: {traceback.format_exc()}")
        logger.error(f"[FIND_FREE_SLOTS] {error_msg}", exc_info=True)
        return f"Unable to find available slots. Error: {str(e)}"

def _compute_free_slots(
        working_hours: List,
        start_date: date,
        end_date: date,
        booked_slots: List[Tuple[datetime, datetime]],
        duration_td: timedelta
) -> List[Tuple[datetime, datetime]]:
    """Finds free slots by subtracting booked slots from working hours.

    Args:
        working_hours: List of WorkingHourSlot objects with day_of_week, from_time, and to fields
        start_date: Start of search window
        end_date: End of search window
        booked_slots: Already booked time slots
        duration_td: Duration of appointment

    Returns:
        List of available (start, end) time slots
    """
    # 1. Generate all potential work blocks within the range

    work_blocks = []

    logger.debug(f"\n--- DEBUG START: _compute_free_slots ---")
    logger.debug(f"Search Window: {start_date} to {end_date}")
    logger.debug(f"Duration Required: {duration_td}")

    for wh in working_hours:
        # Use get_attr to safely handle both dicts and Pydantic objects
        day_str = get_attr(wh, "day_of_week")
        from_time = get_attr(wh, "from_time")
        to_time = get_attr(wh, "to")

        # FIX 1: Normalize casing for WEEKDAY_MAP lookups (e.g., 'monday' -> 'Monday')
        target_day_int = WEEKDAY_MAP.get(day_str.capitalize())

        if target_day_int is None:
            logger.debug(f"  ⚠️  SKIPPING: Unknown day name '{day_str}'")
            continue

        # FIX 2: Calculate the date of that specific weekday for the CURRENT week
        # 'start_date.weekday()' gives 0 for Monday.
        monday_of_week = start_date - timedelta(days=start_date.weekday())
        current_date = monday_of_week + timedelta(days=target_day_int)

        logger.debug(f"  > Weekday {day_str.capitalize()} for this week is {current_date}")

        # FIX 3: Iterate through weeks until we exit the end_date window
        while current_date <= end_date:
            # Only generate blocks that fall within or after the start_date
            if current_date >= start_date:
                try:
                    ws = datetime.combine(
                        current_date,
                        datetime.strptime(from_time, "%H:%M").time(),
                        timezone.utc
                    )
                    we = datetime.combine(
                        current_date,
                        datetime.strptime(to_time, "%H:%M").time(),
                        timezone.utc
                    )
                    work_blocks.append((ws, we))
                    logger.debug(f"    - Block Generated: {ws} to {we}")
                except Exception as e:
                    logger.debug(f"    - Error parsing times for {current_date}: {e}")

            current_date += timedelta(days=7)

    # 2. Preparation for Linear Scan
    work_blocks.sort()
    booked_slots.sort()

    free_slots = []
    b_idx = 0
    num_bookings = len(booked_slots)

    # 3. Sweep-line Scan logic (O(N + M))
    for w_start, w_end in work_blocks:
        current_ptr = w_start

        # Skip bookings that end before this work block starts
        while b_idx < num_bookings and booked_slots[b_idx][1] <= w_start:
            b_idx += 1

        # Check bookings overlapping this block using a temporary index
        temp_idx = b_idx
        while temp_idx < num_bookings and booked_slots[temp_idx][0] < w_end:
            b_start, b_end = booked_slots[temp_idx]

            # Gap check before the booking
            if b_start > current_ptr:
                if (b_start - current_ptr) >= duration_td:
                    free_slots.append((current_ptr, b_start))

            current_ptr = max(current_ptr, b_end)
            temp_idx += 1

        # Gap check after the last booking in the block
        if w_end > current_ptr and (w_end - current_ptr) >= duration_td:
            free_slots.append((current_ptr, w_end))

    logger.debug(f"--- DEBUG END: Found {len(free_slots)} total free slots ---")
    return free_slots

def _find_first_occurrence(start_dt: date, target_weekday: str) -> date:
    """
    Finds the first occurrence of the given weekday on or after start_dt.
    :param start_dt: The starting date.
    :param target_weekday: The target weekday as a string (e.g., "Monday").
    :return: The date of the next occurrence of the given weekday.
    """
    if isinstance(target_weekday, str):
        target_weekday = WEEKDAY_MAP.get(target_weekday)
        if target_weekday is None:
            raise ValueError(f"Invalid weekday: {target_weekday}")

    days_ahead = (target_weekday - start_dt.weekday()) % 7
    return (start_dt + timedelta(days=days_ahead))


def _subtract_booked_slots(
        block_start: datetime,  # Changed hint to datetime for clarity
        block_end: datetime,
        booked_slots: List[Tuple[datetime, datetime]],
        duration_td: timedelta
) -> List[Tuple[datetime, datetime]]:
    """Subtracts booked slots from a working block to find available slots."""
    free_intervals = []
    current = block_start

    # This comparison now works because both slot[0] and block_end are UTC-aware
    relevant_bookings = [
        slot for slot in booked_slots
        if slot[0] < block_end and slot[1] > block_start
    ]

    for b_start, b_end in relevant_bookings:
        # If there is space before the next booking starts
        if b_start > current:
            # Ensure the segment is at least as long as the duration requested
            if b_start - current >= duration_td:
                free_intervals.append((current, b_start))

        # Advance current to the end of the booking
        current = max(current, b_end)

        if current >= block_end:
            break

    # Add the remaining time after the last booking
    if block_end - current >= duration_td:
        free_intervals.append((current, block_end))

    return free_intervals


def _merge_intervals(intervals: List[Tuple[datetime, datetime]]) -> List[Tuple[datetime, datetime]]:
    """Merges consecutive free slots into larger blocks."""
    if not intervals:
        return []
    intervals.sort()
    merged = [intervals[0]]
    for start, end in intervals[1:]:
        last_start, last_end = merged[-1]
        if last_end >= start:
            merged[-1] = (last_start, max(last_end, end))
        else:
            merged.append((start, end))
    return merged


