# src/helpers/actor_context.py
"""
Actor Context Injection — pgAudit traceability for PHI access.

This module provides a FastAPI dependency that injects the current
user's identity into the database transaction context via SET LOCAL.
pgAudit then captures this actor_id in every log entry.

Usage in routes::

    @router.get("/patient/{patient_id}/records")
    async def get_records(
        patient_id: str,
        current_user: User = Depends(get_current_user),
        _: None = Depends(inject_actor_context),
    ):
        # The actor_id is now set for this request's DB operations
        ...
"""

from fastapi import Depends, Request
from medicus_common.core.database import db_manager, inject_actor
from src.api.auth_routes.auth_login import get_current_user
from medicus_common.models.user import User
from medicus_common.core.logging_config import get_logger

logger = get_logger(__name__)


async def inject_actor_context(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> None:
    """
    FastAPI dependency: inject the authenticated user's ID into
    the database transaction context for pgAudit logging.

    This sets ``custom.actor_id`` via SET LOCAL, which scopes
    the value to the current transaction only.

    Should be added to any route that performs PHI read/write operations.
    """
    actor_id = str(current_user.id)

    # Get a connection from the pool and inject the actor
    async with db_manager.connection() as conn:
        await inject_actor(conn, actor_id)

    # Also store on request.state for downstream access if needed
    request.state.actor_id = actor_id

    logger.debug(
        "Actor context injected: user_id=%s path=%s",
        actor_id,
        request.url.path,
    )