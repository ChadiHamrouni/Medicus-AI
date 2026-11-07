"""Health check routes."""

from datetime import datetime, timezone

from fastapi import APIRouter

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger

from src.models.responses import HealthResponse

router = APIRouter()


@router.get("", response_model=HealthResponse)
async def health_check():
    """Liveness: the process is up."""
    return HealthResponse(status="healthy", service="MedicusNotification", version="1.0.0",
                          database="unknown", timestamp=datetime.now(timezone.utc))


@router.get("/detailed", response_model=HealthResponse)
async def detailed_health_check():
    """Readiness: the database (which also holds the delivery queue) is reachable."""
    try:
        await db_manager.fetchval("SELECT 1")
        db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"
    return HealthResponse(
        status="healthy" if db_status == "healthy" else "degraded",
        service="MedicusNotification", version="1.0.0", database=db_status,
        timestamp=datetime.now(timezone.utc),
    )
