"""
Internal notification API (service-to-service, X-Internal-Key).

End users never call these endpoints; other Medicus services create
notifications here or publish events to /events.
"""

from fastapi import APIRouter, Depends, HTTPException, Request

from medicus_common.core.logging_config import logger
from medicus_notification.core.enums import NotificationStatus

from src.core.auth import require_internal
from src.models.requests import BulkNotificationRequest, CreateNotificationRequest
from src.models.responses import BulkNotificationResponse, CreateNotificationResponse, NotificationStatusResponse
from src.services.notification_service import NotificationService

router = APIRouter(dependencies=[Depends(require_internal)])


def get_notification_service(request: Request) -> NotificationService:
    return request.app.state.notification_service


@router.post("", response_model=CreateNotificationResponse, status_code=202)
async def create_notification(request: CreateNotificationRequest,
                              service: NotificationService = Depends(get_notification_service)):
    try:
        notification_id = await service.create_notification(
            user_id=request.user_id,
            template_key=request.template_key,
            category=request.category,
            channels=request.channels,
            priority=request.priority,
            send_after=request.send_after,
            payload=request.payload,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.exception("Error creating notification")
        raise HTTPException(status_code=500, detail="Failed to create notification")
    return CreateNotificationResponse(notification_id=notification_id, status=NotificationStatus.QUEUED,
                                      scheduled_for=request.send_after)


@router.post("/bulk", response_model=BulkNotificationResponse, status_code=202)
async def create_bulk_notifications(request: BulkNotificationRequest,
                                    service: NotificationService = Depends(get_notification_service)):
    notification_ids, errors = [], []
    for idx, item in enumerate(request.notifications):
        try:
            notification_ids.append(await service.create_notification(
                user_id=item.user_id, template_key=item.template_key, category=item.category,
                channels=item.channels, priority=item.priority, send_after=item.send_after, payload=item.payload,
            ))
        except Exception as e:
            logger.error(f"Error creating bulk notification {idx}: {e}")
            errors.append({"index": idx, "user_id": item.user_id, "error": str(e)})
    return BulkNotificationResponse(total=len(request.notifications), successful=len(notification_ids),
                                    failed=len(errors), notification_ids=notification_ids, errors=errors or None)


@router.post("/{notification_id}/cancel")
async def cancel_notification(notification_id: int, service: NotificationService = Depends(get_notification_service)):
    if not await service.cancel_notification(notification_id):
        raise HTTPException(status_code=400, detail="Cannot cancel notification - not in queued status")
    return {"status": "cancelled", "notification_id": notification_id}


@router.get("/{notification_id}", response_model=NotificationStatusResponse)
async def get_notification_status(notification_id: int,
                                  service: NotificationService = Depends(get_notification_service)):
    status = await service.get_notification_status(notification_id)
    if not status:
        raise HTTPException(status_code=404, detail="Notification not found")
    return NotificationStatusResponse(**status)
