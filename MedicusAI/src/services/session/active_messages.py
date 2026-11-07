import json
import uuid
from typing import Optional

import redis.asyncio as redis
from medicus_common.core.logging_config import logger
from medicus_common.core.config import get_settings

settings = get_settings()

KEY_PREFIX = "active_messages"
DEFAULT_TTL = 1800  # 30 minutes
MAX_MESSAGES = 50


class ActiveMessagesManager:
    """Manages conversation history cache using Redis."""

    _redis_client: Optional[redis.Redis] = None

    @classmethod
    async def get_redis(cls) -> redis.Redis:
        """Get or create Redis connection."""
        if cls._redis_client is None:
            redis_url = settings.redis_url
            if redis_url:
                cls._redis_client = redis.from_url(redis_url, decode_responses=True)
                logger.info("🔌 [CACHE] Using Redis URL from settings")
            else:
                host = settings.redis_host or "localhost"
                port = settings.redis_port or 6379
                password = settings.redis_password
                url = f"redis://:{password}@{host}:{port}" if password else f"redis://{host}:{port}"
                cls._redis_client = redis.from_url(url, decode_responses=True)
                logger.info(f"🔌 [CACHE] Connecting to Redis at {host}:{port}")
        return cls._redis_client

    @classmethod
    def _get_key(cls, convo_id: str) -> str:
        """Generate Redis key for conversation."""
        return f"{KEY_PREFIX}:{convo_id}"

    @classmethod
    async def get_history_for_agent(cls, convo_id: str, status: str) -> list:
        """
        Get conversation history for the agent.

        DIFFERENT BEHAVIOR BASED ON STATUS:

        ACTIVE conversations:
        - Check Redis first
        - If Redis has data → return it (NO RELOAD)
        - If Redis empty → load from DB ONCE, save to Redis, return

        INACTIVE conversations:
        - Always query DB directly (no Redis caching)
        - This ensures fresh data for resuming conversations

        NEW conversations:
        - Return empty list

        This approach fixes stale data because:
        - ACTIVE: We load once, then just ADD new messages to Redis
        - INACTIVE: We always get fresh data from DB
        """
        if status == "NEW":
            return []

        convo_short = convo_id[:8] if convo_id else "unknown"

        # INACTIVE: Always query DB (no caching for stale prevention)
        if status == "INACTIVE":
            logger.info(f"📖 [INACTIVE] convo={convo_short} | source=DATABASE | no caching")
            messages = await cls._load_from_db(convo_id, status)
            return messages

        # ACTIVE: Use Redis cache (load once, then add)
        try:
            # Check if we already have messages in Redis
            cached = await cls._get_from_redis(convo_id)

            if cached is not None and len(cached) > 0:
                # Redis has data! Return it (no reload needed)
                logger.info(f"✅ 💚 [ACTIVE - CACHE HIT] convo={convo_short} | msgs={len(cached)} | source=REDIS | no reload")
                return cached

            # Redis is empty - load from DB ONCE
            logger.warning(f"⚠️ 🔴 [ACTIVE - CACHE MISS] convo={convo_short} | source=DATABASE | loading once")
            messages = await cls._load_from_db(convo_id, status)

            if messages:
                await cls._save_to_redis(convo_id, messages)
                logger.info(f"💾 [ACTIVE - CACHE SAVED] convo={convo_short} | msgs={len(messages)} | ttl={DEFAULT_TTL//60}min")
            else:
                logger.info(f"📭 [ACTIVE - CACHE EMPTY] convo={convo_short} | no messages found")

            return messages

        except Exception as e:
            logger.error(f"❌ [ACTIVE - CACHE ERROR] convo={convo_short} | error={str(e)} | fallback=DB")
            return await cls._load_from_db(convo_id, status)

    @classmethod
    async def add_message(cls, convo_id: str, message: dict, status: str = "ACTIVE") -> None:
        """
        Add a new message to the cache.

        ONLY adds to Redis for ACTIVE conversations.
        For INACTIVE, we don't cache (always query DB fresh).

        Args:
            convo_id: Conversation UUID
            message: Message dict with role and content
            status: Conversation status (ACTIVE/INACTIVE)
        """
        convo_short = convo_id[:8] if convo_id else "unknown"

        # Only cache for ACTIVE conversations
        if status != "ACTIVE":
            logger.info(f"⏭️ [SKIP CACHE] convo={convo_short} | status={status} | msg not cached")
            return

        try:
            messages = await cls._get_from_redis(convo_id)

            if messages is None:
                messages = []

            messages.append(message)

            if len(messages) > MAX_MESSAGES:
                removed = len(messages) - MAX_MESSAGES
                messages = messages[-MAX_MESSAGES:]
                logger.info(f"🗑️ [CACHE EVICTED] convo={convo_short} | removed={removed} | kept={MAX_MESSAGES}")

            await cls._save_to_redis(convo_id, messages)
            role = message.get("role", "unknown")
            content_preview = (message.get("content", "")[:30] + "...") if message.get("content") else ""
            logger.info(f"➕ [CACHE ADDED] convo={convo_short} | role={role} | msg=\"{content_preview}\" | total={len(messages)}")

        except Exception as e:
            logger.error(f"❌ [CACHE ADD ERROR] convo={convo_short} | error={str(e)}")

    @classmethod
    async def clear(cls, convo_id: str) -> None:
        """Clear cache for a conversation."""
        convo_short = convo_id[:8] if convo_id else "unknown"

        try:
            redis_client = await cls.get_redis()
            await redis_client.delete(cls._get_key(convo_id))
            logger.info(f"🗑️ [CACHE INVALIDATED] convo={convo_short}")
        except Exception as e:
            logger.error(f"❌ [CACHE INVALIDATE ERROR] convo={convo_short} | error={str(e)}")

    @classmethod
    async def _get_from_redis(cls, convo_id: str) -> Optional[list]:
        """Get messages from Redis cache."""
        key = cls._get_key(convo_id)
        try:
            redis_client = await cls.get_redis()
            data = await redis_client.get(key)

            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"❌ [REDIS GET ERROR] key={key[:20]}... | error={str(e)}")
            return None

    @classmethod
    async def _save_to_redis(cls, convo_id: str, messages: list) -> None:
        """Save messages to Redis cache."""
        key = cls._get_key(convo_id)
        try:
            redis_client = await cls.get_redis()
            await redis_client.set(key, json.dumps(messages), ex=DEFAULT_TTL)
        except Exception as e:
            logger.error(f"❌ [REDIS SAVE ERROR] key={key[:20]}... | error={str(e)}")

    @classmethod
    async def _load_from_db(cls, convo_id: str, status: str) -> list:
        """Load messages from database."""
        from medicus_common.core.database import db_manager

        convo_short = convo_id[:8] if convo_id else "unknown"
        max_history = settings.message_context_limit_active if status == "ACTIVE" else settings.message_context_limit_inactive

        logger.info(f"📖 [DB QUERY] convo={convo_short} | status={status} | limit={max_history}")

        async with db_manager.get_connection() as conn:
            rows = await conn.fetch(
                f"""
                SELECT role, content, created_at
                FROM dialog.messages_view
                WHERE conversation_id = $1
                ORDER BY created_at DESC
                LIMIT {max_history}
                """,
                uuid.UUID(convo_id),
            )

            rows = list(reversed(rows))
            messages = []

            for row in rows:
                try:
                    content_json = json.loads(row['content']) if isinstance(row['content'], str) else row['content']
                    text_content = (
                        content_json.get("text_io") or
                        content_json.get("body") or
                        content_json.get("message") or
                        content_json.get("text") or
                        ""
                    )
                    messages.append({
                        "role": row['role'],
                        "content": text_content,
                    })
                except Exception as e:
                    logger.error(f"❌ [DB PARSE ERROR] convo={convo_short} | error={str(e)}")
                    continue

            logger.info(f"📊 [DB RESULT] convo={convo_short} | fetched={len(messages)} messages")
            return messages
