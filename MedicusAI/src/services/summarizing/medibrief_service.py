"""
MediBrief Service.

Generates a doctor-facing clinical summary of the patient's mirror conversation.
Triggered when the doctor's medidoc agent calls the medibrief_summarize tool.

Reads from : dialog.conversation_details_view, dialog.messages_view  (mat views)
Writes to  : dialog.medibrief_summaries                               (base table)
"""

from medicus_common.core.database import db_manager
from medicus_common.core.openai import llm_parse
from medicus_common.core.logging_config import logger
from medicus_common.models.convo.medibrief import MediBrief


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _extract_text(content) -> str:
    if isinstance(content, dict):
        return content.get("text_io") or content.get("body") or content.get("text") or ""
    return str(content)


async def _load_mirror_details(conn, doctor_conversation_id: str) -> dict | None:
    """
    Fetch mirror conversation ID and latest MediBrief state
    from conversation_details_view for the doctor's conversation.
    """
    row = await conn.fetchrow(
        """
        SELECT
            mirror_conversation_id,
            medibrief_to_message,
            medibrief_summary
        FROM dialog.conversation_details_view
        WHERE id = $1::uuid
        """,
        doctor_conversation_id,
    )
    return dict(row) if row else None


async def _fetch_new_mirror_messages(
    conn,
    mirror_conversation_id: str,
    after_message_id: int | None,
) -> list[dict]:
    """Fetch messages from the mirror (patient) conversation after the last summarized message."""
    if after_message_id is not None:
        rows = await conn.fetch(
            """
            SELECT id, role, content, created_at, processed_by_ai
            FROM dialog.messages_view
            WHERE conversation_id = $1::uuid
              AND id > $2
            ORDER BY id ASC
            """,
            mirror_conversation_id,
            after_message_id,
        )
    else:
        rows = await conn.fetch(
            """
            SELECT id, role, content, created_at, processed_by_ai
            FROM dialog.messages_view
            WHERE conversation_id = $1::uuid
            ORDER BY id ASC
            """,
            mirror_conversation_id,
        )
    return [dict(r) for r in rows]


_MEDIBRIEF_SYSTEM = """\
You are a senior medical documentation specialist generating clinical briefs for licensed physicians.

OUTPUT REGISTER: Precise, formal clinical language. Use standard medical abbreviations (c/o, Hx, Rx, PRN, \
SOB, BP, HR, etc.). Write as one clinician communicating to another — no lay explanations.

STRICT INCLUSION CRITERIA — include ONLY:
  • Chief complaint and presenting symptoms (onset, duration, severity, character, radiation, modifiers)
  • Relevant past medical / surgical / family / social history mentioned by the patient
  • Current medications, dosages, and adherence reported by the patient
  • Allergies or adverse reactions disclosed
  • Vital concerns, red flags, or emergency indicators
  • Lab / imaging results uploaded or described by the patient
  • Patient-reported functional status or disability
  • Chronological clinical timeline

STRICT EXCLUSION — omit entirely:
  • Social pleasantries, greetings, small talk ("Hi", "How are you", "Thank you", etc.)
  • Patient expressions of gratitude or emotional support exchanges
  • Technical explanations of how the AI system works
  • Repeated or duplicate information already captured in a prior summary
  • Non-clinical conversational filler

FORMAT: Structured clinical note. Sections: Chief Complaint | History | Symptoms | Medications & Allergies \
| Uploaded Documents | Clinical Timeline | Action Items. Omit any section with no data.\
"""

_MEDIBRIEF_UPDATE_PROMPT = """\
PRIOR CLINICAL SUMMARY:
{prior}

NEW PATIENT INTERACTION (since last summary):
{messages}{scan_block}

Produce an UPDATED clinical brief that:
1. Integrates all new clinical information with the prior summary
2. Escalates or resolves any action items based on new data
3. Notes any changes in symptom trajectory, medication adherence, or patient status
4. Flags any new red flags or urgent concerns
5. Remains concise — eliminate superseded information from the prior summary
\
"""

_MEDIBRIEF_INITIAL_PROMPT = """\
PATIENT INTERACTION LOG:
{messages}{scan_block}

Produce a CLINICAL BRIEF that:
1. Distills all medically relevant information from the interaction log above
2. Structures findings into a physician-ready clinical note
3. Identifies explicit action items for the attending physician
4. Flags any red flags or urgent concerns that require immediate attention
\
"""


def _build_prompt(messages: list[dict], existing_summary: str | None) -> str:
    # Document/image analyses are tagged by MediScan. (processed_by_ai is set on every reply
    # Sara writes, so it cannot tell analyses from ordinary conversation.)
    def is_scan(m: dict) -> bool:
        return isinstance(m.get("content"), dict) and m["content"].get("source") == "mediscan"

    clinical_msgs = [m for m in messages if not is_scan(m)]
    scan_insights = [m for m in messages if is_scan(m)]

    speaker = {"user": "PATIENT", "assistant": "SARA (assistant)"}
    messages_text = "\n".join(
        f"[{speaker.get(m['role'], m['role'].upper())}] {_extract_text(m['content'])}" for m in clinical_msgs
    )

    scan_block = ""
    if scan_insights:
        count = len(scan_insights)
        label = "documents/images" if count > 1 else "a document/image"
        entries = "\n\n".join(
            f"  [{m['created_at'].strftime('%Y-%m-%d %H:%M UTC')}]\n"
            f"  {_extract_text(m['content'])}"
            for m in scan_insights
        )
        scan_block = f"\n\nUPLOADED MEDICAL DOCUMENTS ({count} {label}):\n{entries}"

    if existing_summary:
        return _MEDIBRIEF_UPDATE_PROMPT.format(
            prior=existing_summary,
            messages=messages_text,
            scan_block=scan_block,
        )
    else:
        return _MEDIBRIEF_INITIAL_PROMPT.format(
            messages=messages_text,
            scan_block=scan_block,
        )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def run_medibrief(doctor_conversation_id: str) -> str:
    """
    Generate and persist a MediBrief clinical summary.

    Reads from the mirror (patient) conversation, identifies messages since the
    last MediBrief, generates a clinical summary via the Responses API (text_llm),
    and inserts a new record into dialog.medibrief_summaries.

    Args:
        doctor_conversation_id: UUID of the doctor's (medidoc) conversation.

    Returns:
        The generated summary text, or a descriptive error string.
    """
    try:
        # 1. Load doctor conversation details (mirror ID + last medibrief state)
        async with db_manager.get_connection() as conn:
            details = await _load_mirror_details(conn, doctor_conversation_id)

        if not details:
            return "Conversation not found."

        mirror_id = details.get("mirror_conversation_id")
        if not mirror_id:
            return "No patient conversation linked to this conversation."

        mirror_id_str = str(mirror_id)
        last_to_message = details.get("medibrief_to_message")
        existing_summary = details.get("medibrief_summary")

        # 2. Fetch new messages from the mirror conversation
        async with db_manager.get_connection() as conn:
            messages = await _fetch_new_mirror_messages(conn, mirror_id_str, last_to_message)

        if not messages:
            if existing_summary:
                return existing_summary
            return "No patient messages to summarize yet."

        from_id = messages[0]["id"]
        to_id = messages[-1]["id"]

        # 3. Build prompt and generate summary via Responses API (text_llm)
        prompt = _build_prompt(messages, existing_summary)

        result = await llm_parse(
            [
                {"role": "system", "content": _MEDIBRIEF_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            MediBrief,
        )

        if not result:
            logger.error(f"[MEDIBRIEF] LLM returned None for conversation {doctor_conversation_id}")
            return "Summary generation failed."

        # The model spreads the brief over several fields: keep all of them.
        brief = "\n\n".join(part for part in [
            result.summary,
            "Key symptoms: " + "; ".join(result.key_symptoms) if result.key_symptoms else "",
            f"Timeline: {result.timeline}" if result.timeline else "",
            f"Notes: {result.notes}" if result.notes else "",
        ] if part)

        # 4. Persist to dialog.medibrief_summaries
        async with db_manager.get_connection() as conn:
            await conn.execute(
                """
                INSERT INTO dialog.medibrief_summaries
                    (conversation_id, mirror_conversation_id, summary_text, from_message_id, to_message_id)
                VALUES ($1::uuid, $2::uuid, $3, $4, $5)
                """,
                doctor_conversation_id,
                mirror_id_str,
                brief,
                from_id,
                to_id,
            )

        logger.info(
            f"[MEDIBRIEF] conversation={doctor_conversation_id} "
            f"mirror={mirror_id_str} messages={from_id}→{to_id}"
        )
        return brief

    except Exception as exc:
        logger.error(
            f"[MEDIBRIEF] Failed for conversation {doctor_conversation_id}: {exc}",
            exc_info=True,
        )
        return f"Error generating clinical summary: {exc}"
