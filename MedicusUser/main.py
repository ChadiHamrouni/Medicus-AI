"""FastAPI application main entry point - Production Ready."""

import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exception_handlers import http_exception_handler

from medicus_common.core.config import get_settings
from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import setup_logging, get_logger

from medicus_common.core.exceptions import MedicusUserException, create_http_exception
from src.api.user_routes import user_routes, profile_routes
from src.api.doctor_routes import doctor_core, doctor_updates
from src.api.patient_routes import patient_core, patient_updates, dependent_core, dependent_add, dependent_updates
from src.api import benchmark_routes, reference_routes
from src.api.medical_routes.medications_routes import router as medications_router
from src.api.medical_routes.procedures_routes import router as procedures_router
from src.api.medical_routes.notes_routes import router as notes_router
from src.api.medical_routes.events_routes import router as events_router
from src.api.medical_routes.vitals_routes import router as vitals_router
from src.api.medical_routes.conditions_routes import router as conditions_router
from src.api.medical_routes.procedures_routes import router as procedures_router
from src.api.auth_routes import auth_password, auth_login, auth_registration, auth_tokens
from src.api.auth_routes import auth_email_verif as auth_email_verification
from src.api.document_routes.docs_routes import router as docs_router
from src.api import support_routes
from medicus_common.core.csrf import CSRFMiddleware


# Disable remote logging for development
import logging
import os
    
# Initialize logging
setup_logging()
logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager with proper startup/shutdown."""
    settings = get_settings()
    
    # Startup
    logger.info("Starting MedicusUser API")
    
    try:
        # Initialize database
        await db_manager.initialize()
        logger.info("Database initialized successfully")
        
        # Perform health checks
        health_status = await db_manager.health_check()
        logger.info("Database health check passed")
        
    except Exception as e:
        logger.error(f"Failed to initialize application: {str(e)}")
        sys.exit(1)

    yield

    # Shutdown
    logger.info("Shutting down MedicusUser API")
    try:
        await db_manager.close()
        logger.info("Application shutdown completed")
    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}")

def create_app() -> FastAPI:
    """Create production-ready FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="MedicusUser API",
        description="Backend API for MedicusUser - Medical conversation management with Sara AI assistant, supporting voice + text interactions for patients and doctors",
        version="1.0.0",
        debug=settings.debug,
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url=None,
        openapi_url="/openapi.json" if not settings.is_production else None,
    )

    # Credentialed CORS needs an explicit origin list (never "*"); see CORS_ORIGINS.
    app.add_middleware(CSRFMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception handlers
    @app.exception_handler(MedicusUserException)
    async def medicus_exception_handler(request: Request, exc: MedicusUserException):
        logger.error(f"Application exception: {str(exc)}")
        return JSONResponse(
            status_code=create_http_exception(exc).status_code,
            content=exc.to_dict()
        )

    @app.exception_handler(HTTPException)
    async def custom_http_exception_handler(request: Request, exc: HTTPException):
        """Enhanced HTTP exception handler with logging."""
        logger.warning(f"HTTP exception: {exc.status_code} - {str(exc.detail)}")
        return await http_exception_handler(request, exc)

    # Health and monitoring endpoints
    @app.get("/api/MedicusUser/health", tags=["monitoring"])
    async def health_check():
        """Basic health check endpoint."""
        return {
            "status": "healthy",
            "service": settings.app_name,
            "environment": settings.environment
        }
    
    @app.get("/api/MedicusUser/health/detailed", tags=["monitoring"])
    async def detailed_health_check():
        """Detailed health check with database status."""
        try:
            db_health = await db_manager.health_check()
            return {
                "status": "healthy",
                "service": settings.app_name,
                "environment": settings.environment,
                "database": db_health,
                "checks": {
                    "database": "healthy"
                }
            }
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return JSONResponse(
                status_code=503,
                content={
                    "status": "unhealthy",
                    "service": settings.app_name,
                    "environment": settings.environment,
                    "checks": {
                        "database": "unhealthy",
                        "error": str(e)
                    }
                }
            )


    # Include API routers
    app.include_router(auth_login.router, prefix="/api/MedicusUser/auth")
    app.include_router(auth_registration.router, prefix="/api/MedicusUser/auth")
    app.include_router(auth_tokens.router, prefix="/api/MedicusUser/auth")
    app.include_router(auth_email_verification.router, prefix="/api/MedicusUser/auth")
    app.include_router(auth_password.router, prefix="/api/MedicusUser/auth")
    app.include_router(user_routes.router, prefix="/api/MedicusUser")
    app.include_router(profile_routes.router, prefix="/api/MedicusUser")
    app.include_router(doctor_core.router, prefix="/api/MedicusUser")
    app.include_router(doctor_updates.router, prefix="/api/MedicusUser")
    app.include_router(reference_routes.router, prefix="/api/MedicusUser")
    app.include_router(dependent_core.router, prefix="/api/MedicusUser")
    app.include_router(dependent_add.router, prefix="/api/MedicusUser/dependents")
    app.include_router(dependent_updates.router, prefix="/api/MedicusUser/dependents")
    app.include_router(patient_core.router, prefix="/api/MedicusUser")
    app.include_router(patient_updates.router, prefix="/api/MedicusUser")
    app.include_router(benchmark_routes.router, prefix="/api/MedicusUser")
    app.include_router(medications_router, prefix="/api/MedicusUser")
    app.include_router(procedures_router, prefix="/api/MedicusUser")
    app.include_router(notes_router, prefix="/api/MedicusUser")
    app.include_router(events_router, prefix="/api/MedicusUser")
    app.include_router(vitals_router, prefix="/api/MedicusUser")
    app.include_router(conditions_router, prefix="/api/MedicusUser")
    app.include_router(procedures_router, prefix="/api/MedicusUser")
    app.include_router(docs_router, prefix="/api/MedicusUser")
    app.include_router(support_routes.router, prefix="/api/MedicusUser")

    logger.info("FastAPI application created with all routes registered")
    logger.info("Auth routes available at: /api/MedicusUser/auth/*")

    return app


# Create app instance
app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8002")), log_config=None)
