# src/api/realtime/router.py
"""Combines all realtime sub-routers into a single APIRouter."""

from fastapi import APIRouter

from src.api.realtime.session import router as session_router
from src.api.realtime.tools import router as tools_router
from src.api.realtime.transcripts import router as transcripts_router

realtime_router = APIRouter()
realtime_router.include_router(session_router)
realtime_router.include_router(tools_router)
realtime_router.include_router(transcripts_router)
