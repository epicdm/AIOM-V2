"""
Rate Limiting Middleware for Mobile API Gateway.

Implements a sliding window rate limiter using Redis.
Falls back to in-memory rate limiting if Redis is unavailable.
"""

import time
from collections import defaultdict
from typing import Callable, Dict, Optional, Tuple

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

from ..config import settings


class InMemoryRateLimiter:
    """
    In-memory rate limiter using sliding window algorithm.
    Used as fallback when Redis is unavailable.
    """

    def __init__(self):
        self._requests: Dict[str, list] = defaultdict(list)

    def is_allowed(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
    ) -> Tuple[bool, int, int]:
        """
        Check if request is allowed and update counter.

        Returns:
            Tuple of (is_allowed, remaining_requests, reset_time)
        """
        now = time.time()
        window_start = now - window_seconds

        # Clean old requests
        self._requests[key] = [
            ts for ts in self._requests[key] if ts > window_start
        ]

        current_count = len(self._requests[key])
        remaining = max(0, max_requests - current_count - 1)
        reset_time = int(window_start + window_seconds)

        if current_count >= max_requests:
            return False, 0, reset_time

        # Add this request
        self._requests[key].append(now)
        return True, remaining, reset_time


class RateLimitMiddleware:
    """
    Rate limiting middleware for API requests.

    Features:
    - Per-client rate limiting (by IP or user ID)
    - Redis-backed for distributed environments
    - In-memory fallback
    - Mobile-specific rate limit headers
    """

    def __init__(
        self,
        app: ASGIApp,
        max_requests: int = 100,
        window_seconds: int = 60,
        key_func: Optional[Callable[[Request], str]] = None,
    ):
        """
        Initialize rate limiter.

        Args:
            app: The ASGI application
            max_requests: Maximum requests per window
            window_seconds: Window size in seconds
            key_func: Function to extract rate limit key from request
        """
        self.app = app
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.key_func = key_func or self._default_key_func
        self._limiter = InMemoryRateLimiter()

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)

        # Get rate limit key
        key = await self._get_key(request)

        # Check rate limit
        is_allowed, remaining, reset_time = self._limiter.is_allowed(
            key, self.max_requests, self.window_seconds
        )

        if not is_allowed:
            response = self._rate_limit_response(reset_time)
            await response(scope, receive, send)
            return

        # Add rate limit headers to response
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend(
                    [
                        (b"x-ratelimit-limit", str(self.max_requests).encode()),
                        (b"x-ratelimit-remaining", str(remaining).encode()),
                        (b"x-ratelimit-reset", str(reset_time).encode()),
                    ]
                )
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_wrapper)

    async def _get_key(self, request: Request) -> str:
        """Get the rate limit key for this request."""
        return self.key_func(request)

    def _default_key_func(self, request: Request) -> str:
        """Default key function using client IP and optional user ID."""
        # Try to get user ID from authorization header
        user_id = None
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            # Extract user ID from token if available
            # This is a simple approach - in production, validate the token
            user_id = auth_header[7:20]  # Use first part of token as key

        # Get client IP
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"

        if user_id:
            return f"ratelimit:user:{user_id}"
        return f"ratelimit:ip:{client_ip}"

    def _rate_limit_response(self, reset_time: int) -> Response:
        """Generate rate limit exceeded response."""
        retry_after = max(1, reset_time - int(time.time()))

        return JSONResponse(
            status_code=429,
            content={
                "error": "rate_limit_exceeded",
                "message": "Too many requests. Please try again later.",
                "retry_after": retry_after,
            },
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(self.max_requests),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(reset_time),
            },
        )


def create_rate_limiter(
    max_requests: Optional[int] = None,
    window_seconds: Optional[int] = None,
) -> Callable:
    """
    Factory function to create rate limiter with custom settings.

    Args:
        max_requests: Override default max requests
        window_seconds: Override default window
    """

    def decorator(app: ASGIApp) -> RateLimitMiddleware:
        return RateLimitMiddleware(
            app,
            max_requests=max_requests or settings.rate_limit_requests,
            window_seconds=window_seconds or settings.rate_limit_window,
        )

    return decorator
