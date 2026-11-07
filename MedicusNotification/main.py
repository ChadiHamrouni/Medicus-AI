"""
MedicusNotification - multi-channel notifications (push, email) with preferences,
quiet hours, templates and a database-backed delivery queue.
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from medicus_common.core.config import get_settings
from medicus_common.core.database import db_manager
from medicus_common.core.exceptions import MedicusCommonException
from medicus_common.core.logging_config import setup_logging

from src.api.routes import devices_router, events_router, health_router, notifications_router, settings_router
from src.core.config import get_notification_settings
from src.services.event_handler import EventHandler
from src.services.notification_service import NotificationService
from src.worker.dispatcher import NotificationDispatcher
from src.worker.notification_worker import NotificationWorker

setup_logging()
logger = logging.getLogger("medicus.notification")
settings = get_notification_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db_manager.initialize()

    notification_service = NotificationService()
    await notification_service.initialize()
    app.state.notification_service = notification_service
    app.state.event_handler = EventHandler(notification_service)

    dispatcher_task = None
    if settings.worker_enabled:
        worker = NotificationWorker()
        await worker.initialize()
        app.state.worker = worker
        dispatcher = NotificationDispatcher(worker)
        app.state.dispatcher = dispatcher
        dispatcher_task = asyncio.create_task(dispatcher.run())
    else:
        logger.info("WORKER_ENABLED=false: API only, no deliveries from this instance")

    yield

    if dispatcher_task:
        app.state.dispatcher.stop()
        await asyncio.wait_for(dispatcher_task, timeout=30)
        await app.state.worker.cleanup()
    await db_manager.close()


def create_app() -> FastAPI:
    app = FastAPI(
        title="MedicusNotification API",
        description="Notification service for the Medicus platform",
        version="2.0.0",
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
        openapi_url=None if settings.is_production else "/openapi.json",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_settings().cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(MedicusCommonException)
    async def medicus_exception_handler(request: Request, exc: MedicusCommonException):
        return JSONResponse(status_code=getattr(exc, "status_code", 500),
                            content={"error": getattr(exc, "error_code", "INTERNAL_ERROR"),
                                     "message": getattr(exc, "message", "Request failed")})

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": "INTERNAL_SERVER_ERROR",
                                                      "message": "An internal server error occurred"})

    # Every router is served under /api/v1/... and the legacy /api/MedicusNotification/... prefix.
    for prefix in ("/api/v1", "/api/MedicusNotification"):
        app.include_router(health_router, prefix=f"{prefix}/health", tags=["Health"])
        app.include_router(notifications_router, prefix=f"{prefix}/notifications", tags=["Notifications (internal)"])
        app.include_router(events_router, prefix=f"{prefix}/events", tags=["Events (internal)"])
        app.include_router(devices_router, prefix=f"{prefix}/devices", tags=["Devices"])
        app.include_router(settings_router, prefix=f"{prefix}/settings", tags=["Settings"])
    app.include_router(health_router, prefix="/health", tags=["Health"])
    return app


app = create_app()


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8004")),
                log_level=settings.log_level.lower())
