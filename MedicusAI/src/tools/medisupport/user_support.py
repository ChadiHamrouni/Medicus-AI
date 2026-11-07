import json
from typing import Optional, List, Dict, Any
from agents import function_tool
from datetime import datetime, timezone

from medicus_common.core.database import db_manager
from medicus_common.core.exceptions import DatabaseError, ValidationError
from medicus_common.models.audit.audit_context import AuditContext
from medicus_common.models.ticket import (
    TicketResponse,
    SupportTicketsResponse,
    SupportTicketResultResponse
)


# ============================================================
# SUPPORT — READ EXISTING TICKETS
# ============================================================

@function_tool
async def get_support(
    created_by: Optional[int] = None,
    status: Optional[str] = "open",
    category: Optional[str] = None,
    limit: int = 5,
) -> SupportTicketsResponse:
    """
    Retrieve existing support tickets to prevent duplicates.

    INTENT
    ------
    Use this tool to check whether a similar support issue has already
    been reported and is still unresolved.

    This tool exists to:
    - Avoid duplicate tickets
    - Preserve user continuity
    - Allow Sara to reference existing support work

    WORKFLOW ROLE (PRE-FLIGHT CHECK)
    --------------------------------
    This tool is the FIRST step in the support ticket workflow.

    When a user reports an issue:
    1. Call this tool SILENTLY with created_by=<user_id>, status="open"
    2. If matching tickets exist → inform user and provide ticket ID(s)
    3. If no matching tickets → proceed to ask for confirmation
    4. Do NOT create tickets without this check

    WHEN TO USE
    -----------
    - BEFORE offering to create a new support ticket (MANDATORY)
    - When the user reports a technical, administrative, or system issue
    - When the user asks about the status of prior support requests

    WHEN NOT TO USE
    ---------------
    - Do NOT use for medical issues
    - Do NOT use for emergencies
    - Do NOT use for booking, billing, or clinical workflows

    PARAMETERS
    ----------
    created_by : int, optional
        User ID who created the ticket.
        If omitted, returns tickets across users.

    status : str, optional
        Ticket status filter.
        Default: "open"

    category : str, optional
        Ticket category filter (e.g., technical, administrative).

    limit : int
        Maximum number of tickets to return.

    RETURNS
    -------
    List[Dict[str, Any]]
        Each item contains (from support.tickets_view materialized view):
        - ticket_id: Unique identifier
        - subject: Ticket subject
        - description: Issue description
        - ticket_status: Current status (open, resolved, closed)
        - priority: Priority level
        - category: Category (technical, administrative, etc)
        - creator_user_id: User ID who created ticket
        - creator_role: Role of creator (doctor, patient, etc)
        - creator_name: Full name of creator
        - clinical_id: Doctor ID or Patient ID (depending on role)
        - specialty: Specialty name (if creator is doctor)
        - country: Country name (if creator is doctor)
        - assigned_user_id: User ID of assigned staff (if any)
        - assigned_staff_name: Full name of assigned staff member
        - staff_level: Staff role level (admin, engineer, etc)
        - created_at: Creation timestamp
        - updated_at: Last update timestamp
        - closed_at: Closure timestamp (if closed)

    STATE BEHAVIOR
    --------------
    - Read-only
    - No mutations

    HARD RULES
    ----------
    - Never infer ticket resolution
    - If no tickets exist, return empty list
    """

    try:
        async with db_manager.get_connection() as conn:
            query = """
                SELECT
                    ticket_id,
                    subject,
                    description,
                    ticket_status,
                    priority,
                    category,
                    creator_user_id,
                    creator_role,
                    creator_name,
                    clinical_id,
                    specialty,
                    country,
                    assigned_user_id,
                    assigned_staff_name,
                    staff_level,
                    created_at,
                    updated_at,
                    closed_at
                FROM support.tickets_view
                WHERE ($1::int IS NULL OR creator_user_id = $1)
                  AND ($2::text IS NULL OR ticket_status = $2)
                  AND ($3::text IS NULL OR category = $3)
                ORDER BY created_at DESC
                LIMIT $4
            """
            rows = await conn.fetch(query, created_by, status, category, limit)
            tickets = [TicketResponse(**dict(row)) for row in rows]
            return SupportTicketsResponse(tickets=tickets, total=len(tickets))

    except Exception as e:
        raise DatabaseError(f"Failed to retrieve support tickets: {str(e)}")


# ============================================================
# SUPPORT — CREATE NEW TICKET
# ============================================================

_CATEGORIES = {"technical", "billing", "feedback", "account"}
_PRIORITIES = {"low", "medium", "high", "critical"}


@function_tool
async def report_support(
    subject: str,
    description: str,
    created_by: int,
    category: str = "technical",
    priority: str = "medium",
    tags: Optional[List[str]] = None,
    audit_context: Optional[AuditContext] = None,
) -> SupportTicketResultResponse:
    """
    Create a new support ticket from a user-reported issue.

    INTENT
    ------
    Use this tool to formally report non-clinical issues such as:
    - Technical problems
    - Notification failures
    - Booking system errors
    - App or platform malfunctions

    Tickets created here are routed to human support teams.

    WORKFLOW REQUIREMENT (MANDATORY)
    --------------------------------
    This tool MUST ONLY be called AFTER user confirmation.

    Required sequence:
    1. Check for existing tickets: get_support(created_by=user_id, status="open")
    2. Ask user: "Would you like me to open a support ticket for you?"
    3. Wait for explicit "Yes" confirmation
    4. ONLY THEN call this tool

    DO NOT create tickets proactively without user consent.

    WHEN TO USE
    -----------
    - AFTER confirming no unresolved similar ticket exists via get_support
    - AFTER receiving explicit user confirmation to create a ticket
    - When the user explicitly asks for help or reports a problem
    - When the issue cannot be solved via available tools

    WHEN NOT TO USE
    ---------------
    - Do NOT use for medical questions
    - Do NOT use for emergencies
    - Do NOT use for clinical data errors (use medical mutation tools)
    - Do NOT use without user confirmation

    PARAMETERS
    ----------
    subject : str
        Short, descriptive title of the issue.

    description : str
        Free-text description of the problem in the user's own words.

    created_by : int
        User ID submitting the ticket.

    category : str
        Ticket category (technical, billing, feedback, account).

    priority : str
        Ticket urgency (low, medium, high, critical).

    tags : List[str], optional
        Searchable labels (e.g., "notifications", "booking").

    audit_context : AuditContext, optional
        Audit metadata if available.

    RETURNS
    -------
    Dict[str, Any]
        Created ticket metadata:
        - id
        - status
        - created_at

    STATE BEHAVIOR
    --------------
    - Creates a new database record
    - Immutable after creation except via support workflow

    HARD RULES
    ----------
    - Never create duplicate tickets without checking get_support
    - Never fabricate user intent or issue details
    """

    if not subject or not description:
        raise ValidationError("Support ticket requires subject and description.")
    category = category.lower().strip() if category and category.lower().strip() in _CATEGORIES else "technical"
    priority = priority.lower().strip() if priority and priority.lower().strip() in _PRIORITIES else "medium"

    try:
        async with db_manager.get_connection() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO support.tickets
                (subject, body, category, priority, tags, created_by, created_at, updated_at)
                VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7, $7)
                RETURNING id, status, created_at
                """,
                subject,
                json.dumps({"description": description}),
                category,
                priority,
                tags or [],
                created_by,
                datetime.now(timezone.utc),
            )

            if row is None:
                raise DatabaseError("Failed to create support ticket - no result returned")

            result = SupportTicketResultResponse(
                id=row["id"],
                status=row["status"],
                created_at=row["created_at"].isoformat(),
                closed_at=None
            )

        # Refresh materialized view for immediate visibility

        return result

    except Exception as e:
        raise DatabaseError(f"Failed to create support ticket: {str(e)}")


# ============================================================
# SUPPORT — CLOSE / RESOLVE TICKET
# ============================================================

@function_tool
async def close_support(
    ticket_id: int,
    resolved_by: int,
    resolution_note: Optional[str] = None,
) -> SupportTicketResultResponse:
    """
    Mark an existing support ticket as resolved.

    INTENT
    ------
    Use this tool to close a support ticket after the issue
    has been addressed or confirmed resolved.

    WHEN TO USE
    -----------
    - When support confirms resolution
    - When the user acknowledges the issue is fixed

    WHEN NOT TO USE
    ---------------
    - Do NOT close tickets without confirmation
    - Do NOT guess resolution

    PARAMETERS
    ----------
    ticket_id : int
        Identifier of the support ticket.

    resolved_by : int
        User or agent ID performing the closure.

    resolution_note : str, optional
        Short explanation of how the issue was resolved.

    RETURNS
    -------
    Dict[str, Any]
        Resolution result:
        - id
        - status
        - closed_at

    STATE BEHAVIOR
    --------------
    - Mutates ticket status
    - Sets closed_at timestamp

    HARD RULES
    ----------
    - Never invent ticket IDs
    - Ticket must exist and not already be closed
    """

    try:
        async with db_manager.get_connection() as conn:
            row = await conn.fetchrow(
                """
                UPDATE support.tickets
                SET status = 'closed',
                    closed_at = $2,
                    updated_at = $2,
                    user_comments = CASE WHEN $3::text IS NULL THEN user_comments
                        ELSE user_comments || jsonb_build_array(
                            jsonb_build_object('resolution', $3::text, 'at', $2::timestamptz)) END
                WHERE id = $1 AND status != 'closed'
                RETURNING id, status, closed_at
                """,
                ticket_id,
                datetime.now(timezone.utc),
                resolution_note or None,
            )

            if not row:
                return SupportTicketResultResponse(id=ticket_id, status="not_found_or_closed",
                                                   created_at=None, closed_at=None)

            result = SupportTicketResultResponse(
                id=row["id"],
                status=row["status"],
                closed_at=row["closed_at"].isoformat(),
                created_at=None
            )

        # Refresh materialized view for immediate visibility

        return result

    except Exception as e:
        raise DatabaseError(f"Failed to close support ticket: {str(e)}")
