# =============================================================================
# main.py - PRODUCTION-READY MEDICUSCONVO APPLICATION
# =============================================================================

from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import socketio


from medicus_common.core.config import get_settings
from medicus_common.core.database import db_manager
from medicus_common.core.exceptions import (
    MedicusConvoError,
)
from medicus_common.core.logging_config import get_logger, setup_logging
from src.api import conversation_routes, health, socketio_routes, message_routes
import os 
import logging

    
    
# Setup logging first
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    try:
        # Initialize database
        try:
            await db_manager.initialize()
        except Exception as db_error:
            logger.error(f"Database startup error: {db_error}")

        # Log configuration
        settings = get_settings()

        # Initialize Socket.IO manager after database is ready
        try:
            from src.services.socketio_service import initialize_socketio_manager
            manager = initialize_socketio_manager()
        except Exception as e:
            logger.error(f"❌ Failed to initialize Socket.IO manager: {e}")
            logger.error(f"🔍 Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"🔍 Full traceback: {traceback.format_exc()}")

        yield

    finally:
        # Shutdown

        try:
            # Close database connections
            await db_manager.close()

        except Exception as e:
            logger.error(f"Error during shutdown: {e}")


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="MedicusConvo API",
        description="Backend API for MedicusConvo - Medical conversation management with Sara AI assistant, supporting voice + text interactions for patients and doctors",
        version="1.0.0",
        debug=settings.debug,
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url=None,
        openapi_url="/openapi.json" if not settings.is_production else None,
    )

    # Setup all production middleware (but exclude TrustedHost for Socket.IO compatibility)
    # Socket.IO WebSocket connections may have different Host headers that fail TrustedHostMiddleware
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.middleware.gzip import GZipMiddleware

    from medicus_common.core.csrf import CSRFMiddleware

    app.add_middleware(CSRFMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add GZip middleware
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Add custom middleware for mobile/web client handling
    @app.middleware("http")
    async def client_compatibility_middleware(request: Request, call_next):
        """Handle mobile and web client compatibility."""
        response = await call_next(request)

        # Add API version header for client compatibility checks
        response.headers["X-API-Version"] = "1.0.0"

        # Handle mobile-specific responses
        if hasattr(request.state, 'client_platform') and request.state.client_platform == "mobile":
            response.headers["X-Mobile-Optimized"] = "true"

        return response

    # Include routers with /api/MedicusConvo prefix
    app.include_router(health.router, prefix="/api/MedicusConvo")
    app.include_router(conversation_routes.router, prefix="/api/MedicusConvo")
    app.include_router(message_routes.router, prefix="/api/MedicusConvo")
    app.include_router(message_routes.media_router, prefix="/api/MedicusConvo")
    app.include_router(socketio_routes.router, prefix="/api/MedicusConvo")

    # Add client configuration endpoint BEFORE Socket.IO mounting
    @app.get("/api/MedicusConvo/client/config")
    async def get_client_config(request: Request):
        """Get client-specific configuration for mobile and web apps."""
        settings = get_settings()
        client_platform = getattr(request.state, 'client_platform', 'unknown')

        config = {
            "api_version": "1.0.0",
            "client_platform": client_platform,
            "features": {
                "real_time_messaging": True,
                "file_upload": True,
                "audio_messaging": True,
                "voice_responses": True,
                "push_notifications": client_platform == "mobile",
                "offline_support": client_platform == "mobile",
            },
            "limits": {
                "max_file_size": 20 * 1024 * 1024,  # 20MB
                "max_message_length": 4000,
                "max_conversations": 100,
            },
            "endpoints": {
                "websocket_url": f"/api/MedicusConvo/socketio/conversation/{{conversation_id}}?token={{jwt_token}}",
            }
        }

        return config

    @app.get("/api/MedicusConvo/client/compatibility/{client_version}")
    async def check_client_compatibility(client_version: str):
        """Check if client version is compatible with current API."""
        supported_versions = ["1.0.0", "1.0.1", "1.1.0"]

        is_compatible = client_version in supported_versions
        latest_version = max(supported_versions)

        return {
            "compatible": is_compatible,
            "client_version": client_version,
            "latest_version": latest_version,
            "minimum_version": "1.0.0",
            "deprecated": False,
            "upgrade_required": not is_compatible,
            "message": "Client version is compatible" if is_compatible else "Please upgrade your app"
        }

    # Integrate Socket.IO with FastAPI
    from src.services.socketio_service import get_socketio_manager

    # Get Socket.IO manager (will be initialized during lifespan)
    manager = get_socketio_manager()

    # Create Socket.IO ASGI app
    # Mount at /api/MedicusConvo/socketio - socketio_path="" prevents default /socket.io suffix
    socket_app = socketio.ASGIApp(
        manager.sio,
        socketio_path=""  # Empty string prevents automatic /socket.io suffix
    )

    # Mount at /api/MedicusConvo/socketio path
    app.mount("/api/MedicusConvo/socketio", socket_app)

    # Log the Socket.IO endpoint for debugging
    settings = get_settings()

    # Exception handlers
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Handle request validation errors."""
        logger.warning(f"Validation error for request {request.url}: {exc.errors()}")
        return JSONResponse(
            status_code=422,
            content={"detail": exc.errors()},
        )

    @app.exception_handler(MedicusConvoError)
    async def medicus_convo_exception_handler(request: Request, exc: MedicusConvoError):
        """Handle MedicusConvo specific exceptions."""
        logger.error(f"MedicusConvo error for request {request.url}: {exc}")
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc)},
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Handle all other exceptions."""
        logger.error(f"Unexpected error for request {request.url}: {exc}")
        import traceback
        logger.error(f"🔍 Full traceback: {traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    return app


# Create application instance
app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8003")), log_level="info")