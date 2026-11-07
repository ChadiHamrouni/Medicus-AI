# src/api/realtime/__init__.py
"""Re-export the combined router for backwards compatibility."""
from src.api.realtime.router import realtime_router

__all__ = ["realtime_router"]
