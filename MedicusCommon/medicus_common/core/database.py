# src/core/database.py
"""Production-grade database manager for MedicusCommon."""

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from typing import Optional, AsyncGenerator, Any, Dict, List
import asyncpg
from asyncpg import Pool, Connection

from medicus_common.core.config import get_settings
from medicus_common.core.exceptions import DatabaseError

logger = logging.getLogger(__name__)


async def inject_actor(conn: asyncpg.Connection, actor_id: str) -> None:
    """
    Set the human actor for the current transaction (pgAudit context).

    Call this inside a transaction block before any PHI query.
    SET LOCAL scopes to the current transaction — auto-cleared on COMMIT/ROLLBACK.
    """
    # SET does not accept bind parameters; set_config(..., is_local => true) does.
    await conn.execute("SELECT set_config('custom.actor_id', $1, true)", str(actor_id))


class DatabaseManager:
    """Production-grade database manager with comprehensive error handling and monitoring."""

    _instance: Optional['DatabaseManager'] = None
    _pool: Optional[Pool] = None
    _lock = asyncio.Lock()
    _is_initialized = False
    _stats = {
        "queries_executed": 0,
        "transactions_executed": 0,
        "errors_count": 0,
        "total_execution_time": 0.0,
    }

    def __new__(cls) -> 'DatabaseManager':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @property
    def is_initialized(self) -> bool:
        """Check if database manager is initialized."""
        return self._is_initialized and self._pool is not None

    @property
    def stats(self) -> Dict[str, Any]:
        """Get database manager statistics."""
        return self._stats.copy()

    async def initialize(self) -> None:
        """Initialize database connection pool with comprehensive error handling."""
        if self._is_initialized and self._pool is not None:
            return

        async with self._lock:
            if self._is_initialized and self._pool is not None:
                return

            settings = get_settings()
            
            try:
                self._pool = await asyncpg.create_pool(
                    settings.database_url,
                    min_size=settings.db_pool_min_size,
                    max_size=settings.db_pool_max_size,
                    command_timeout=settings.db_command_timeout,
                    server_settings={
                        'jit': 'off',
                        'application_name': settings.app_name,
                        'timezone': 'UTC',
                    },
                    setup=self._setup_connection,
                )

                # Test connection and setup database
                await self._validate_connection()
                # TEMPORARILY DISABLED - THIS IS CAUSING A HUGE HANG
                # await self._setup_database()
                
                self._is_initialized = True

            except asyncpg.InvalidAuthorizationSpecificationError as e:
                logger.error(f"Database authentication failed: {e}")
                raise DatabaseError(f"Database authentication failed: {e}") from e
            except asyncpg.CannotConnectNowError as e:
                logger.error(f"Database server unavailable: {e}")
                raise DatabaseError(f"Database server unavailable: {e}") from e
            except asyncpg.ConnectionDoesNotExistError as e:
                logger.error(f"Database does not exist: {e}")
                raise DatabaseError(f"Database does not exist: {e}") from e
            except Exception as e:
                logger.error(f"Failed to initialize database pool: {e}", exc_info=True)
                raise DatabaseError(f"Database initialization failed: {e}") from e

    async def _setup_connection(self, conn: Connection) -> None:
        """Setup individual database connections."""
        try:
            # Set connection-level settings
            await conn.execute("SET timezone TO 'UTC'")
            await conn.execute("SET statement_timeout TO '30s'")
            logger.debug("Connection setup completed")
        except Exception as e:
            logger.warning(f"Failed to setup connection: {e}")

    async def _validate_connection(self) -> None:
        """Validate database connection is working."""
        try:
            async with self._pool.acquire() as conn:
                result = await conn.fetchval("SELECT 1")
                if result != 1:
                    raise DatabaseError("Database connection validation failed")
                logger.debug("Database connection validated")
        except Exception as e:
            logger.error(f"Database connection validation failed: {e}")
            raise DatabaseError(f"Database connection validation failed: {e}") from e

    async def _setup_database(self) -> None:
        """Setup database schemas with error handling."""
        try:
            async with self.get_connection() as conn:
                # Create schemas
                await conn.execute("CREATE SCHEMA IF NOT EXISTS auth")
                await conn.execute("CREATE SCHEMA IF NOT EXISTS public")
                logger.debug("Database schemas created/verified")
                
                # Could add more setup here:
                # - Extensions
                # - RLS policies  
                # - Default data
                
        except Exception as e:
            logger.error(f"Database setup failed: {e}")
            raise DatabaseError(f"Database setup failed: {e}") from e

    async def close(self) -> None:
        """Close database connection pool gracefully."""
        if self._pool:
            try:
                await self._pool.close()
                self._pool = None
                self._is_initialized = False
                logger.info("Database connection pool closed gracefully")
            except Exception as e:
                logger.error(f"Error closing database pool: {e}")

    async def health_check(self) -> Dict[str, Any]:
        """Perform database health check."""
        try:
            start_time = time.time()
            
            if not self.is_initialized:
                return {"status": "unhealthy", "error": "Not initialized"}
                
            async with self._pool.acquire() as conn:
                # Test basic query
                await conn.fetchval("SELECT 1")
                
                # Get pool stats
                pool_size = self._pool.get_size()
                pool_idle = self._pool.get_idle_size()
                
                response_time = time.time() - start_time
                
                return {
                    "status": "healthy",
                    "response_time_ms": round(response_time * 1000, 2),
                    "pool_size": pool_size,
                    "pool_idle": pool_idle,
                    "stats": self.stats,
                }
                
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "unhealthy", 
                "error": str(e),
                "stats": self.stats,
            }

    @asynccontextmanager
    async def get_connection(self) -> AsyncGenerator[Connection, None]:
        """Get database connection with comprehensive error handling."""
        if not self.is_initialized:
            await self.initialize()

        start_time = time.time()
        # Only failures to obtain a connection are translated to DatabaseError.
        # Exceptions raised inside the caller's `async with` block (including
        # asyncpg errors such as UniqueViolationError) propagate unchanged.
        try:
            conn = await self._pool.acquire()
        except (asyncpg.PostgresError, asyncpg.InterfaceError, OSError, asyncio.TimeoutError) as e:
            self._stats["errors_count"] += 1
            logger.error(f"Could not acquire database connection: {e}")
            raise DatabaseError(f"Database connection failure: {e}") from e
        try:
            yield conn
        except (asyncpg.PostgresError, asyncpg.InterfaceError):
            self._stats["errors_count"] += 1
            raise
        finally:
            await self._pool.release(conn)
            self._stats["total_execution_time"] += time.time() - start_time

    @asynccontextmanager
    async def transaction(self) -> AsyncGenerator[Connection, None]:
        """Get database transaction with monitoring."""
        start_time = time.time()
        transaction_id = f"txn_{int(time.time() * 1000)}"
        
        try:
            logger.debug(f"Starting transaction {transaction_id}")
            async with self.get_connection() as conn:
                async with conn.transaction():
                    self._stats["transactions_executed"] += 1
                    yield conn
                    logger.debug(f"Transaction {transaction_id} committed successfully")
                    
        except Exception as e:
            logger.error(f"Transaction {transaction_id} failed: {e}")
            raise
        finally:
            execution_time = time.time() - start_time
            logger.debug(f"Transaction {transaction_id} completed in {execution_time:.3f}s")

    async def execute(
        self, 
        query: str, 
        *args, 
        timeout: Optional[float] = None
    ) -> str:
        """Execute a query that doesn't return rows with monitoring."""
        return await self._execute_with_monitoring("execute", query, args, timeout)

    async def fetch(
        self, 
        query: str, 
        *args, 
        timeout: Optional[float] = None
    ):
        """Fetch multiple rows with monitoring."""
        return await self._execute_with_monitoring("fetch", query, args, timeout)

    async def fetchrow(
        self, 
        query: str, 
        *args, 
        timeout: Optional[float] = None
    ):
        """Fetch a single row with monitoring."""
        return await self._execute_with_monitoring("fetchrow", query, args, timeout)

    async def fetchval(
        self, 
        query: str, 
        *args, 
        timeout: Optional[float] = None
    ) -> Any:
        """Fetch a single value with monitoring."""
        return await self._execute_with_monitoring("fetchval", query, args, timeout)

    async def _execute_with_monitoring(
        self,
        method: str,
        query: str,
        args: tuple,
        timeout: Optional[float] = None
    ) -> Any:
        """Execute query with comprehensive monitoring and error handling."""
        start_time = time.time()
        query_id = f"q_{int(time.time() * 1000)}"
        
        # Sanitize query for logging (remove potential PII)
        log_query = query[:100] + "..." if len(query) > 100 else query
        logger.debug(f"Executing {method} query {query_id}: {log_query}")
        
        try:
            async with self.get_connection() as conn:
                # Use timeout if provided
                if timeout:
                    result = await asyncio.wait_for(
                        getattr(conn, method)(query, *args),
                        timeout=timeout
                    )
                else:
                    result = await getattr(conn, method)(query, *args)
                    
                self._stats["queries_executed"] += 1
                execution_time = time.time() - start_time
                
                logger.debug(
                    f"Query {query_id} completed successfully in {execution_time:.3f}s"
                )
                
                return result
                
        except asyncio.TimeoutError:
            self._stats["errors_count"] += 1
            logger.error(f"Query {query_id} timed out after {timeout}s")
            raise DatabaseError(f"Query timed out after {timeout}s")
        except asyncpg.UniqueViolationError as e:
            self._stats["errors_count"] += 1
            logger.warning(f"Query {query_id} unique constraint violation: {e}")
            raise DatabaseError(f"Unique constraint violation: {e}") from e
        except asyncpg.ForeignKeyViolationError as e:
            self._stats["errors_count"] += 1
            logger.warning(f"Query {query_id} foreign key violation: {e}")
            raise DatabaseError(f"Foreign key constraint violation: {e}") from e
        except asyncpg.CheckViolationError as e:
            self._stats["errors_count"] += 1
            logger.warning(f"Query {query_id} check constraint violation: {e}")
            raise DatabaseError(f"Check constraint violation: {e}") from e
        except asyncpg.PostgresSyntaxError as e:
            self._stats["errors_count"] += 1
            logger.error(f"Query {query_id} syntax error: {e}")
            raise DatabaseError(f"SQL syntax error: {e}") from e
        except Exception as e:
            self._stats["errors_count"] += 1
            execution_time = time.time() - start_time
            logger.error(
                f"Query {query_id} failed after {execution_time:.3f}s: {e}",
                exc_info=True
            )
            raise DatabaseError(f"Query execution failed: {e}") from e

    async def execute_many(
        self,
        query: str,
        args_list: List[tuple],
        timeout: Optional[float] = None
    ) -> None:
        """Execute query multiple times with different parameters."""
        start_time = time.time()
        query_id = f"qm_{int(time.time() * 1000)}"
        
        logger.debug(f"Executing batch query {query_id} with {len(args_list)} parameters")
        
        try:
            async with self.get_connection() as conn:
                if timeout:
                    await asyncio.wait_for(
                        conn.executemany(query, args_list),
                        timeout=timeout
                    )
                else:
                    await conn.executemany(query, args_list)
                    
                self._stats["queries_executed"] += len(args_list)
                execution_time = time.time() - start_time
                
                logger.debug(
                    f"Batch query {query_id} completed successfully in {execution_time:.3f}s"
                )
                
        except Exception as e:
            self._stats["errors_count"] += 1
            logger.error(f"Batch query {query_id} failed: {e}", exc_info=True)
            raise DatabaseError(f"Batch query execution failed: {e}") from e


# Global database manager instance
db_manager = DatabaseManager()
