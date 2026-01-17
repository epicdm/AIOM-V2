"""
Briefings Router for Mobile API Gateway.

Provides mobile-optimized access to daily briefings with offline support.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from ..models.responses import MobileResponse, PaginatedResponse
from ..models.user import UserProfile
from ..services.auth import require_auth
from ..services.database import execute_query, execute_one

router = APIRouter(prefix="/briefings", tags=["Briefings"])


class BriefingContent(BaseModel):
    """Briefing content model."""

    title: Optional[str] = None
    summary: Optional[str] = None
    sections: Optional[List[dict]] = None


class Briefing(BaseModel):
    """Daily briefing model for mobile."""

    id: str
    content: str  # JSON string
    is_read: bool = Field(False, alias="isRead")
    read_at: Optional[datetime] = Field(None, alias="readAt")
    version_number: int = Field(1, alias="versionNumber")
    status: str = "active"
    generated_at: datetime = Field(..., alias="generatedAt")
    expires_at: datetime = Field(..., alias="expiresAt")
    created_at: datetime = Field(..., alias="createdAt")

    class Config:
        from_attributes = True
        populate_by_name = True


class MinimalBriefing(BaseModel):
    """Minimal briefing for list views."""

    id: str
    is_read: bool = Field(False, alias="isRead")
    status: str = "active"
    generated_at: datetime = Field(..., alias="generatedAt")
    expires_at: datetime = Field(..., alias="expiresAt")

    class Config:
        populate_by_name = True


class MarkReadRequest(BaseModel):
    """Request to mark briefing as read."""

    briefing_id: str = Field(..., alias="briefingId")

    class Config:
        populate_by_name = True


@router.get(
    "/today",
    response_model=MobileResponse[Optional[Briefing]],
    summary="Get Today's Briefing",
    description="Get the current active briefing for the authenticated user.",
)
async def get_today_briefing(
    user: UserProfile = Depends(require_auth),
) -> MobileResponse[Optional[Briefing]]:
    """
    Get today's briefing for the user.

    Returns the most recent active briefing that hasn't expired.
    """
    result = await execute_one(
        """
        SELECT
            id, content, is_read, read_at, version_number,
            status, generated_at, expires_at, created_at
        FROM daily_briefing
        WHERE user_id = :user_id
            AND status = 'active'
            AND expires_at > NOW()
        ORDER BY generated_at DESC
        LIMIT 1
        """,
        {"user_id": user.id},
    )

    if not result:
        return MobileResponse(
            success=True,
            data=None,
            message="No active briefing available",
        )

    briefing = Briefing(
        id=result["id"],
        content=result["content"],
        is_read=result["is_read"],
        read_at=result.get("read_at"),
        version_number=result["version_number"],
        status=result["status"],
        generated_at=result["generated_at"],
        expires_at=result["expires_at"],
        created_at=result["created_at"],
    )

    return MobileResponse(
        success=True,
        data=briefing,
        cache_ttl=300,  # Cache for 5 minutes
    )


@router.get(
    "",
    response_model=PaginatedResponse[MinimalBriefing],
    summary="List Briefings",
    description="Get a paginated list of the user's briefings.",
)
async def list_briefings(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    status: Optional[str] = Query(None),
    user: UserProfile = Depends(require_auth),
) -> PaginatedResponse[MinimalBriefing]:
    """
    List user's briefings with pagination.

    Returns minimal data for list views to reduce payload size.
    """
    offset = (page - 1) * page_size
    params = {"user_id": user.id, "limit": page_size, "offset": offset}

    where_clause = "user_id = :user_id"
    if status:
        where_clause += " AND status = :status"
        params["status"] = status

    # Count total
    count_result = await execute_one(
        f"SELECT COUNT(*) as total FROM daily_briefing WHERE {where_clause}",
        params,
    )
    total = count_result["total"] if count_result else 0

    # Fetch briefings
    results = await execute_query(
        f"""
        SELECT id, is_read, status, generated_at, expires_at
        FROM daily_briefing
        WHERE {where_clause}
        ORDER BY generated_at DESC
        LIMIT :limit OFFSET :offset
        """,
        params,
    )

    briefings = [
        MinimalBriefing(
            id=r["id"],
            is_read=r["is_read"],
            status=r["status"],
            generated_at=r["generated_at"],
            expires_at=r["expires_at"],
        )
        for r in results
    ]

    return PaginatedResponse(
        items=briefings,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + len(briefings)) < total,
    )


@router.get(
    "/{briefing_id}",
    response_model=MobileResponse[Briefing],
    summary="Get Briefing",
    description="Get a specific briefing by ID.",
)
async def get_briefing(
    briefing_id: str,
    user: UserProfile = Depends(require_auth),
) -> MobileResponse[Briefing]:
    """
    Get a specific briefing by ID.
    """
    result = await execute_one(
        """
        SELECT
            id, content, is_read, read_at, version_number,
            status, generated_at, expires_at, created_at
        FROM daily_briefing
        WHERE id = :briefing_id AND user_id = :user_id
        """,
        {"briefing_id": briefing_id, "user_id": user.id},
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Briefing not found",
        )

    briefing = Briefing(
        id=result["id"],
        content=result["content"],
        is_read=result["is_read"],
        read_at=result.get("read_at"),
        version_number=result["version_number"],
        status=result["status"],
        generated_at=result["generated_at"],
        expires_at=result["expires_at"],
        created_at=result["created_at"],
    )

    return MobileResponse(
        success=True,
        data=briefing,
        cache_ttl=60,
    )


@router.post(
    "/read",
    response_model=MobileResponse[bool],
    summary="Mark Briefing as Read",
    description="Mark a briefing as read.",
)
async def mark_briefing_read(
    request: MarkReadRequest,
    user: UserProfile = Depends(require_auth),
) -> MobileResponse[bool]:
    """
    Mark a briefing as read.

    Updates the is_read flag and sets read_at timestamp.
    """
    result = await execute_one(
        """
        UPDATE daily_briefing
        SET is_read = true, read_at = :read_at, updated_at = :updated_at
        WHERE id = :briefing_id AND user_id = :user_id
        RETURNING id
        """,
        {
            "briefing_id": request.briefing_id,
            "user_id": user.id,
            "read_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        },
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Briefing not found",
        )

    return MobileResponse(success=True, data=True)


@router.get(
    "/unread/count",
    response_model=MobileResponse[int],
    summary="Get Unread Count",
    description="Get the count of unread briefings.",
)
async def get_unread_count(
    user: UserProfile = Depends(require_auth),
) -> MobileResponse[int]:
    """
    Get the count of unread active briefings.

    Useful for badge counts in mobile apps.
    """
    result = await execute_one(
        """
        SELECT COUNT(*) as count
        FROM daily_briefing
        WHERE user_id = :user_id
            AND is_read = false
            AND status = 'active'
            AND expires_at > NOW()
        """,
        {"user_id": user.id},
    )

    count = result["count"] if result else 0

    return MobileResponse(
        success=True,
        data=count,
        cache_ttl=60,  # Cache for 1 minute
    )
