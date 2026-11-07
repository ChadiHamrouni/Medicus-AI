"""
Conversation Compaction Service.

Triggered automatically after each AI turn when the number of uncompacted messages
reaches ConversationConstants.MAX_HISTORY_LENGTH.

Compresses the conversation into a rolling cumulative summary persisted in
dialog.conversation_compactions. This is pure AI context management — NOT a
clinical or patient-facing summary.

Read from : dialog.messages_view, dialog.conversation_details_view  (mat views)
Write to  : dialog.conversation_compactions                          (base table)
"""

from pydantic import BaseModel, Field

from medicus_common.core.database import db_manager
from medicus_common.core.openai import llm_parse
from medicus_common.core.logging_config import logger
from medicus_common.core.constants import ConversationConstants
from src.services.socketio_client import socketio_broadcast_service


# ---------------------------------------------------------------------------
# Internal output model (Responses API structured output)
# ---------------------------------------------------------------------------

class _CompactionResult(BaseModel):
    summary: str = Field(
        ...,
        description=(
            "Cumulative, lossless compression of the full conversation history. "
            "Preserves all clinically or contextually relevant facts in the most compact form."
        ),
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _extract_text(content) -> str:
    if isinstance(content, dict):
        return content.get("text_io") or content.get("body") or content.get("text") or ""
    return str(content)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def needs_compaction(conversation_id: str, compact_to_message_id: int | None) -> bool:
    """
    Return True when uncompacted message count >= MAX_HISTORY_LENGTH.

    Args:
        conversation_id    : UUID string of the conversation.
        compact_to_message_id: Last message ID covered by the latest compaction,
                               or None if the conversation has never been compacted.
    """
    async with db_manager.get_connection() as conn:
        if compact_to_message_id is not None:
            count = await conn.fetchval(
                """
                SELECT COUNT(*)
                FROM dialog.messages_view
                WHERE conversation_id = $1::uuid
                  AND id > $2
                """,
                conversation_id,
                compact_to_message_id,
            )
        else:
            count = await conn.fetchval(
                """
                SELECT COUNT(*)
                FROM dialog.messages_view
                WHERE conversation_id = $1::uuid
                """,
                conversation_id,
            )
    return (count or 0) >= ConversationConstants.MAX_HISTORY_LENGTH


async def compact_conversation(
    conversation_id: str,
    compact_to_message_id: int | None,
    existing_summary: str | None,
) -> tuple[bool, int | None, str | None]:
    """
    Compact uncompacted messages into a cumulative rolling summary.

    The new summary incorporates all previous context (via existing_summary)
    plus all messages with id > compact_to_message_id. The resulting record
    covers from_message_id → to_message_id and replaces the previous compaction
    as the agent's long-term memory for this conversation.

    Args:
        conversation_id      : UUID string of the conversation.
        compact_to_message_id: Last message ID covered by latest compaction (None = no prior compaction).
        existing_summary     : Text of the latest compaction (None = no prior compaction).

    Returns:
        (performed, to_message_id, new_summary) — False/None/None if not performed.
    """
    try:
        # 1. Fetch uncompacted messages
        async with db_manager.get_connection() as conn:
            if compact_to_message_id is not None:
                rows = await conn.fetch(
                    """
                    SELECT id, role, content
                    FROM dialog.messages_view
                    WHERE conversation_id = $1::uuid
                      AND id > $2
                    ORDER BY id ASC
                    """,
                    conversation_id,
                    compact_to_message_id,
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT id, role, content
                    FROM dialog.messages_view
                    WHERE conversation_id = $1::uuid
                    ORDER BY id ASC
                    """,
                    conversation_id,
                )

        if not rows:
            logger.info(f"[COMPACTION] No uncompacted messages for {conversation_id}")
            return False, None, None

        from_id = rows[0]["id"]
        to_id = rows[-1]["id"]

        # 2. Build LLM prompt
        new_messages_text = "\n".join(
            f"{r['role'].upper()}: {_extract_text(r['content'])}" for r in rows
        )

        _SYSTEM = (
            "You are a lossless conversation compressor for a medical AI agent. "
            "Your output is the agent's sole long-term memory — it must retain every fact, "
            "intent, decision, and contextual detail needed to continue the conversation "
            "seamlessly. This includes both clinical content AND conversational context "
            "(what was asked, what was answered, what was promised, what is pending). "
            "Write in dense, information-maximised prose. No bullet points. No headers. "
            "No omissions."
        )

        if existing_summary:
            prompt = (
                f"PRIOR CONTEXT SUMMARY:\n{existing_summary}\n\n"
                f"NEW MESSAGES TO COMPRESS INTO SUMMARY:\n{new_messages_text}\n\n"
                "Produce a single updated context summary that:\n"
                "1. Fully integrates the new messages with the prior summary\n"
                "2. Retains every fact, action, decision, pending item, and conversational detail\n"
                "3. Resolves or updates any information that has changed\n"
                "4. Is maximally concise without any information loss"
            )
        else:
            prompt = (
                f"CONVERSATION TO COMPRESS:\n{new_messages_text}\n\n"
                "Produce a single context summary that:\n"
                "1. Retains every fact, action, decision, pending item, and conversational detail\n"
                "2. Maintains full chronological and causal awareness\n"
                "3. Is maximally concise without any information loss"
            )

        # 3. Generate summary via Responses API (text_llm)
        result = await llm_parse(
            [
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": prompt},
            ],
            _CompactionResult,
        )

        if not result:
            logger.error(f"[COMPACTION] LLM returned None for conversation {conversation_id}")
            return False, None, None

        # 4. Persist to dialog.conversation_compactions
        async with db_manager.get_connection() as conn:
            await conn.execute(
                """
                INSERT INTO dialog.conversation_compactions
                    (conversation_id, summary_text, from_message_id, to_message_id)
                VALUES ($1::uuid, $2, $3, $4)
                """,
                conversation_id,
                result.summary,
                from_id,
                to_id,
            )

        logger.info(
            f"[COMPACTION] conversation={conversation_id} "
            f"messages={from_id}→{to_id}"
        )
        return True, to_id, result.summary

    except Exception as exc:
        logger.error(
            f"[COMPACTION] Failed for conversation {conversation_id}: {exc}",
            exc_info=True,
        )
        return False, None, None

async def _trigger_compaction(
    convo_id: str,
    compact_to_message: int | None,
    compact_summary: str | None,
) -> None:
    """Non-blocking: check and perform conversation compaction if needed."""
    try:
        if await needs_compaction(convo_id, compact_to_message):
            performed, to_id, new_summary = await compact_conversation(
                convo_id,
                compact_to_message,
                compact_summary,
            )
            if performed and to_id is not None and new_summary is not None:
                await socketio_broadcast_service.broadcast_compaction_complete(
                    convo_id, to_id, new_summary,
                )
    except Exception as exc:
        logger.error(f"[MEDITEXT] Compaction failed for {convo_id}: {exc}", exc_info=True)
