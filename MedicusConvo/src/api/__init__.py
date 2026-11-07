from fastapi import APIRouter

from src.api.conversation_routes import router as convo_router
from src.api.health import router as health_router

# Create main API router
api_router = APIRouter()

# Include all sub-routers
api_router.include_router(health_router)
api_router.include_router(convo_router)

# Export the main router and individual routers for flexibility
__all__ = [
    "api_router",
    "convo_router",
    "health_router",
]
