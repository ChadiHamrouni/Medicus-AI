from .devices import router as devices_router
from .events import router as events_router
from .health import router as health_router
from .notifications import router as notifications_router
from .settings import router as settings_router

__all__ = ["devices_router", "events_router", "health_router", "notifications_router", "settings_router"]
