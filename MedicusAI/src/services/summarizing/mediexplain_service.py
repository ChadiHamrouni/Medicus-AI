"""
MediExplain Service.

Generates a patient-facing plain-language explanation of the medical instructions,
diagnoses, and prescriptions communicated in the patient's conversation.

Triggered when the patient's mediaid agent calls the mediexplain_explain tool.

WHAT IS INCLUDED   : Doctor's prescriptions, diagnoses, instructions, and care plans
                     as communicated to the patient through Sara.
WHAT IS EXCLUDED   : Internal clinical reasoning between the doctor and Sara,
                     diagnostic deliberation not surfaced to the patient,
                     system meta-discussions, social exchanges.

Reads from : dialog.conversation_details_view, dialog.messages_view  (mat views)
Writes to  : dialog.mediexplain_summaries                             (base table)
"""

from medicus_common.core.database import db_manager
from medicus_common.core.openai import llm_parse
from medicus_common.core.logging_config import logger
from medicus_common.models.convo.mediexplain import MediExplain


# ---------------------------------------------------------------------------
# Prompt constants
# ---------------------------------------------------------------------------

_MEDIEXPLAIN_SYSTEM = """\
You are MediExplain — a compassionate patient communication specialist.

Your job is to translate what a doctor has communicated to a patient into clear, \
warm, and actionable language that any adult can understand without a medical background.

OUTPUT REGISTER: Conversational, empathetic, practical. Grade 7–8 reading level. \
Short sentences. Active voice. First-person patient perspective ("you should take…", \
"your doctor wants you to…"). Use analogies when they clarify.

STRICT INCLUSION CRITERIA — explain ONLY:
  • Diagnoses or health conditions explained to the patient
  • Prescribed medications: name, dose, timing, duration, purpose, and what to expect
  • Instructions for the patient to follow (diet, rest, activity restrictions, wound care, etc.)
  • Upcoming tests, procedures, or referrals and what they involve
  • Warning signs the patient should watch for and when to seek help
  • Follow-up appointments and their purpose
  • Answers Sara gave to the patient's direct medical questions

STRICT EXCLUSION — omit entirely:
  • The doctor's internal clinical reasoning or diagnostic deliberation
  • Technical medical decision-making between the doctor and Sara (the AI assistant)
  • Differential diagnoses the doctor considered but did not communicate to the patient
  • Dosing calculation rationale or pharmacological justifications
  • Social pleasantries, greetings, and conversational filler
  • Any AI system instructions or meta-discussions about how Sara works
  • Repeated information already captured in a prior explanation

TRANSLATION RULES:
  • Replace every abbreviation: "TID" → "three times a day", "PRN" → "only when needed", \
"PO" → "by mouth", "QHS" → "at bedtime", "SOB" → "shortness of breath"
  • Replace every jargon term: "hypertension" → "high blood pressure", \
"pyrexia" → "fever", "analgesic" → "pain reliever", "contraindicated" → "not safe for you"
  • Preserve exact numbers: doses (500mg stays 500mg), frequencies, durations
  • For medications: always state the name, what it treats, how/when to take it, \
and one key thing to watch for\
"""

_MEDIEXPLAIN_UPDATE_PROMPT = """\
PREVIOUS EXPLANATION YOU GAVE THIS PATIENT:
{prior}

NEW MEDICAL INFORMATION TO EXPLAIN:
{messages}{scan_block}

Produce an UPDATED patient explanation that:
1. Adds new information in clear, plain language
2. Updates or corrects anything that has changed (e.g., dosage change, new diagnosis)
3. Keeps all still-relevant instructions from the prior explanation
4. Removes anything that is no longer applicable
5. Ends with a clear, friendly summary of what the patient needs to do next
\
"""

_MEDIEXPLAIN_INITIAL_PROMPT = """\
MEDICAL INFORMATION TO EXPLAIN TO THE PATIENT:
{messages}{scan_block}

Produce a PATIENT EXPLANATION that:
1. Translates all medical instructions and diagnoses into plain, everyday language
2. Tells the patient clearly what they need to do and why
3. Explains any medications: what they are for, how to take them, what to expect
4. Lists any warning signs the patient must watch for
5. Ends with a warm, clear summary of the most important next steps

If there is no medical information to explain, output exactly: "No medical information to explain."
\
"""


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _extract_text(content) -> str:
    if isinstance(content, dict):
        return content.get("text_io") or content.get("body") or content.get("text") or ""
    return str(content)


async def _load_conversation_details(conn, conversation_id: str) -> dict | None:
    row = await conn.fetchrow(
        """
        SELECT
            mediexplain_to_message,
            mediexplain_summary
        FROM dialog.conversation_details_view
        WHERE id = $1::uuid
        """,
        conversation_id,
    )
    return dict(row) if row else None


async def _fetch_new_messages(
    conn,
    conversation_id: str,
    after_message_id: int | None,
) -> list[dict]:
    """
    Fetch messages from the patient conversation after the last explained message.
    Includes all roles — the LLM prompt instructs what to include/exclude.
    """
    if after_message_id is not None:
        rows = await conn.fetch(
            """
            SELECT id, role, content, created_at, processed_by_ai
            FROM dialog.messages_view
            WHERE conversation_id = $1::uuid
              AND id > $2
            ORDER BY id ASC
            """,
            conversation_id,
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
            conversation_id,
        )
    return [dict(r) for r in rows]


def _build_prompt(messages: list[dict], existing_summary: str | None) -> str:
    # Separate scan insights (document analyses) from conversational messages
    scan_msgs = [m for m in messages if m.get("processed_by_ai") and m["role"] == "assistant"]
    convo_msgs = [m for m in messages if not (m.get("processed_by_ai") and m["role"] == "assistant")]

    messages_text = "\n".join(
        f"[{m['role'].upper()}] {_extract_text(m['content'])}" for m in convo_msgs
    )

    scan_block = ""
    if scan_msgs:
        count = len(scan_msgs)
        label = "medical documents/images" if count > 1 else "a medical document/image"
        entries = "\n\n".join(
            f"  [{m['created_at'].strftime('%Y-%m-%d %H:%M UTC')}]\n"
            f"  {_extract_text(m['content'])}"
            for m in scan_msgs
        )
        scan_block = (
            f"\n\nDOCUMENTS YOUR DOCTOR REVIEWED ({count} {label}):\n{entries}\n"
            f"(Explain the key findings from these documents in simple terms.)"
        )

    if existing_summary:
        return _MEDIEXPLAIN_UPDATE_PROMPT.format(
            prior=existing_summary,
            messages=messages_text,
            scan_block=scan_block,
        )
    else:
        return _MEDIEXPLAIN_INITIAL_PROMPT.format(
            messages=messages_text,
            scan_block=scan_block,
        )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def run_mediexplain(conversation_id: str) -> str:
    """
    Generate and persist a MediExplain patient-facing explanation.

    Reads new messages since the last explanation from dialog.messages_view,
    generates a plain-language explanation via the Responses API (text_llm),
    and inserts a new record into dialog.mediexplain_summaries.

    Args:
        conversation_id: UUID of the patient's (mediaid) conversation.

    Returns:
        The generated explanation text, or a descriptive error string.
    """
    try:
        # 1. Load conversation details (last explained message + existing explanation)
        async with db_manager.get_connection() as conn:
            details = await _load_conversation_details(conn, conversation_id)

        if not details:
            return "Conversation not found."

        last_to_message = details.get("mediexplain_to_message")
        existing_summary = details.get("mediexplain_summary")

        # 2. Fetch new messages
        async with db_manager.get_connection() as conn:
            messages = await _fetch_new_messages(conn, conversation_id, last_to_message)

        if not messages:
            if existing_summary:
                return existing_summary
            return "No medical information to explain yet."

        from_id = messages[0]["id"]
        to_id = messages[-1]["id"]

        # 3. Build prompt and generate explanation via Responses API (text_llm)
        prompt = _build_prompt(messages, existing_summary)

        result = await llm_parse(
            [
                {"role": "system", "content": _MEDIEXPLAIN_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            MediExplain,
        )

        if not result:
            logger.error(f"[MEDIEXPLAIN] LLM returned None for conversation {conversation_id}")
            return "Explanation generation failed."

        # 4. Persist to dialog.mediexplain_summaries
        async with db_manager.get_connection() as conn:
            await conn.execute(
                """
                INSERT INTO dialog.mediexplain_summaries
                    (conversation_id, summary_text, from_message_id, to_message_id)
                VALUES ($1::uuid, $2, $3, $4)
                """,
                conversation_id,
                result.summary,
                from_id,
                to_id,
            )

        logger.info(
            f"[MEDIEXPLAIN] conversation={conversation_id} messages={from_id}→{to_id}"
        )
        return result.summary

    except Exception as exc:
        logger.error(
            f"[MEDIEXPLAIN] Failed for conversation {conversation_id}: {exc}",
            exc_info=True,
        )
        return f"Error generating explanation: {exc}"
