"""Vitals helper functions for threshold and trend computation.

AUTHORITATIVE IMPLEMENTATION
=============================
These helpers provide BATCHED, on-demand computation of:
1. Vital trends (comparing current vs previous values)
2. Threshold configurations (age + gender aware from vital_reference_ranges)

CRITICAL REQUIREMENTS:
- All helpers MUST be PLURAL and BATCHED
- NO per-vital queries
- NO loops with DB calls
- EXACTLY ONE database query per helper function

Usage:
    from medicus_common.services.vitals_helpers import (
        get_patient_vital_thresholds,
        get_patient_vital_trends
    )

    # Batched threshold retrieval
    thresholds = await get_patient_vital_thresholds(
        patient_id=123,
        vital_names=["systolic", "resting_heart_rate", "temperature_c"]
    )
    # Returns: {"systolic": VitalThresholdConfig(...), "resting_heart_rate": VitalThresholdConfig(...), ...}

    # Batched trend calculation
    trends = await get_patient_vital_trends(
        patient_id=123,
        vital_names=["systolic", "resting_heart_rate", "temperature_c"]
    )
    # Returns: {"systolic": "H", "resting_heart_rate": "L", "temperature_c": "S"}
"""

import json
from typing import Dict, Optional, List
from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.models.medical.vitals import VitalThresholdConfig, VitalThresholdZone

_GENDER_CODES = {"male": "M", "m": "M", "female": "F", "f": "F"}


async def get_patient_vital_thresholds(
    patient_id: int,
    vital_names: List[str]
) -> Dict[str, Optional[VitalThresholdConfig]]:
    """Fetch threshold configurations for multiple vitals in ONE query.

    BATCHED IMPLEMENTATION - EXACTLY ONE DATABASE QUERY.

    Queries the vital_reference_ranges table and selects appropriate threshold
    configurations that match the patient's gender and age range.

    Args:
        patient_id: Patient ID (used to fetch gender and age)
        vital_names: List of vital keys (e.g., ['systolic', 'resting_heart_rate'])

    Returns:
        Dictionary mapping vital_name to VitalThresholdConfig (or None if no threshold exists)
        Example: {"systolic": VitalThresholdConfig(...), "heart_rate": None}

    Rules:
        - MUST execute EXACTLY ONE database query
        - Matches gender: exact match or 'ALL'
        - Matches age: age_min <= age <= age_max
        - Returns first matching configuration per vital
        - Returns None if no thresholds defined for a vital

    Performance:
        - Single query regardless of vital count
        - NO N+1 queries
        - NO loops with DB calls
    """
    if not vital_names:
        return {}

    query = """
        WITH patient_info AS (
            SELECT
                gender,
                EXTRACT(YEAR FROM AGE(dob))::int AS age
            FROM public.patients
            WHERE id = $1
        )
        SELECT
            vrr.vital_key,
            vrr.thresholds,
            pi.gender AS patient_gender,
            pi.age AS patient_age
        FROM public.vital_reference_ranges vrr
        CROSS JOIN patient_info pi
        WHERE vrr.vital_key = ANY($2::text[])
          AND vrr.is_active = true
    """

    try:
        async with db_manager.get_connection() as conn:
            rows = await conn.fetch(query, patient_id, vital_names)

            result = {}

            for row in rows:
                vital_name = row['vital_key']
                thresholds_json = row['thresholds']
                if isinstance(thresholds_json, str):
                    thresholds_json = json.loads(thresholds_json)
                patient_gender = _GENDER_CODES.get((row['patient_gender'] or '').lower(), 'ALL')
                patient_age = row['patient_age'] if row['patient_age'] is not None else 30

                if not thresholds_json:
                    result[vital_name] = None
                    continue

                # Find matching threshold config
                matching_config = None
                for cfg in thresholds_json:
                    # Check gender match
                    cfg_gender = cfg.get("gender", "ALL")
                    gender_ok = (
                        cfg_gender == "ALL"
                        or (patient_gender == "M" and cfg_gender == "M")
                        or (patient_gender == "F" and cfg_gender == "F")
                    )

                    # Check age match
                    age_min = cfg.get("age_min", 0)
                    age_max = cfg.get("age_max", 120)
                    age_ok = age_min <= patient_age <= age_max

                    if gender_ok and age_ok:
                        # Found matching config - convert to Pydantic model
                        zones_data = cfg.get("zones", [])
                        zones = [
                            VitalThresholdZone(
                                min=zone.get("min"),
                                max=zone.get("max"),
                                color=zone.get("color", "#6B7280"),
                                label=zone.get("label", "Unknown"),
                                status=zone.get("status")
                            )
                            for zone in zones_data
                        ]

                        matching_config = VitalThresholdConfig(
                            gender=cfg_gender,
                            age_min=age_min,
                            age_max=age_max,
                            zones=zones
                        )
                        break

                result[vital_name] = matching_config

            # Ensure all requested vitals are in result (even if None)
            for vital_name in vital_names:
                if vital_name not in result:
                    result[vital_name] = None

            return result

    except Exception as e:
        logger.error(
            f"Error fetching thresholds for vitals={vital_names}: {str(e)}",
            exc_info=True
        )
        # Return empty thresholds on error
        return {vital_name: None for vital_name in vital_names}


async def get_patient_vital_trends(
    patient_id: int,
    vital_names: List[str]
) -> Dict[str, Optional[str]]:
    """Compute trend indicators for multiple vitals in ONE query.

    BATCHED IMPLEMENTATION - EXACTLY ONE DATABASE QUERY.

    Compares latest vital values against previous values to determine trend:
    - 'H': Higher than previous
    - 'L': Lower than previous
    - 'S': Same as previous
    - None: Not computable (non-numeric, only one reading, etc.)

    Args:
        patient_id: Patient ID
        vital_names: List of vital keys (e.g., ['systolic', 'resting_heart_rate'])

    Returns:
        Dictionary mapping vital_name to trend indicator
        Example: {"systolic": "H", "resting_heart_rate": "L", "diet": None}

    Logic:
        1. Get latest values from medical_vitals_latest_view
        2. Get previous values from medical_vitals_view (recorded_at strictly less than latest)
        3. Compare numeric values to determine trend
        4. Return None for non-numeric vitals

    Performance:
        - Single query regardless of vital count
        - NO N+1 queries
        - NO loops with DB calls
    """
    if not vital_names:
        return {}

    query = """
        WITH latest AS (
            SELECT vital_name, vital_value, recorded_at
            FROM public.medical_vitals_latest_view
            WHERE patient_id = $1
              AND vital_name = ANY($2::text[])
        ),
        previous AS (
            SELECT
                v.vital_name,
                v.vital_value,
                ROW_NUMBER() OVER (
                    PARTITION BY v.vital_name
                    ORDER BY v.recorded_at DESC
                ) AS rn
            FROM public.medical_vitals_view v
            JOIN latest l ON l.vital_name = v.vital_name
            WHERE v.patient_id = $3
              AND v.recorded_at < l.recorded_at
        )
        SELECT
            l.vital_name,
            l.vital_value AS current_val,
            p.vital_value AS previous_val
        FROM latest l
        LEFT JOIN previous p
          ON p.vital_name = l.vital_name
         AND p.rn = 1
    """

    try:
        async with db_manager.get_connection() as conn:
            rows = await conn.fetch(query, patient_id, vital_names, patient_id)

        trends = {}
        for row in rows:
            vital_name = row["vital_name"]
            current_val = row["current_val"]
            previous_val = row["previous_val"]

            # Attempt to compute numeric trend
            if previous_val is None:
                # Only one reading exists
                trends[vital_name] = None
                continue

            try:
                current_numeric = float(current_val)
                previous_numeric = float(previous_val)

                if current_numeric > previous_numeric:
                    trends[vital_name] = "H"
                elif current_numeric < previous_numeric:
                    trends[vital_name] = "L"
                else:
                    trends[vital_name] = "S"

            except (ValueError, TypeError):
                # Non-numeric vital (e.g., diet, blood_type)
                trends[vital_name] = None

        # Ensure all requested vitals are in result (even if None)
        for vital_name in vital_names:
            if vital_name not in trends:
                trends[vital_name] = None

        return trends

    except Exception as e:
        logger.error(
            f"Error computing trends for vitals={vital_names}: {str(e)}",
            exc_info=True
        )
        # Return no trends on error
        return {vital_name: None for vital_name in vital_names}