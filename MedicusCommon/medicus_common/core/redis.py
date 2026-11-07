import redis.asyncio as redis
import asyncio
from typing import Optional
import os


class RedisClient:
    def __init__(self, url: Optional[str] = None):
        
        if url:
            self.url = url
        else:
            host = os.getenv("REDIS_HOST", "localhost")
            port = os.getenv("REDIS_PORT", "6379")
            password = os.getenv("REDIS_PASSWORD")
            
            if password:
                self.url = f"redis://:{password}@{host}:{port}"
            else:
                self.url = f"redis://{host}:{port}"
        
        self.client: Optional[redis.Redis] = None

    async def connect(self) -> redis.Redis:
        """Create and return Redis connection."""
        if not self.client:
            self.client = redis.from_url(self.url, encoding="utf-8", decode_responses=True)
        return self.client

    async def close(self):
        """Close Redis connection."""
        if self.client:
            await self.client.aclose()
            self.client = None

    async def lpush(self, name: str, values: list):
        """Push multiple values to the left of the list."""
        await self.client.lpush(name, *values)


# Configuration
CACHE_TTL = 24 * 3600  # 24 hours


async def test_redis():
    """Test Redis connection and basic operations."""
    redis_client = RedisClient()

    try:
        client = await redis_client.connect()

        # Test basic operations
        await client.set("test_key", "test_value", ex=CACHE_TTL)
        value = await client.get("test_key")

        print(f"Redis test successful: {value}")

        # Test with TTL
        ttl = await client.ttl("test_key")
        print(f"Key TTL: {ttl} seconds")

    except Exception as e:
        print(f"Redis test failed: {e}")
    finally:
        await redis_client.close()


if __name__ == "__main__":
    asyncio.run(test_redis())
