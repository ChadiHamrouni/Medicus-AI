from datetime import datetime
from typing import Optional
from uuid import UUID

import asyncpg

from medicus_common.core.database import db_manager
from medicus_common.models.user.user_core import UserRole
from medicus_common.core.exceptions import DatabaseError
from medicus_common.core.logging_config import logger
from medicus_common.models.convo.convo_core import ConversationState
from medicus_common.models.convo.convo_requests import ConversationCreateRequest, MessageCreateRequest
from medicus_common.models.convo.convo_responses import ConversationHead, ConversationListResponse, ConversationContext
from medicus_common.models.convo.convo_records import PatientInfo, DoctorInfo

class ConversationExistsError(Exception):
    """A conversation between this patient and doctor already exists."""


class ConvoService:
    """Refactored conversation service with improved architecture."""

    @staticmethod
    def _row_to_conversation_head(row) -> ConversationHead:
        """Convert a conversations_view row to a ConversationHead."""
        patient_info = None
        if row.get('patient_name'):
            patient_info = PatientInfo(
                name=row['patient_name'],
                image=row.get('patient_image'),
                age=row.get('patient_current_age'),
                gender=row.get('patient_gender')
            )


        doctor_info = None
        if row.get('doctor_name'):
            doctor_info = DoctorInfo(
                name=row['doctor_name'],
                image=row.get('doctor_image'),
                specialty_name=row.get('doctor_specialty_name')
            )

        created_at = row.get('created_at') or datetime.now()
        updated_at = row.get('updated_at') or datetime.now()

        return ConversationHead(
            id=row['id'],
            user_id=row['user_id'],
            patient_id=row.get('patient_id'),
            doctor_id=row.get('doctor_id'),
            assistant=row['assistant'],
            region_id=row.get('region_id'),
            created_at=created_at,
            updated_at=updated_at,
            state=row.get('state', ConversationState.ACTIVE),
            lastMessage=row.get('last_message_text'),
            lastMessageTimestamp=row.get('last_message_timestamp'),
            patient=patient_info,
            doctor=doctor_info,
            mirror_conversation_id=row.get('mirror_conversation_id')
        )

    async def list_conversations(self, user,
                                 page: int = 1,
                                 page_size: int = 20,
                                 patient_id: Optional[int] = None,
                                 doctor_id: Optional[int] = None,
                                 assistant: str = "mediaid") -> ConversationListResponse:
        """List user conversations based on context."""
        user_id = getattr(user, 'id', None)
        offset = (page - 1) * page_size

        # Build WHERE clause - show conversations owned by user
        where_conditions = [
            "c.user_id = $1",
            "c.assistant = $2",
            "c.state != $3"
        ]
        params = [user_id, assistant, ConversationState.CLOSED.value]

        # Add optional patient_id filter
        if patient_id is not None:
            where_conditions.append(f"c.patient_id = ${len(params) + 1}")
            params.append(patient_id)

        # Add optional doctor_id filter
        if doctor_id is not None:
            where_conditions.append(f"c.doctor_id = ${len(params) + 1}")
            params.append(doctor_id)

        where_clause = " AND ".join(where_conditions)

        # Fetch page_size + 1 to detect if there's a next page (no COUNT needed)
        fetch_limit = page_size + 1
        query_params = params + [fetch_limit, offset]
        query = f"""
            SELECT *
            FROM dialog.conversations_view c
            WHERE {where_clause}
            ORDER BY c.updated_at DESC
            LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
        """

        rows = await db_manager.fetch(query, *query_params)

        # Determine if there's a next page by checking if we got the extra row
        has_next = len(rows) > page_size
        rows_to_process = rows[:page_size]

        conversations = [self._row_to_conversation_head(row) for row in rows_to_process]

        # Calculate pagination (has_next already determined above)
        has_previous = page > 1

        next_url = f"?page={page + 1}&page_size={page_size}" if has_next else None
        previous_url = f"?page={page - 1}&page_size={page_size}" if has_previous else None

        return ConversationListResponse(
            conversations=conversations,
            total=len(conversations),  # Return actual count, not total
            page=page,
            page_size=page_size,
            next=next_url,
            previous=previous_url
        )

    async def get_conversation_by_id(self, convo_id: UUID) -> Optional[ConversationHead]:
        """Get a single conversation by ID."""
        query = """
            SELECT *
            FROM dialog.conversations_view
            WHERE id = $1
        """
        row = await db_manager.fetchrow(query, convo_id)

        if not row:
            return None

        return self._row_to_conversation_head(row)

    async def get_conversation_context(self, convo_id: UUID) -> Optional[ConversationContext]:
        """
        Fetch AI context state for a conversation from conversation_details_view.

        Returns compaction state (AI long-term memory) and domain-specific summaries.
        Used by the frontend to hydrate its local cache (future: SQLite) on conversation open.
        """
        row = await db_manager.fetchrow(
            """
            SELECT
                compact_summary,
                compact_to_message,
                medibrief_summary,
                mediexplain_summary
            FROM dialog.conversation_details_view
            WHERE id = $1
            """,
            convo_id,
        )
        if not row:
            return None
        return ConversationContext(
            conversation_id=convo_id,
            compact_summary=row["compact_summary"],
            compact_to_message=row["compact_to_message"],
            medibrief_summary=row["medibrief_summary"],
            mediexplain_summary=row["mediexplain_summary"],
        )

    async def search_conversations(self, user,
                                    q: str,
                                    mode: str = "participant",
                                    assistant: str = "mediaid",
                                    patient_id: Optional[int] = None,
                                    doctor_id: Optional[int] = None,
                                    page: int = 1,
                                    page_size: int = 20) -> ConversationListResponse:
        """Search conversations by participant name or message content."""
        user_id = getattr(user, 'id', None)
        offset = (page - 1) * page_size
        search_pattern = f"%{q.strip().lower()}%"

        where_conditions = [
            "c.user_id = $1",
            "c.assistant = $2",
            "c.state != $3"
        ]
        params = [user_id, assistant, ConversationState.CLOSED.value]

        if patient_id is not None:
            where_conditions.append(f"c.patient_id = ${len(params) + 1}")
            params.append(patient_id)

        if doctor_id is not None:
            where_conditions.append(f"c.doctor_id = ${len(params) + 1}")
            params.append(doctor_id)

        # Add search condition
        search_param_idx = len(params) + 1
        params.append(search_pattern)

        if mode == "content":
            where_conditions.append(f"""EXISTS (
                SELECT 1 FROM dialog.messages_view m
                WHERE m.conversation_id = c.id
                AND (
                    LOWER(m.content->>'text_io') LIKE ${search_param_idx} OR
                    LOWER(m.content->>'text') LIKE ${search_param_idx} OR
                    LOWER(m.content->>'message') LIKE ${search_param_idx}
                )
            )""")
        else:
            # Participant mode: search by name
            if assistant == "medidoc":
                where_conditions.append(f"LOWER(c.patient_name) LIKE ${search_param_idx}")
            else:
                where_conditions.append(f"LOWER(c.doctor_name) LIKE ${search_param_idx}")

        where_clause = " AND ".join(where_conditions)
        fetch_limit = page_size + 1
        query_params = params + [fetch_limit, offset]

        query = f"""
            SELECT *
            FROM dialog.conversations_view c
            WHERE {where_clause}
            ORDER BY c.updated_at DESC
            LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
        """

        rows = await db_manager.fetch(query, *query_params)

        has_next = len(rows) > page_size
        conversations = [self._row_to_conversation_head(row) for row in rows[:page_size]]

        has_previous = page > 1
        next_url = f"?page={page + 1}&page_size={page_size}" if has_next else None
        previous_url = f"?page={page - 1}&page_size={page_size}" if has_previous else None

        return ConversationListResponse(
            conversations=conversations,
            total=len(conversations),
            page=page,
            page_size=page_size,
            next=next_url,
            previous=previous_url
        )

    async def create_conversation(self, req: ConversationCreateRequest, user) -> ConversationHead:
        """
        Start a patient <-> doctor thread: the patient's copy (mediaid) plus the
        doctor's mirror (medidoc), linked through mirror_conversation_id.
        """
        if getattr(user, "role", None) != UserRole.PATIENT or req.assistant.value != "mediaid":
            raise PermissionError("Only patients can start a conversation with a doctor")
        if not (req.patient_id and req.doctor_id):
            raise ValueError("patient_id and doctor_id are required")

        patient_owner = await db_manager.fetchval(
            "SELECT user_id FROM public.patients WHERE id = $1 AND deleted_at IS NULL", req.patient_id
        )
        if patient_owner != user.id:
            raise PermissionError("Unknown patient profile")
        doctor_user_id = await db_manager.fetchval(
            "SELECT user_id FROM public.doctors WHERE id = $1 AND deleted_at IS NULL AND status = 'ACTIVE'",
            req.doctor_id,
        )
        if doctor_user_id is None:
            raise ValueError("Unknown doctor")

        columns = "id, user_id, patient_id, doctor_id, assistant, region_id, created_at, updated_at, mirror_conversation_id"
        try:
            async with db_manager.transaction() as conn:
                patient_row = await conn.fetchrow(
                    f"""INSERT INTO dialog.conversations (user_id, patient_id, doctor_id, assistant)
                        VALUES ($1, $2, $3, 'mediaid') RETURNING {columns}""",
                    user.id, req.patient_id, req.doctor_id,
                )
                doctor_row = await conn.fetchrow(
                    f"""INSERT INTO dialog.conversations (user_id, patient_id, doctor_id, assistant, mirror_conversation_id)
                        VALUES ($1, $2, $3, 'medidoc', $4) RETURNING {columns}""",
                    doctor_user_id, req.patient_id, req.doctor_id, patient_row["id"],
                )
                await conn.execute(
                    "UPDATE dialog.conversations SET mirror_conversation_id = $1 WHERE id = $2",
                    doctor_row["id"], patient_row["id"],
                )
        except asyncpg.UniqueViolationError:
            raise ConversationExistsError()
        except DatabaseError as e:
            if isinstance(e.__cause__, asyncpg.UniqueViolationError) or "unique" in str(e).lower():
                raise ConversationExistsError()
            raise

        return ConversationHead(**{
            **dict(patient_row),
            "mirror_conversation_id": doctor_row["id"],
            "state": ConversationState.ACTIVE,
        })



# Global service instance
convo_service = ConvoService()