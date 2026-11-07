from typing import List, Optional, Literal
from agents import function_tool
from pydantic import BaseModel, Field

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.core.exceptions import DatabaseError


class ConversationResult(BaseModel):
    """Single conversation search result with link."""
    conversation_id: str = Field(description="Conversation UUID")
    patient_name: Optional[str] = Field(None, description="Patient's full name (None if doctor-only conversation)")
    last_message: str = Field(description="Preview of last message")
    last_message_time: str = Field(description="When last message was sent")
    conversation_link: str = Field(description="Deep link to open this conversation in app")


class ConversationSearchResults(BaseModel):
    """Search results containing matching conversations."""
    results: List[ConversationResult] = Field(description="List of matching conversations")
    total_found: int = Field(description="Total number of conversations matching the query")
    message: str = Field(description="Human-readable summary of search results")


@function_tool
async def search_conversations(
        query: str,
        doctor_id: Optional[int] = None,
        assistant: Literal["mediaid", "medidoc"] = None,
) -> ConversationSearchResults:
    """
    Search the doctor's patient conversations by patient name or keywords.

    INTENT
    ------
    Use this tool when a doctor asks to find or reference a conversation
    with a specific patient. Searches by patient name, medical topics, or keywords.
    This tool is for doctor-facing (MediDoc) context only.

    STATE TRANSITION
    ----------------
    - Executes a read-only search over the doctor's conversation history.
    - Returns matching conversations with patient names and summaries.
    - Does NOT modify conversations, messages, or medical records.

    PARAMETERS
    ----------
    query : str
        Search query - typically a patient name or medical keyword.
        Examples: "Bobby", "headache", "Bobby headache"

    doctor_id : int
        The doctor's ID. Automatically provided from context.
        Used to filter conversations belonging to this doctor.

    assistant : str
        The assistant context. Automatically provided from context.
        Should be "medidoc" for doctor searches.

    RETURNS
    -------
    ConversationSearchResults
        Matching conversations with:
        - conversation_id
        - patient_name
        - last message preview
        - timestamps
        - deep-link for navigation

    HARD RULES
    ----------
    - Only returns conversations belonging to the doctor
    - MUST NOT fabricate conversations or metadata
    - Returns empty result if no matches found

    EXAMPLES
    --------
    # Doctor searching for a patient named Bobby
    results = await search_conversations(
        query="Bobby",
        doctor_id=50019,
        assistant="medidoc"
    )
    """

    try:
        logger.info(f"[TOOL] search_conversations called: doctor_id={doctor_id}, assistant={assistant}, query=\"{query}\"")

        # Validate doctor_id is provided
        if not doctor_id:
            logger.error("[TOOL] search_conversations: doctor_id is required")
            return ConversationSearchResults(
                results=[],
                total_found=0,
                message="Doctor ID is required to search conversations"
            )

        # Prepare search terms
        search_terms = [term.strip().lower() for term in query.split() if term.strip()]
        if not search_terms:
            return ConversationSearchResults(
                results=[],
                total_found=0,
                message="No search terms provided"
            )

        # Build search conditions - search doctor's conversations by patient name/content
        # IMPORTANT: Filter by assistant='medidoc' to only return doctor-facing conversations
        # This excludes mirrored patient conversations (mediaid) that have the same doctor_id
        search_conditions = []
        search_params = [doctor_id, "closed", "medidoc"]  # doctor_id, state != 'closed', assistant
        param_count = 4  # Start at $4 since $1=doctor_id, $2=state, $3=assistant

        for term in search_terms:
            condition = f"""(
                LOWER(c.patient_name) LIKE ${param_count} OR
                LOWER(c.doctor_name) LIKE ${param_count + 1} OR
                LOWER(c.assistant::text) LIKE ${param_count + 2} OR
                EXISTS (
                    SELECT 1 FROM dialog.messages_view m
                    WHERE m.conversation_id = c.id
                    AND (
                        LOWER(m.content->>'text_io') LIKE ${param_count + 3} OR
                        LOWER(m.content->>'text') LIKE ${param_count + 4} OR
                        LOWER(m.content->>'message') LIKE ${param_count + 5}
                    )
                )
            )"""
            search_conditions.append(condition)

            search_pattern = f"%{term}%"
            search_params.extend([search_pattern] * 6)
            param_count += 6

        where_clause = " AND ".join(search_conditions)

        # Search query - find doctor's conversations matching the query
        # Filter by assistant='medidoc' to only return doctor-facing conversations
        # Exclude solo Sara conversations (patient_id IS NULL) - these are doctor talking to Sara without a patient
        search_query = f"""
            SELECT DISTINCT
                c.id, c.patient_name, c.doctor_name,
                c.last_message_text, c.last_message_timestamp, c.updated_at
            FROM dialog.conversations_view c
            WHERE c.doctor_id = $1
              AND c.state != $2
              AND c.assistant = $3
              AND c.patient_id IS NOT NULL
              AND ({where_clause})
            ORDER BY c.updated_at DESC
            LIMIT 5
        """

        rows = await db_manager.fetch(search_query, *search_params)

        # Build results with deep links
        results = []
        for row in rows:
            # Deep link format: mediapp://conversation/{id}
            link = f"mediapp://conversation/{row['id']}"

            results.append(ConversationResult(
                conversation_id=str(row['id']),
                patient_name=row.get('patient_name'),  # Can be None for doctor-only conversations
                last_message=(row.get('last_message_text') or '')[:100],
                last_message_time=str(row.get('last_message_timestamp') or ''),
                conversation_link=link
            ))

        # Generate human-readable message
        if len(results) == 0:
            message = f"No conversations found matching '{query}'"
        elif len(results) == 1:
            message = f"Found 1 conversation matching '{query}'"
        else:
            message = f"Found {len(results)} conversations matching '{query}' (showing top 5)"

        # Log results
        logger.info(f"[TOOL] search_conversations result: {len(results)} found, message=\"{message}\"")
        for i, r in enumerate(results):
            logger.info(f"[TOOL]   [{i+1}] patient={r.patient_name}, last_msg=\"{r.last_message[:50]}...\"")

        return ConversationSearchResults(
            results=results,
            total_found=len(results),
            message=message
        )

    except Exception as e:
        logger.error(f"Failed to search conversations: {e}")
        raise DatabaseError(f"Search failed: {str(e)}")