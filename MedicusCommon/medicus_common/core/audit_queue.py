import asyncio
import json
from typing import Dict, Any

from medicus_common.core.logging_config import logger
from medicus_common.core.database import db_manager  # Assuming db_manager is accessible here


# Define the structure for the generic audit log table
TOOL_EXECUTION_LOG_TABLE = "audit.tool_execution_logs"


class AuditQueueManager:
    """
    Manages the asyncio queue and a single background worker for non-blocking audit logging.
    """
    _queue: asyncio.Queue = None
    _worker_task: asyncio.Task = None

    @classmethod
    def initialize(cls):
        """Initializes the queue and starts the single background worker task."""
        if cls._queue is None:
            cls._queue = asyncio.Queue()
            cls._worker_task = asyncio.create_task(cls._audit_worker())

    @classmethod
    async def enqueue_log(cls, log_data: Dict[str, Any]):
        """Non-blocking call to add a log entry to the queue."""
        if cls._queue is None:
            # Handle case where initialization failed or was skipped (should not happen in prod)
            logger.error("Audit queue is not initialized. Dropping log entry.")
            return

        # Puts the data onto the queue immediately (non-blocking)
        await cls._queue.put(log_data)

    @classmethod
    async def _audit_worker(cls):
        """
        The dedicated background task that continuously consumes the queue and performs
        the slow, blocking database write operations.
        """
        insert_query = f"""
            INSERT INTO {TOOL_EXECUTION_LOG_TABLE}
            (created_at, user_id, actor_role, tool_name, client_request_id, payload, result)
            VALUES ($1::timestamptz, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
        """

        while True:
            try:
                # 1. Block until a new log entry is available
                log_data = await cls._queue.get()

                # 2. Get a dedicated connection (outside of any transaction context)
                async with db_manager.get_connection() as conn:

                    # 3. Perform the database write
                    # We use json.dumps here because the data is being written,
                    # and the log_data['created_at'] is converted from ISO string back to timestamptz.
                    await conn.execute(
                        insert_query,
                        log_data['created_at'],
                        log_data.get('user_id'),
                        log_data.get('actor_role'),
                        log_data['tool_name'],
                        log_data.get('client_request_id'),
                        json.dumps(log_data.get('payload')),
                        json.dumps(log_data.get('result'))
                    )

                cls._queue.task_done()

            except asyncio.CancelledError:
                # Allows the worker to be cleanly shut down
                break
            except Exception as e:
                # CRITICAL: Log any failure in the worker but DO NOT crash the worker.
                logger.error(f"Audit Worker failed to write log entry: {e}", exc_info=True)
                # Important: still call task_done to avoid blocking the queue consumer
                cls._queue.task_done()