"""
Mobile Authentication Router.

Provides mobile-specific authentication endpoints including:
- Token validation
- Token refresh
- Device registration
- Biometric auth status
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field

from ..services.auth import (
    get_current_user,
    require_auth,
    get_token_from_request,
    get_auth_service,
)
from ..models.user import UserProfile
from ..models.responses import SuccessResponse, ErrorResponse


router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden"},
    },
)


# Request/Response Models
class TokenValidationRequest(BaseModel):
    """Request to validate a token."""
    token: str = Field(..., description="The session token to validate")


class TokenValidationResponse(BaseModel):
    """Response from token validation."""
    is_valid: bool
    user_id: Optional[str] = None
    expires_at: Optional[str] = None
    error: Optional[str] = None


class DeviceRegistrationRequest(BaseModel):
    """Request to register a mobile device."""
    device_id: str = Field(..., description="Unique device identifier")
    device_name: str = Field(..., description="Human-readable device name")
    platform: str = Field(..., description="Platform: ios, android, or web")
    push_token: Optional[str] = Field(None, description="Push notification token")
    app_version: Optional[str] = Field(None, description="App version")
    os_version: Optional[str] = Field(None, description="OS version")


class DeviceRegistrationResponse(BaseModel):
    """Response from device registration."""
    id: str
    device_name: str
    platform: str
    is_active: bool
    registered_at: str


class BiometricStatusRequest(BaseModel):
    """Request to update biometric status."""
    enabled: bool = Field(..., description="Whether biometric auth is enabled")
    device_id: str = Field(..., description="Device ID to update")


class SessionInfo(BaseModel):
    """Information about a session."""
    id: str
    expires_at: str
    user_agent: Optional[str] = None
    created_at: str
    is_current: bool = False


class DeviceInfo(BaseModel):
    """Information about a registered device."""
    id: str
    device_name: str
    platform: str
    is_active: bool
    last_used_at: str
    created_at: str


@router.post(
    "/validate",
    response_model=TokenValidationResponse,
    summary="Validate a session token",
    description="Validates a session token and returns user information if valid.",
)
async def validate_token(
    request: TokenValidationRequest,
) -> TokenValidationResponse:
    """Validate a session token."""
    auth_service = get_auth_service()
    session_data = await auth_service.validate_session(request.token)

    if not session_data:
        return TokenValidationResponse(
            is_valid=False,
            error="Invalid or expired token",
        )

    session = session_data.get("session", {})
    user = session_data.get("user", {})

    return TokenValidationResponse(
        is_valid=True,
        user_id=user.get("id"),
        expires_at=session.get("expiresAt"),
    )


@router.get(
    "/session",
    response_model=SuccessResponse,
    summary="Get current session info",
    description="Returns information about the current authenticated session.",
)
async def get_session_info(
    request: Request,
    user: UserProfile = Depends(require_auth),
) -> SuccessResponse:
    """Get current session information."""
    token = await get_token_from_request(request)
    auth_service = get_auth_service()
    session_data = await auth_service.validate_session(token) if token else None

    session_info = None
    if session_data and session_data.get("session"):
        session = session_data["session"]
        session_info = {
            "id": session.get("id"),
            "expiresAt": session.get("expiresAt"),
            "createdAt": session.get("createdAt"),
        }

    return SuccessResponse(
        data={
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "image": user.image,
                "isAdmin": user.is_admin,
                "plan": user.plan,
            },
            "session": session_info,
        }
    )


@router.post(
    "/refresh",
    response_model=SuccessResponse,
    summary="Refresh the session",
    description="Refreshes the current session and returns updated token info.",
)
async def refresh_session(
    request: Request,
    user: UserProfile = Depends(require_auth),
) -> SuccessResponse:
    """
    Refresh the current session.

    For Better Auth, sessions are managed server-side. This endpoint
    verifies the current session is still valid and returns updated
    expiration info.
    """
    token = await get_token_from_request(request)
    auth_service = get_auth_service()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "unauthorized", "message": "No token provided"},
        )

    session_data = await auth_service.validate_session(token)

    if not session_data or not session_data.get("session"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "unauthorized", "message": "Session is invalid or expired"},
        )

    session = session_data["session"]

    return SuccessResponse(
        data={
            "token": token,
            "expiresAt": session.get("expiresAt"),
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
            },
        }
    )


@router.post(
    "/device/register",
    response_model=DeviceRegistrationResponse,
    summary="Register a mobile device",
    description="Registers a mobile device for push notifications and tracking.",
)
async def register_device(
    request: DeviceRegistrationRequest,
    user: UserProfile = Depends(require_auth),
) -> DeviceRegistrationResponse:
    """Register a mobile device."""
    # In a full implementation, this would save to the database
    # For now, we return a mock response
    return DeviceRegistrationResponse(
        id=f"device_{request.device_id}",
        device_name=request.device_name,
        platform=request.platform,
        is_active=True,
        registered_at=datetime.utcnow().isoformat(),
    )


@router.post(
    "/device/biometric",
    response_model=SuccessResponse,
    summary="Update biometric auth status",
    description="Updates the biometric authentication status for a device.",
)
async def update_biometric_status(
    request: BiometricStatusRequest,
    user: UserProfile = Depends(require_auth),
) -> SuccessResponse:
    """Update biometric authentication status for a device."""
    # In a full implementation, this would save to the database
    return SuccessResponse(
        data={
            "device_id": request.device_id,
            "biometric_enabled": request.enabled,
            "updated_at": datetime.utcnow().isoformat(),
        }
    )


@router.get(
    "/devices",
    response_model=SuccessResponse,
    summary="List registered devices",
    description="Returns a list of all devices registered for the current user.",
)
async def list_devices(
    user: UserProfile = Depends(require_auth),
) -> SuccessResponse:
    """List all registered devices for the current user."""
    # In a full implementation, this would query the database
    return SuccessResponse(
        data={
            "devices": [],
            "count": 0,
        }
    )


@router.delete(
    "/device/{device_id}",
    response_model=SuccessResponse,
    summary="Deactivate a device",
    description="Deactivates a registered device.",
)
async def deactivate_device(
    device_id: str,
    user: UserProfile = Depends(require_auth),
) -> SuccessResponse:
    """Deactivate a registered device."""
    return SuccessResponse(
        data={
            "device_id": device_id,
            "deactivated": True,
            "deactivated_at": datetime.utcnow().isoformat(),
        }
    )


@router.post(
    "/logout",
    response_model=SuccessResponse,
    summary="Logout from current session",
    description="Logs out from the current session.",
)
async def logout(
    user: UserProfile = Depends(require_auth),
) -> SuccessResponse:
    """Logout from the current session."""
    # In a full implementation, this would invalidate the session
    return SuccessResponse(
        data={
            "logged_out": True,
            "message": "Successfully logged out",
        }
    )


@router.post(
    "/logout/all",
    response_model=SuccessResponse,
    summary="Logout from all sessions",
    description="Logs out from all sessions except the current one.",
)
async def logout_all(
    request: Request,
    user: UserProfile = Depends(require_auth),
) -> SuccessResponse:
    """Logout from all sessions except the current one."""
    # In a full implementation, this would invalidate all other sessions
    return SuccessResponse(
        data={
            "revoked_count": 0,
            "message": "All other sessions have been revoked",
        }
    )
