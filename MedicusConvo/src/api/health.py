# =============================================================================
# src/api/health.py
# =============================================================================

"""Comprehensive health check endpoints for production monitoring."""

import time
from datetime import UTC, datetime
from typing import Any, Dict

import psutil
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response
from medicus_common.core.config import get_settings
from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import get_logger
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

logger = get_logger(__name__)
router = APIRouter(prefix="/health", tags=["health"])


@router.get("/")
async def health_check() -> Dict[str, Any]:
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "service": "MedicusConvo",
        "timestamp": datetime.now(UTC).isoformat(),
        "version": "1.0.0",
    }


@router.get("/live")
async def liveness_check() -> Dict[str, Any]:
    """Liveness check - indicates if the service is running."""
    return {
        "status": "alive",
        "timestamp": datetime.now(UTC).isoformat(),
        "uptime_seconds": time.time() - psutil.boot_time(),
    }


@router.get("/ready")
async def readiness_check() -> Dict[str, Any]:
    """Comprehensive readiness check for all dependencies."""
    settings = get_settings()
    checks = {}
    overall_status = "ready"

    try:
        # Database health check
        db_health = await db_manager.health_check()
        checks["database"] = db_health
        if db_health["status"] != "healthy":
            overall_status = "not_ready"

        # AI Service health check (if configured)
        ai_url = getattr(settings, "ai_api_url", None)
        if ai_url:
            try:
                import httpx

                async with httpx.AsyncClient(timeout=5.0) as client:
                    response = await client.get(f"{ai_url.rstrip('/')}/api/MedicusAI/health/live")
                    if response.status_code == 200:
                        checks["ai_service"] = {"status": "healthy"}
                    else:
                        checks["ai_service"] = {
                            "status": "unhealthy",
                            "status_code": response.status_code,
                        }
                        # AI service is not critical for basic operations
            except Exception as e:
                logger.error(f"AI service health check failed: {e}")
                checks["ai_service"] = {"status": "unhealthy", "error": str(e)}
        else:
            checks["ai_service"] = {"status": "not_configured"}

        return {
            "status": overall_status,
            "timestamp": datetime.now(UTC).isoformat(),
            "checks": checks,
        }

    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "not_ready",
                "timestamp": datetime.now(UTC).isoformat(),
                "error": str(e),
            },
        )


@router.get("/detailed")
async def detailed_health_check() -> Dict[str, Any]:
    """Detailed health check with system metrics."""
    settings = get_settings()

    # System metrics
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    cpu_percent = psutil.cpu_percent(interval=1)

    # Process metrics
    process = psutil.Process()
    process_memory = process.memory_info()

    # Database metrics
    db_health = await db_manager.health_check()

    return {
        "status": "healthy",
        "timestamp": datetime.now(UTC).isoformat(),
        "service": {
            "name": "MedicusConvo",
            "version": "1.0.0",
            "environment": settings.environment,
            "debug": settings.debug,
        },
        "system": {
            "cpu_percent": cpu_percent,
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "percent": memory.percent,
                "used": memory.used,
            },
            "disk": {
                "total": disk.total,
                "free": disk.free,
                "used": disk.used,
                "percent": (disk.used / disk.total) * 100,
            },
        },
        "process": {
            "pid": process.pid,
            "memory_rss": process_memory.rss,
            "memory_vms": process_memory.vms,
            "cpu_percent": process.cpu_percent(),
            "num_threads": process.num_threads(),
            "create_time": process.create_time(),
        },
        "database": db_health,
    }


@router.get("/metrics")
async def metrics() -> Response:
    """Prometheus metrics endpoint."""
    settings = get_settings()

    if not settings.enable_metrics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Metrics collection is disabled",
        )

    # Return Prometheus metrics
    metrics_data = generate_latest()
    return Response(content=metrics_data, media_type=CONTENT_TYPE_LATEST)
