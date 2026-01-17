"""
Standard response models for Mobile API Gateway.

These models define a consistent API response format optimized for mobile clients.
"""

from datetime import datetime
from typing import Any, Dict, Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field


T = TypeVar("T")


class MobileResponse(BaseModel, Generic[T]):
    """
    Standard response wrapper for mobile API endpoints.

    Features:
    - Consistent structure for all responses
    - Mobile-friendly error handling
    - Metadata for caching and sync
    """

    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    cache_ttl: Optional[int] = Field(
        None, description="Cache time-to-live in seconds", alias="cacheTtl"
    )
    version: Optional[str] = Field(None, description="API version for compatibility")

    class Config:
        populate_by_name = True


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Paginated response for list endpoints.

    Optimized for infinite scroll and mobile pagination patterns.
    """

    items: List[T]
    total: int
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100, alias="pageSize")
    has_more: bool = Field(False, alias="hasMore")
    next_cursor: Optional[str] = Field(None, alias="nextCursor")
    prev_cursor: Optional[str] = Field(None, alias="prevCursor")

    @property
    def total_pages(self) -> int:
        """Calculate total pages."""
        if self.page_size <= 0:
            return 0
        return (self.total + self.page_size - 1) // self.page_size

    class Config:
        populate_by_name = True


class ErrorDetail(BaseModel):
    """Detailed error information."""

    code: str
    message: str
    field: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """
    Standard error response.

    Provides actionable error information for mobile clients.
    """

    success: bool = False
    error: ErrorDetail
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: Optional[str] = Field(None, alias="requestId")
    retry_after: Optional[int] = Field(
        None, description="Seconds to wait before retry", alias="retryAfter"
    )
    offline_action: Optional[str] = Field(
        None,
        description="Suggested offline action (queue, skip, etc.)",
        alias="offlineAction",
    )

    class Config:
        populate_by_name = True


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "healthy"
    version: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    services: Dict[str, str] = Field(default_factory=dict)
    compression_enabled: bool = Field(True, alias="compressionEnabled")
    offline_sync_enabled: bool = Field(True, alias="offlineSyncEnabled")

    class Config:
        populate_by_name = True


class MinimalListResponse(BaseModel):
    """
    Minimal list response for bandwidth-sensitive endpoints.

    Returns only IDs and essential metadata for client-side lookup.
    """

    ids: List[str]
    timestamps: Dict[str, datetime] = Field(
        default_factory=dict, description="ID to last-modified timestamp mapping"
    )
    deleted_ids: List[str] = Field(default_factory=list, alias="deletedIds")
    server_timestamp: datetime = Field(
        default_factory=datetime.utcnow, alias="serverTimestamp"
    )

    class Config:
        populate_by_name = True


class BatchOperationResult(BaseModel):
    """Result of a batch operation."""

    total: int
    successful: int
    failed: int
    results: List[Dict[str, Any]]


class CompressionStats(BaseModel):
    """Statistics about response compression."""

    original_size: int = Field(..., alias="originalSize")
    compressed_size: int = Field(..., alias="compressedSize")
    compression_ratio: float = Field(..., alias="compressionRatio")
    encoding: str
    bytes_saved: int = Field(..., alias="bytesSaved")

    class Config:
        populate_by_name = True
