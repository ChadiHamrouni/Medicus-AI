"""
Conversation session service.

Manages history loading and message persistence for AI conversation turns.

GOLDEN RULES:
  - Read only from mat views (messages_view, conversation_details_view).
  - Write only to base tables (dialog.messages).
  - NEW / ACTIVE → no DB read; history is empty (ACTIVE context comes from payload).
  - INACTIVE     → ONE DB round-trip: query conversation_details_view for compaction
                   state, then fetch all uncompacted messages (bounded by MAX_HISTORY_LENGTH).
"""

import json
import uuid
from decimal import Decimal
from typing import Optional

from agents import TResponseInputItem

from medicus_common.core.constants import ConversationConstants
from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger


class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles Decimal objects."""

    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def _extract_text(content) -> str:
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except (json.JSONDecodeError, TypeError):
            return content
    if isinstance(content, dict):
        return (
            content.get("text_io")
            or content.get("body")
            or content.get("text")
            or ""
        )
    return str(content)


class ConvoService:

    @staticmethod
    async def load_history(
        convo_id: str,
        status: str,
    ) -> tuple[list[TResponseInputItem], dict | None]:
        """
        Load conversation history per golden rules.

        - NEW    : returns ([], None) — no DB hit.
        - ACTIVE : returns ([], None) — no DB hit; compact_summary is in the payload.
        - INACTIVE: one DB connection — queries conversation_details_view for compaction
                    state, then fetches all uncompacted messages (bounded by
                    MAX_HISTORY_LENGTH) from messages_view.

        Returns:
            (history, inactive_context)
            inactive_context keys: compact_summary, compact_to_message,
                                   medibrief_summary, mediexplain_summary.
            None for NEW / ACTIVE.
        """
        if status in ("NEW", "ACTIVE"):
            return [], None

        # INACTIVE — single connection, two queries
        async with db_manager.get_connection() as conn:
            details = await conn.fetchrow(
                """
                SELECT
                    compact_summary,
                    compact_to_message,
                    medibrief_summary,
                    mediexplain_summary
                FROM dialog.conversation_details_view
                WHERE id = $1::uuid
                """,
                convo_id,
            )

            if not details:
                logger.warning(f"[CONVO] No details row for conversation {convo_id}")
                return [], None

            compact_to_message = details["compact_to_message"]

            if compact_to_message is not None:
                rows = await conn.fetch(
                    """
                    SELECT id, role, content
                    FROM dialog.messages_view
                    WHERE conversation_id = $1::uuid
                      AND id > $2
                    ORDER BY id ASC
                    LIMIT $3
                    """,
                    convo_id,
                    compact_to_message,
                    ConversationConstants.MAX_HISTORY_LENGTH,
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT id, role, content
                    FROM dialog.messages_view
                    WHERE conversation_id = $1::uuid
                    ORDER BY id ASC
                    LIMIT $2
                    """,
                    convo_id,
                    ConversationConstants.MAX_HISTORY_LENGTH,
                )

        history: list[TResponseInputItem] = []
        for row in rows:
            try:
                history.append(
                    {"role": row["role"], "content": _extract_text(row["content"])}
                )
            except Exception as exc:
                logger.error(f"[CONVO] Failed to parse message id={row['id']}: {exc}")

        inactive_context = {
            "compact_summary": details["compact_summary"],
            "compact_to_message": compact_to_message,
            "medibrief_summary": details["medibrief_summary"],
            "mediexplain_summary": details["mediexplain_summary"],
        }

        logger.info(
            f"[CONVO] INACTIVE load: convo={convo_id} "
            f"messages={len(history)} compact_to={compact_to_message}"
        )
        return history, inactive_context

    @staticmethod
    async def add_convo_message(
        convo_id: str,
        role: str,
        content_body: str,
        attachments: Optional[list] = None,
        processed_by_ai: bool = False,
    ) -> Optional[dict]:
        """
        Add a single message to an existing conversation.

        NOTE: This service does NOT create conversations. Conversations must be created
        by MedicusConvo service before calling this method.

        Args:
            convo_id: UUID of the existing conversation.
            role: Message role (user, assistant, system).
            content_body: Message content (string or dict).
            attachments: Optional list of attachment metadata.
            processed_by_ai: Whether this message was processed by AI.

        Returns:
            Message data dict with id, created_at if successful, None otherwise.
        """
        async with db_manager.transaction() as conn:
            if isinstance(content_body, dict):
                content_json = content_body.copy()
                if "text_io" in content_json and not isinstance(content_json["text_io"], str):
                    content_json["text_io"] = str(content_json.get("text_io", ""))
                if "body" in content_json and not isinstance(content_json["body"], str):
                    content_json["body"] = str(content_json.get("body", ""))
            else:
                content_json = {
                    "type": "app",
                    "text_io": content_body,
                    "body": content_body,
                    "format": "markdown",
                }
                if attachments:
                    content_json["attachments"] = attachments

            try:
                message_data = await conn.fetchrow(
                    """
                    INSERT INTO dialog.messages (conversation_id, role, content, processed_by_ai)
                    VALUES ($1, $2::dialog.message_role, $3, $4)
                    RETURNING id, created_at, conversation_id, role, content, processed_by_ai
                    """,
                    uuid.UUID(convo_id),
                    role,
                    json.dumps(content_json, cls=DecimalEncoder),
                    processed_by_ai,
                )

                return {
                    "id": message_data["id"],
                    "created_at": message_data["created_at"].isoformat(),
                    "conversation_id": str(message_data["conversation_id"]),
                    "role": message_data["role"],
                    "content": json.loads(message_data["content"]),
                }
            except Exception as exc:
                logger.error(f"[CONVO] add_convo_message failed: {exc}", exc_info=True)
                return None
