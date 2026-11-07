"""Batch Clinical Coding Job.

Parallel map-reduce processor for clinical coding across procedures, conditions, and vitals.

Architecture:
1. FETCH: Query uncoded records from materialized views
2. DETECT: Determine language from text using fastText
3. MAP: Apply hybrid resolution (Cache -> DB Translation -> LLM)
4. REDUCE: Update source tables with resolved codes

Each entity type runs in parallel for maximum throughput.
Language detection uses fastText to identify the language from clinician text,
then looks up language_id from the languages table.
"""


import asyncio
import datetime
import json
from typing import Any
from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger

# Service Mappers (Using the hybrid resolution logic)
from src.services.coding.procedures_coding import map_procedure_texts_to_codes
from src.services.coding.conditions_coding import map_condition_texts_to_codes
from src.services.coding.vitals_coding import map_vital_texts_to_keys
# Configuration
TASK_TIMEOUT = 120
BATCH_LIMIT = 100
FAILURE_LOG = "coding_audit_failures.log"


async def refresh_materialized_views(conn):
    """Ensures views are up to date for the FETCH phase."""
    views = [
        "public.medical_procedures_view",
        "public.medical_conditions_latest_view",
        "public.medical_vitals_latest_view",
    ]
    for view in views:
        try:
            await conn.execute(f"REFRESH MATERIALIZED VIEW CONCURRENTLY {view}")
        except Exception as e:
            # Fallback if concurrent refresh isn't supported (e.g. no unique index)
            logger.warning(f"Concurrent refresh failed for {view}, attempting standard refresh: {e}")
            await conn.execute(f"REFRESH MATERIALIZED VIEW {view}")


async def log_audit_failure(category: str, error: str, context: Any = None):
    """Logs batch failures for audit purposes."""
    entry = {
        "timestamp": datetime.datetime.now().isoformat(),
        "category": category,
        "error": error,
        "context": context
    }
    try:
        with open(FAILURE_LOG, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        logger.error(f"Failed to write audit log: {e}")



async def process_procedures_batch():
    """
    Process uncoded procedures.

    1. Fetch distinct procedure_text from records without procedure_id
    2. Map all texts to procedure_id via fuzzy search
    3. Update medical_procedures table with resolved IDs
    """
    entity_name = "PROCEDURES"

    try:
        async with db_manager.get_connection() as conn:
            # ---- PHASE 1: FETCH ----
            fetch_query = """
                SELECT DISTINCT id, display_name AS procedure_text
                FROM medical_procedures_view
                WHERE procedure_code IS NULL
                  AND display_name IS NOT NULL
                  AND display_name != ''
                LIMIT $1
            """
            rows = await conn.fetch(fetch_query, BATCH_LIMIT)

            text_to_record_id = {row['procedure_text']: row['id'] for row in rows}
            procedure_texts = list(text_to_record_id.keys())

            # ---- PHASE 2: MAP ----
            result = await asyncio.wait_for(
                map_procedure_texts_to_codes(procedure_texts),
                timeout=TASK_TIMEOUT
            )

            # ---- PHASE 3: REDUCE ----
            update_query = """
                UPDATE medical_procedures
                SET procedure_id = $1
                WHERE id = $2
                  AND procedure_id IS NULL
            """
            updated_count = 0
            for mapping in result.mappings:
                if mapping.procedure_id is not None:
                    record_id = text_to_record_id.get(mapping.procedure_text)
                    if record_id:
                        await conn.execute(update_query, mapping.procedure_id, record_id)
                        updated_count += 1


    except asyncio.TimeoutError:
        await log_audit_failure(entity_name, "Timeout exceeded", {"timeout": TASK_TIMEOUT})
        logger.error(f"[{entity_name}] Timeout exceeded ({TASK_TIMEOUT}s)")
    except Exception as e:
        await log_audit_failure(entity_name, str(e))
        logger.error(f"[{entity_name}] Failed: {e}")


async def process_conditions_batch():
    """
    Process uncoded conditions.

    1. Fetch distinct condition_text from records without condition_id
    2. Map all texts to condition_id via fuzzy search
    3. Update medical_conditions table with resolved IDs
    """
    entity_name = "CONDITIONS"

    try:
        async with db_manager.get_connection() as conn:
            # ---- PHASE 1: FETCH ----
            fetch_query = """
                SELECT DISTINCT id, condition_text
                FROM medical_conditions_latest_view
                WHERE condition_id IS NULL
                  AND condition_text IS NOT NULL
                  AND condition_text != ''
                LIMIT $1
            """
            rows = await conn.fetch(fetch_query, BATCH_LIMIT)

            text_to_record_id = {row['condition_text']: row['id'] for row in rows}
            condition_texts = list(text_to_record_id.keys())

            # ---- PHASE 2: MAP ----
            result = await asyncio.wait_for(
                map_condition_texts_to_codes(condition_texts),
                timeout=TASK_TIMEOUT
            )

            # ---- PHASE 3: REDUCE ----
            update_query = """
                UPDATE medical_conditions
                SET condition_id = $1
                WHERE id = $2
                  AND condition_id IS NULL
            """
            updated_count = 0
            for mapping in result.mappings:
                if mapping.condition_id is not None:
                    record_id = text_to_record_id.get(mapping.condition_text)
                    if record_id:
                        await conn.execute(update_query, mapping.condition_id, record_id)
                        updated_count += 1


    except asyncio.TimeoutError:
        await log_audit_failure(entity_name, "Timeout exceeded", {"timeout": TASK_TIMEOUT})
        logger.error(f"[{entity_name}] Timeout exceeded ({TASK_TIMEOUT}s)")
    except Exception as e:
        await log_audit_failure(entity_name, str(e))
        logger.error(f"[{entity_name}] Failed: {e}")


async def process_vitals_batch():
    """
    Process uncoded vitals.

    1. Fetch distinct vital_text from records without vital_id
    2. Map all texts to standardized vital_key via hybrid resolution
    3. Update medical_vitals JSONB with resolved vital_id

    View Schema (medical_vitals_latest_view):
    - vital_text: Raw clinician input (what we map FROM)
    - vital_id: FK to vital_reference_ranges (what we resolve TO)
    - vital_key: Standardized key from JSONB
    """
    entity_name = "VITALS"

    try:
        async with db_manager.get_connection() as conn:
            # ---- PHASE 1: FETCH ----
            fetch_query = """
                SELECT id, vital_text
                FROM medical_vitals_latest_view
                WHERE vital_id IS NULL
                  AND vital_text IS NOT NULL
                  AND vital_text != ''
                LIMIT $1
            """
            rows = await conn.fetch(fetch_query, BATCH_LIMIT)

            vital_texts = [row['vital_text'] for row in rows]
            text_to_record_id = {row['vital_text']: row['id'] for row in rows}

            # ---- PHASE 3: MAP (Resolve text to keys) ----
            result = await asyncio.wait_for(
                map_vital_texts_to_keys(vital_texts),
                timeout=TASK_TIMEOUT
            )
            all_mappings = result.mappings


            # ---- PHASE 4: REDUCE (Update JSONB array in base table) ----
            updated_count = 0
            for mapping in all_mappings:
                if mapping.vital_id is not None:
                    record_id = text_to_record_id.get(mapping.vital_text)
                    if record_id:
                        update_query = """
                            UPDATE medical_vitals
                            SET vital_values = (
                                SELECT jsonb_agg(
                                    CASE
                                        WHEN jsonb_typeof(elem) = 'object'
                                            AND (elem->>'vital_text') = $1
                                        THEN jsonb_set(elem, ARRAY['vital_id'], to_jsonb($2::integer))
                                        ELSE elem
                                    END
                                )
                                FROM jsonb_array_elements(vital_values) AS elem
                            )
                            WHERE id = $3
                            AND jsonb_typeof(vital_values) = 'array'
                        """
                        await conn.execute(update_query, mapping.vital_text, mapping.vital_id, record_id)
                        updated_count += 1


    except asyncio.TimeoutError:
        await log_audit_failure(entity_name, "Timeout exceeded", {"timeout": TASK_TIMEOUT})
        logger.error(f"[{entity_name}] Timeout exceeded ({TASK_TIMEOUT}s)")
    except Exception as e:
        await log_audit_failure(entity_name, str(e))
        logger.error(f"[{entity_name}] Failed: {e}")


async def run_clinical_coding_job():
    """
    Main Orchestrator for Parallel Clinical Coding.

    Executes all three coding branches (procedures, conditions, vitals) in parallel
    using asyncio.gather for maximum throughput.
    """

    start_time = datetime.datetime.now()

    async with db_manager.get_connection() as conn:
        await refresh_materialized_views(conn)

    # Execute all three branches in parallel
    results = await asyncio.gather(
        process_procedures_batch(),
        process_conditions_batch(),
        process_vitals_batch(),
        return_exceptions=True
    )

    # Log any exceptions that occurred
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            entity = ["PROCEDURES", "CONDITIONS", "VITALS"][i]
            logger.error(f"[{entity}] Exception during processing: {result}")


if __name__ == "__main__":
    asyncio.run(run_clinical_coding_job())