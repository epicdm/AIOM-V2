"""
Users Router for Mobile API Gateway.

Provides mobile-optimized user endpoints with reduced payload sizes.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text

from ..models.responses import MobileResponse, PaginatedResponse
from ..models.user import MinimalUser, UserProfile, UserProfileUpdate
from ..services.auth import get_current_user, require_auth
from ..services.database import execute_query, execute_one, get_db_session

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/me",
    response_model=MobileResponse[UserProfile],
    summary="Get Current User",
    description="Get the authenticated user's profile information.",
)
async def get_me(
    user: UserProfile = Depends(require_auth),
) -> MobileResponse[UserProfile]:
    """
    Get the current authenticated user's profile.

    This endpoint is optimized for mobile with:
    - Compressed response
    - Essential fields only
    - Caching headers
    """
    return MobileResponse(
        success=True,
        data=user,
        cache_ttl=60,  # Cache for 1 minute
    )


@router.get(
    "/me/minimal",
    response_model=MobileResponse[MinimalUser],
    summary="Get Minimal User Info",
    description="Get minimal user information for UI display.",
)
async def get_me_minimal(
    user: UserProfile = Depends(require_auth),
) -> MobileResponse[MinimalUser]:
    """
    Get minimal user information.

    Ultra-compact response for header bars, avatars, etc.
    """
    minimal = MinimalUser(
        id=user.id,
        name=user.name,
        image=user.image,
    )
    return MobileResponse(
        success=True,
        data=minimal,
        cache_ttl=300,  # Cache for 5 minutes
    )


@router.patch(
    "/me",
    response_model=MobileResponse[UserProfile],
    summary="Update User Profile",
    description="Update the authenticated user's profile.",
)
async def update_me(
    update_data: UserProfileUpdate,
    user: UserProfile = Depends(require_auth),
) -> MobileResponse[UserProfile]:
    """
    Update the current user's profile.

    Supports partial updates - only provided fields are updated.
    """
    # Build update query
    update_fields = []
    params = {"user_id": user.id, "updated_at": datetime.utcnow()}

    if update_data.name is not None:
        update_fields.append("name = :name")
        params["name"] = update_data.name

    if update_data.image is not None:
        update_fields.append("image = :image")
        params["image"] = update_data.image

    if not update_fields:
        # No updates, return current user
        return MobileResponse(success=True, data=user)

    update_fields.append("updated_at = :updated_at")

    # Execute update
    query = f"""
        UPDATE "user"
        SET {", ".join(update_fields)}
        WHERE id = :user_id
        RETURNING *
    """

    result = await execute_one(query, params)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user",
        )

    # Update bio in user_profile if provided
    if update_data.bio is not None:
        bio_query = """
            INSERT INTO user_profile (id, bio, updated_at)
            VALUES (:user_id, :bio, :updated_at)
            ON CONFLICT (id) DO UPDATE SET
                bio = :bio,
                updated_at = :updated_at
        """
        await execute_one(
            bio_query,
            {
                "user_id": user.id,
                "bio": update_data.bio,
                "updated_at": datetime.utcnow(),
            },
        )

    # Fetch updated user with profile
    updated_user = await _get_user_with_profile(user.id)

    return MobileResponse(success=True, data=updated_user)


@router.get(
    "/{user_id}",
    response_model=MobileResponse[MinimalUser],
    summary="Get User by ID",
    description="Get a user's public profile by their ID.",
)
async def get_user(
    user_id: str,
    current_user: Optional[UserProfile] = Depends(get_current_user),
) -> MobileResponse[MinimalUser]:
    """
    Get a user's public profile.

    Returns minimal information suitable for displaying in lists, comments, etc.
    """
    result = await execute_one(
        """
        SELECT id, name, image
        FROM "user"
        WHERE id = :user_id
        """,
        {"user_id": user_id},
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    minimal = MinimalUser(
        id=result["id"],
        name=result["name"],
        image=result.get("image"),
    )

    return MobileResponse(
        success=True,
        data=minimal,
        cache_ttl=300,  # Cache for 5 minutes
    )


@router.get(
    "",
    response_model=PaginatedResponse[MinimalUser],
    summary="List Users",
    description="Get a paginated list of users (admin only or for member directory).",
)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    current_user: UserProfile = Depends(require_auth),
) -> PaginatedResponse[MinimalUser]:
    """
    List users with pagination.

    Supports search by name or email (partial match).
    """
    offset = (page - 1) * page_size
    params = {"limit": page_size, "offset": offset}

    # Build query
    where_clause = "1=1"
    if search:
        where_clause = "(name ILIKE :search OR email ILIKE :search)"
        params["search"] = f"%{search}%"

    # Count total
    count_query = f"""
        SELECT COUNT(*) as total
        FROM "user"
        WHERE {where_clause}
    """
    count_result = await execute_one(count_query, params)
    total = count_result["total"] if count_result else 0

    # Fetch users
    query = f"""
        SELECT id, name, image
        FROM "user"
        WHERE {where_clause}
        ORDER BY name ASC
        LIMIT :limit OFFSET :offset
    """
    results = await execute_query(query, params)

    users = [
        MinimalUser(
            id=r["id"],
            name=r["name"],
            image=r.get("image"),
        )
        for r in results
    ]

    return PaginatedResponse(
        items=users,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + len(users)) < total,
    )


async def _get_user_with_profile(user_id: str) -> Optional[UserProfile]:
    """Fetch user with profile data."""
    result = await execute_one(
        """
        SELECT
            u.id, u.name, u.email, u.image,
            u.email_verified, u.is_admin, u.plan,
            u.subscription_status, u.created_at, u.updated_at,
            p.bio
        FROM "user" u
        LEFT JOIN user_profile p ON p.id = u.id
        WHERE u.id = :user_id
        """,
        {"user_id": user_id},
    )

    if not result:
        return None

    return UserProfile(
        id=result["id"],
        name=result["name"],
        email=result["email"],
        image=result.get("image"),
        email_verified=result.get("email_verified", False),
        is_admin=result.get("is_admin", False),
        plan=result.get("plan", "free"),
        subscription_status=result.get("subscription_status"),
        bio=result.get("bio"),
        created_at=result["created_at"],
        updated_at=result["updated_at"],
    )
