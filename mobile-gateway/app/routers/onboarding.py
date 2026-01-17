"""
Mobile Onboarding Router.

Provides mobile-specific onboarding endpoints including:
- Phone number submission and OTP sending
- OTP verification
- Account linking with SIP credential provisioning
- Session management for onboarding flow
"""

import random
import string
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field, validator

from ..services.auth import get_current_user, require_auth, get_auth_service
from ..models.user import UserProfile
from ..models.responses import SuccessResponse, ErrorResponse


router = APIRouter(
    prefix="/onboarding",
    tags=["onboarding"],
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request"},
        429: {"model": ErrorResponse, "description": "Too Many Requests"},
    },
)


# In-memory storage for demo (use database in production)
_onboarding_sessions: Dict[str, Dict[str, Any]] = {}
_phone_verifications: Dict[str, Dict[str, Any]] = {}
_sip_credentials: Dict[str, Dict[str, Any]] = {}
_rate_limits: Dict[str, Dict[str, Any]] = {}


# Request/Response Models
class StartOnboardingRequest(BaseModel):
    """Request to start onboarding with phone number."""

    phone_number: str = Field(
        ...,
        description="Phone number in E.164 format",
        min_length=10,
        max_length=15,
    )
    device_id: Optional[str] = Field(None, description="Unique device identifier")
    device_platform: Optional[str] = Field(
        None, description="Platform: ios, android, or web"
    )
    device_name: Optional[str] = Field(None, description="Human-readable device name")

    @validator("phone_number")
    def validate_phone_number(cls, v):
        # Remove any non-digit characters except leading +
        cleaned = "".join(c for c in v if c.isdigit() or (c == "+" and v.index(c) == 0))
        if not cleaned.startswith("+"):
            cleaned = "+" + cleaned
        if len(cleaned) < 10 or len(cleaned) > 16:
            raise ValueError("Phone number must be 10-15 digits")
        return cleaned

    @validator("device_platform")
    def validate_platform(cls, v):
        if v and v not in ["ios", "android", "web"]:
            raise ValueError("Platform must be ios, android, or web")
        return v


class StartOnboardingResponse(BaseModel):
    """Response from starting onboarding."""

    session_id: str
    verification_id: str
    phone_number: str
    current_step: str
    expires_at: str
    # Development only - not returned in production
    otp_code: Optional[str] = None


class VerifyOTPRequest(BaseModel):
    """Request to verify OTP code."""

    session_id: str = Field(..., description="Onboarding session ID")
    phone_number: str = Field(..., description="Phone number that received the OTP")
    otp_code: str = Field(
        ..., description="6-digit OTP code", min_length=6, max_length=6
    )

    @validator("otp_code")
    def validate_otp_code(cls, v):
        if not v.isdigit():
            raise ValueError("OTP code must contain only digits")
        return v


class VerifyOTPResponse(BaseModel):
    """Response from OTP verification."""

    session_id: str
    phone_number: str
    verified: bool
    current_step: str
    next_step: str


class LinkAccountRequest(BaseModel):
    """Request to link account and provision SIP credentials."""

    session_id: str = Field(..., description="Onboarding session ID")
    display_name: Optional[str] = Field(
        None, description="Display name for caller ID", max_length=100
    )


class SIPCredentialsResponse(BaseModel):
    """SIP credentials response."""

    sip_username: str
    sip_password: str
    sip_domain: str
    sip_uri: str
    display_name: Optional[str]
    transport_protocol: str
    codec_preferences: list[str]
    stun_turn_config: dict


class LinkAccountResponse(BaseModel):
    """Response from account linking."""

    session_id: str
    completed: bool
    user: dict
    phone_number: str
    sip_credentials: SIPCredentialsResponse


class ResendOTPRequest(BaseModel):
    """Request to resend OTP."""

    session_id: str = Field(..., description="Onboarding session ID")
    phone_number: str = Field(..., description="Phone number to resend OTP to")


class SessionStatusResponse(BaseModel):
    """Response for session status."""

    session_id: str
    current_step: str
    phone_number: Optional[str]
    is_completed: bool
    is_expired: bool
    expires_at: str
    created_at: str


# Helper functions
def generate_otp_code() -> str:
    """Generate a 6-digit OTP code."""
    return "".join(random.choices(string.digits, k=6))


def generate_session_id() -> str:
    """Generate a unique session ID."""
    return secrets.token_urlsafe(16)


def generate_sip_username(phone_number: str) -> str:
    """Generate a unique SIP username."""
    phone_digits = "".join(c for c in phone_number if c.isdigit())[-6:]
    random_suffix = secrets.token_hex(2)
    return f"u{phone_digits}{random_suffix}"


def generate_sip_password() -> str:
    """Generate a secure SIP password."""
    return secrets.token_urlsafe(12)


def check_rate_limit(phone_number: str, limit: int = 3, window: int = 60) -> bool:
    """Check if phone number has exceeded rate limit."""
    now = datetime.utcnow()
    key = f"otp:{phone_number}"

    if key not in _rate_limits:
        _rate_limits[key] = {"count": 0, "reset_at": now + timedelta(seconds=window)}

    entry = _rate_limits[key]

    if now > entry["reset_at"]:
        entry["count"] = 0
        entry["reset_at"] = now + timedelta(seconds=window)

    if entry["count"] >= limit:
        return False

    entry["count"] += 1
    return True


# Endpoints
@router.post(
    "/start",
    response_model=SuccessResponse,
    summary="Start onboarding with phone number",
    description="Initiates onboarding flow and sends OTP to the provided phone number.",
)
async def start_onboarding(
    request_data: StartOnboardingRequest,
    request: Request,
) -> SuccessResponse:
    """Start the onboarding flow with phone number."""
    phone_number = request_data.phone_number

    # Check rate limit
    if not check_rate_limit(phone_number):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "rate_limit_exceeded",
                "message": "Too many requests. Please wait before requesting a new code.",
                "retry_after": 60,
            },
        )

    # Generate IDs and codes
    session_id = generate_session_id()
    verification_id = generate_session_id()
    otp_code = generate_otp_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # Get client IP
    ip_address = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")

    # Store session
    _onboarding_sessions[session_id] = {
        "id": session_id,
        "phone_number": phone_number,
        "current_step": "otp_verification",
        "device_id": request_data.device_id,
        "device_platform": request_data.device_platform,
        "device_name": request_data.device_name,
        "verification_id": verification_id,
        "is_completed": False,
        "expires_at": expires_at,
        "created_at": datetime.utcnow(),
    }

    # Store verification
    _phone_verifications[verification_id] = {
        "id": verification_id,
        "phone_number": phone_number,
        "otp_code": otp_code,
        "status": "pending",
        "attempt_count": 0,
        "max_attempts": 3,
        "expires_at": expires_at,
        "ip_address": ip_address,
        "created_at": datetime.utcnow(),
    }

    # In production, send OTP via SMS here
    print(f"[DEV] OTP for {phone_number}: {otp_code}")

    response_data = {
        "session_id": session_id,
        "verification_id": verification_id,
        "phone_number": phone_number,
        "current_step": "otp_verification",
        "expires_at": expires_at.isoformat(),
    }

    # Include OTP in development mode
    import os
    if os.environ.get("DEBUG", "").lower() == "true":
        response_data["otp_code"] = otp_code

    return SuccessResponse(
        data=response_data,
        message=f"Verification code sent to {phone_number}",
    )


@router.post(
    "/verify-otp",
    response_model=SuccessResponse,
    summary="Verify OTP code",
    description="Verifies the OTP code entered by the user.",
)
async def verify_otp(
    request_data: VerifyOTPRequest,
) -> SuccessResponse:
    """Verify the OTP code."""
    session_id = request_data.session_id
    phone_number = request_data.phone_number
    otp_code = request_data.otp_code

    # Check session exists
    session = _onboarding_sessions.get(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "session_not_found",
                "message": "Please start a new onboarding session",
            },
        )

    # Check session not expired
    if datetime.utcnow() > session["expires_at"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "session_expired",
                "message": "Session has expired. Please start a new onboarding session.",
            },
        )

    # Check session not completed
    if session["is_completed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "session_completed",
                "message": "This onboarding session has already been completed.",
            },
        )

    # Find verification
    verification_id = session.get("verification_id")
    verification = _phone_verifications.get(verification_id)

    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "verification_not_found",
                "message": "No pending verification found. Please request a new code.",
            },
        )

    # Check verification not expired
    if datetime.utcnow() > verification["expires_at"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "verification_expired",
                "message": "Verification code has expired. Please request a new code.",
            },
        )

    # Check max attempts
    if verification["attempt_count"] >= verification["max_attempts"]:
        verification["status"] = "failed"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "max_attempts_exceeded",
                "message": "Maximum verification attempts exceeded. Please request a new code.",
            },
        )

    # Increment attempt count
    verification["attempt_count"] += 1

    # Verify OTP
    if verification["otp_code"] != otp_code:
        remaining = verification["max_attempts"] - verification["attempt_count"]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "invalid_otp",
                "message": f"Invalid verification code. {remaining} attempts remaining.",
            },
        )

    # Mark as verified
    verification["status"] = "verified"
    verification["verified_at"] = datetime.utcnow()

    # Update session step
    session["current_step"] = "account_link"
    session["phone_number"] = phone_number

    return SuccessResponse(
        data={
            "session_id": session_id,
            "phone_number": phone_number,
            "verified": True,
            "current_step": "account_link",
            "next_step": "Link your account or create a new one",
        },
        message="Phone number verified successfully",
    )


@router.post(
    "/link-account",
    response_model=SuccessResponse,
    summary="Link account and provision SIP credentials",
    description="Links the verified phone to user account and provisions SIP credentials.",
)
async def link_account(
    request_data: LinkAccountRequest,
    user: UserProfile = Depends(require_auth),
) -> SuccessResponse:
    """Link account and provision SIP credentials."""
    session_id = request_data.session_id

    # Check session exists
    session = _onboarding_sessions.get(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "session_not_found",
                "message": "Please start a new onboarding session",
            },
        )

    # Check session not expired
    if datetime.utcnow() > session["expires_at"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "session_expired",
                "message": "Session has expired. Please start a new onboarding session.",
            },
        )

    # Check current step
    if session["current_step"] != "account_link":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "invalid_step",
                "message": "Please complete phone verification first.",
                "current_step": session["current_step"],
            },
        )

    phone_number = session.get("phone_number")
    if not phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "missing_verification",
                "message": "Phone number has not been verified.",
            },
        )

    # Provision SIP credentials
    sip_username = generate_sip_username(phone_number)
    sip_password = generate_sip_password()
    sip_domain = "sip.soundstation.io"
    sip_uri = f"sip:{sip_username}@{sip_domain}"

    sip_credentials = {
        "id": generate_session_id(),
        "user_id": user.id,
        "sip_username": sip_username,
        "sip_password": sip_password,
        "sip_domain": sip_domain,
        "sip_uri": sip_uri,
        "phone_number": phone_number,
        "display_name": request_data.display_name or user.name,
        "transport_protocol": "TLS",
        "codec_preferences": ["OPUS", "G722", "PCMU"],
        "stun_turn_config": {
            "stun_servers": [
                "stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302",
            ],
        },
        "status": "active",
        "provisioned_at": datetime.utcnow(),
    }

    # Store credentials
    _sip_credentials[sip_credentials["id"]] = sip_credentials

    # Mark session as completed
    session["is_completed"] = True
    session["completed_at"] = datetime.utcnow()
    session["current_step"] = "complete"
    session["user_id"] = user.id
    session["sip_credential_id"] = sip_credentials["id"]

    return SuccessResponse(
        data={
            "session_id": session_id,
            "completed": True,
            "user": {
                "id": user.id,
                "name": user.name,
            },
            "phone_number": phone_number,
            "sip_credentials": {
                "sip_username": sip_username,
                "sip_password": sip_password,
                "sip_domain": sip_domain,
                "sip_uri": sip_uri,
                "display_name": sip_credentials["display_name"],
                "transport_protocol": sip_credentials["transport_protocol"],
                "codec_preferences": sip_credentials["codec_preferences"],
                "stun_turn_config": sip_credentials["stun_turn_config"],
            },
        },
        message="Account linked and SIP credentials provisioned successfully",
    )


@router.post(
    "/resend-otp",
    response_model=SuccessResponse,
    summary="Resend OTP code",
    description="Resends the OTP code to the specified phone number.",
)
async def resend_otp(
    request_data: ResendOTPRequest,
    request: Request,
) -> SuccessResponse:
    """Resend OTP code."""
    session_id = request_data.session_id
    phone_number = request_data.phone_number

    # Check rate limit
    if not check_rate_limit(phone_number):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "rate_limit_exceeded",
                "message": "Too many requests. Please wait before requesting a new code.",
                "retry_after": 60,
            },
        )

    # Check session exists
    session = _onboarding_sessions.get(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "session_not_found",
                "message": "Please start a new onboarding session",
            },
        )

    # Check session not expired
    if datetime.utcnow() > session["expires_at"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "session_expired",
                "message": "Session has expired. Please start a new onboarding session.",
            },
        )

    # Generate new verification
    verification_id = generate_session_id()
    otp_code = generate_otp_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # Get client IP
    ip_address = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")

    # Store new verification
    _phone_verifications[verification_id] = {
        "id": verification_id,
        "phone_number": phone_number,
        "otp_code": otp_code,
        "status": "pending",
        "attempt_count": 0,
        "max_attempts": 3,
        "expires_at": expires_at,
        "ip_address": ip_address,
        "created_at": datetime.utcnow(),
    }

    # Update session
    session["verification_id"] = verification_id

    # In production, send OTP via SMS here
    print(f"[DEV] New OTP for {phone_number}: {otp_code}")

    response_data = {
        "session_id": session_id,
        "verification_id": verification_id,
        "phone_number": phone_number,
        "expires_at": expires_at.isoformat(),
    }

    # Include OTP in development mode
    import os
    if os.environ.get("DEBUG", "").lower() == "true":
        response_data["otp_code"] = otp_code

    return SuccessResponse(
        data=response_data,
        message=f"New verification code sent to {phone_number}",
    )


@router.get(
    "/session/{session_id}",
    response_model=SuccessResponse,
    summary="Get onboarding session status",
    description="Returns the current status of an onboarding session.",
)
async def get_session_status(
    session_id: str,
) -> SuccessResponse:
    """Get onboarding session status."""
    session = _onboarding_sessions.get(session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "session_not_found",
                "message": "Session not found",
            },
        )

    is_expired = datetime.utcnow() > session["expires_at"]

    return SuccessResponse(
        data={
            "session_id": session["id"],
            "current_step": session["current_step"],
            "phone_number": session.get("phone_number"),
            "is_completed": session["is_completed"],
            "is_expired": is_expired,
            "expires_at": session["expires_at"].isoformat(),
            "created_at": session["created_at"].isoformat(),
            "device_id": session.get("device_id"),
            "device_platform": session.get("device_platform"),
        },
    )


@router.get(
    "/sip-credentials",
    response_model=SuccessResponse,
    summary="Get user's SIP credentials",
    description="Returns all active SIP credentials for the authenticated user.",
)
async def get_sip_credentials(
    user: UserProfile = Depends(require_auth),
) -> SuccessResponse:
    """Get user's SIP credentials."""
    user_credentials = [
        cred
        for cred in _sip_credentials.values()
        if cred.get("user_id") == user.id and cred.get("status") == "active"
    ]

    return SuccessResponse(
        data={
            "credentials": [
                {
                    "id": cred["id"],
                    "sip_username": cred["sip_username"],
                    "sip_domain": cred["sip_domain"],
                    "sip_uri": cred["sip_uri"],
                    "phone_number": cred["phone_number"],
                    "display_name": cred.get("display_name"),
                    "status": cred["status"],
                    "provisioned_at": cred["provisioned_at"].isoformat(),
                }
                for cred in user_credentials
            ],
            "count": len(user_credentials),
        },
    )
