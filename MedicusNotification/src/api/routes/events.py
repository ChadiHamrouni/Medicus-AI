"""Internal API: other Medicus services publish domain events here (see EVENT_REGISTRY)."""

from fastapi import APIRouter, Depends, HTTPException, Request

from medicus_notification import EVENT_REGISTRY

from src.core.auth import require_internal
from src.models.requests import EventRequest
from src.models.responses import EventResponse

router = APIRouter(dependencies=[Depends(require_internal)])


@router.post("", response_model=EventResponse, status_code=202)
async def publish_event(body: EventRequest, request: Request):
    if body.event_type not in EVENT_REGISTRY:
        raise HTTPException(status_code=400, detail=f"Unknown event type '{body.event_type}'")
    created = await request.app.state.event_handler.handle_event(body.event_type, body.payload)
    return EventResponse(event_type=body.event_type, notifications_created=created)
