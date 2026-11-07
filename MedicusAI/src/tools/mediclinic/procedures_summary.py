"""Procedure summary generation using LLM.

This module handles the computation and persistence of procedure summaries.
It fetches procedure details, builds a clinical timeline, and uses LLM
to generate a professional medical summary.
"""

import json
from datetime import datetime, timezone
from typing import Dict, Any

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.core.exceptions import DatabaseError, MedicusAIException
from medicus_common.llm import parse_structured
from medicus_common.models.medical.procedures import ProcedureSummary


PROCEDURE_SUMMARY_SYSTEM_PROMPT = """
You are a senior clinical AI assisting licensed medical professionals.
Produce a precise, high-fidelity clinical summary using formal medical terminology.
Highlight and reason about critical risks where applicable.
Do not hallucinate facts not present in the input.
"""


async def generate_procedure_summary(
    procedure_id: int,
    persist_summary: bool = True
) -> Dict[str, Any]:
    """
    Generate a clinical summary for a medical procedure using LLM.

    Fetches all procedure details from the view, builds a timeline,
    calls the LLM to generate a professional summary, and optionally
    persists it back to the database.

    Args:
        procedure_id: The unique identifier of the procedure.
        persist_summary: Whether to save the summary to the database.

    Returns:
        Dict containing procedure_id, procedure_name, summary, risk_profile, log_history.

    Raises:
        DatabaseError: If database operations fail.
        MedicusAIException: If LLM summarization fails.
    """
    try:
        async with db_manager.get_connection() as conn:
            # Fetch all detail logs for this procedure (view includes procedure info)
            detail_rows = await conn.fetch(
                """
                SELECT id, actor_role, entry_type, severity_level, logged_at,
                       event_text, event_value, event_unit,
                       procedure_text, procedure_name, procedure_description
                FROM public.medical_procedure_details_view
                WHERE procedure_id = $1
                ORDER BY logged_at ASC
                """,
                procedure_id
            )

            if not detail_rows:
                return {"error": "Insufficient clinical data to generate a summary."}

            # Get procedure name from first row (all rows have same procedure info)
            first_row = detail_rows[0]
            procedure_name = first_row.get('procedure_name') or first_row.get('procedure_text') or 'Unknown Procedure'

            # Build timeline from detail rows
            log_entries = []
            critical_events = []
            critical_count = 0

            for row in detail_rows:
                timestamp = row['logged_at'].isoformat() if row['logged_at'] else 'N/A'
                actor_role = (row.get('actor_role') or 'system').upper()
                entry_type = row.get('entry_type') or 'note'

                # Build detail from event_text, event_value, event_unit
                event_text = row.get('event_text') or ''
                event_value = row.get('event_value')
                event_unit = row.get('event_unit') or ''

                if event_value is not None:
                    detail = f"{event_text} {event_value} {event_unit}".strip()
                else:
                    detail = event_text

                log_entries.append(f"[{timestamp}] ({actor_role}/{entry_type}): {detail}")

                # severity_level is integer: 0=normal, 1=watch, 2+=critical
                severity = row.get('severity_level') or 0
                if severity >= 2:
                    critical_count += 1
                    critical_events.append({
                        "timestamp": timestamp,
                        "actor_role": actor_role,
                        "entry_type": entry_type,
                        "detail": detail,
                        "severity": severity
                    })

            full_timeline = "\n".join(log_entries)

            # Call LLM to generate summary
            summary_text = await _call_llm_for_summary(
                procedure_id=procedure_id,
                procedure_name=procedure_name,
                clinical_history=log_entries,
                critical_events=critical_events
            )

            risk_profile = "STABLE" if critical_count == 0 else "CRITICAL"

            # Persist summary if requested
            if persist_summary:
                await conn.execute(
                    "UPDATE public.medical_procedures SET summary = $1, updated_at = NOW() WHERE id = $2",
                    summary_text, procedure_id
                )

        return {
            "procedure_id": procedure_id,
            "procedure_name": procedure_name,
            "summary": summary_text,
            "risk_profile": risk_profile,
            "log_history": full_timeline,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }

    except MedicusAIException:
        raise
    except Exception as e:
        logger.error(f"generate_procedure_summary_failed: {e} (procedure_id={procedure_id})")
        raise DatabaseError(f"Failed to generate procedure summary: {e}")


async def _call_llm_for_summary(
    procedure_id: int,
    procedure_name: str,
    clinical_history: list,
    critical_events: list
) -> str:
    """
    Call LLM to generate a clinical summary.

    Args:
        procedure_id: Procedure identifier.
        procedure_name: Name of the procedure.
        clinical_history: List of timeline entries.
        critical_events: List of critical event dicts.

    Returns:
        Generated summary text.

    Raises:
        MedicusAIException: If LLM call fails.
    """
    user_payload = {
        "procedure_id": procedure_id,
        "procedure_name": procedure_name,
        "clinical_history": clinical_history,
        "critical_events": critical_events,
        "instructions": {
            "medical_narrative": "Concise professional synthesis of the procedure so far.",
            "risk_assessment": "One of: STABLE, GUARDED, CRITICAL.",
            "critical_insights": "Summarize only severity >= 2 events.",
        },
    }

    try:
        summary = await parse_structured(
            [
                {"role": "system", "content": PROCEDURE_SUMMARY_SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(user_payload, default=str)},
            ],
            ProcedureSummary,
            role="summary",
        )
        if summary is None:
            raise RuntimeError("model returned no summary")
        return summary.medical_narrative

    except Exception as e:
        logger.error(f"llm_procedure_summary_failed: {e} (procedure_id={procedure_id})")
        raise MedicusAIException(
            f"Procedure summarization failed for procedure_id={procedure_id}: {e}"
        )