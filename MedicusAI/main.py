import os
from dotenv import load_dotenv

# Load environment variables FIRST before any other imports
load_dotenv()

import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any

from src.api.route import router as agent_router
from src.api.live import live_router
from src.api.knowledge import router as knowledge_router
from src.api.medibench.common import medibench_enabled
from src.services.socketio_client import socketio_broadcast_service

from medicus_common.core.logging_config import logger, setup_logging
from medicus_common.core.audit_queue import AuditQueueManager

# Setup logging configuration early
setup_logging()
from medicus_common.core.redis import RedisClient
from medicus_common.core.database import db_manager
from medicus_common.core.exceptions import (
    MedicusAIException,
    ConfigurationError,
)
from medicus_common.core.constants import HTTPStatusCodes
from medicus_common.core.config import get_settings


# Initialize global resources
redis_client = RedisClient()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - startup and shutdown."""
    startup_success = False
    settings = get_settings()
    try:
        # Connect to Redis (optional — service runs without it)
        try:
            app.state.redis = await redis_client.connect()
        except Exception as e:
            logger.warning_with_context(
                "Redis connection unavailable, continuing without it",
                error=str(e),
                error_type=type(e).__name__
            )
            app.state.redis = None

        # Warm up DB pool so first /chat doesn't pay connection setup cost.
        try:
            async with db_manager.get_connection() as conn:
                await conn.execute("SELECT 1")
        except Exception as e:
            logger.warning_with_context(
                "Database warmup failed (continuing)",
                error=str(e),
                error_type=type(e).__name__,
            )

        # Initialize audit queue for background audit logging
        AuditQueueManager.initialize()

        startup_success = True
        yield

    except ConfigurationError as e:
        logger.error_with_context(
            "Configuration error during startup",
            error=e.message,
            error_code=e.error_code
        )
        raise
    except Exception as e:
        logger.error_with_context(
            "Unexpected error during startup",
            error=str(e),
            error_type=type(e).__name__
        )
        raise
    finally:
        # Shutdown
        if startup_success:
            logger.info("Shutting down Medicus application...")
            await socketio_broadcast_service.disconnect()
            try:
                await redis_client.close()
                logger.info("Redis connection closed successfully")
            except Exception as e:
                logger.error_with_context(
                    "Error closing Redis connection",
                    error=str(e),
                    error_type=type(e).__name__
                )
        else:
            logger.error("Application shutdown due to startup failure")


def create_app() -> FastAPI:
    """Create and configure FastAPI application with proper error handling."""
    settings = get_settings()
    
    app = FastAPI(
        title="Medicus AI API",
        description="Medical AI assistant API with voice, text, and image processing capabilities",
        version="1.0.0",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url=None,
        openapi_url="/openapi.json" if not settings.is_production else None,
        lifespan=lifespan
    )

    from medicus_common.core.csrf import CSRFMiddleware

    app.add_middleware(CSRFMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


    # Add exception handlers
    @app.exception_handler(MedicusAIException)
    async def medicus_exception_handler(request: Request, exc: MedicusAIException) -> JSONResponse:
        """Handle custom Medicus exceptions."""
        logger.error_with_context(
            f"Medicus exception: {exc.message}",
            error_code=exc.error_code,
            details=exc.details,
            path=str(request.url),
            method=request.method
        )
        
        return JSONResponse(
            status_code=HTTPStatusCodes.INTERNAL_SERVER_ERROR,
            content={
                "error": exc.message,
                "error_code": exc.error_code,
                "details": exc.details
            }
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        """Handle HTTP exceptions."""
        logger.warning_with_context(
            f"HTTP exception: {exc.detail}",
            status_code=exc.status_code,
            path=str(request.url),
            method=request.method
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.detail,
                "status_code": exc.status_code
            }
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Handle unexpected exceptions."""
        logger.error_with_context(
            f"Unexpected error: {str(exc)}",
            error_type=type(exc).__name__,
            path=str(request.url),
            method=request.method,
            exc_info=True
        )
        
        return JSONResponse(
            status_code=HTTPStatusCodes.INTERNAL_SERVER_ERROR,
            content={
                "error": "Internal server error",
                "message": "An unexpected error occurred"
            }
        )


    # Include routers
    app.include_router(agent_router, prefix="/api/MedicusAI", tags=["tools"])
    app.include_router(live_router, prefix="/api/MedicusAI", tags=["live-voice"])
    app.include_router(knowledge_router, prefix="/api/MedicusAI")
    
    # MediBench evaluation API (separate project); mounted only when MEDIBENCH_API_KEY is set.
    if medibench_enabled():
        from src.api.medibench import router as medibench_router
        app.include_router(medibench_router, prefix="/api/internal", tags=["internal"])

    # Health check endpoint
    @app.get("/api/MedicusAI/health/live")
    async def health_check() -> Dict[str, Any]:
        """Liveness health check."""
        from datetime import datetime, timezone
        return {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    return app


# Create app instance
app = create_app()

if __name__ == "__main__":

    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), log_level="info")