from medicus_common.core.logging_config import logger

from src.services.session.convo_service import ConvoService
from src.services.session.active_messages import ActiveMessagesManager
from src.services.socketio_client import socketio_broadcast_service


async def _persist_and_broadcast(payload, ai_text, transcription):
    """Encapsulated background task for persistence and user notification."""
    try:
        # 1. First save the USER message (transcription) to avoid consecutive assistant messages
        # MedicusConvo skips saving user messages for audio files, so we must do it here
        user_content = {
            "type": "app",
            "text_io": transcription,
            "audio_io": payload.audio_io,
            "assistant": payload.assistant,
            "sender_id": payload.sender_id
        }
        user_msg_data = await ConvoService.add_convo_message(
            convo_id=payload.convo_id,
            role="user",
            content_body=user_content,
        )

        if user_msg_data:
            await socketio_broadcast_service.broadcast_ai_message(
                payload.convo_id,
                {
                    "conversation_id": payload.convo_id,
                    "role": user_msg_data["role"],
                    "content": user_msg_data["content"],
                    "id": str(user_msg_data["id"]),
                    "created_at": user_msg_data["created_at"],
                    "processed_by_ai": False
                }
            )

        # 2. Then save the ASSISTANT message (AI response)
        message_data = await ConvoService.add_convo_message(
            convo_id=payload.convo_id,
            role="assistant",
            content_body={"type": "app", "text_io": ai_text, "assistant": payload.assistant},
            processed_by_ai=True
        )

        if message_data:
            # Add both user and assistant messages to Redis cache (only for ACTIVE)
            convo_status = getattr(payload, 'convo_status', None)
            status = convo_status.value if convo_status else "ACTIVE"
            
            await ActiveMessagesManager.add_message(
                payload.convo_id,
                {"role": "user", "content": transcription},
                status=status
            )
            await ActiveMessagesManager.add_message(
                payload.convo_id,
                {"role": "assistant", "content": ai_text},
                status=status
            )

            await socketio_broadcast_service.broadcast_ai_message(
                payload.convo_id,
                {
                    "conversation_id": payload.convo_id,
                    "role": message_data["role"],
                    "content": message_data["content"],
                    "id": str(message_data["id"]),
                    "created_at": message_data["created_at"],
                    "processed_by_ai": True
                }
            )
    except Exception as e:
        logger.warning(f"MediVox Background Task Failed: {e}")


UNCLEAR_VOICE_REPLY = ("I couldn't make out that voice message. Could you record it again "
                       "in a quieter place, or type your question?")


async def _save_empty_transcription_placeholder(payload):
    """Transcription failed or was empty: show the voice note with a placeholder text and
    answer it, through the same path as a normal voice message (saved and broadcast, so
    the app's pending bubble resolves)."""
    await _persist_and_broadcast(payload, UNCLEAR_VOICE_REPLY, "[Voice message - audio unclear]")
