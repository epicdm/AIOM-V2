"""
Authentication Service for Mobile API Gateway.

Integrates with Better Auth session management from the main application.
"""

import hashlib
import hmac
from datetime import datetime
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..config import settings
from ..models.user import MinimalUser, UserProfile


# Security scheme for Swagger UI
security = HTTPBearer(auto_error=False)


class AuthService:
    """
    Service for handling authentication with Better Auth.

    Better Auth stores sessions in the database with the following structure:
    - session.token: The session token
    - session.userId: Reference to user
    - session.expiresAt: Expiration timestamp

    For mobile API, we support:
    1. Session token in Authorization header (Bearer token)
    2. Cookie-based session (forwarded from web)
    """

    def __init__(self, main_app_url: str = None):
        self.main_app_url = main_app_url or settings.main_app_url
        self._http_client: Optional[httpx.AsyncClient] = None

    @property
    def http_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(
                base_url=self.main_app_url,
                timeout=10.0,
            )
        return self._http_client

    async def close(self):
        """Close HTTP client."""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None

    async def validate_session(self, token: str) -> Optional[dict]:
        """
        Validate a session token by calling the main app's auth endpoint.

        This proxies to the Better Auth /api/auth/get-session endpoint.
        """
        try:
            # Forward the session token to the main app
            response = await self.http_client.get(
                "/api/auth/get-session",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Cookie": f"better-auth.session_token={token}",
                },
            )

            if response.status_code == 200:
                data = response.json()
                if data and data.get("session"):
                    return data
            return None

        except httpx.RequestError:
            # Main app unavailable - try local validation if possible
            return None

    async def get_user_from_session(self, session_data: dict) -> Optional[UserProfile]:
        """Extract user information from session data."""
        if not session_data:
            return None

        user_data = session_data.get("user", {})
        if not user_data.get("id"):
            return None

        return UserProfile(
            id=user_data.get("id"),
            name=user_data.get("name", ""),
            email=user_data.get("email", ""),
            image=user_data.get("image"),
            email_verified=user_data.get("emailVerified", False),
            is_admin=user_data.get("isAdmin", False),
            plan=user_data.get("plan", "free"),
            subscription_status=user_data.get("subscriptionStatus"),
            bio=user_data.get("bio"),
            created_at=datetime.fromisoformat(
                user_data.get("createdAt", datetime.utcnow().isoformat())
            ),
            updated_at=datetime.fromisoformat(
                user_data.get("updatedAt", datetime.utcnow().isoformat())
            ),
        )


# Global auth service instance
_auth_service: Optional[AuthService] = None


def get_auth_service() -> AuthService:
    """Get the global auth service instance."""
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service


async def get_token_from_request(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[str]:
    """
    Extract authentication token from request.

    Checks in order:
    1. Authorization header (Bearer token)
    2. Cookie (better-auth.session_token)
    3. X-Session-Token header (mobile apps)
    """
    # Check Authorization header
    if credentials and credentials.credentials:
        return credentials.credentials

    # Check cookies
    session_cookie = request.cookies.get("better-auth.session_token")
    if session_cookie:
        return session_cookie

    # Check custom header for mobile
    mobile_token = request.headers.get("X-Session-Token")
    if mobile_token:
        return mobile_token

    return None


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[UserProfile]:
    """
    Get the current authenticated user.

    Returns None if not authenticated (for optional auth endpoints).
    """
    token = await get_token_from_request(request, credentials)
    if not token:
        return None

    auth_service = get_auth_service()
    session_data = await auth_service.validate_session(token)

    if not session_data:
        return None

    return await auth_service.get_user_from_session(session_data)


async def require_auth(
    user: Optional[UserProfile] = Depends(get_current_user),
) -> UserProfile:
    """
    Require authentication for an endpoint.

    Raises 401 if user is not authenticated.
    """
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "unauthorized",
                "message": "Authentication required",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def require_admin(
    user: UserProfile = Depends(require_auth),
) -> UserProfile:
    """
    Require admin authentication for an endpoint.

    Raises 403 if user is not an admin.
    """
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "forbidden",
                "message": "Admin access required",
            },
        )
    return user


def get_minimal_user(user: UserProfile) -> MinimalUser:
    """Convert full user profile to minimal representation."""
    return MinimalUser(
        id=user.id,
        name=user.name,
        image=user.image,
    )
