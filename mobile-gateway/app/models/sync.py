"""
Offline Sync Models.

These models align with the client-side offline queue schema
defined in src/db/offline-queue-schema.ts
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SyncOperation(str, Enum):
    """Types of operations that can be synced."""

    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    UPLOAD = "UPLOAD"
    CUSTOM = "CUSTOM"


class SyncStatus(str, Enum):
    """Status of a sync operation."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CONFLICT = "conflict"


class SyncPriority(str, Enum):
    """Priority levels for sync operations."""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class EntityType(str, Enum):
    """Types of entities that can be synced."""

    EXPENSE_REQUEST = "expense_request"
    USER_PROFILE = "user_profile"
    ATTACHMENT = "attachment"
    COMMENT = "comment"
    POST = "post"
    MESSAGE = "message"
    NOTIFICATION = "notification"
    BRIEFING = "briefing"
    CALL_RECORD = "call_record"
    CONTACT = "contact"
    CONTACT_SYNC = "contact_sync"
    CUSTOM = "custom"


class ConflictResolution(str, Enum):
    """Conflict resolution strategies."""

    CLIENT_WINS = "client_wins"
    SERVER_WINS = "server_wins"
    MERGE = "merge"
    MANUAL = "manual"


class SyncQueueItem(BaseModel):
    """
    A single item in the sync queue.
    Matches the client-side OfflineQueueItem structure.
    """

    id: str = Field(..., description="Unique identifier for this queue item")
    operation_type: SyncOperation = Field(..., alias="operationType")
    entity_type: EntityType = Field(..., alias="entityType")
    entity_id: Optional[str] = Field(None, alias="entityId")
    payload: Dict[str, Any]
    priority: SyncPriority = SyncPriority.NORMAL
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(..., alias="createdAt")
    endpoint: Optional[str] = None
    http_method: Optional[str] = Field(None, alias="httpMethod")
    conflict_resolution: ConflictResolution = Field(
        ConflictResolution.CLIENT_WINS, alias="conflictResolution"
    )

    class Config:
        populate_by_name = True
        use_enum_values = True


class SyncConflict(BaseModel):
    """Represents a sync conflict that needs resolution."""

    item_id: str = Field(..., alias="itemId")
    entity_type: EntityType = Field(..., alias="entityType")
    entity_id: str = Field(..., alias="entityId")
    client_version: Dict[str, Any] = Field(..., alias="clientVersion")
    server_version: Dict[str, Any] = Field(..., alias="serverVersion")
    conflict_fields: List[str] = Field(..., alias="conflictFields")
    resolution_options: List[ConflictResolution] = Field(
        ..., alias="resolutionOptions"
    )

    class Config:
        populate_by_name = True
        use_enum_values = True


class SyncResult(BaseModel):
    """Result of processing a single sync item."""

    item_id: str = Field(..., alias="itemId")
    status: SyncStatus
    entity_id: Optional[str] = Field(None, alias="entityId")
    error: Optional[str] = None
    conflict: Optional[SyncConflict] = None
    server_timestamp: datetime = Field(
        default_factory=datetime.utcnow, alias="serverTimestamp"
    )

    class Config:
        populate_by_name = True
        use_enum_values = True


class SyncBatchRequest(BaseModel):
    """Request to sync a batch of items."""

    items: List[SyncQueueItem]
    client_timestamp: datetime = Field(..., alias="clientTimestamp")
    device_id: Optional[str] = Field(None, alias="deviceId")
    last_sync_timestamp: Optional[datetime] = Field(None, alias="lastSyncTimestamp")

    class Config:
        populate_by_name = True


class SyncBatchResponse(BaseModel):
    """Response from a batch sync operation."""

    results: List[SyncResult]
    server_timestamp: datetime = Field(
        default_factory=datetime.utcnow, alias="serverTimestamp"
    )
    conflicts: List[SyncConflict] = Field(default_factory=list)
    success_count: int = Field(0, alias="successCount")
    failure_count: int = Field(0, alias="failureCount")
    conflict_count: int = Field(0, alias="conflictCount")

    class Config:
        populate_by_name = True


class ServerChange(BaseModel):
    """A change on the server that the client should know about."""

    entity_type: EntityType = Field(..., alias="entityType")
    entity_id: str = Field(..., alias="entityId")
    operation: SyncOperation
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime

    class Config:
        populate_by_name = True
        use_enum_values = True


class SyncPullRequest(BaseModel):
    """Request to pull changes from server."""

    last_sync_timestamp: Optional[datetime] = Field(None, alias="lastSyncTimestamp")
    entity_types: Optional[List[EntityType]] = Field(None, alias="entityTypes")
    device_id: Optional[str] = Field(None, alias="deviceId")
    limit: int = Field(100, ge=1, le=500)

    class Config:
        populate_by_name = True


class SyncPullResponse(BaseModel):
    """Response with server changes."""

    changes: List[ServerChange]
    server_timestamp: datetime = Field(
        default_factory=datetime.utcnow, alias="serverTimestamp"
    )
    has_more: bool = Field(False, alias="hasMore")
    next_cursor: Optional[str] = Field(None, alias="nextCursor")

    class Config:
        populate_by_name = True
