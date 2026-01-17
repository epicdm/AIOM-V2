"""
Configuration settings for the Mobile API Gateway.
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App Settings
    app_name: str = "Mobile API Gateway"
    app_version: str = "1.0.0"
    debug: bool = False

    # Server Settings
    host: str = "0.0.0.0"
    port: int = 8000

    # Database Settings (PostgreSQL - same as main app)
    database_url: str = "postgresql://postgres:example@localhost:5432/postgres"

    # Main App URL (for proxying/integration)
    main_app_url: str = "http://localhost:3000"

    # Better Auth Settings
    better_auth_secret: str = ""

    # Redis Settings (for caching and rate limiting)
    redis_url: Optional[str] = "redis://localhost:6379"

    # Compression Settings
    compression_min_size: int = 500  # Minimum bytes to trigger compression
    compression_level: int = 6  # Compression level (1-9, higher = more compression)

    # Rate Limiting
    rate_limit_requests: int = 100  # Requests per window
    rate_limit_window: int = 60  # Window in seconds

    # Offline Sync Settings
    sync_batch_size: int = 50  # Max items per sync batch
    sync_conflict_resolution: str = "client_wins"  # Default conflict resolution

    # CORS Settings
    cors_origins: str = "*"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
