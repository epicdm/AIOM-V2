"""
Database Service for Mobile API Gateway.

Provides async PostgreSQL access using asyncpg and SQLAlchemy.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text

from ..config import settings


# Convert PostgreSQL URL to async format
def get_async_database_url(url: str) -> str:
    """Convert a standard PostgreSQL URL to asyncpg format."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


# Create async engine
engine = create_async_engine(
    get_async_database_url(settings.database_url),
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

# Create session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Base for ORM models (if needed)
Base = declarative_base()


class DatabaseService:
    """
    Database service providing async database operations.

    Uses the same PostgreSQL database as the main application.
    """

    def __init__(self):
        self.engine = engine
        self.session_maker = async_session_maker

    async def get_session(self) -> AsyncSession:
        """Get a new database session."""
        return self.session_maker()

    @asynccontextmanager
    async def session_scope(self) -> AsyncGenerator[AsyncSession, None]:
        """Provide a transactional scope around a series of operations."""
        session = self.session_maker()
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    async def health_check(self) -> bool:
        """Check database connectivity."""
        try:
            async with self.session_scope() as session:
                await session.execute(text("SELECT 1"))
            return True
        except Exception:
            return False


# Global database service instance
_database_service: Optional[DatabaseService] = None


def get_database() -> DatabaseService:
    """Get the global database service instance."""
    global _database_service
    if _database_service is None:
        _database_service = DatabaseService()
    return _database_service


# Dependency for FastAPI
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides a database session for route handlers.

    Usage:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db_session)):
            ...
    """
    database = get_database()
    async with database.session_scope() as session:
        yield session


# Raw query helpers for reading from the existing schema
async def execute_query(query: str, params: dict = None) -> list:
    """Execute a raw SQL query and return results."""
    database = get_database()
    async with database.session_scope() as session:
        result = await session.execute(text(query), params or {})
        return result.mappings().all()


async def execute_one(query: str, params: dict = None) -> Optional[dict]:
    """Execute a raw SQL query and return a single result."""
    results = await execute_query(query, params)
    return dict(results[0]) if results else None
