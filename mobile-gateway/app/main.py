"""
Mobile API Gateway - Main Application

FastAPI gateway providing mobile-optimized endpoints with:
- Payload compression (Brotli, Gzip, Deflate)
- Offline sync support
- Reduced data transfer
- Rate limiting
"""

import time
from contextlib import asynccontextmanager
from typing import Callable

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .middleware.compression import CompressionMiddleware
from .middleware.rate_limiter import RateLimitMiddleware
from .routers import health_router, sync_router, users_router, briefings_router, auth_router, contacts_router, onboarding_router
from .services.auth import get_auth_service
from .services.database import get_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.

    Handles startup and shutdown events.
    """
    # Startup
    print(f"Starting {settings.app_name} v{settings.app_version}")

    # Initialize services
    database = get_database()

    # Verify database connection
    try:
        is_healthy = await database.health_check()
        if is_healthy:
            print("Database connection established")
        else:
            print("Warning: Database connection failed")
    except Exception as e:
        print(f"Warning: Database check failed: {e}")

    yield

    # Shutdown
    print("Shutting down...")

    # Close auth service HTTP client
    auth_service = get_auth_service()
    await auth_service.close()


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="""
    Mobile API Gateway providing optimized endpoints for mobile applications.

    ## Features

    - **Payload Compression**: Automatic Brotli/Gzip compression for reduced bandwidth
    - **Offline Sync**: Queue operations while offline, sync when connected
    - **Reduced Data Transfer**: Minimal payloads with selective field responses
    - **Rate Limiting**: Per-client rate limiting to prevent abuse
    - **Authentication**: Seamless integration with Better Auth

    ## API Versioning

    All endpoints are prefixed with `/api/v1/mobile/` for versioning.

    ## Compression

    The gateway automatically compresses responses based on:
    - Client's `Accept-Encoding` header
    - Response content type
    - Response size (minimum 500 bytes)

    Supported encodings: `br` (Brotli), `gzip`, `deflate`

    ## Offline Sync

    Use the `/sync/push` endpoint to sync queued offline operations.
    Use the `/sync/pull` endpoint to fetch server changes.
    """,
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
        "X-Request-ID",
        "Content-Encoding",
    ],
)


# Add custom middleware
@app.middleware("http")
async def add_request_id(request: Request, call_next: Callable) -> Response:
    """Add request ID header for tracing."""
    import uuid

    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

    # Store in request state
    request.state.request_id = request_id

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id

    return response


@app.middleware("http")
async def add_process_time_header(request: Request, call_next: Callable) -> Response:
    """Add processing time header."""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    return response


# Add compression middleware
app.add_middleware(
    CompressionMiddleware,
    minimum_size=settings.compression_min_size,
    compression_level=settings.compression_level,
)

# Add rate limiting middleware
app.add_middleware(
    RateLimitMiddleware,
    max_requests=settings.rate_limit_requests,
    window_seconds=settings.rate_limit_window,
)


# Include routers with /api/v1/mobile prefix
API_PREFIX = "/api/v1/mobile"

app.include_router(health_router, prefix=API_PREFIX)
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(users_router, prefix=API_PREFIX)
app.include_router(briefings_router, prefix=API_PREFIX)
app.include_router(sync_router, prefix=API_PREFIX)
app.include_router(contacts_router, prefix=API_PREFIX)
app.include_router(onboarding_router, prefix=API_PREFIX)


# Root endpoint
@app.get("/", include_in_schema=False)
async def root():
    """Root endpoint returning API information."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": f"{API_PREFIX}/health",
    }


# Error handlers - Handle HTTPException specifically
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with proper status codes."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail if isinstance(exc.detail, dict) else {
                "code": "http_error",
                "message": str(exc.detail),
            },
            "requestId": getattr(request.state, "request_id", None),
        },
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors."""
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": "validation_error",
                "message": "Request validation failed",
                "details": exc.errors(),
            },
            "requestId": getattr(request.state, "request_id", None),
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    # Don't handle HTTPException here - it's handled above
    if isinstance(exc, HTTPException):
        raise exc

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "internal_error",
                "message": "An unexpected error occurred",
                "details": str(exc) if settings.debug else None,
            },
            "requestId": getattr(request.state, "request_id", None),
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
