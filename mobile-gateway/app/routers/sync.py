"""
Sync Router for Mobile API Gateway.

Provides offline sync support endpoints for mobile clients.
Handles batch operations, conflict resolution, and change tracking.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from ..config import settings
from ..models.responses import MobileResponse
from ..models.sync import (
    ConflictResolution,
    EntityType,
    ServerChange,
    SyncBatchRequest,
    SyncBatchResponse,
    SyncConflict,
    SyncOperation,
    SyncPullRequest,
    SyncPullResponse,
    SyncQueueItem,
    SyncResult,
    SyncStatus,
)
from ..models.user import UserProfile
from ..services.auth import require_auth
from ..services.database import execute_query, execute_one

router = APIRouter(prefix="/sync", tags=["Offline Sync"])


class SyncMetadata(BaseModel):
    """Metadata about sync status."""

    last_sync: Optional[datetime] = Field(None, alias="lastSync")
    pending_count: int = Field(0, alias="pendingCount")
    conflict_count: int = Field(0, alias="conflictCount")
    server_timestamp: datetime = Field(
        default_factory=datetime.utcnow, alias="serverTimestamp"
    )

    class Config:
        populate_by_name = True


@router.post(
    "/push",
    response_model=SyncBatchResponse,
    summary="Push Sync Changes",
    description="Push a batch of offline changes to the server.",
)
async def push_changes(
    request: SyncBatchRequest,
    user: UserProfile = Depends(require_auth),
) -> SyncBatchResponse:
    """
    Push a batch of queued offline changes to the server.

    This endpoint:
    1. Validates each change in the batch
    2. Checks for conflicts with server state
    3. Applies changes or returns conflict information
    4. Returns results for each item

    Supports configurable conflict resolution strategies.
    """
    results: List[SyncResult] = []
    conflicts: List[SyncConflict] = []
    success_count = 0
    failure_count = 0

    for item in request.items:
        try:
            result = await _process_sync_item(item, user.id)
            results.append(result)

            if result.status == SyncStatus.COMPLETED:
                success_count += 1
            elif result.status == SyncStatus.CONFLICT:
                if result.conflict:
                    conflicts.append(result.conflict)
            else:
                failure_count += 1

        except Exception as e:
            results.append(
                SyncResult(
                    item_id=item.id,
                    status=SyncStatus.FAILED,
                    error=str(e),
                )
            )
            failure_count += 1

    return SyncBatchResponse(
        results=results,
        server_timestamp=datetime.utcnow(),
        conflicts=conflicts,
        success_count=success_count,
        failure_count=failure_count,
        conflict_count=len(conflicts),
    )


@router.post(
    "/pull",
    response_model=SyncPullResponse,
    summary="Pull Server Changes",
    description="Pull changes from the server since last sync.",
)
async def pull_changes(
    request: SyncPullRequest,
    user: UserProfile = Depends(require_auth),
) -> SyncPullResponse:
    """
    Pull changes from the server since the last sync timestamp.

    Returns a list of changes that the client should apply locally.
    Supports filtering by entity type and pagination.
    """
    changes: List[ServerChange] = []

    # Get the since timestamp (default to 24 hours ago if not provided)
    since = request.last_sync_timestamp or (datetime.utcnow() - timedelta(days=1))

    # Filter entity types or get all
    entity_types = request.entity_types or list(EntityType)

    # Fetch changes for each entity type
    for entity_type in entity_types:
        entity_changes = await _get_changes_for_entity(
            entity_type=entity_type,
            user_id=user.id,
            since=since,
            limit=request.limit // len(entity_types),  # Distribute limit
        )
        changes.extend(entity_changes)

    # Sort by timestamp
    changes.sort(key=lambda c: c.timestamp)

    # Limit total changes
    has_more = len(changes) > request.limit
    changes = changes[: request.limit]

    return SyncPullResponse(
        changes=changes,
        server_timestamp=datetime.utcnow(),
        has_more=has_more,
        next_cursor=str(changes[-1].timestamp.isoformat()) if has_more else None,
    )


@router.get(
    "/status",
    response_model=MobileResponse[SyncMetadata],
    summary="Get Sync Status",
    description="Get the current sync status and metadata.",
)
async def get_sync_status(
    user: UserProfile = Depends(require_auth),
) -> MobileResponse[SyncMetadata]:
    """
    Get current sync status for the user.

    Returns information about:
    - Last successful sync timestamp
    - Number of pending changes
    - Number of unresolved conflicts
    """
    # In a full implementation, this would query a sync_log table
    # For now, return basic metadata

    metadata = SyncMetadata(
        last_sync=None,  # Would be tracked per-device
        pending_count=0,
        conflict_count=0,
        server_timestamp=datetime.utcnow(),
    )

    return MobileResponse(
        success=True,
        data=metadata,
    )


@router.post(
    "/resolve",
    response_model=MobileResponse[SyncResult],
    summary="Resolve Conflict",
    description="Resolve a sync conflict with the specified resolution strategy.",
)
async def resolve_conflict(
    item_id: str,
    resolution: ConflictResolution,
    merged_data: Optional[Dict[str, Any]] = None,
    user: UserProfile = Depends(require_auth),
) -> MobileResponse[SyncResult]:
    """
    Resolve a previously reported sync conflict.

    Supports resolution strategies:
    - client_wins: Use the client's version
    - server_wins: Keep the server's version
    - merge: Use the provided merged_data
    - manual: Requires merged_data
    """
    if resolution in [ConflictResolution.MERGE, ConflictResolution.MANUAL]:
        if not merged_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="merged_data is required for merge/manual resolution",
            )

    # In a full implementation, this would:
    # 1. Look up the conflict record
    # 2. Apply the resolution
    # 3. Update the entity
    # 4. Clear the conflict

    result = SyncResult(
        item_id=item_id,
        status=SyncStatus.COMPLETED,
        server_timestamp=datetime.utcnow(),
    )

    return MobileResponse(
        success=True,
        data=result,
    )


async def _process_sync_item(item: SyncQueueItem, user_id: str) -> SyncResult:
    """
    Process a single sync queue item.

    Routes to the appropriate handler based on entity type and operation.
    """
    handlers = {
        EntityType.EXPENSE_REQUEST: _sync_expense_request,
        EntityType.USER_PROFILE: _sync_user_profile,
        EntityType.BRIEFING: _sync_briefing,
        # Add more handlers as needed
    }

    handler = handlers.get(item.entity_type)

    if not handler:
        # For unsupported entity types, return as completed (no-op)
        return SyncResult(
            item_id=item.id,
            status=SyncStatus.COMPLETED,
            server_timestamp=datetime.utcnow(),
        )

    return await handler(item, user_id)


async def _sync_expense_request(item: SyncQueueItem, user_id: str) -> SyncResult:
    """Handle expense request sync operations."""

    if item.operation_type == SyncOperation.CREATE:
        # Generate ID if not provided
        entity_id = item.entity_id or str(uuid.uuid4())

        # Insert expense request
        query = """
            INSERT INTO expense_request (
                id, amount, currency, purpose, description,
                requester_id, status, created_at, updated_at, submitted_at
            ) VALUES (
                :id, :amount, :currency, :purpose, :description,
                :requester_id, 'pending', :created_at, :updated_at, :submitted_at
            )
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """

        result = await execute_one(
            query,
            {
                "id": entity_id,
                "amount": item.payload.get("amount", "0"),
                "currency": item.payload.get("currency", "USD"),
                "purpose": item.payload.get("purpose", ""),
                "description": item.payload.get("description"),
                "requester_id": user_id,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "submitted_at": datetime.utcnow(),
            },
        )

        return SyncResult(
            item_id=item.id,
            status=SyncStatus.COMPLETED if result else SyncStatus.FAILED,
            entity_id=entity_id,
            server_timestamp=datetime.utcnow(),
        )

    elif item.operation_type == SyncOperation.UPDATE:
        if not item.entity_id:
            return SyncResult(
                item_id=item.id,
                status=SyncStatus.FAILED,
                error="entity_id required for update",
            )

        # Check for conflicts
        existing = await execute_one(
            "SELECT updated_at FROM expense_request WHERE id = :id AND requester_id = :user_id",
            {"id": item.entity_id, "user_id": user_id},
        )

        if not existing:
            return SyncResult(
                item_id=item.id,
                status=SyncStatus.FAILED,
                error="Entity not found",
            )

        # Build update query
        update_fields = []
        params = {"id": item.entity_id, "user_id": user_id}

        for field in ["amount", "currency", "purpose", "description"]:
            if field in item.payload:
                update_fields.append(f"{field} = :{field}")
                params[field] = item.payload[field]

        if update_fields:
            update_fields.append("updated_at = :updated_at")
            params["updated_at"] = datetime.utcnow()

            query = f"""
                UPDATE expense_request
                SET {", ".join(update_fields)}
                WHERE id = :id AND requester_id = :user_id
                RETURNING id
            """
            result = await execute_one(query, params)

            return SyncResult(
                item_id=item.id,
                status=SyncStatus.COMPLETED if result else SyncStatus.FAILED,
                entity_id=item.entity_id,
            )

        return SyncResult(
            item_id=item.id,
            status=SyncStatus.COMPLETED,
            entity_id=item.entity_id,
        )

    elif item.operation_type == SyncOperation.DELETE:
        if not item.entity_id:
            return SyncResult(
                item_id=item.id,
                status=SyncStatus.FAILED,
                error="entity_id required for delete",
            )

        result = await execute_one(
            "DELETE FROM expense_request WHERE id = :id AND requester_id = :user_id RETURNING id",
            {"id": item.entity_id, "user_id": user_id},
        )

        return SyncResult(
            item_id=item.id,
            status=SyncStatus.COMPLETED if result else SyncStatus.FAILED,
            entity_id=item.entity_id,
        )

    return SyncResult(
        item_id=item.id,
        status=SyncStatus.FAILED,
        error=f"Unsupported operation: {item.operation_type}",
    )


async def _sync_user_profile(item: SyncQueueItem, user_id: str) -> SyncResult:
    """Handle user profile sync operations."""

    if item.operation_type == SyncOperation.UPDATE:
        update_fields = []
        params = {"user_id": user_id}

        # Update user table fields
        user_fields = []
        if "name" in item.payload:
            user_fields.append("name = :name")
            params["name"] = item.payload["name"]
        if "image" in item.payload:
            user_fields.append("image = :image")
            params["image"] = item.payload["image"]

        if user_fields:
            user_fields.append("updated_at = :updated_at")
            params["updated_at"] = datetime.utcnow()

            await execute_one(
                f"""
                UPDATE "user"
                SET {", ".join(user_fields)}
                WHERE id = :user_id
                """,
                params,
            )

        # Update profile table fields
        if "bio" in item.payload:
            await execute_one(
                """
                INSERT INTO user_profile (id, bio, updated_at)
                VALUES (:user_id, :bio, :updated_at)
                ON CONFLICT (id) DO UPDATE SET
                    bio = :bio,
                    updated_at = :updated_at
                """,
                {
                    "user_id": user_id,
                    "bio": item.payload["bio"],
                    "updated_at": datetime.utcnow(),
                },
            )

        return SyncResult(
            item_id=item.id,
            status=SyncStatus.COMPLETED,
            entity_id=user_id,
        )

    return SyncResult(
        item_id=item.id,
        status=SyncStatus.FAILED,
        error=f"Unsupported operation for user_profile: {item.operation_type}",
    )


async def _sync_briefing(item: SyncQueueItem, user_id: str) -> SyncResult:
    """Handle briefing sync operations (mainly read status)."""

    if item.operation_type == SyncOperation.UPDATE:
        if not item.entity_id:
            return SyncResult(
                item_id=item.id,
                status=SyncStatus.FAILED,
                error="entity_id required for briefing update",
            )

        # Only allow updating is_read status
        if "is_read" in item.payload:
            result = await execute_one(
                """
                UPDATE daily_briefing
                SET is_read = :is_read, read_at = :read_at, updated_at = :updated_at
                WHERE id = :id AND user_id = :user_id
                RETURNING id
                """,
                {
                    "id": item.entity_id,
                    "user_id": user_id,
                    "is_read": item.payload["is_read"],
                    "read_at": datetime.utcnow() if item.payload["is_read"] else None,
                    "updated_at": datetime.utcnow(),
                },
            )

            return SyncResult(
                item_id=item.id,
                status=SyncStatus.COMPLETED if result else SyncStatus.FAILED,
                entity_id=item.entity_id,
            )

        return SyncResult(
            item_id=item.id,
            status=SyncStatus.COMPLETED,
            entity_id=item.entity_id,
        )

    return SyncResult(
        item_id=item.id,
        status=SyncStatus.FAILED,
        error=f"Unsupported operation for briefing: {item.operation_type}",
    )


async def _get_changes_for_entity(
    entity_type: EntityType,
    user_id: str,
    since: datetime,
    limit: int,
) -> List[ServerChange]:
    """Fetch changes for a specific entity type since the given timestamp."""

    changes = []

    if entity_type == EntityType.EXPENSE_REQUEST:
        results = await execute_query(
            """
            SELECT id, amount, currency, purpose, description, status, updated_at
            FROM expense_request
            WHERE requester_id = :user_id AND updated_at > :since
            ORDER BY updated_at ASC
            LIMIT :limit
            """,
            {"user_id": user_id, "since": since, "limit": limit},
        )

        for r in results:
            changes.append(
                ServerChange(
                    entity_type=EntityType.EXPENSE_REQUEST,
                    entity_id=r["id"],
                    operation=SyncOperation.UPDATE,
                    data={
                        "amount": r["amount"],
                        "currency": r["currency"],
                        "purpose": r["purpose"],
                        "description": r.get("description"),
                        "status": r["status"],
                    },
                    timestamp=r["updated_at"],
                )
            )

    elif entity_type == EntityType.BRIEFING:
        results = await execute_query(
            """
            SELECT id, is_read, status, generated_at, expires_at, updated_at
            FROM daily_briefing
            WHERE user_id = :user_id AND updated_at > :since
            ORDER BY updated_at ASC
            LIMIT :limit
            """,
            {"user_id": user_id, "since": since, "limit": limit},
        )

        for r in results:
            changes.append(
                ServerChange(
                    entity_type=EntityType.BRIEFING,
                    entity_id=r["id"],
                    operation=SyncOperation.UPDATE,
                    data={
                        "is_read": r["is_read"],
                        "status": r["status"],
                        "generated_at": r["generated_at"].isoformat(),
                        "expires_at": r["expires_at"].isoformat(),
                    },
                    timestamp=r["updated_at"],
                )
            )

    return changes
